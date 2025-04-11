/**
 * Database connection utility
 */
const { MongoClient } = require('mongodb');
const logger = require('./logger');

// MongoDB connection URI from environment variables
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/email-rag';

// MongoDB client instance
let client = null;
let db = null;
let isConnected = false;

/**
 * Connect to MongoDB
 * @returns {Promise<Object>} MongoDB client
 */
async function connect() {
  try {
    if (isConnected && db) {
      return db;
    }

    // Create MongoDB client
    client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Connect to MongoDB
    await client.connect();
    db = client.db();
    isConnected = true;

    logger.info('Connected to MongoDB successfully');
    return db;
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`, { error });
    throw new Error(`Failed to connect to MongoDB: ${error.message}`);
  }
}

/**
 * Disconnect from MongoDB
 * @returns {Promise<void>}
 */
async function disconnect() {
  try {
    if (client) {
      await client.close();
      isConnected = false;
      client = null;
      db = null;
      logger.info('Disconnected from MongoDB');
    }
  } catch (error) {
    logger.error(`MongoDB disconnect error: ${error.message}`, { error });
  }
}

/**
 * Get MongoDB database instance
 * @returns {Promise<Object>} MongoDB database
 */
async function getDb() {
  if (!isConnected || !db) {
    return connect();
  }
  return db;
}

/**
 * Check MongoDB connection
 * @returns {Promise<boolean>} Whether connected to MongoDB
 */
async function isDbConnected() {
  try {
    if (!client) {
      return false;
    }
    
    // Check connection with a simple command
    await client.db().command({ ping: 1 });
    return true;
  } catch (error) {
    logger.error(`MongoDB connection check failed: ${error.message}`);
    return false;
  }
}

// Export functions
module.exports = {
  connect,
  disconnect,
  getDb,
  isConnected: isDbConnected
}; 