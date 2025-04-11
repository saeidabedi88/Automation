/**
 * Email Service - Handles email parsing, processing, and sending
 */
const nodemailer = require('nodemailer');
const { simpleParser } = require('mailparser');
const { htmlToText } = require('html-to-text');
const winston = require('winston');
const Imap = require('imap');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { once } = require('events');

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/email-service-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/email-service-combined.log' })
  ]
});

// SMTP transport for sending emails
let transporter;
try {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
} catch (error) {
  logger.error(`Failed to create email transporter: ${error.message}`);
  // Don't throw, let the service initialize without email sending capability
  // We'll check for transporter availability before sending
}

// IMAP client for receiving emails
let imapClient;
let isImapConfigured = false;

/**
 * Initialize IMAP client with credentials from environment
 */
function initializeImap() {
  if (!process.env.IMAP_HOST || !process.env.IMAP_USER || !process.env.IMAP_PASSWORD) {
    logger.warn('IMAP credentials not provided in environment. Email polling will not be available.');
    isImapConfigured = false;
    return;
  }

  try {
    imapClient = new Imap({
      user: process.env.IMAP_USER,
      password: process.env.IMAP_PASSWORD,
      host: process.env.IMAP_HOST,
      port: parseInt(process.env.IMAP_PORT || '993', 10),
      tls: process.env.IMAP_TLS !== 'false',
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 30000
    });

    imapClient.on('error', (err) => {
      logger.error(`IMAP connection error: ${err.message}`);
    });

    logger.info('IMAP client initialized');
    isImapConfigured = true;
  } catch (error) {
    logger.error(`Failed to initialize IMAP client: ${error.message}`);
    isImapConfigured = false;
  }
}

/**
 * Start polling for new emails
 * @param {Function} onNewEmail - Callback function when new email is received
 * @param {number} pollInterval - Polling interval in milliseconds (default: 60000 = 1 minute)
 */
async function startEmailPolling(onNewEmail, pollInterval = 60000) {
  if (!isImapConfigured) {
    initializeImap();
    if (!isImapConfigured) {
      logger.error('Cannot start email polling: IMAP not configured');
      return;
    }
  }

  logger.info(`Starting email polling with interval: ${pollInterval}ms`);

  // Initial check
  try {
    await checkNewEmails(onNewEmail);
  } catch (error) {
    logger.error(`Error in initial email check: ${error.message}`);
  }

  // Set interval for polling
  const intervalId = setInterval(async () => {
    try {
      await checkNewEmails(onNewEmail);
    } catch (error) {
      logger.error(`Error checking emails: ${error.message}`);
    }
  }, pollInterval);

  // Return interval ID so it can be cleared if needed
  return intervalId;
}

/**
 * Check for new emails and process them
 * @param {Function} onNewEmail - Callback function when new email is received
 */
async function checkNewEmails(onNewEmail) {
  return new Promise((resolve, reject) => {
    if (!imapClient) {
      return reject(new Error('IMAP client not initialized'));
    }

    imapClient.once('ready', () => {
      imapClient.openBox('INBOX', false, (err, box) => {
        if (err) {
          imapClient.end();
          return reject(err);
        }

        // Search for unread messages
        imapClient.search(['UNSEEN'], (err, results) => {
          if (err) {
            imapClient.end();
            return reject(err);
          }

          if (!results || results.length === 0) {
            logger.info('No new emails found');
            imapClient.end();
            return resolve();
          }

          logger.info(`Found ${results.length} new emails`);

          const fetch = imapClient.fetch(results, { bodies: '', markSeen: true });

          fetch.on('message', (msg) => {
            let rawEmail = '';

            msg.on('body', (stream) => {
              stream.on('data', (chunk) => {
                rawEmail += chunk.toString();
              });
            });

            msg.once('end', async () => {
              try {
                // Parse email and pass to callback
                const parsedEmail = await parseEmail(rawEmail);
                onNewEmail(parsedEmail);
              } catch (error) {
                logger.error(`Error processing email: ${error.message}`);
              }
            });
          });

          fetch.once('error', (err) => {
            logger.error(`Fetch error: ${err.message}`);
            imapClient.end();
            reject(err);
          });

          fetch.once('end', () => {
            logger.info('Email fetch completed');
            imapClient.end();
            resolve();
          });
        });
      });
    });

    imapClient.once('error', (err) => {
      logger.error(`IMAP error: ${err.message}`);
      reject(err);
    });

    imapClient.connect();
  });
}

/**
 * Parse an email from raw data
 * @param {Buffer|String} rawEmail - Raw email data
 * @returns {Promise<Object>} Parsed email object
 */
