/**
 * Routes for unread inbox briefs and decision-based replies
 */
const express = require('express');
const Joi = require('joi');
const inboxService = require('../services/inboxService');

const router = express.Router();

const decisionSchema = Joi.object({
  action: Joi.string().valid('approve_send', 'edit_send', 'skip', 'archive', 'needs_info').required(),
  notes: Joi.string().allow('', null),
  editedBody: Joi.string().allow('', null),
  decidedBy: Joi.string().allow('', null),
  sendImmediately: Joi.boolean()
});

router.get('/unread', async (req, res) => {
  try {
    const refresh = req.query.refresh !== 'false';
    const accountId = req.query.accountId || null;
    const limit = parseInt(req.query.limit || '20', 10);
    const data = await inboxService.getUnreadBriefs({ accountId, limit, refresh });
    res.json({ status: 'success', data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.post('/:emailId/draft', async (req, res) => {
  try {
    const notes = req.body?.decisionNotes || req.body?.notes || '';
    const item = await inboxService.generateDraftReply(req.params.emailId, notes);
    res.json({ status: 'success', data: item });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

router.post('/:emailId/decision', async (req, res) => {
  try {
    const { error, value } = decisionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ status: 'error', message: error.message });
    }

    const item = inboxService.recordDecision(req.params.emailId, value);

    if (['approve_send', 'edit_send'].includes(value.action) && req.body.sendImmediately !== false) {
      const sent = await inboxService.sendApprovedReply(req.params.emailId);
      return res.json({ status: 'success', data: sent.item, sendResult: sent.result });
    }

    res.json({ status: 'success', data: item });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

router.post('/:emailId/send', async (req, res) => {
  try {
    const sent = await inboxService.sendApprovedReply(req.params.emailId);
    res.json({ status: 'success', data: sent.item, sendResult: sent.result });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
