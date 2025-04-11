const { connectMongo, pgPool, testPgConnection } = require('../utils/db');
const fs = require('fs');
const path = require('path');

// MongoDB models
const Log = require('./mongo/Log');
const Analytics = require('./mongo/Analytics');

// Export MongoDB models
const mongoModels = {
  Log,
  Analytics
};

// Function to initialize database connections
const initDatabases = async () => {
  // Connect to MongoDB
  await connectMongo();
  
  // Test PostgreSQL connection
  await testPgConnection();
  
  // Initialize PostgreSQL tables if needed
  // This would typically be handled by a migration tool in production
  if (process.env.NODE_ENV === 'development') {
    try {
      const sqlPath = path.join(__dirname, 'sql', 'init.sql');
      const initSQL = fs.readFileSync(sqlPath, 'utf8');
      
      const client = await pgPool.connect();
      await client.query(initSQL);
      console.log('PostgreSQL tables initialized');
      client.release();
    } catch (error) {
      console.error('Error initializing PostgreSQL tables:', error);
    }
  }
};

// PostgreSQL query helpers
const pgQuery = async (text, params) => {
  const start = Date.now();
  const res = await pgPool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
};

module.exports = {
  mongoModels,
  pgQuery,
  initDatabases
}; 