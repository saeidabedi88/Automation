/**
 * Knowledge Base Routes - API endpoints for knowledge base operations
 */
const express = require('express');
const Joi = require('joi');
const logger = require('../utils/logger');
const knowledgeService = require('../services/knowledgeService');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Validation schema for document
const documentSchema = Joi.object({
  title: Joi.string().required(),
  content: Joi.string().required(),
  type: Joi.string().valid('policy', 'procedure', 'faq', 'product', 'other').required(),
  metadata: Joi.object({
    tags: Joi.array().items(Joi.string()),
    category: Joi.string(),
    author: Joi.string(),
    updatedAt: Joi.date().iso(),
    version: Joi.string()
  }).optional()
});

// Validation schema for document update
const documentUpdateSchema = Joi.object({
  title: Joi.string(),
  content: Joi.string(),
  type: Joi.string().valid('policy', 'procedure', 'faq', 'product', 'other'),
  metadata: Joi.object({
    tags: Joi.array().items(Joi.string()),
    category: Joi.string(),
    author: Joi.string(),
    updatedAt: Joi.date().iso(),
    version: Joi.string()
  }).optional()
}).min(1);

/**
 * @route POST /api/knowledge/documents
 * @description Add a document to the knowledge base
 * @access Public
 */
router.post('/documents', async (req, res) => {
  try {
    // Validate request
    const { error, value } = documentSchema.validate(req.body);
    if (error) {
      logger.warn(`Invalid document request: ${error.message}`);
      return res.status(400).json({
        status: 'error',
        message: `Validation error: ${error.message}`
      });
    }
    
    // Generate document ID
    const documentId = uuidv4();
    logger.info(`Adding document to knowledge base: ${documentId}`);
    
    // Process and store document
    const result = await knowledgeService.addDocument(
      documentId,
      value.title,
      value.content,
      value.type,
      value.metadata || {}
    );
    
    logger.info(`Document added to knowledge base: ${documentId}`);
    
    // Return result
    return res.status(201).json({
      status: 'success',
      message: 'Document added successfully',
      data: {
        documentId,
        title: value.title,
        type: value.type
      }
    });
  } catch (error) {
    logger.error(`Error adding document: ${error.message}`, { error });
    return res.status(500).json({
      status: 'error',
      message: 'Failed to add document',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/knowledge/documents
 * @description Get all documents in the knowledge base
 * @access Public
 */
router.get('/documents', async (req, res) => {
  try {
    // Get query parameters
    const type = req.query.type;
    const tag = req.query.tag;
    const category = req.query.category;
    
    logger.info('Retrieving documents from knowledge base');
    
    // Get documents
    const documents = await knowledgeService.getDocuments(type, tag, category);
    
    logger.info(`Retrieved ${documents.length} documents`);
    
    // Return documents
    return res.json({
      status: 'success',
      data: {
        documents
      }
    });
  } catch (error) {
    logger.error(`Error retrieving documents: ${error.message}`, { error });
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve documents',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/knowledge/documents/:id
 * @description Get a document by ID
 * @access Public
 */
router.get('/documents/:id', async (req, res) => {
  try {
    const documentId = req.params.id;
    logger.info(`Retrieving document: ${documentId}`);
    
    // Get document
    const document = await knowledgeService.getDocumentById(documentId);
    
    if (!document) {
      logger.warn(`Document not found: ${documentId}`);
      return res.status(404).json({
        status: 'error',
        message: 'Document not found'
      });
    }
    
    logger.info(`Retrieved document: ${documentId}`);
    
    // Return document
    return res.json({
      status: 'success',
      data: {
        document
      }
    });
  } catch (error) {
    logger.error(`Error retrieving document: ${error.message}`, { error });
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve document',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route PUT /api/knowledge/documents/:id
 * @description Update a document by ID
 * @access Public
 */
router.put('/documents/:id', async (req, res) => {
  try {
    const documentId = req.params.id;
    
    // Validate request
    const { error, value } = documentUpdateSchema.validate(req.body);
    if (error) {
      logger.warn(`Invalid document update request: ${error.message}`);
      return res.status(400).json({
        status: 'error',
        message: `Validation error: ${error.message}`
      });
    }
    
    logger.info(`Updating document: ${documentId}`);
    
    // Check if document exists
    const exists = await knowledgeService.documentExists(documentId);
    if (!exists) {
      logger.warn(`Document not found for update: ${documentId}`);
      return res.status(404).json({
        status: 'error',
        message: 'Document not found'
      });
    }
    
    // Update document
    const result = await knowledgeService.updateDocument(documentId, value);
    
    logger.info(`Updated document: ${documentId}`);
    
    // Return result
    return res.json({
      status: 'success',
      message: 'Document updated successfully',
      data: {
        documentId
      }
    });
  } catch (error) {
    logger.error(`Error updating document: ${error.message}`, { error });
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update document',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route DELETE /api/knowledge/documents/:id
 * @description Delete a document by ID
 * @access Public
 */
router.delete('/documents/:id', async (req, res) => {
  try {
    const documentId = req.params.id;
    logger.info(`Deleting document: ${documentId}`);
    
    // Delete document
    const result = await knowledgeService.deleteDocument(documentId);
    
    if (!result) {
      logger.warn(`Document not found for deletion: ${documentId}`);
      return res.status(404).json({
        status: 'error',
        message: 'Document not found'
      });
    }
    
    logger.info(`Deleted document: ${documentId}`);
    
    // Return result
    return res.json({
      status: 'success',
      message: 'Document deleted successfully',
      data: {
        documentId
      }
    });
  } catch (error) {
    logger.error(`Error deleting document: ${error.message}`, { error });
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete document',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 