/**
 * RAG Routes - API endpoints for RAG operations
 */
const express = require('express');
const Joi = require('joi');
const logger = require('../utils/logger');
const ragService = require('../services/ragService');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Validation schema for query
const querySchema = Joi.object({
  query: Joi.string().required().min(3).max(1000),
  metadata: Joi.object({
    userId: Joi.string(),
    emailId: Joi.string(),
    intent: Joi.string(),
    topic: Joi.string()
  }).optional(),
  options: Joi.object({
    maxResults: Joi.number().integer().min(1).max(50).default(5),
    threshold: Joi.number().min(0).max(1).default(0.7),
    includeMetadata: Joi.boolean().default(true)
  }).optional()
});

// Validation schema for email context
const emailContextSchema = Joi.object({
  emailId: Joi.string().required(),
  subject: Joi.string().required(),
  content: Joi.string().required(),
  metadata: Joi.object().optional()
});

/**
 * @route POST /api/rag/query
 * @description Query for relevant context using RAG
 * @access Public
 */
router.post('/query', async (req, res) => {
  try {
    // Validate request
    const { error, value } = querySchema.validate(req.body);
    if (error) {
      logger.warn(`Invalid query request: ${error.message}`);
      return res.status(400).json({
        status: 'error',
        message: `Validation error: ${error.message}`
      });
    }
    
    // Generate request ID for tracking
    const requestId = uuidv4();
    logger.info(`Processing RAG query [${requestId}]: ${value.query.substring(0, 50)}...`);
    
    // Process query and get results
    const results = await ragService.query(value.query, value.metadata || {}, value.options || {});
    
    logger.info(`RAG query successful [${requestId}]: Found ${results.length} results`);
    
    // Return results
    return res.json({
      status: 'success',
      data: {
        results,
        query: value.query,
        requestId
      }
    });
  } catch (error) {
    logger.error(`Error processing RAG query: ${error.message}`, { error });
    return res.status(500).json({
      status: 'error',
      message: 'Failed to process query',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/rag/email-context
 * @description Process and store email content for RAG
 * @access Public
 */
router.post('/email-context', async (req, res) => {
  try {
    // Validate request
    const { error, value } = emailContextSchema.validate(req.body);
    if (error) {
      logger.warn(`Invalid email context request: ${error.message}`);
      return res.status(400).json({
        status: 'error',
        message: `Validation error: ${error.message}`
      });
    }
    
    logger.info(`Processing email for RAG context: ${value.emailId}`);
    
    // Process and store email content
    const result = await ragService.storeEmailContext(
      value.emailId, 
      value.subject, 
      value.content, 
      value.metadata || {}
    );
    
    logger.info(`Email context processed: ${value.emailId}`);
    
    // Return result
    return res.status(201).json({
      status: 'success',
      message: 'Email context stored successfully',
      data: {
        emailId: value.emailId,
        documentCount: result.documentCount
      }
    });
  } catch (error) {
    logger.error(`Error processing email context: ${error.message}`, { error });
    return res.status(500).json({
      status: 'error',
      message: 'Failed to process email context',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/rag/email-context/:id
 * @description Get stored context for a specific email
 * @access Public
 */
router.get('/email-context/:id', async (req, res) => {
  try {
    const emailId = req.params.id;
    logger.info(`Retrieving RAG context for email: ${emailId}`);
    
    // Get email context
    const context = await ragService.getEmailContext(emailId);
    
    if (!context) {
      logger.warn(`Email context not found: ${emailId}`);
      return res.status(404).json({
        status: 'error',
        message: 'Email context not found'
      });
    }
    
    logger.info(`Retrieved context for email: ${emailId}`);
    
    // Return context
    return res.json({
      status: 'success',
      data: {
        context
      }
    });
  } catch (error) {
    logger.error(`Error retrieving email context: ${error.message}`, { error });
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve email context',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 