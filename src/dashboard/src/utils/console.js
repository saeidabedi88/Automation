/**
 * Custom console utilities for better debugging
 */

// Define log levels
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Current log level based on environment
const currentLogLevel = process.env.NODE_ENV === 'production' 
  ? LogLevel.WARN 
  : (process.env.REACT_APP_LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO);

/**
 * Custom logger with control over log levels
 */
const logger = {
  debug: (message, ...args) => {
    if (currentLogLevel <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
  
  info: (message, ...args) => {
    if (currentLogLevel <= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  
  warn: (message, ...args) => {
    if (currentLogLevel <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  
  error: (message, ...args) => {
    if (currentLogLevel <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
  
  // Group logs for better readability
  group: (title, fn, collapsed = false) => {
    if (collapsed) {
      console.groupCollapsed(title);
    } else {
      console.group(title);
    }
    
    try {
      fn();
    } finally {
      console.groupEnd();
    }
  },
  
  // Log an object with a title
  object: (title, obj) => {
    if (currentLogLevel <= LogLevel.DEBUG) {
      console.groupCollapsed(title);
      console.dir(obj);
      console.groupEnd();
    }
  }
};

export default logger; 