const amqp = require('amqplib');
const winston = require('winston');

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/queue-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/queue-combined.log' })
  ]
});

// Queue names
const QUEUES = {
  EMAIL_PROCESSING: 'email_processing',
  RESPONSE_GENERATION: 'response_generation',
  HUMAN_REVIEW: 'human_review',
  NOTIFICATIONS: 'notifications'
};

// Exchange names
const EXCHANGES = {
  EMAIL_EVENTS: 'email_events',
  SYSTEM_EVENTS: 'system_events'
};

// Routing keys
const ROUTING_KEYS = {
  EMAIL_RECEIVED: 'email.received',
  EMAIL_PROCESSED: 'email.processed',
  RESPONSE_GENERATED: 'response.generated',
  RESPONSE_APPROVED: 'response.approved',
  RESPONSE_SENT: 'response.sent',
  SYSTEM_ERROR: 'system.error',
  SYSTEM_WARNING: 'system.warning'
};

let connection = null;
let channel = null;

// Connect to RabbitMQ
const connect = async () => {
  try {
    if (connection) return connection;
    
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    logger.info('Connected to RabbitMQ');
    
    // Handle connection close
    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      connection = null;
      setTimeout(connect, 5000);
    });
    
    // Handle connection error
    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error:', err);
      connection = null;
    });
    
    return connection;
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
};

// Create a channel
const createChannel = async () => {
  try {
    if (channel) return channel;
    
    const conn = await connect();
    channel = await conn.createChannel();
    logger.info('Created RabbitMQ channel');
    
    // Set up exchanges
    await channel.assertExchange(EXCHANGES.EMAIL_EVENTS, 'topic', { durable: true });
    await channel.assertExchange(EXCHANGES.SYSTEM_EVENTS, 'topic', { durable: true });
    
    // Set up queues
    await channel.assertQueue(QUEUES.EMAIL_PROCESSING, { durable: true });
    await channel.assertQueue(QUEUES.RESPONSE_GENERATION, { durable: true });
    await channel.assertQueue(QUEUES.HUMAN_REVIEW, { durable: true });
    await channel.assertQueue(QUEUES.NOTIFICATIONS, { durable: true });
    
    // Bind queues to exchanges
    await channel.bindQueue(QUEUES.EMAIL_PROCESSING, EXCHANGES.EMAIL_EVENTS, ROUTING_KEYS.EMAIL_RECEIVED);
    await channel.bindQueue(QUEUES.RESPONSE_GENERATION, EXCHANGES.EMAIL_EVENTS, ROUTING_KEYS.EMAIL_PROCESSED);
    await channel.bindQueue(QUEUES.HUMAN_REVIEW, EXCHANGES.EMAIL_EVENTS, ROUTING_KEYS.RESPONSE_GENERATED);
    await channel.bindQueue(QUEUES.NOTIFICATIONS, EXCHANGES.SYSTEM_EVENTS, '#');
    
    // Handle channel close
    channel.on('close', () => {
      logger.warn('RabbitMQ channel closed');
      channel = null;
    });
    
    return channel;
  } catch (error) {
    logger.error('Failed to create RabbitMQ channel:', error);
    throw error;
  }
};

// Publish a message to an exchange
const publish = async (exchange, routingKey, message) => {
  try {
    const ch = await createChannel();
    const messageBuffer = Buffer.from(JSON.stringify(message));
    ch.publish(exchange, routingKey, messageBuffer, {
      persistent: true,
      contentType: 'application/json'
    });
    logger.info(`Published message to ${exchange} with routing key ${routingKey}`);
    return true;
  } catch (error) {
    logger.error(`Failed to publish message to ${exchange} with routing key ${routingKey}:`, error);
    throw error;
  }
};

// Send a message directly to a queue
const sendToQueue = async (queue, message) => {
  try {
    const ch = await createChannel();
    const messageBuffer = Buffer.from(JSON.stringify(message));
    ch.sendToQueue(queue, messageBuffer, {
      persistent: true,
      contentType: 'application/json'
    });
    logger.info(`Sent message to queue ${queue}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send message to queue ${queue}:`, error);
    throw error;
  }
};

// Consume messages from a queue
const consume = async (queue, callback) => {
  try {
    const ch = await createChannel();
    await ch.prefetch(1);
    
    await ch.consume(queue, async (msg) => {
      if (!msg) return;
      
      try {
        const content = JSON.parse(msg.content.toString());
        await callback(content, msg);
        ch.ack(msg);
      } catch (error) {
        logger.error(`Error processing message from queue ${queue}:`, error);
        ch.nack(msg, false, false);
      }
    });
    
    logger.info(`Consuming messages from queue ${queue}`);
    return true;
  } catch (error) {
    logger.error(`Failed to consume messages from queue ${queue}:`, error);
    throw error;
  }
};

// Close connection
const close = async () => {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    
    if (connection) {
      await connection.close();
      connection = null;
    }
    
    logger.info('Closed RabbitMQ connection');
    return true;
  } catch (error) {
    logger.error('Failed to close RabbitMQ connection:', error);
    throw error;
  }
};

module.exports = {
  connect,
  createChannel,
  publish,
  sendToQueue,
  consume,
  close,
  QUEUES,
  EXCHANGES,
  ROUTING_KEYS
}; 