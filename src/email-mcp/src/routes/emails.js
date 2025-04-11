/**
 * Email Routes - API endpoints for email operations
 */
const express = require('express');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const processingService = require('../services/processingService');
const emailService = require('../services/emailService');
const templateService = require('../services/templateService');

// Initialize router
const router = express.Router();

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/email-routes-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/email-routes-combined.log' })
  ]
});

// Validation schema for processing an email
const processEmailSchema = Joi.object({
  email_id: Joi.string().required(),
  classification: Joi.object({
    intent: Joi.string().required(),
    risk_level: Joi.string().valid('low', 'medium', 'high').required(),
    confidence: Joi.number().min(0).max(1).required()
  }).required(),
  email_data: Joi.object({
    subject: Joi.string().required(),
    from: Joi.string().required(),
    to: Joi.string().required(),
    cc: Joi.string().allow(null, ''),
    text: Joi.string().required(),
    html: Joi.string().allow(null, ''),
    date: Joi.date().iso(),
    metadata: Joi.object().unknown(true)
  }).required()
});

// Validation schema for reviewing a response
const reviewResponseSchema = Joi.object({
  approved: Joi.boolean().required(),
  edited_content: Joi.string().allow(null, ''),
  reviewer_id: Joi.string().required(),
  reviewer_comments: Joi.string().allow(null, '')
});

/**
 * Validate UUID format
 * @param {string} id - UUID to validate
 * @returns {boolean} Whether the UUID is valid
 */
function isUuidValid(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * POST /api/emails/process
 * Process an email with a given classification
 */
router.post('/process', async (req, res) => {
  try {
    // Validate request
    const { error, value } = processEmailSchema.validate(req.body);
    if (error) {
      logger.warn(`Invalid process email request: ${error.message}`);
      return res.status(400).json({
        status: 'error',
        message: `Validation error: ${error.message}`
      });
    }
    
    const { email_id, classification, email_data } = value;
    
    // Process the email
    const result = await processingService.processEmail(email_data, classification);
    
    logger.info(`Email processed: ${email_id}, response: ${result.response_id}`);
    
    // Return response
    res.json({
      status: 'success',
      message: 'Email processed successfully',
      data: result
    });
  } catch (error) {
    logger.error(`Error processing email: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/emails/review/:id
 * Handle a reviewed response
 */
router.post('/review/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!isUuidValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid response ID format'
      });
    }
    
    // Validate request body
    const { error, value } = reviewResponseSchema.validate(req.body);
    if (error) {
      logger.warn(`Invalid review request: ${error.message}`);
      return res.status(400).json({
        status: 'error',
        message: `Validation error: ${error.message}`
      });
    }
    
    // Handle the reviewed response
    const result = await processingService.handleReviewedResponse(id, value);
    
    logger.info(`Response reviewed: ${id}, approved: ${value.approved}`);
    
    // Return response
    res.json({
      status: 'success',
      message: 'Response review processed',
      data: result
    });
  } catch (error) {
    logger.error(`Error handling review: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/emails/response/:id
 * Get details of a specific response
 */
router.get('/response/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!isUuidValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid response ID format'
      });
    }
    
    // Get response details
    const response = await processingService.getResponseDetails(id);
    
    logger.info(`Retrieved response details: ${id}`);
    
    // Return response
    res.json({
      status: 'success',
      data: response
    });
  } catch (error) {
    logger.error(`Error getting response details: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get response details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/emails/templates
 * Get all email templates
 */
router.get('/templates', async (req, res) => {
  try {
    // Get all templates
    const templates = await templateService.getAllTemplates();
    
    logger.info(`Retrieved ${templates.length} templates`);
    
    // Return templates
    res.json({
      status: 'success',
      data: templates
    });
  } catch (error) {
    logger.error(`Error getting templates: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get templates',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/emails/templates/:intent
 * Get templates for a specific intent
 */
router.get('/templates/:intent', async (req, res) => {
  try {
    const { intent } = req.params;
    
    // Get templates for intent
    const templates = await templateService.getTemplatesForIntent(intent);
    
    logger.info(`Retrieved ${templates.length} templates for intent: ${intent}`);
    
    // Return templates
    res.json({
      status: 'success',
      data: templates
    });
  } catch (error) {
    logger.error(`Error getting templates for intent: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get templates',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/emails/templates
 * Create a new template
 */
router.post('/templates', async (req, res) => {
  try {
    // Validate request body
    const templateSchema = Joi.object({
      intent: Joi.string().required(),
      purpose: Joi.string().required(),
      content: Joi.string().required()
    });
    
    const { error, value } = templateSchema.validate(req.body);
    if (error) {
      logger.warn(`Invalid template creation request: ${error.message}`);
      return res.status(400).json({
        status: 'error',
        message: `Validation error: ${error.message}`
      });
    }
    
    // Create template
    const template = await templateService.createTemplate(value);
    
    logger.info(`Created template for intent: ${value.intent}`);
    
    // Return created template
    res.status(201).json({
      status: 'success',
      message: 'Template created',
      data: template
    });
  } catch (error) {
    logger.error(`Error creating template: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create template',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/emails/templates/:id
 * Update an existing template
 */
router.put('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate request body
    const templateSchema = Joi.object({
      intent: Joi.string().required(),
      purpose: Joi.string().required(),
      content: Joi.string().required()
    });
    
    const { error, value } = templateSchema.validate(req.body);
    if (error) {
      logger.warn(`Invalid template update request: ${error.message}`);
      return res.status(400).json({
        status: 'error',
        message: `Validation error: ${error.message}`
      });
    }
    
    // Update template
    const template = await templateService.updateTemplate(id, value);
    
    logger.info(`Updated template: ${id}`);
    
    // Return updated template
    res.json({
      status: 'success',
      message: 'Template updated',
      data: template
    });
  } catch (error) {
    logger.error(`Error updating template: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update template',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/emails/templates/:id
 * Delete a template
 */
router.delete('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete template
    await templateService.deleteTemplate(id);
    
    logger.info(`Deleted template: ${id}`);
    
    // Return success
    res.json({
      status: 'success',
      message: 'Template deleted'
    });
  } catch (error) {
    logger.error(`Error deleting template: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete template',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 