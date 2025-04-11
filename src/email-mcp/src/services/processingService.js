/**
 * Processing Service - Coordinates the email processing pipeline
 */
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const emailService = require('./emailService');
const llmService = require('./llmService');
const templateService = require('./templateService');
const { Pool } = require('pg');
const amqp = require('amqplib');

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/processing-service-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/processing-service-combined.log' })
  ]
});

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.POSTGRES_URI,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Message queue connection
let channel;
const QUEUE_NAME = process.env.RESPONSE_QUEUE || 'email_responses';
const EXCHANGE_NAME = process.env.EMAIL_EXCHANGE || 'email_exchange';

// Initialize message queue connection
(async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URI);
    channel = await connection.createChannel();
    
    // Ensure exchange and queue exist
    await channel.assertExchange(EXCHANGE_NAME, 'direct', { durable: true });
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, 'response');
    
    logger.info('Message queue connection established');
  } catch (error) {
    logger.error(`Failed to connect to message queue: ${error.message}`);
  }
})();

/**
 * Process an email based on its classification
 * @param {Object} email - Email data with content and metadata
 * @param {Object} classification - Intent classification data
 * @returns {Promise<Object>} Processing result
 */
async function processEmail(email, classification) {
  try {
    logger.info(`Processing email with ID ${email.id} and intent ${classification.intent}`);
    
    // 1. Extract email thread history
    const history = emailService.extractEmailThreadHistory(email);
    
    // 2. Get relevant templates for this intent
    const templates = await templateService.getTemplatesForIntent(classification.intent);
    
    // 3. Prepare email data for LLM processing
    const emailData = {
      content: {
        subject: email.subject,
        body: email.plainText || email.text
      },
      classification,
      metadata: email.metadata || {}
    };
    
    // 4. Generate response using LLM
    const generatedResponse = await llmService.generateEmailResponse(emailData, history, templates);
    
    // 5. Store the generated response
    const responseId = await saveResponse(email.id, generatedResponse, classification);
    
    // 6. Determine next action based on risk level
    const isLowRisk = classification.risk_level === 'low';
    
    if (isLowRisk && process.env.AUTO_SEND_LOW_RISK === 'true') {
      // Auto-send low-risk emails
      await sendResponse(responseId, email, generatedResponse);
      
      logger.info(`Auto-sent low-risk response for email ${email.id}`);
      return {
        status: 'completed',
        response_id: responseId,
        auto_sent: true
      };
    } else {
      // Send to human review
      await sendToHumanReview(responseId, email, generatedResponse, classification);
      
      logger.info(`Sent to human review: response ${responseId} for email ${email.id}`);
      return {
        status: 'awaiting_review',
        response_id: responseId,
        auto_sent: false
      };
    }
  } catch (error) {
    logger.error(`Error processing email ${email.id}: ${error.message}`);
    throw new Error(`Failed to process email: ${error.message}`);
  }
}

/**
 * Save the generated response to the database
 * @param {string} emailId - Original email ID
 * @param {Object} response - Generated response data
 * @param {Object} classification - Intent classification data
 * @returns {Promise<string>} Response ID
 */
async function saveResponse(emailId, response, classification) {
  try {
    const client = await pool.connect();
    try {
      const responseId = uuidv4();
      
      const result = await client.query(
        `INSERT INTO responses
         (id, email_id, content, model_used, token_usage, created_at, status, intent, risk_level)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8)
         RETURNING id`,
        [
          responseId,
          emailId,
          response.body,
          response.model_used,
          JSON.stringify(response.token_usage),
          classification.risk_level === 'low' && process.env.AUTO_SEND_LOW_RISK === 'true' ? 'sent' : 'pending_review',
          classification.intent,
          classification.risk_level
        ]
      );
      
      logger.info(`Saved response ${result.rows[0].id} for email ${emailId}`);
      return result.rows[0].id;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error(`Error saving response for email ${emailId}: ${error.message}`);
    throw new Error(`Failed to save response: ${error.message}`);
  }
}

/**
 * Send the response email
 * @param {string} responseId - Response ID
 * @param {Object} originalEmail - Original email data
 * @param {Object} generatedResponse - Generated response data
 * @returns {Promise<Object>} Send result
 */
async function sendResponse(responseId, originalEmail, generatedResponse) {
  try {
    // 1. Compose the email
    const composedEmail = emailService.composeEmail(generatedResponse, originalEmail);
    
    // 2. Send the email
    const sendResult = await emailService.sendEmail(composedEmail);
    
    // 3. Update response status
    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE responses SET status = $1, sent_at = NOW(), message_id = $2 WHERE id = $3',
        ['sent', sendResult.messageId, responseId]
      );
    } finally {
      client.release();
    }
    
    logger.info(`Sent response ${responseId} for email ${originalEmail.id}: ${sendResult.messageId}`);
    
    // 4. Publish to message queue
    if (channel) {
      await channel.publish(EXCHANGE_NAME, 'response', Buffer.from(JSON.stringify({
        event: 'response_sent',
        response_id: responseId,
        email_id: originalEmail.id,
        message_id: sendResult.messageId,
        timestamp: new Date().toISOString()
      })));
    }
    
    return {
      success: true,
      response_id: responseId,
      message_id: sendResult.messageId
    };
  } catch (error) {
    logger.error(`Error sending response ${responseId}: ${error.message}`);
    throw new Error(`Failed to send response: ${error.message}`);
  }
}

