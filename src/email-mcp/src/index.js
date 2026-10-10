const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const winston = require('winston');
const { Pool } = require('pg');
const amqp = require('amqplib');

// Load environment variables
dotenv.config();

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/email-mcp-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/email-mcp-combined.log' })
  ]
});

// Import services
const emailService = require('./services/emailService');
const llmService = require('./services/llmService');
const templateService = require('./services/templateService');
const processingService = require('./services/processingService');
const accountService = require('./services/accountService');
const calendarService = require('./services/calendarService');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = await checkPostgresConnection();
    
    // Check OpenAI API status
    const llmStatus = await llmService.checkApiStatus();
    
    // Check email service connections
    const emailConnections = await emailService.checkConnections();
    
    res.json({
      status: 'healthy',
      version: '0.1.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      details: {
        database: dbStatus ? 'connected' : 'error',
        message_queue: process.mqChannel ? 'connected' : 'not connected',
        external_services: {
          llm_api: llmStatus ? 'connected' : 'error',
          email_server: emailConnections.smtp
        }
      }
    });
  } catch (error) {
    logger.error(`Health check error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Routes
app.use('/api/emails', require('./routes/emails'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/inbox', require('./routes/inbox'));
app.use('/api/calendar', require('./routes/calendar'));

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Database and message queue connections
let pool;
process.mqChannel = null;
process.mqConnection = null;

// Check PostgreSQL connection
async function checkPostgresConnection() {
  try {
    if (!pool) {
      pool = new Pool({
        connectionString: process.env.POSTGRES_URI,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
    }
    
    const client = await pool.connect();
    try {
      await client.query('SELECT NOW()');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error(`Database connection error: ${error.message}`);
    return false;
  }
}

// Set up RabbitMQ connection and consumers
async function setupMessageQueue() {
  try {
    // Connect to RabbitMQ
    process.mqConnection = await amqp.connect(process.env.RABBITMQ_URI);
    process.mqChannel = await process.mqConnection.createChannel();
    
    // Set up exchanges and queues
    const EXCHANGE_NAME = process.env.EMAIL_EXCHANGE || 'email_exchange';
    const INCOMING_QUEUE = process.env.INCOMING_EMAIL_QUEUE || 'incoming_emails';
    
    await process.mqChannel.assertExchange(EXCHANGE_NAME, 'direct', { durable: true });
    await process.mqChannel.assertQueue(INCOMING_QUEUE, { durable: true });
    await process.mqChannel.bindQueue(INCOMING_QUEUE, EXCHANGE_NAME, 'incoming');
    
    // Set up consumer for incoming emails from Conductor MCP
    process.mqChannel.consume(INCOMING_QUEUE, async (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          logger.info(`Received message: ${content.event} for email ${content.email_id}`);
          
          if (content.event === 'email_classified') {
            // Process the classified email
            const { email_id, classification, email_data } = content;
            
            await processingService.processEmail(email_data, classification);
            
            logger.info(`Processed email ${email_id} with intent ${classification.intent}`);
          }
          
          // Acknowledge the message
          process.mqChannel.ack(msg);
        } catch (error) {
          logger.error(`Error processing message: ${error.message}`);
          // Reject the message and requeue
          process.mqChannel.nack(msg, false, true);
        }
      }
    }, { noAck: false });
    
    logger.info('Message queue consumers set up successfully');
    return true;
  } catch (error) {
    logger.error(`Message queue setup error: ${error.message}`);
    return false;
  }
}

// Initialize database and message queue, then start server
async function startServer() {
  try {
    // Check database connection
    const dbConnected = await checkPostgresConnection();
    if (!dbConnected) {
      logger.warn('Database connection failed, retrying in 5 seconds...');
      setTimeout(startServer, 5000);
      return;
    }
    
    // Set up message queue
    const mqConnected = await setupMessageQueue();
    if (!mqConnected) {
      logger.warn('Message queue connection failed, retrying in 5 seconds...');
      setTimeout(startServer, 5000);
      return;
    }
    
    // Start server
    const PORT = process.env.PORT || 3002;
    app.listen(PORT, () => {
      logger.info(`Email MCP running on port ${PORT}`);

      // Seed connected accounts from env when none are stored yet
      try {
        accountService.seedFromEnvIfEmpty();
      } catch (seedError) {
        logger.warn(`Account seed skipped: ${seedError.message}`);
      }
      
      // Start email polling if IMAP is configured
      if (process.env.ENABLE_EMAIL_POLLING === 'true') {
        logger.info('Email polling enabled, initializing...');
        emailService.startEmailPolling(async (email) => {
          try {
            logger.info(`New email received: ${email.id} - ${email.subject}`);
            
            // Save email to database
            // This would normally be handled by a dedicated repository layer
            const client = await pool.connect();
            try {
              const result = await client.query(
                'INSERT INTO emails (email_id, subject, sender, received_at, body, metadata) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                [email.id, email.subject, email.from, email.date, email.text, JSON.stringify({ 
                  html: email.html,
                  attachments: email.attachments 
                })]
              );
              const dbId = result.rows[0].id;
              
              // Send message to Conductor MCP for processing
              await process.mqChannel.publish(
                process.env.EMAIL_EXCHANGE || 'email_exchange',
                'incoming',
                Buffer.from(JSON.stringify({
                  event: 'new_email',
                  email_id: dbId,
                  email_data: {
                    message_id: email.id,
                    subject: email.subject,
                    sender: email.from,
                    received_at: email.date,
                    body: email.text
                  }
                }))
              );
              
              logger.info(`Email ${dbId} sent to processing queue`);
            } finally {
              client.release();
            }
          } catch (error) {
            logger.error(`Error processing incoming email: ${error.message}`);
          }
        }, parseInt(process.env.EMAIL_POLL_INTERVAL || '60000', 10));
      }

      // Periodically sync calendars and log due reminders
      const calendarInterval = parseInt(process.env.CALENDAR_SYNC_INTERVAL || '300000', 10);
      setInterval(async () => {
        try {
          await calendarService.syncAllSources();
          const reminders = calendarService.getDueReminders({ lookAheadMinutes: 120 });
          reminders.forEach((reminder) => {
            logger.info(`Calendar reminder: ${reminder.message}`);
          });
        } catch (calError) {
          logger.warn(`Calendar sync/reminder cycle failed: ${calError.message}`);
        }
      }, calendarInterval);
    });
  } catch (error) {
    logger.error(`Server startup error: ${error.message}`);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully.');
  
  // Close database connections
  if (pool) {
    await pool.end();
  }
  
  // Close message queue connection
  if (process.mqChannel) {
    await process.mqChannel.close();
  }
  
  if (process.mqConnection) {
    await process.mqConnection.close();
  }
  
  process.exit(0);
});

module.exports = app; 