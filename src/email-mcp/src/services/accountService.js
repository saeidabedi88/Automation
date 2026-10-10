/**
 * Account Service - Multi-account email connection management
 * Stores IMAP/SMTP credentials for Gmail and other providers.
 */
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Imap = require('imap');
const nodemailer = require('nodemailer');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/account-service.log' })
  ]
});

const DATA_DIR = process.env.EMAIL_DATA_DIR || path.join(__dirname, '../../data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'email-accounts.json');

const PROVIDER_PRESETS = {
  gmail: {
    label: 'Gmail',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    imapTls: true,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpSecure: true,
    help: 'Use a Google App Password (Google Account → Security → App Passwords).'
  },
  outlook: {
    label: 'Outlook / Microsoft 365',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    imapTls: true,
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    smtpSecure: false,
    help: 'Use your Microsoft account password or an app password if MFA is enabled.'
  },
  yahoo: {
    label: 'Yahoo Mail',
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    imapTls: true,
    smtpHost: 'smtp.mail.yahoo.com',
    smtpPort: 465,
    smtpSecure: true,
    help: 'Generate an app password in Yahoo Account Security settings.'
  },
  icloud: {
    label: 'iCloud',
    imapHost: 'imap.mail.me.com',
    imapPort: 993,
    imapTls: true,
    smtpHost: 'smtp.mail.me.com',
    smtpPort: 587,
    smtpSecure: false,
    help: 'Use an app-specific password from appleid.apple.com.'
  },
  custom: {
    label: 'Custom IMAP/SMTP',
    imapHost: '',
    imapPort: 993,
    imapTls: true,
    smtpHost: '',
    smtpPort: 465,
    smtpSecure: true,
    help: 'Enter your provider IMAP and SMTP settings manually.'
  }
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify({ accounts: [] }, null, 2));
  }
}

function readStore() {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
  } catch (error) {
    logger.error(`Failed to read accounts store: ${error.message}`);
    return { accounts: [] };
  }
}

function writeStore(store) {
  ensureDataDir();
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(store, null, 2));
}

function sanitizeAccount(account) {
  if (!account) return null;
  const { password, ...safe } = account;
  return {
    ...safe,
    hasPassword: Boolean(password)
  };
}

function getProviderPresets() {
  return PROVIDER_PRESETS;
}

function listAccounts() {
  const store = readStore();
  return store.accounts.map(sanitizeAccount);
}

function getAccount(id) {
  const store = readStore();
  return store.accounts.find((a) => a.id === id) || null;
}

function getAccountCredentials(id) {
  return getAccount(id);
}

function seedFromEnvIfEmpty() {
  const store = readStore();
  if (store.accounts.length > 0) return;

  if (!process.env.IMAP_USER || !process.env.IMAP_PASSWORD) return;

  const account = {
    id: uuidv4(),
    label: process.env.DEFAULT_FROM_EMAIL || process.env.IMAP_USER,
    email: process.env.IMAP_USER,
    provider: 'custom',
    imapHost: process.env.IMAP_HOST,
    imapPort: parseInt(process.env.IMAP_PORT || '993', 10),
    imapTls: process.env.IMAP_TLS !== 'false',
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT || '465', 10),
    smtpSecure: process.env.SMTP_SECURE !== 'false',
    password: process.env.IMAP_PASSWORD,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastCheckedAt: null,
    lastError: null
  };

  store.accounts.push(account);
  writeStore(store);
  logger.info(`Seeded email account from environment: ${account.email}`);
}

async function testImapConnection(config) {
  return new Promise((resolve) => {
    const client = new Imap({
      user: config.email,
      password: config.password,
      host: config.imapHost,
      port: config.imapPort || 993,
      tls: config.imapTls !== false,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 20000
    });

    const timer = setTimeout(() => {
      try { client.end(); } catch (_) { /* ignore */ }
      resolve({ ok: false, error: 'IMAP connection timed out' });
    }, 25000);

    client.once('ready', () => {
      clearTimeout(timer);
      client.end();
      resolve({ ok: true });
    });

    client.once('error', (err) => {
      clearTimeout(timer);
      resolve({ ok: false, error: err.message });
    });

    client.connect();
  });
}

