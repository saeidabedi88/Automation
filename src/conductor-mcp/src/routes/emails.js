const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const emailService = require('../services/emailService');
const logger = require('../utils/logger');
const Joi = require('joi');

// Validation schema for receiving email
const receiveEmailSchema = Joi.object({
  externalId: Joi.string(),
  from: Joi.string().email().required(),
  to: Joi.string().email().required(),
  subject: Joi.string().allow('').required(),
  plainText: Joi.string().allow('').required(),
  html: Joi.string().allow(''),
  cc: Joi.array().items(Joi.string().email()),
  bcc: Joi.array().items(Joi.string().email()),
  headers: Joi.object()
});

// Validation schema for draft response
const draftResponseSchema = Joi.object({
  task_id: Joi.string().uuid().required(),
  email_id: Joi.string().uuid().required(),
  draft_response: Joi.object({
    body: Joi.string().required(),
    generated_at: Joi.date().iso().required(),
    body_html: Joi.string()
  }).required(),
  metadata: Joi.object({
    confidence: Joi.number().min(0).max(1),
    suggestions: Joi.array().items(
      Joi.object({
        type: Joi.string().required(),
        content: Joi.string().required()
      })
    )
  }).required()
});

// Validation schema for reviewed response
const reviewedResponseSchema = Joi.object({
  review_id: Joi.string().uuid().required(),
  email_id: Joi.string().uuid().required(),
  approved_response: Joi.object({
    body: Joi.string().required(),
    approved_at: Joi.date().iso().required(),
    approved_by: Joi.string().uuid().required()
  }).required(),
  feedback: Joi.object({
    quality_rating: Joi.number().integer().min(1).max(5),
    comments: Joi.string().allow(''),
    edit_distance: Joi.number().integer().min(0)
  }).required()
});

/**
 * @route POST /api/emails
 * @description Receive an incoming email
 * @access Public
 */
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = receiveEmailSchema.validate(req.body);
    
    if (error) {
      logger.warn('Invalid email data received', { error: error.details });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email data',
        details: error.details
      });
    }
    
    // Process the email
    const email = await emailService.receiveEmail(value);
    
    return res.status(201).json({
      status: 'success',
      message: 'Email received successfully',
      data: {
        email_id: email.id
      }
    });
  } catch (error) {
    logger.error('Error in receive email endpoint:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/emails/:id
 * @description Get email by ID
 * @access Public
 */
router.get('/:id', async (req, res) => {
  try {
    const emailId = req.params.id;
    
    // Validate UUID format
    if (!isUuidValid(emailId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email ID format'
      });
    }
    
    // Get email from database
    const email = await emailService.getEmailById(emailId);
    
    if (!email) {
      return res.status(404).json({
        status: 'error',
        message: 'Email not found'
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: {
        email
      }
    });
  } catch (error) {
    logger.error(`Error getting email ${req.params.id}:`, error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/emails/process/:id
 * @description Process an email by ID
 * @access Public
 */
router.post('/process/:id', async (req, res) => {
  try {
    const emailId = req.params.id;
    
    // Validate UUID format
    if (!isUuidValid(emailId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email ID format'
      });
    }
    
    // Process the email
    const result = await emailService.processEmail(emailId);
    
    return res.status(200).json({
      status: 'success',
      message: 'Email processed successfully',
      data: {
        email_id: result.email.id,
        task_id: result.task.id,
        classification: {
          intent: result.classification.intent,
          risk_level: result.classification.risk_level
        }
      }
    });
  } catch (error) {
    logger.error(`Error processing email ${req.params.id}:`, error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/emails/drafts
 * @description Handle draft response from Email MCP
 * @access Public
 */
router.post('/drafts', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = draftResponseSchema.validate(req.body);
    
    if (error) {
      logger.warn('Invalid draft response data', { error: error.details });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid draft response data',
        details: error.details
      });
    }
    
    // Handle the draft response
    const result = await emailService.handleDraftResponse(value);
    
    return res.status(200).json({
      status: 'success',
      message: 'Draft response handled successfully',
      data: {
        response_id: result.response.id,
        review_task_id: result.reviewTask.id
      }
    });
  } catch (error) {
    logger.error('Error handling draft response:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/emails/reviewed
 * @description Handle reviewed response from Dashboard
 * @access Public
 */
router.post('/reviewed', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = reviewedResponseSchema.validate(req.body);
    
    if (error) {
      logger.warn('Invalid reviewed response data', { error: error.details });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid reviewed response data',
        details: error.details
      });
    }
    
    // Handle the reviewed response
    const result = await emailService.handleReviewedResponse(value);
    
    return res.status(200).json({
      status: 'success',
      message: 'Reviewed response handled successfully',
      data: {
        response_id: result.response.id,
        feedback_id: result.feedback.id
      }
    });
  } catch (error) {
    logger.error('Error handling reviewed response:', error);
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