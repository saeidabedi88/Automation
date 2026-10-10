/**
 * Inbox Service - Fetch unread mail across accounts and produce briefs
 */
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { htmlToText } = require('html-to-text');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const accountService = require('./accountService');
const llmService = require('./llmService');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/inbox-service.log' })
  ]
});

const DATA_DIR = process.env.EMAIL_DATA_DIR || path.join(__dirname, '../../data');
const BRIEFS_FILE = path.join(DATA_DIR, 'inbox-briefs.json');
const DECISIONS_FILE = path.join(DATA_DIR, 'reply-decisions.json');

function ensureStore(file, fallback) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  }
}

function readJson(file, fallback) {
  ensureStore(file, fallback);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureStore(file, data);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function fallbackBrief(email) {
  const text = (email.plainText || email.text || '').replace(/\s+/g, ' ').trim();
  const snippet = text.slice(0, 220) + (text.length > 220 ? '…' : '');
  return {
    summary: snippet || 'No readable body content.',
    urgency: /urgent|asap|immediately|today/i.test(`${email.subject} ${text}`) ? 'high' : 'normal',
    suggestedAction: 'review',
    keyPoints: []
  };
}

function fetchUnreadFromAccount(account, limit = 20) {
  return new Promise((resolve, reject) => {
    const client = new Imap({
      user: account.email,
      password: account.password,
      host: account.imapHost,
      port: account.imapPort || 993,
      tls: account.imapTls !== false,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 30000
    });

    const emails = [];

    client.once('ready', () => {
      client.openBox('INBOX', true, (err) => {
        if (err) {
          client.end();
          return reject(err);
        }

        client.search(['UNSEEN'], (searchErr, results) => {
          if (searchErr) {
            client.end();
            return reject(searchErr);
          }

          if (!results || results.length === 0) {
            client.end();
            return resolve([]);
          }

          const ids = results.slice(-limit);
          const fetch = client.fetch(ids, {
            bodies: '',
            markSeen: false,
            struct: true
          });

          fetch.on('message', (msg) => {
            let raw = '';
            let uid = null;

            msg.on('attributes', (attrs) => {
              uid = attrs.uid;
            });

            msg.on('body', (stream) => {
              stream.on('data', (chunk) => {
                raw += chunk.toString('utf8');
              });
            });

            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(raw);
                const safeId = `acc-${account.id}-uid-${uid || uuidv4()}`;
                emails.push({
                  id: safeId,
                  messageId: parsed.messageId || null,
                  uid,
                  accountId: account.id,
                  accountEmail: account.email,
                  accountLabel: account.label,
                  subject: parsed.subject || '(No subject)',
                  from: parsed.from ? parsed.from.text : 'Unknown',
                  to: parsed.to ? parsed.to.text : account.email,
                  date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
                  text: parsed.text || '',
                  html: parsed.html || null,
                  plainText: parsed.html
                    ? htmlToText(parsed.html)
                    : (parsed.text || '')
                });
              } catch (parseError) {
                logger.error(`Parse error for ${account.email}: ${parseError.message}`);
              }
            });
          });

          fetch.once('error', (fetchErr) => {
            client.end();
            reject(fetchErr);
          });

          fetch.once('end', () => {
            client.end();
            // small delay so message end handlers can finish
            setTimeout(() => resolve(emails), 300);
          });
        });
      });
    });

    client.once('error', (imapErr) => {
      reject(imapErr);
    });

    client.connect();
  });
}

async function briefEmail(email) {
  try {
    if (process.env.OPENAI_API_KEY && llmService.generateEmailBrief) {
      return await llmService.generateEmailBrief(email);
    }
  } catch (error) {
    logger.warn(`LLM brief failed, using fallback: ${error.message}`);
  }
  return fallbackBrief(email);
}

async function getUnreadBriefs({ accountId = null, limit = 20, refresh = true } = {}) {
  const cache = readJson(BRIEFS_FILE, { items: [], updatedAt: null });

  if (!refresh && cache.items.length > 0) {
    return {
      items: accountId
        ? cache.items.filter((i) => i.accountId === accountId)
        : cache.items,
      updatedAt: cache.updatedAt,
      cached: true
    };
  }

  const accounts = accountService.listEnabledAccounts()
    .filter((a) => !accountId || a.id === accountId);

  const all = [];
  const errors = [];

  for (const account of accounts) {
    try {
      const unread = await fetchUnreadFromAccount(account, limit);
      for (const email of unread) {
        const brief = await briefEmail(email);
        all.push({
          id: email.id,
          uid: email.uid,
          accountId: email.accountId,
          accountEmail: email.accountEmail,
          accountLabel: email.accountLabel,
          subject: email.subject,
          from: email.from,
          to: email.to,
          date: email.date,
          preview: (email.plainText || '').slice(0, 280),
          brief,
          status: 'unread',
          draftReply: null,
          decision: null
        });
      }
      accountService.markAccountChecked(account.id, null);
    } catch (error) {
      logger.error(`Unread fetch failed for ${account.email}: ${error.message}`);
      accountService.markAccountChecked(account.id, error.message);
      errors.push({ accountId: account.id, email: account.email, error: error.message });
    }
  }

  all.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Preserve draft/decision state from previous cache
  const previousById = new Map(cache.items.map((i) => [i.id, i]));
  const merged = all.map((item) => {
    const prev = previousById.get(item.id);
    if (!prev) return item;
    return {
      ...item,
      draftReply: prev.draftReply || null,
      decision: prev.decision || null,
      status: prev.decision ? prev.status : item.status
    };
  });

  const payload = {
    items: merged,
    updatedAt: new Date().toISOString(),
    errors
  };
  writeJson(BRIEFS_FILE, payload);
  return { ...payload, cached: false };
}