/**
 * Send the response to human review
 * @param {string} responseId - Response ID
 * @param {Object} originalEmail - Original email data
 * @param {Object} generatedResponse - Generated response data 
 * @param {Object} classification - Intent classification data
 * @returns {Promise<Object>} Result of sending to review
 */
async function sendToHumanReview(responseId, originalEmail, generatedResponse, classification) {
  try {
    // Publish to message queue for Dashboard to pick up
    if (channel) {
      await channel.publish(EXCHANGE_NAME, 'human_review', Buffer.from(JSON.stringify({
        event: 'request_human_review',
        response_id: responseId,
        email_id: originalEmail.id,
        intent: classification.intent,
        risk_level: classification.risk_level,
        timestamp: new Date().toISOString()
      })));
      
      logger.info(`Published human review request for response ${responseId}`);
      
      return {
        success: true,
        response_id: responseId,
        status: 'pending_review'
      };
    } else {
      throw new Error('Message queue not available');
    }
  } catch (error) {
    logger.error(`Error sending to human review ${responseId}: ${error.message}`);
    throw new Error(`Failed to send to human review: ${error.message}`);
  }
}

/**
 * Handle a reviewed response
 * @param {string} responseId - Response ID
 * @param {Object} reviewData - Review data including approved status and edits
 * @returns {Promise<Object>} Result of handling the review
 */
async function handleReviewedResponse(responseId, reviewData) {
  try {
    const { approved, edited_content, reviewer_id, reviewer_comments } = reviewData;
    
    // Get original response and email data
    const client = await pool.connect();
    let originalEmail, responseData;
    
    try {
      // Get response data
      const responseResult = await client.query(
        'SELECT email_id, content, status FROM responses WHERE id = $1',
        [responseId]
      );
      
      if (responseResult.rows.length === 0) {
        throw new Error(`Response with ID ${responseId} not found`);
      }
      
      responseData = responseResult.rows[0];
      
      // Get email data
      const emailResult = await client.query(
        'SELECT * FROM emails WHERE id = $1',
        [responseData.email_id]
      );
      
      if (emailResult.rows.length === 0) {
        throw new Error(`Email with ID ${responseData.email_id} not found`);
      }
      
      originalEmail = emailResult.rows[0];
      
      // Update response status based on review
      await client.query(
        `UPDATE responses 
         SET status = $1, 
             reviewer_id = $2,
             reviewer_comments = $3,
             content = $4,
             reviewed_at = NOW()
         WHERE id = $5`,
        [
          approved ? 'approved' : 'rejected',
          reviewer_id,
          reviewer_comments,
          edited_content || responseData.content,
          responseId
        ]
      );
    } finally {
      client.release();
    }
    
    // If approved, send the response
    if (approved) {
      // Create the structure needed for sending
      const reconstructedEmail = {
        id: originalEmail.id,
        from: originalEmail.from_address,
        to: originalEmail.to_address,
        subject: originalEmail.subject
      };
      
      const generatedResponse = {
        body: edited_content || responseData.content
      };
      
      // Send the approved response
      const sendResult = await sendResponse(responseId, reconstructedEmail, generatedResponse);
      
      logger.info(`Sent approved response ${responseId}`);
      return {
        success: true,
        status: 'sent',
        response_id: responseId,
        message_id: sendResult.message_id
      };
    } else {
      // If rejected, just return the status
      logger.info(`Response ${responseId} was rejected`);
      return {
        success: true,
        status: 'rejected',
        response_id: responseId
      };
    }
  } catch (error) {
    logger.error(`Error handling reviewed response ${responseId}: ${error.message}`);
    throw new Error(`Failed to handle reviewed response: ${error.message}`);
  }
}

/**
 * Get details of a response
 * @param {string} responseId - Response ID 
 * @returns {Promise<Object>} Response details
 */
async function getResponseDetails(responseId) {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT r.*, e.subject, e.from_address, e.to_address
         FROM responses r
         JOIN emails e ON r.email_id = e.id
         WHERE r.id = $1`,
        [responseId]
      );
      
      if (result.rows.length === 0) {
        throw new Error(`Response with ID ${responseId} not found`);
      }
      
      logger.info(`Retrieved details for response ${responseId}`);
      return result.rows[0];
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error(`Error getting response details ${responseId}: ${error.message}`);
    throw new Error(`Failed to get response details: ${error.message}`);
  }
}

module.exports = {
  processEmail,
  handleReviewedResponse,
  getResponseDetails,
  sendResponse
}; 