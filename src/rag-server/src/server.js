/**
 * RAG Server - Main entry point
 */
const app = require('./app');
const logger = require('./utils/logger');
const ragService = require('./services/ragService');

// Get port from environment variable or use default
const PORT = process.env.PORT || 3003;

// Initialize the server
async function initializeServer() {
  try {
    // Initialize ChromaDB
    await ragService.initializeChroma();
    
    // Start the server
    app.listen(PORT, () => {
      logger.info(`RAG Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error(`Failed to initialize server: ${error.message}`, { error });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`, { error });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled rejection: ${error.message}`, { error });
  process.exit(1);
});

// Start the server
initializeServer(); 