async function generateDraftReply(emailId, decisionNotes = '') {
  const cache = readJson(BRIEFS_FILE, { items: [] });
  const item = cache.items.find((i) => i.id === emailId);
  if (!item) {
    throw new Error('Unread email not found. Refresh the inbox first.');
  }

  let draft;
  try {
    if (process.env.OPENAI_API_KEY) {
      draft = await llmService.generateEmailResponse(
        {
          content: {
            subject: item.subject,
            body: item.preview
          },
          classification: {
            intent: item.brief?.suggestedAction || 'general_reply',
            risk_level: item.brief?.urgency === 'high' ? 'high' : 'medium'
          },
          metadata: {
            decision_notes: decisionNotes
          }
        },
        [],
        []
      );
    } else {
      draft = {
        body: `Hi,\n\nThanks for your email regarding "${item.subject}".\n\n${decisionNotes || 'I will follow up shortly with more details.'}\n\nBest regards`,
        model_used: 'fallback'
      };
    }
  } catch (error) {
    draft = {
      body: `Hi,\n\nThanks for your note about "${item.subject}".\n\n${decisionNotes || ''}\n\nBest regards`,
      model_used: 'fallback',
      error: error.message
    };
  }

  item.draftReply = {
    body: draft.body,
    model_used: draft.model_used,
    decisionNotes,
    generatedAt: new Date().toISOString()
  };
  item.status = 'draft_ready';
  writeJson(BRIEFS_FILE, cache);
  return item;
}

function recordDecision(emailId, decision) {
  const cache = readJson(BRIEFS_FILE, { items: [] });
  const item = cache.items.find((i) => i.id === emailId);
  if (!item) {
    throw new Error('Email not found in current unread briefs');
  }

  const allowed = ['approve_send', 'edit_send', 'skip', 'archive', 'needs_info'];
  if (!allowed.includes(decision.action)) {
    throw new Error(`Invalid decision action. Allowed: ${allowed.join(', ')}`);
  }

  item.decision = {
    action: decision.action,
    notes: decision.notes || '',
    editedBody: decision.editedBody || item.draftReply?.body || null,
    decidedAt: new Date().toISOString(),
    decidedBy: decision.decidedBy || 'dashboard-user'
  };
  item.status = decision.action;

  const decisions = readJson(DECISIONS_FILE, { decisions: [] });
  decisions.decisions.unshift({
    id: uuidv4(),
    emailId,
    accountId: item.accountId,
    subject: item.subject,
    from: item.from,
    ...item.decision
  });
  writeJson(DECISIONS_FILE, decisions);
  writeJson(BRIEFS_FILE, cache);
  return item;
}

async function sendApprovedReply(emailId) {
  const emailService = require('./emailService');
  const cache = readJson(BRIEFS_FILE, { items: [] });
  const item = cache.items.find((i) => i.id === emailId);
  if (!item) {
    throw new Error('Email not found');
  }
  if (!item.decision || !['approve_send', 'edit_send'].includes(item.decision.action)) {
    throw new Error('Reply must be approved before sending');
  }

  const body = item.decision.editedBody || item.draftReply?.body;
  if (!body) {
    throw new Error('No reply body available');
  }

  const account = accountService.getAccountCredentials(item.accountId);
  const replyTo = item.from.match(/<(.+)>/) ? item.from.match(/<(.+)>/)[1] : item.from;
  const subject = item.subject.startsWith('Re:') ? item.subject : `Re: ${item.subject}`;

  const result = await emailService.sendEmailWithAccount(account, {
    to: replyTo,
    subject,
    body,
    from: account.email
  });

  item.status = 'sent';
  item.decision.sentAt = new Date().toISOString();
  item.decision.messageId = result.messageId;
  writeJson(BRIEFS_FILE, cache);
  return { item, result };
}

module.exports = {
  getUnreadBriefs,
  generateDraftReply,
  recordDecision,
  sendApprovedReply,
  fetchUnreadFromAccount
};
