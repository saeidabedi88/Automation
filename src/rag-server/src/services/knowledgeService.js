/**
 * Knowledge Service - Manages knowledge base documents
 * Handles CRUD operations for knowledge documents
 */
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// In-memory storage for development
// In production, this would use a database and vector store
const documentStore = new Map();

// Mock initial data
const initialDocuments = [
  {
    id: 'doc_001',
    title: 'API Rate Limits Policy',
    content: 'This document outlines the API rate limits for different subscription tiers. Basic tier: 10,000 requests/month. Pro tier: 50,000 requests/month. Enterprise tier: Custom limits based on contract. Exceeding these limits will result in 429 Too Many Requests responses.',
    type: 'policy',
    metadata: {
      tags: ['api', 'rate-limit', 'subscription'],
      category: 'technical',
      author: 'Tech Team',
      updatedAt: '2023-01-15T10:00:00Z',
      version: '1.2'
    },
    createdAt: '2022-12-01T09:00:00Z'
  },
  {
    id: 'doc_002',
    title: 'Enterprise Subscription Features',
    content: 'The Enterprise subscription includes the following features: 24/7 priority support with 1-hour SLA, dedicated account management, custom API rate limits, advanced analytics dashboard, and custom integration options. Contact sales for pricing.',
    type: 'product',
    metadata: {
      tags: ['enterprise', 'subscription', 'features'],
      category: 'product',
      author: 'Product Team',
      updatedAt: '2023-02-20T14:30:00Z',
      version: '2.0'
    },
    createdAt: '2022-11-15T11:20:00Z'
  },
  {
    id: 'doc_003',
    title: 'API Access FAQ',
    content: 'Frequently asked questions about API access: 1. How do I get an API key? Answer: You can generate an API key in your account settings. 2. What authentication method is used? Answer: We use Bearer token authentication. 3. Are there rate limits? Answer: Yes, depending on your subscription tier.',
    type: 'faq',
    metadata: {
      tags: ['api', 'faq', 'authentication'],
      category: 'support',
      author: 'Support Team',
      updatedAt: '2023-03-05T09:15:00Z',
      version: '1.5'
    },
    createdAt: '2022-10-10T16:45:00Z'
  }
];

// Initialize with mock data
initialDocuments.forEach(doc => {
  documentStore.set(doc.id, doc);
});

/**
 * Add a document to the knowledge base
 * @param {string} documentId - Document ID
 * @param {string} title - Document title
 * @param {string} content - Document content
 * @param {string} type - Document type
 * @param {Object} metadata - Document metadata
 * @returns {Promise<Object>} Added document
 */
async function addDocument(documentId, title, content, type, metadata = {}) {
  try {
    logger.info(`Adding document to knowledge base: ${documentId} - ${title}`);
    
    const now = new Date().toISOString();
    const document = {
      id: documentId,
      title,
      content,
      type,
      metadata: {
        ...metadata,
        updatedAt: metadata.updatedAt || now
      },
      createdAt: now
    };
    
    // Store document
    documentStore.set(documentId, document);
    
    logger.info(`Document added successfully: ${documentId}`);
    return document;
  } catch (error) {
    logger.error(`Error adding document: ${error.message}`, { error });
    throw new Error(`Failed to add document: ${error.message}`);
  }
}

/**
 * Get all documents, optionally filtered by type, tag, or category
 * @param {string} type - Document type filter
 * @param {string} tag - Document tag filter
 * @param {string} category - Document category filter
 * @returns {Promise<Array>} Array of documents
 */
async function getDocuments(type, tag, category) {
  try {
    logger.info('Getting knowledge base documents', { type, tag, category });
    
    let documents = Array.from(documentStore.values());
    
    // Apply filters if provided
    if (type) {
      documents = documents.filter(doc => doc.type === type);
    }
    
    if (tag) {
      documents = documents.filter(doc => 
        doc.metadata.tags && doc.metadata.tags.includes(tag)
      );
    }
    
    if (category) {
      documents = documents.filter(doc => 
        doc.metadata.category === category
      );
    }
    
    logger.info(`Retrieved ${documents.length} documents`);
    return documents;
  } catch (error) {
    logger.error(`Error getting documents: ${error.message}`, { error });
    throw new Error(`Failed to get documents: ${error.message}`);
  }
}

/**
 * Get a document by ID
 * @param {string} documentId - Document ID
 * @returns {Promise<Object|null>} Document or null if not found
 */
async function getDocumentById(documentId) {
  try {
    logger.info(`Getting document by ID: ${documentId}`);
    
    if (!documentStore.has(documentId)) {
      logger.warn(`Document not found: ${documentId}`);
      return null;
    }
    
    const document = documentStore.get(documentId);
    logger.info(`Retrieved document: ${documentId}`);
    
    return document;
  } catch (error) {
    logger.error(`Error getting document: ${error.message}`, { error });
    throw new Error(`Failed to get document: ${error.message}`);
  }
}

/**
 * Update a document
 * @param {string} documentId - Document ID
 * @param {Object} updates - Document updates
 * @returns {Promise<Object|null>} Updated document or null if not found
 */
async function updateDocument(documentId, updates) {
  try {
    logger.info(`Updating document: ${documentId}`);
    
    if (!documentStore.has(documentId)) {
      logger.warn(`Document not found for update: ${documentId}`);
      return null;
    }
    
    const existingDocument = documentStore.get(documentId);
    const now = new Date().toISOString();
    
    // Create updated document
    const updatedDocument = {
      ...existingDocument,
      ...updates,
      metadata: {
        ...existingDocument.metadata,
        ...(updates.metadata || {}),
        updatedAt: now
      }
    };
    
    // Store updated document
    documentStore.set(documentId, updatedDocument);
    
    logger.info(`Document updated: ${documentId}`);
    return updatedDocument;
  } catch (error) {
    logger.error(`Error updating document: ${error.message}`, { error });
    throw new Error(`Failed to update document: ${error.message}`);
  }
}

/**
 * Delete a document
 * @param {string} documentId - Document ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function deleteDocument(documentId) {
  try {
    logger.info(`Deleting document: ${documentId}`);
    
    if (!documentStore.has(documentId)) {
      logger.warn(`Document not found for deletion: ${documentId}`);
      return false;
    }
    
    // Delete document
    documentStore.delete(documentId);
    
    logger.info(`Document deleted: ${documentId}`);
    return true;
  } catch (error) {
    logger.error(`Error deleting document: ${error.message}`, { error });
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}

/**
 * Check if a document exists
 * @param {string} documentId - Document ID
 * @returns {Promise<boolean>} Whether the document exists
 */
async function documentExists(documentId) {
  try {
    return documentStore.has(documentId);
  } catch (error) {
    logger.error(`Error checking document existence: ${error.message}`, { error });
    throw new Error(`Failed to check document existence: ${error.message}`);
  }
}

module.exports = {
  addDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  documentExists
}; 