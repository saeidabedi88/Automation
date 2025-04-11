const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const { initDatabases } = require('./models');
const logger = require('./utils/logger');
const queue = require('./utils/queue');

// Load environment variables
dotenv.config();

// Log errors directly to console
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception', error);
  // Exit with failure
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection', reason);
});

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Simplified logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Serve static files from the React build directory
const dashboardBuildPath = path.join(__dirname, '..', '..', 'dashboard', 'build');
app.use(express.static(dashboardBuildPath));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database connections
    const pgStatus = await testPgConnection();
    
    res.json({
      status: 'healthy',
      version: '0.1.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      details: {
        database: pgStatus ? 'connected' : 'error',
        message_queue: queue.connection ? 'connected' : 'error',
        external_services: {
          email_mcp: 'unknown' // Will be updated when we implement monitoring
        }
      }
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.stack });
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// API Routes - these come after static files but before the catch-all route
app.use('/api/emails', require('./routes/emails'));
app.use('/api/responses', require('./routes/responses'));

// Serve React's index.html for any non-API routes (for client-side routing)
app.get('*', function(req, res, next) {
  // Skip if the request is for an API route
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(dashboardBuildPath, 'index.html'));
});

// 404 handler - only for API routes now
app.use((req, res, next) => {
  // Only handle API routes with 404 JSON response
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      status: 'error',
      message: 'Not found'
    });
  } else {
    // For any other routes, we've already handled them with the catch-all route above
    res.status(404).sendFile(path.join(dashboardBuildPath, 'index.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack, {
    component: 'api',
    path: req.path,
    method: req.method
  });
  
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize databases and start server
const PORT = process.env.PORT || 3001;

// Utility function to test PostgreSQL connection
async function testPgConnection() {
  try {
    const { testPgConnection } = require('./utils/db');
    return await testPgConnection();
  } catch (error) {
    logger.error('PostgreSQL connection test failed', { error: error.stack });
    return false;
  }
}

// Initialize databases and message queue before starting the server
async function startServer() {
  try {
    // Initialize databases
    await initDatabases();
    
    // Connect to message queue
    await queue.connect();
    await queue.createChannel();
    
    // Start listening for messages from queues
    await setupQueueConsumers();
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`Conductor MCP running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.stack });
    process.exit(1);
  }
}

// Set up message queue consumers
async function setupQueueConsumers() {
  try {
    // Import email service
    const emailService = require('./services/emailService');
    
    // Consume email received events
    await queue.consume(queue.QUEUES.EMAIL_PROCESSING, async (message) => {
      try {
        logger.info('Received message from EMAIL_PROCESSING queue', { emailId: message.emailId });
        
        // Process the email
        await emailService.processEmail(message.emailId);
      } catch (error) {
        logger.error(`Error processing message from EMAIL_PROCESSING queue`, { error: error.stack, message });
      }
    });
    
    // Consume human review events
    await queue.consume(queue.QUEUES.HUMAN_REVIEW, async (message) => {
      try {
        logger.info('Received message from HUMAN_REVIEW queue', { message });
        
        // This would typically involve notifying the Dashboard about pending reviews
        // For now, we'll just log the message
        logger.info('Human review request received', { 
          emailId: message.emailId,
          responseId: message.responseId,
          taskId: message.taskId
        });
      } catch (error) {
        logger.error(`Error processing message from HUMAN_REVIEW queue`, { error: error.stack, message });
      }
    });
    
    logger.info('Queue consumers set up successfully');
  } catch (error) {
    logger.error('Failed to set up queue consumers', { error: error.stack });
    throw error;
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully.');
  
  try {
    // Close message queue connection
    await queue.close();
    
    // Close database connections
    // This would normally be handled by a database connection manager
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.stack });
    process.exit(1);
  }
});

module.exports = app; 