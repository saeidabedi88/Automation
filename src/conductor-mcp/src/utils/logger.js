const winston = require('winston');
const { mongoModels } = require('../models');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Create format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Create format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.json(),
);

// Custom MongoDB transport
const MongoTransport = winston.transports.MongoDB = class MongoTransport extends winston.Transport {
  constructor(options) {
    super(options);
    this.name = 'mongodb';
    this.level = options.level || 'info';
  }

  log(info, callback) {
    // Only log to MongoDB if it's available
    if (mongoModels && mongoModels.Log) {
      setImmediate(() => {
        // Create a new log entry
        const logEntry = new mongoModels.Log({
          level: info.level,
          message: info.message,
          source: 'conductor',
          component: info.component || 'general',
          metadata: info.metadata || {},
          actor: info.actor || 'system',
          emailId: info.emailId || null,
          taskId: info.taskId || null,
          ip: info.ip || null
        });

        // Save log entry to database
        logEntry.save()
          .then(() => {
            // Successfully saved log entry
            if (callback) callback(null, true);
          })
          .catch((error) => {
            // Error saving log entry
            console.error('Error saving log to MongoDB:', error);
            if (callback) callback(error);
          });
      });
    } else {
      // MongoDB not available
      if (callback) callback(null, true);
    }
  }
};

// Create winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
    
    // File transports
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: fileFormat,
    }),
    
    // MongoDB transport (will be skipped if MongoDB is not available)
    new MongoTransport({
      level: 'info',
    }),
  ],
});

// Wrapper for adding extra metadata to logs
const logWithMetadata = (level, message, metadata = {}) => {
  logger.log({
    level,
    message,
    ...metadata,
  });
};

// Export methods
module.exports = {
  error: (message, metadata) => logWithMetadata('error', message, metadata),
  warn: (message, metadata) => logWithMetadata('warn', message, metadata),
  info: (message, metadata) => logWithMetadata('info', message, metadata),
  http: (message, metadata) => logWithMetadata('http', message, metadata),
  debug: (message, metadata) => logWithMetadata('debug', message, metadata),
  
  // Original logger for direct access if needed
  logger,
}; 