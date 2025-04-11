/**
 * Analytics Routes
 * 
 * Routes for retrieving analytics data about email processing
 */

const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const winston = require('winston');

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'analytics-routes' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/analytics-routes-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/analytics-routes-combined.log' })
  ]
});

/**
 * @route GET /api/analytics
 * @description Get analytics data about email processing
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    logger.info('GET /api/analytics - Fetching analytics data');
    const analytics = await analyticsService.getEmailAnalytics();
    res.json(analytics);
  } catch (error) {
    logger.error('Error retrieving analytics data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve analytics data',
      error: error.message
    });
  }
});

/**
 * @route GET /api/analytics/emails
 * @description Get analytics data specifically about emails
 * @access Public
 */
router.get('/emails', async (req, res) => {
  try {
    logger.info('GET /api/analytics/emails - Fetching email analytics data');
    const analytics = await analyticsService.getEmailAnalytics();
    res.json(analytics);
  } catch (error) {
    logger.error('Error retrieving email analytics data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve email analytics data',
      error: error.message
    });
  }
});

module.exports = router; 