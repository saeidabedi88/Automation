/**
 * Routes for connecting and managing email accounts
 */
const express = require('express');
const Joi = require('joi');
const accountService = require('../services/accountService');

const router = express.Router();

const accountSchema = Joi.object({
  label: Joi.string().allow('', null),
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required(),
  provider: Joi.string().valid('gmail', 'outlook', 'yahoo', 'icloud', 'custom').default('custom'),
  imapHost: Joi.string().allow('', null),
  imapPort: Joi.number().integer().min(1).max(65535),
  imapTls: Joi.boolean(),
  smtpHost: Joi.string().allow('', null),
  smtpPort: Joi.number().integer().min(1).max(65535),
  smtpSecure: Joi.boolean(),
  enabled: Joi.boolean()
});

router.get('/providers', (req, res) => {
  res.json({
    status: 'success',
    data: accountService.getProviderPresets()
  });
});

router.get('/', (req, res) => {
  try {
    accountService.seedFromEnvIfEmpty();
    res.json({
      status: 'success',
      data: accountService.listAccounts()
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { error, value } = accountSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ status: 'error', message: error.message });
    }
    const account = await accountService.createAccount(value);
    res.status(201).json({ status: 'success', data: account });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const account = await accountService.updateAccount(req.params.id, req.body);
    res.json({ status: 'success', data: account });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = accountService.deleteAccount(req.params.id);
    res.json({ status: 'success', data: result });
  } catch (err) {
    res.status(404).json({ status: 'error', message: err.message });
  }
});

router.post('/:id/test', async (req, res) => {
  try {
    const account = accountService.getAccountCredentials(req.params.id);
    if (!account) {
      return res.status(404).json({ status: 'error', message: 'Account not found' });
    }
    const imap = await accountService.testImapConnection(account);
    const smtp = account.smtpHost
      ? await accountService.testSmtpConnection(account)
      : { ok: false, error: 'SMTP not configured' };
    res.json({ status: 'success', data: { imap, smtp } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