async function testSmtpConnection(config) {
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort || 465,
      secure: config.smtpSecure !== false,
      auth: {
        user: config.email,
        pass: config.password
      }
    });
    await transporter.verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function createAccount(input) {
  const preset = PROVIDER_PRESETS[input.provider] || PROVIDER_PRESETS.custom;
  const account = {
    id: uuidv4(),
    label: input.label || input.email,
    email: input.email,
    provider: input.provider || 'custom',
    imapHost: input.imapHost || preset.imapHost,
    imapPort: parseInt(input.imapPort || preset.imapPort, 10),
    imapTls: input.imapTls !== undefined ? input.imapTls : preset.imapTls,
    smtpHost: input.smtpHost || preset.smtpHost,
    smtpPort: parseInt(input.smtpPort || preset.smtpPort, 10),
    smtpSecure: input.smtpSecure !== undefined ? input.smtpSecure : preset.smtpSecure,
    password: input.password,
    enabled: input.enabled !== false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastCheckedAt: null,
    lastError: null
  };

  if (!account.email || !account.password || !account.imapHost) {
    throw new Error('email, password, and imapHost are required');
  }

  const imapTest = await testImapConnection(account);
  if (!imapTest.ok) {
    throw new Error(`IMAP connection failed: ${imapTest.error}`);
  }

  if (account.smtpHost) {
    const smtpTest = await testSmtpConnection(account);
    if (!smtpTest.ok) {
      account.lastError = `SMTP warning: ${smtpTest.error}`;
      logger.warn(`SMTP check failed for ${account.email}: ${smtpTest.error}`);
    }
  }

  const store = readStore();
  if (store.accounts.some((a) => a.email.toLowerCase() === account.email.toLowerCase())) {
    throw new Error(`Account ${account.email} is already connected`);
  }

  store.accounts.push(account);
  writeStore(store);
  logger.info(`Connected email account: ${account.email}`);
  return sanitizeAccount(account);
}

async function updateAccount(id, updates) {
  const store = readStore();
  const index = store.accounts.findIndex((a) => a.id === id);
  if (index === -1) {
    throw new Error('Account not found');
  }

  const current = store.accounts[index];
  const next = {
    ...current,
    ...updates,
    id: current.id,
    password: updates.password || current.password,
    updatedAt: new Date().toISOString()
  };

  if (updates.password || updates.imapHost || updates.email) {
    const imapTest = await testImapConnection(next);
    if (!imapTest.ok) {
      throw new Error(`IMAP connection failed: ${imapTest.error}`);
    }
  }

  store.accounts[index] = next;
  writeStore(store);
  return sanitizeAccount(next);
}

function deleteAccount(id) {
  const store = readStore();
  const before = store.accounts.length;
  store.accounts = store.accounts.filter((a) => a.id !== id);
  if (store.accounts.length === before) {
    throw new Error('Account not found');
  }
  writeStore(store);
  return { deleted: true };
}

function markAccountChecked(id, error = null) {
  const store = readStore();
  const account = store.accounts.find((a) => a.id === id);
  if (!account) return;
  account.lastCheckedAt = new Date().toISOString();
  account.lastError = error;
  writeStore(store);
}

function listEnabledAccounts() {
  seedFromEnvIfEmpty();
  return readStore().accounts.filter((a) => a.enabled);
}

module.exports = {
  getProviderPresets,
  listAccounts,
  getAccount,
  getAccountCredentials,
  createAccount,
  updateAccount,
  deleteAccount,
  markAccountChecked,
  listEnabledAccounts,
  testImapConnection,
  testSmtpConnection,
  seedFromEnvIfEmpty
};
