const { Pool } = require('pg');
const mongoose = require('mongoose');
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
    new winston.transports.File({ filename: 'logs/db-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/db-combined.log' })
  ]
});

// PostgreSQL connection
const pgPool = new Pool({
  connectionString: process.env.POSTGRES_URI,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pgPool.on('error', (err) => {
  logger.error('PostgreSQL connection error:', err);
});

// MongoDB connection
const connectMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('MongoDB connected');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test PostgreSQL connection
const testPgConnection = async () => {
  try {
    const client = await pgPool.connect();
    logger.info('PostgreSQL connected');
    client.release();
    return true;
  } catch (error) {
    logger.error('PostgreSQL connection test failed:', error);
    return false;
  }
};

module.exports = {
  pgPool,
  connectMongo,
  testPgConnection,
  mongo: mongoose,
}; 