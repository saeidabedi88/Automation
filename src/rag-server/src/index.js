/**
 * RAG Server - Main entry point
 * This server provides endpoints for retrieving contextual information
 * using Retrieval Augmented Generation (RAG) for the Email MCP system.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');
const { formatErrorResponse } = require('./utils/errors');
const { apiKeyAuth } = require('./middleware/auth');

// Setup logs directory
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Initialize Express app
const app = express();
const PORT = config.server.port;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Authentication middleware
app.use('/api', apiKeyAuth);

// Import routes
const ragRoutes = require('./routes/rag');
const knowledgeRoutes = require('./routes/knowledge');

// API routes
app.use('/api/rag', ragRoutes);
app.use('/api/knowledge', knowledgeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'RAG server is healthy',
    version: process.env.npm_package_version || '0.1.0',
    environment: config.server.env,
    mockData: config.features.useMockData ? 'enabled' : 'disabled'
  });
});

// 404 handler
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Error handling middleware
app.use((err, req, res, next) => {
  const includeStack = config.server.env !== 'production';
  const errorResponse = formatErrorResponse(err, includeStack);
  
  logger.error(`Error: ${err.message}`, { 
    error: err,
    path: req.path,
    method: req.method
  });
  
  res.status(errorResponse.statusCode || 500).json(errorResponse);
});

// Start server
app.listen(PORT, () => {
  logger.info(`RAG server listening on port ${PORT}`);
  logger.info(`Environment: ${config.server.env}`);
  logger.info(`Mock data mode: ${config.features.useMockData ? 'enabled' : 'disabled'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app; 