async function parseEmail(rawEmail) {
  try {
    const parsed = await simpleParser(rawEmail);
    
    // Extract key information
    const email = {
      id: parsed.messageId,
      subject: parsed.subject || '(No subject)',
      from: parsed.from.text,
      to: parsed.to.text,
      cc: parsed.cc ? parsed.cc.text : null,
      date: parsed.date,
      text: parsed.text,
      html: parsed.html,
      plainText: parsed.html ? htmlToText(parsed.html) : parsed.text,
      attachments: parsed.attachments.map(att => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
        content: att.content
      }))
    };
    
    logger.info(`Successfully parsed email: ${email.id}`);
    return email;
  } catch (error) {
    logger.error(`Error parsing email: ${error.message}`);
    throw new Error(`Failed to parse email: ${error.message}`);
  }
}

/**
 * Send an email
 * @param {Object} emailData - Email data to send
 * @returns {Promise<Object>} Send result
 */
async function sendEmail(emailData) {
  try {
    if (!transporter) {
      throw new Error('Email transporter not initialized');
    }
    
    const { to, cc, subject, body, attachments = [], from = process.env.DEFAULT_FROM_EMAIL } = emailData;
    
    // Convert body to HTML if it's not already
    const isHtml = /<[a-z][\s\S]*>/i.test(body);
    const html = isHtml ? body : body.replace(/\n/g, '<br>');
    const text = isHtml ? htmlToText(body) : body;
    
    // Prepare email
    const message = {
      from,
      to,
      cc,
      subject,
      text,
      html,
      attachments: attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType
      }))
    };
    
    // Send email
    const info = await transporter.sendMail(message);
    
    logger.info(`Email sent: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    logger.error(`Error sending email: ${error.message}`);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Compose an email from a generated response and recipient information
 * @param {Object} responseData - Generated response data
 * @param {Object} originalEmail - Original email data
 * @returns {Object} Composed email ready to send
 */
function composeEmail(responseData, originalEmail) {
  try {
    const { body } = responseData;
    const { from, subject, to, attachments = [] } = originalEmail;
    
    // Extract the reply-to address from the original sender
    const replyTo = from.match(/<(.+)>/) ? from.match(/<(.+)>/)[1] : from;
    
    // Create a proper reply subject
    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
    
    // Compose the email
    const composedEmail = {
      to: replyTo,
      subject: replySubject,
      body,
      // Forward any attachments from the original email if needed
      attachments: []
    };
    
    logger.info(`Composed reply email to: ${replyTo}`);
    return composedEmail;
  } catch (error) {
    logger.error(`Error composing email: ${error.message}`);
    throw new Error(`Failed to compose email: ${error.message}`);
  }
}

/**
 * Extract email thread history from an email
 * @param {Object} email - Parsed email object
 * @returns {Array} Email thread history
 */
function extractEmailThreadHistory(email) {
  try {
    const history = [];
    const { text } = email;
    
    // Simple implementation - in reality would need more sophisticated parsing
    // to handle various email client formats
    const historyLines = text.split('\n');
    const historyEntries = [];
    let currentEntry = null;
    
    for (const line of historyLines) {
      // Common patterns for quoted email headers
      const headerMatch = line.match(/^On (.+), (.+) wrote:/);
      
      if (headerMatch) {
        if (currentEntry) {
          historyEntries.push(currentEntry);
        }
        
        currentEntry = {
          date: headerMatch[1],
          from: headerMatch[2],
          content: []
        };
      } else if (currentEntry && line.startsWith('>')) {
        // Quoted content from previous emails
        currentEntry.content.push(line.substring(1).trim());
      }
    }
    
    if (currentEntry) {
      historyEntries.push(currentEntry);
    }
    
    // Convert to the format expected by the LLM service
    historyEntries.forEach(entry => {
      history.push({
        date: entry.date,
        from: entry.from,
        snippet: entry.content.join(' ').substring(0, 200) + '...'
      });
    });
    
    return history;
  } catch (error) {
    logger.error(`Error extracting email history: ${error.message}`);
    return []; // Return empty history rather than failing
  }
}

/**
 * Check if email service connections are working
 * @returns {Promise<Object>} Status of SMTP and IMAP connections
 */
async function checkConnections() {
  try {
    const status = {
      smtp: 'not configured',
      imap: 'not configured'
    };

    // Verify SMTP connection
    if (transporter) {
      const smtpVerification = await transporter.verify();
      status.smtp = smtpVerification ? 'connected' : 'error';
    }

    // Verify IMAP connection
    if (isImapConfigured) {
      try {
        await new Promise((resolve, reject) => {
          imapClient.once('ready', () => {
            imapClient.end();
            resolve();
          });
          
          imapClient.once('error', (err) => {
            reject(err);
          });
          
          imapClient.connect();
        });
        status.imap = 'connected';
      } catch (error) {
        status.imap = 'error';
        status.imapError = error.message;
      }
    }

    return status;
  } catch (error) {
    logger.error(`Error checking email connections: ${error.message}`);
    return {
      smtp: 'error',
      imap: 'error',
      error: error.message
    };
  }
}

// Initialize IMAP on module load
initializeImap();

module.exports = {
  parseEmail,
  sendEmail,
  composeEmail,
  extractEmailThreadHistory,
  checkConnections,
  startEmailPolling
}; 