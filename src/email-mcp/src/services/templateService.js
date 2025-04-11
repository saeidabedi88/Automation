/**
 * Template Service - Manages email response templates
 */
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
const { Pool } = require('pg');

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/template-service-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/template-service-combined.log' })
  ]
});

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.POSTGRES_URI,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Template cache to avoid frequent database access
let templateCache = {};
let lastCacheRefresh = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get templates for a specific intent
 * @param {string} intent - The email intent
 * @returns {Promise<Array>} Array of templates for the intent
 */
async function getTemplatesForIntent(intent) {
  try {
    // Check if cache needs refresh
    if (Date.now() - lastCacheRefresh > CACHE_TTL) {
      await refreshTemplateCache();
    }
    
    // Return templates for the intent, or empty array if none found
    return templateCache[intent] || [];
  } catch (error) {
    logger.error(`Error getting templates for intent ${intent}: ${error.message}`);
    return []; // Return empty array instead of failing
  }
}

/**
 * Refresh the template cache from the database
 * @returns {Promise<void>}
 */
async function refreshTemplateCache() {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, intent, purpose, content, created_at, updated_at FROM templates'
      );
      
      // Reset cache
      const newCache = {};
      
      // Group templates by intent
      result.rows.forEach(template => {
        if (!newCache[template.intent]) {
          newCache[template.intent] = [];
        }
        
        newCache[template.intent].push({
          id: template.id,
          purpose: template.purpose,
          content: template.content,
          created_at: template.created_at,
          updated_at: template.updated_at
        });
      });
      
      // Update cache and timestamp
      templateCache = newCache;
      lastCacheRefresh = Date.now();
      
      logger.info(`Template cache refreshed with ${result.rows.length} templates`);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error(`Error refreshing template cache: ${error.message}`);
    throw new Error(`Failed to refresh template cache: ${error.message}`);
  }
}

/**
 * Create a new template
 * @param {Object} templateData - Template data
 * @returns {Promise<Object>} Created template
 */
async function createTemplate(templateData) {
  try {
    const { intent, purpose, content } = templateData;
    
    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO templates (intent, purpose, content) VALUES ($1, $2, $3) RETURNING *',
        [intent, purpose, content]
      );
      
      const newTemplate = result.rows[0];
      
      // Update cache
      if (!templateCache[intent]) {
        templateCache[intent] = [];
      }
      
      templateCache[intent].push({
        id: newTemplate.id,
        purpose: newTemplate.purpose,
        content: newTemplate.content,
        created_at: newTemplate.created_at,
        updated_at: newTemplate.updated_at
      });
      
      logger.info(`Created new template for intent ${intent}`);
      return newTemplate;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error(`Error creating template: ${error.message}`);
    throw new Error(`Failed to create template: ${error.message}`);
  }
}

/**
 * Update an existing template
 * @param {string} id - Template ID
 * @param {Object} templateData - Updated template data
 * @returns {Promise<Object>} Updated template
 */
async function updateTemplate(id, templateData) {
  try {
    const { intent, purpose, content } = templateData;
    
    const client = await pool.connect();
    try {
      const result = await client.query(
        'UPDATE templates SET intent = $1, purpose = $2, content = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
        [intent, purpose, content, id]
      );
      
      if (result.rows.length === 0) {
        throw new Error(`Template with ID ${id} not found`);
      }
      
      // Force cache refresh
      await refreshTemplateCache();
      
      logger.info(`Updated template ${id}`);
      return result.rows[0];
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error(`Error updating template ${id}: ${error.message}`);
    throw new Error(`Failed to update template: ${error.message}`);
  }
}

/**
 * Delete a template
 * @param {string} id - Template ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteTemplate(id) {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM templates WHERE id = $1 RETURNING id',
        [id]
      );
      
      if (result.rows.length === 0) {
        throw new Error(`Template with ID ${id} not found`);
      }
      
      // Force cache refresh
      await refreshTemplateCache();
      
      logger.info(`Deleted template ${id}`);
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error(`Error deleting template ${id}: ${error.message}`);
    throw new Error(`Failed to delete template: ${error.message}`);
  }
}

/**
 * Load initial templates from a JSON file
 * @param {string} filePath - Path to the template JSON file
 * @returns {Promise<number>} Number of templates loaded
 */
async function loadInitialTemplates(filePath) {
  try {
    // Read and parse the template file
    const templateData = await fs.readFile(filePath, 'utf8');
    const templates = JSON.parse(templateData);
    
    // Connect to the database
    const client = await pool.connect();
    try {
      let loadedCount = 0;
      
      // Insert templates if they don't exist
      for (const template of templates) {
        const { intent, purpose, content } = template;
        
        // Check if a similar template exists
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
          
          loadedCount++;
        }
      }
      
      // Refresh the cache
      await refreshTemplateCache();
      
      logger.info(`Loaded ${loadedCount} initial templates`);
      return loadedCount;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error(`Error loading initial templates: ${error.message}`);
    throw new Error(`Failed to load initial templates: ${error.message}`);
  }
}

/**
 * Get all templates
 * @returns {Promise<Array>} All templates
 */
async function getAllTemplates() {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, intent, purpose, content, created_at, updated_at FROM templates ORDER BY intent, purpose'
      );
      
      logger.info(`Retrieved ${result.rows.length} templates`);
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error(`Error getting all templates: ${error.message}`);
    throw new Error(`Failed to get templates: ${error.message}`);
  }
}

// Initialize on startup to ensure templates are available
(async () => {
  try {
    // Check if initial template file exists and load if needed
    const initialTemplateFile = path.join(__dirname, '../config/initial-templates.json');
    try {
      await fs.access(initialTemplateFile);
      await loadInitialTemplates(initialTemplateFile);
    } catch (fileError) {
      logger.info('No initial template file found, skipping template preloading');
    }
    
    // Ensure cache is loaded
    await refreshTemplateCache();
  } catch (error) {
    logger.error(`Template service initialization error: ${error.message}`);
  }
})();

module.exports = {
  getTemplatesForIntent,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getAllTemplates,
  refreshTemplateCache
}; 