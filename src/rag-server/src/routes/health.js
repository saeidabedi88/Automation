/**
 * Health Check Routes - API endpoints for monitoring service health
 */
const express = require('express');
const logger = require('../utils/logger');
const ragService = require('../services/ragService');

const router = express.Router();

/**
 * @route GET /api/health
 * @description Get health status of the RAG server
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    // Check if ChromaDB is initialized
    const isChromaInitialized = await ragService.initializeChroma();
    
    // Add additional health checks here as needed
    const healthStatus = {
      status: isChromaInitialized ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      components: {
        database: {
          status: isChromaInitialized ? 'healthy' : 'degraded',
          name: 'ChromaDB',
          message: isChromaInitialized ? 'Connected' : 'Connection issues detected'
        },
        api: {
          status: 'healthy'
        }
      }
    };
    
    logger.info('Health check performed', { result: healthStatus.status });
    
    // Send appropriate status code based on health
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    return res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error(`Error during health check: ${error.message}`, { error });
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Failed to perform health check',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 