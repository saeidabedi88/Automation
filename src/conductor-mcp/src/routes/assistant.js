/**
 * Proxy routes for inbox briefs, email accounts, and calendar
 * Forwards to Email MCP so the dashboard can use a single API origin.
 */
const express = require('express');
const axios = require('axios');
const logger = require('../utils/logger');

const router = express.Router();
const EMAIL_MCP_URL = process.env.EMAIL_MCP_URL || 'http://localhost:3002';

async function proxyToEmailMcp(req, res) {
  const pathOnly = req.originalUrl.split('?')[0];
  const url = `${EMAIL_MCP_URL}${pathOnly}`;

  try {
    const response = await axios({
      method: req.method,
      url,
      params: req.query,
      data: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      timeout: 60000,
      validateStatus: () => true
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    logger.error('Assistant proxy error', { error: error.message, url });
    res.status(502).json({
      status: 'error',
      message: `Email MCP unavailable: ${error.message}`
    });
  }
}

router.all(/^\/accounts(\/.*)?$/, proxyToEmailMcp);
router.all(/^\/inbox(\/.*)?$/, proxyToEmailMcp);
router.all(/^\/calendar(\/.*)?$/, proxyToEmailMcp);

module.exports = router;
