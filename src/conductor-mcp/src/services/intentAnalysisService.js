const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { pgQuery } = require('../models');
const logger = require('../utils/logger');
const { OpenAI } = require('openai');
const NodeCache = require('node-cache');

/**
 * Service for analyzing email intent and classifying risk levels
 * Enhanced with OpenAI LLM for improved accuracy
 */
class IntentAnalysisService {
  constructor() {
    this.emailMcpUrl = process.env.EMAIL_MCP_URL;
    
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Initialize cache for classification results
    // TTL: 1 hour, check period: 10 minutes
    this.cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
    
    // Model configuration
    this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo';
    this.maxTokens = 150;
    this.temperature = 0.3; // Low temperature for more deterministic results
    
    // Valid intents and risk levels for validation
    this.validIntents = ['support', 'inquiry', 'complaint', 'feedback', 'order', 'partnership', 'other'];
    this.validRiskLevels = ['low', 'medium', 'high'];
  }

  /**
   * Analyze email intent and classify risk level using LLM
   * @param {Object} email - The email object
   * @returns {Object} - Classification result
   */
  async analyzeIntent(email) {
    try {
      logger.info(`Analyzing intent for email: ${email.id}`);
      
      // Check cache first
      const cacheKey = `classification_${email.id}`;
      const cachedResult = this.cache.get(cacheKey);
      
      if (cachedResult) {
        logger.info(`Using cached classification for email: ${email.id}`);
        return cachedResult;
      }
      
      // Extract email content
      const subject = email.subject || '';
      const content = email.content_text || '';
      const from = email.from_address || '';
      
      // Try LLM classification first
      try {
        const llmClassification = await this.classifyWithLLM(subject, content, from);
        
        // Create classification result with LLM data
        const classification = {
          id: uuidv4(),
          email_id: email.id,
          intent: llmClassification.intent,
          risk_level: llmClassification.risk_level,
          confidence: llmClassification.confidence,
          metadata: {
            keywords: this.extractKeywords(content),
            analysis_timestamp: new Date().toISOString(),
            analysis_method: 'llm',
            model_used: this.model,
            ...llmClassification.additional_info
          }
        };
        
        // Save classification to database
        await this.saveClassification(classification);
        
        // Cache the result
        this.cache.set(cacheKey, classification);
        
        logger.info(`Email ${email.id} classified by LLM as ${classification.intent} with risk level ${classification.risk_level}`);
        
        return classification;
      } catch (llmError) {
        // Log LLM error
        logger.error(`LLM classification failed for email ${email.id}:`, llmError);
        logger.info(`Falling back to rule-based classification for email ${email.id}`);
        
        // Fall back to rule-based classification
        return this.fallbackClassification(email);
      }
    } catch (error) {
      logger.error(`Error analyzing intent for email ${email.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Classify email using OpenAI LLM
   * @param {string} subject - Email subject
   * @param {string} content - Email content
   * @param {string} from - Sender email
   * @returns {Object} - Classification data
   */
  async classifyWithLLM(subject, content, from) {
    try {
      // Prepare content for classification - limit size to avoid token limits
      const truncatedContent = content.length > 1500 ? content.substring(0, 1500) + '...' : content;
      
      // Create system prompt for classification
      const systemPrompt = `
        You are an email intent classification system. Analyze the email provided and determine:
        1. The primary intent of the email
        2. The risk level associated with the email
        
        Classify the intent as one of the following:
        - support: Technical support requests or help with existing products/services
        - inquiry: Questions about products, services, or pricing
        - complaint: Expressions of dissatisfaction or reporting problems
        - feedback: General comments, suggestions, or praise
        - order: Related to placing, modifying, or tracking orders
        - partnership: Business partnership proposals or vendor communications
        - other: Any intent not fitting the above categories
        
        Assess the risk level as:
        - low: Routine emails that can be safely auto-processed
        - medium: Emails requiring some care but suitable for automated handling
        - high: Complex, sensitive, urgent, or legal communications requiring human review
        
        Provide your analysis in JSON format with the following fields:
        - intent: the classified intent (one of the categories above)
        - risk_level: the risk assessment (low, medium, or high)
        - confidence: your confidence in this classification (0.0 to 1.0)
        - explanation: brief explanation of your reasoning
        - key_topics: array of 1-5 key topics detected in the email
      `;
      
      const userPrompt = `
        Email Subject: ${subject}
        
        From: ${from}
        
        Email Content:
        ${truncatedContent}
      `;
      
      // Call OpenAI API
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        response_format: { type: 'json_object' }
      });
      
      // Parse response
      const responseContent = response.choices[0].message.content;
      const classification = JSON.parse(responseContent);
      
      // Validate and sanitize the result
      return this.validateClassification(classification);
    } catch (error) {
      logger.error('Error in LLM classification:', error);
      throw new Error(`LLM classification failed: ${error.message}`);
    }
  }
  
  /**
   * Validate and sanitize the LLM classification result
   * @param {Object} classification - Raw classification from LLM
   * @returns {Object} - Validated classification
   */
  validateClassification(classification) {
    // Check if all required fields are present
    const requiredFields = ['intent', 'risk_level', 'confidence'];
    for (const field of requiredFields) {
      if (!classification[field]) {
        throw new Error(`Missing required field in LLM response: ${field}`);
      }
    }
    
    // Sanitize intent
    let intent = classification.intent.toLowerCase();
    if (!this.validIntents.includes(intent)) {
      logger.warn(`Invalid intent from LLM: ${intent}, defaulting to 'other'`);
      intent = 'other';
    }
    
    // Sanitize risk level
    let riskLevel = classification.risk_level.toLowerCase();
    if (!this.validRiskLevels.includes(riskLevel)) {
      logger.warn(`Invalid risk level from LLM: ${riskLevel}, defaulting to 'medium'`);
      riskLevel = 'medium';
    }
    
    // Sanitize confidence
    let confidence = parseFloat(classification.confidence);
    if (isNaN(confidence) || confidence < 0 || confidence > 1) {
      logger.warn(`Invalid confidence from LLM: ${classification.confidence}, defaulting to 0.7`);
      confidence = 0.7;
    }
    
    // Return cleaned classification
    return {
      intent,
      risk_level: riskLevel,
      confidence,
      additional_info: {
        explanation: classification.explanation || 'No explanation provided',
        key_topics: Array.isArray(classification.key_topics) ? classification.key_topics : []
      }
    };
  }
  
  /**
   * Fall back to rule-based classification when LLM fails
   * @param {Object} email - The email object
   * @returns {Object} - Classification result
   */
  async fallbackClassification(email) {
    try {
      const subject = (email.subject || '').toLowerCase();
      const content = (email.content_text || '').toLowerCase();
      const from = (email.from_address || '').toLowerCase();
      
      // Intent classification (simplified example)
      let intent = 'other';
      if (content.includes('help') || content.includes('support') || subject.includes('help')) {
        intent = 'support';
      } else if (content.includes('buy') || content.includes('price') || content.includes('purchase')) {
        intent = 'inquiry';
      } else if (content.includes('problem') || content.includes('issue') || content.includes('not working')) {
        intent = 'complaint';
      } else if (content.includes('thank') || content.includes('love') || content.includes('great')) {
        intent = 'feedback';
      } else if (content.includes('order') || content.includes('shipping') || content.includes('delivery')) {
        intent = 'order';
      } else if (content.includes('partner') || content.includes('collaborate') || content.includes('business opportunity')) {
        intent = 'partnership';
      }
      
      // Risk level assessment (simplified example)
      let riskLevel = 'low';
      
      // Higher risk if it's a complaint
      if (intent === 'complaint') {
        riskLevel = 'medium';
      }
      
      // Higher risk if it contains urgent language
      if (
        content.includes('urgent') || 
        content.includes('immediately') || 
        content.includes('asap') ||
        subject.includes('urgent')
      ) {
        riskLevel = 'high';
      }
      
      // Higher risk if it mentions legal terms
      if (
        content.includes('lawyer') || 
        content.includes('legal') || 
        content.includes('attorney') ||
        content.includes('sue') ||
        content.includes('lawsuit')
      ) {
        riskLevel = 'high';
      }
      
      // Create classification result
      const classification = {
        id: uuidv4(),
        email_id: email.id,
        intent,
        risk_level: riskLevel,
        confidence: 0.65, // Lower confidence for rule-based approach
        metadata: {
          keywords: this.extractKeywords(content),
          analysis_timestamp: new Date().toISOString(),
          analysis_method: 'rule_based'
        }
      };
      
      // Save classification to database
      await this.saveClassification(classification);
      
      logger.info(`Email ${email.id} classified by rule-based system as ${intent} with risk level ${riskLevel}`);
      
      return classification;
    } catch (error) {
      logger.error(`Error in fallback classification for email ${email.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Save classification to database
   * @param {Object} classification - The classification object
   * @returns {Object} - Saved classification
   */
  async saveClassification(classification) {
    try {
      const query = `
        INSERT INTO classifications 
        (id, email_id, intent, risk_level, confidence, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [
        classification.id,
        classification.email_id,
        classification.intent,
        classification.risk_level,
        classification.confidence,
        JSON.stringify(classification.metadata)
      ];
      
      const result = await pgQuery(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error saving classification to database:`, error);
      throw error;
    }
  }
  
  /**
   * Extract keywords from content (simplified)
   * @param {string} content - The email content
   * @returns {string[]} - Extracted keywords
   */
  extractKeywords(content) {
    // This is a very simplified version. In a real implementation,
    // we would use NLP techniques like TF-IDF or entity extraction.
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
      
    // Remove common stop words
    const stopWords = ['this', 'that', 'then', 'than', 'they', 'them', 'their', 'have', 'from', 'what', 'with', 'would'];
    const filteredWords = words.filter(word => !stopWords.includes(word));
    
    // Count word frequency and take top 10
    const wordCount = {};
    filteredWords.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
  
  /**
   * Route an email to the Email MCP for processing
   * @param {Object} email - The email object
   * @param {Object} classification - The classification result
   * @returns {Object} - Routing result
   */
  async routeToEmailMcp(email, classification) {
    try {
      logger.info(`Routing email ${email.id} to Email MCP`);
      
      // Prepare the payload for the Email MCP
      const payload = {
        email_id: email.id,
        metadata: {
          from: email.from_address,
          to: email.to_address,
          subject: email.subject,
          date: email.received_at,
          cc: email.cc || [],
          bcc: email.bcc || []
        },
        content: {
          plain_text: email.content_text,
          html: email.content_html
        },
        classification: {
          intent: classification.intent,
          risk_level: classification.risk_level,
          confidence: classification.confidence,
          analysis_method: classification.metadata?.analysis_method || 'unknown',
          explanation: classification.metadata?.additional_info?.explanation || ''
        },
        history: [] // Would be populated with actual email history in a real implementation
      };
      
      // Send to Email MCP
      const response = await axios.post(`${this.emailMcpUrl}/api/emails/process`, payload);
      
      logger.info(`Email ${email.id} routed to Email MCP successfully with task ID: ${response.data.task_id}`);
      
      return response.data;
    } catch (error) {
      logger.error(`Error routing email ${email.id} to Email MCP:`, error);
      throw error;
    }
  }
  
  /**
   * Get classification performance metrics
   * @returns {Object} - Performance metrics
   */
  async getPerformanceMetrics() {
    try {
      // Query for recent classifications to calculate metrics
      const query = `
        SELECT 
          AVG(confidence) as avg_confidence,
          COUNT(*) as total_classifications,
          SUM(CASE WHEN metadata->>'analysis_method' = 'llm' THEN 1 ELSE 0 END) as llm_count,
          SUM(CASE WHEN metadata->>'analysis_method' = 'rule_based' THEN 1 ELSE 0 END) as rule_based_count,
          AVG(EXTRACT(EPOCH FROM (classifications.created_at - emails.received_at))) as avg_processing_time_seconds
        FROM 
          classifications
        JOIN
          emails ON classifications.email_id = emails.id
        WHERE
          classifications.created_at > NOW() - INTERVAL '24 HOURS'
      `;
      
      const result = await pgQuery(query);
      const metrics = result.rows[0];
      
      // Add cache metrics
      metrics.cache_hits = this.cache.getStats().hits;
      metrics.cache_misses = this.cache.getStats().misses;
      metrics.cache_keys = this.cache.keys().length;
      
      return metrics;
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      return {
        error: 'Failed to retrieve metrics',
        message: error.message
      };
    }
  }
}

module.exports = new IntentAnalysisService(); 