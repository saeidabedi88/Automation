const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const emailService = require('../services/emailService');
const logger = require('../utils/logger');
const { pgQuery } = require('../models');
const Joi = require('joi');

// Validation schema for auto-complete response
const autoCompleteSchema = Joi.object({
  task_id: Joi.string().uuid().required(),
  email_id: Joi.string().uuid().required(),
  response: Joi.object({
    body: Joi.string().required(),
    sent_at: Joi.date().iso().required()
  }).required(),
  metadata: Joi.object({
    response_type: Joi.string().valid('auto').required(),
    templates_used: Joi.array().items(Joi.string())
  }).required()
});

/**
 * @route POST /api/responses/auto-complete
 * @description Notify that an auto-response has been completed by the Email MCP
 * @access Public
 */
router.post('/auto-complete', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = autoCompleteSchema.validate(req.body);
    
    if (error) {
      logger.warn('Invalid auto-complete data', { error: error.details });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid auto-complete data',
        details: error.details
      });
    }
    
    // Update task status
    await emailService.updateTask(value.task_id, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });
    
    // Save the response to database
    const responseId = uuidv4();
    
    const query = `
      INSERT INTO responses
      (id, email_id, task_id, body_text, is_auto_generated, is_approved, sent_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      responseId,
      value.email_id,
      value.task_id,
      value.response.body,
      true, // Auto-generated
      true, // Auto-approved
      value.response.sent_at
    ];
    
    const result = await pgQuery(query, values);
    const response = result.rows[0];
    
    logger.info(`Auto-response for email ${value.email_id} recorded successfully`);
    
    return res.status(200).json({
      status: 'success',
      message: 'Auto-response completed successfully',
      data: {
        response_id: response.id
      }
    });
  } catch (error) {
    logger.error('Error in auto-complete endpoint:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/responses/draft
 * @description Handle a draft response from the Email MCP
 * @access Public
 */
router.post('/draft', async (req, res) => {
  try {
    // Validation is performed in the emails routes, so we'll just redirect
    return res.redirect(307, '/api/emails/drafts');
  } catch (error) {
    logger.error('Error in draft response redirect:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/responses/reviewed
 * @description Handle a reviewed response from the Dashboard
 * @access Public
 */
router.post('/reviewed', async (req, res) => {
  try {
    // Validation is performed in the emails routes, so we'll just redirect
    return res.redirect(307, '/api/emails/reviewed');
  } catch (error) {
    logger.error('Error in reviewed response redirect:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/responses/:id
 * @description Get a response by ID
 * @access Public
 */
router.get('/:id', async (req, res) => {
  try {
    const responseId = req.params.id;
    
    // Validate UUID format
    if (!isUuidValid(responseId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid response ID format'
      });
    }
    
    // Get response from database
    const query = 'SELECT * FROM responses WHERE id = $1';
    const result = await pgQuery(query, [responseId]);
    const response = result.rows[0];
    
    if (!response) {
      return res.status(404).json({
        status: 'error',
        message: 'Response not found'
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: {
        response
      }
    });
  } catch (error) {
    logger.error(`Error getting response ${req.params.id}:`, error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Utility function to validate UUID
function isUuidValid(uuid) {
  try {
    return uuid && uuidv4.validate(uuid);
  } catch (error) {
    return false;
  }
}

module.exports = router; 