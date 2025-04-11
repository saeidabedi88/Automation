#!/usr/bin/env node

/**
 * Database initialization script for Email MCP
 * Loads schema from init.sql and seed data from initial-templates.json
 */

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.POSTGRES_URI,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Initialize database with schema from SQL file
 */
async function initializeSchema() {
  try {
    console.log('Reading SQL schema file...');
    const sqlFilePath = path.resolve(__dirname, 'init.sql');
    const sqlScript = await fs.readFile(sqlFilePath, 'utf8');
    
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    try {
      console.log('Executing schema SQL...');
      await client.query(sqlScript);
      console.log('Schema created successfully!');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error initializing schema:', error.message);
    throw error;
  }
}

/**
 * Load initial templates from JSON file
 */
async function loadInitialTemplates() {
  try {
    console.log('Reading templates file...');
    const templatesFilePath = path.resolve(__dirname, '../config/initial-templates.json');
    const templatesData = await fs.readFile(templatesFilePath, 'utf8');
    const templates = JSON.parse(templatesData);
    
    console.log(`Found ${templates.length} templates to load`);
    
    const client = await pool.connect();
    try {
      let insertedCount = 0;
      let skippedCount = 0;
      
      // Begin transaction
      await client.query('BEGIN');
      
      for (const template of templates) {
        const { intent, purpose, content } = template;
        
        // Check if similar template exists
        const existingResult = await client.query(
          'SELECT id FROM templates WHERE intent = $1 AND purpose = $2',
          [intent, purpose]
        );
        
        if (existingResult.rows.length === 0) {
          // Insert new template
          await client.query(
            'INSERT INTO templates (intent, purpose, content) VALUES ($1, $2, $3)',
            [intent, purpose, content]
          );
          insertedCount++;
        } else {
          skippedCount++;
        }
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log(`Templates loaded: ${insertedCount} inserted, ${skippedCount} skipped (already exist)`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error loading templates:', error.message);
    throw error;
  }
}

/**
 * Main function to run initialization
 */
async function initializeDatabase() {
  try {
    console.log('Starting database initialization...');
    
    // Initialize schema
    await initializeSchema();
    
    // Load templates
    await loadInitialTemplates();
    
    console.log('Database initialization completed successfully!');
    
    // Close pool
    await pool.end();
    
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase(); 