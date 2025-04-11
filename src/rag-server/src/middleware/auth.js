/**
 * Authentication middleware
 */
const logger = require('../utils/logger');
const { UnauthorizedError } = require('../utils/errors');
const config = require('../config');

/**
 * API key authentication middleware
 * Validates the 'x-api-key' header against the configured API key
 */
function apiKeyAuth(req, res, next) {
  try {
    // Skip auth in development mode when mock data is used
    if (config.server.env === 'development' && config.features.useMockData) {
      return next();
    }

    // Check if API key is configured
    if (!config.security.apiKeySecret) {
      logger.warn('API key authentication is not configured');
      return next();
    }

    // Get API key from header
    const apiKey = req.headers['x-api-key'];
    
    // Validate API key
    if (!apiKey || apiKey !== config.security.apiKeySecret) {
      logger.warn('Invalid API key provided');
      throw new UnauthorizedError('Invalid API key');
    }

    // API key is valid
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  apiKeyAuth
}; 