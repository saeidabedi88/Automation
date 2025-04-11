/**
 * Error handling utilities
 */

/**
 * Custom API error class
 */
class ApiError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found error (404)
 */
class NotFoundError extends ApiError {
  constructor(message = 'Resource not found', details = null) {
    super(message, 404, details);
  }
}

/**
 * Bad Request error (400)
 */
class BadRequestError extends ApiError {
  constructor(message = 'Bad request', details = null) {
    super(message, 400, details);
  }
}

/**
 * Unauthorized error (401)
 */
class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', details = null) {
    super(message, 401, details);
  }
}

/**
 * Forbidden error (403)
 */
class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden', details = null) {
    super(message, 403, details);
  }
}

/**
 * Internal Server error (500)
 */
class InternalServerError extends ApiError {
  constructor(message = 'Internal server error', details = null) {
    super(message, 500, details);
  }
}

/**
 * Validation error with details
 */
class ValidationError extends BadRequestError {
  constructor(message = 'Validation error', details = null) {
    super(message, details);
  }
}

/**
 * Format error response
 * @param {Error} err - Error object
 * @param {boolean} includeStack - Whether to include stack trace
 * @returns {Object} Formatted error response
 */
function formatErrorResponse(err, includeStack = false) {
  const response = {
    status: 'error',
    message: err.message || 'Unknown error'
  };

  // Add status code if it's an API error
  if (err instanceof ApiError) {
    response.statusCode = err.statusCode;
    
    // Add error details if available
    if (err.details) {
      response.details = err.details;
    }
  } else {
    response.statusCode = 500;
  }

  // Add stack trace in development mode if requested
  if (includeStack && process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  return response;
}

module.exports = {
  ApiError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  InternalServerError,
  ValidationError,
  formatErrorResponse
}; 