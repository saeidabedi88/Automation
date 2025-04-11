const { v4: uuidv4 } = require('uuid');
const { pgQuery } = require('../models');
const logger = require('../utils/logger');
const intentAnalysisService = require('./intentAnalysisService');
const queue = require('../utils/queue');

/**
 * Service for handling email operations in the Conductor MCP
 */
class EmailService {
  /**
   * Receive and process an incoming email
   * @param {Object} emailData - The incoming email data
   * @returns {Object} - The processed email
   */
  async receiveEmail(emailData) {
    try {
      logger.info(`Receiving email with subject: ${emailData.subject}`);
      
      // Generate a UUID for the email
      const emailId = uuidv4();
      
      // Save email to database
      const email = await this.saveEmail({
        id: emailId,
        external_id: emailData.externalId || null,
        from_address: emailData.from,
        to_address: emailData.to,
        subject: emailData.subject,
        received_at: new Date().toISOString(),
        content_text: emailData.plainText,
        content_html: emailData.html,
        cc: emailData.cc || [],
        bcc: emailData.bcc || [],
        headers: emailData.headers || {},
        status: 'pending'
      });
      
      // Publish email received event to message queue
      await queue.publish(
        queue.EXCHANGES.EMAIL_EVENTS, 
        queue.ROUTING_KEYS.EMAIL_RECEIVED, 
        { emailId: email.id }
      );
      
      logger.info(`Email saved with ID: ${email.id}`);
      
      return email;
    } catch (error) {
      logger.error('Error receiving email:', error);
      throw error;
    }
  }
  
  /**
   * Process an email by analyzing intent and routing to Email MCP
   * @param {string} emailId - The email ID
   * @returns {Object} - Processing result
   */
  async processEmail(emailId) {
    try {
      logger.info(`Processing email: ${emailId}`);
      
      // Get email from database
      const email = await this.getEmailById(emailId);
      
      if (!email) {
        throw new Error(`Email with ID ${emailId} not found`);
      }
      
      // Update email status
      await this.updateEmailStatus(emailId, 'processed');
      
      // Analyze intent
      const classification = await intentAnalysisService.analyzeIntent(email);
      
      // Create task in the database
      const task = await this.createTask({
        email_id: email.id,
        type: 'email_processing',
        status: 'pending',
        priority: classification.risk_level === 'high' ? 1 : 
                 classification.risk_level === 'medium' ? 2 : 3,
        metadata: {
          classification_id: classification.id
        }
      });
      
      // Route to Email MCP
      const routingResult = await intentAnalysisService.routeToEmailMcp(email, classification);
      
      // Update task with routing result
      await this.updateTask(task.id, {
        status: 'in_progress',
        metadata: {
          ...task.metadata,
          task_id: routingResult.task_id
        }
      });
      
      // Publish email processed event to message queue
      await queue.publish(
        queue.EXCHANGES.EMAIL_EVENTS, 
        queue.ROUTING_KEYS.EMAIL_PROCESSED, 
        { 
          emailId: email.id,
          taskId: task.id,
          classification
        }
      );
      
      logger.info(`Email ${emailId} processed successfully`);
      
      return {
        email,
        classification,
        task,
        routingResult
      };
    } catch (error) {
      logger.error(`Error processing email ${emailId}:`, error);
      
      // Publish error event to message queue
      await queue.publish(
        queue.EXCHANGES.SYSTEM_EVENTS, 
        queue.ROUTING_KEYS.SYSTEM_ERROR, 
        { 
          emailId,
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      );
      
      throw error;
    }
  }
  
  /**
   * Save email to database
   * @param {Object} email - The email object
   * @returns {Object} - Saved email
   */
  async saveEmail(email) {
    try {
      const query = `
        INSERT INTO emails 
        (id, external_id, from_address, to_address, subject, received_at, 
         content_text, content_html, cc, bcc, headers, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      const values = [
        email.id,
        email.external_id,
        email.from_address,
        email.to_address,
        email.subject,
        email.received_at,
        email.content_text,
        email.content_html,
        email.cc,
        email.bcc,
        JSON.stringify(email.headers),
        email.status
      ];
      
      const result = await pgQuery(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error saving email to database:', error);
      throw error;
    }
  }
  
  /**
   * Get email by ID
   * @param {string} id - The email ID
   * @returns {Object} - Retrieved email
   */
  async getEmailById(id) {
    try {
      const query = 'SELECT * FROM emails WHERE id = $1';
      const result = await pgQuery(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting email ${id} from database:`, error);
      throw error;
    }
  }
  
  /**
   * Update email status
   * @param {string} id - The email ID
   * @param {string} status - The new status
   * @returns {Object} - Updated email
   */
  async updateEmailStatus(id, status) {
    try {
      const query = 'UPDATE emails SET status = $1 WHERE id = $2 RETURNING *';
      const result = await pgQuery(query, [status, id]);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating email ${id} status:`, error);
      throw error;
    }
  }
  
  /**
   * Create a task
   * @param {Object} task - The task object
   * @returns {Object} - Created task
   */
  async createTask(task) {
    try {
      const taskId = uuidv4();
      
      const query = `
        INSERT INTO tasks 
        (id, email_id, type, status, priority, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [
        taskId,
        task.email_id,
        task.type,
        task.status,
        task.priority,
        JSON.stringify(task.metadata || {})
      ];
      
      const result = await pgQuery(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating task:', error);
      throw error;
    }
  }
  
  /**
   * Update a task
   * @param {string} id - The task ID
   * @param {Object} updates - The updates to apply
   * @returns {Object} - Updated task
   */
  async updateTask(id, updates) {
    try {
      // Build the SET clause dynamically based on provided updates
      const setClauses = [];
      const values = [id]; // Start with the ID as the first parameter
      let paramIndex = 2; // Start parameter index from 2 (after id)
      
      // Add each update to the SET clause
      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'metadata' && typeof value === 'object') {
          setClauses.push(`metadata = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          setClauses.push(`${key} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      });
      
      // If nothing to update, return early
      if (setClauses.length === 0) {
        return this.getTaskById(id);
      }
      
      const query = `
        UPDATE tasks
        SET ${setClauses.join(', ')}, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await pgQuery(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating task ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Get task by ID
   * @param {string} id - The task ID
   * @returns {Object} - Retrieved task
   */
  async getTaskById(id) {
    try {
      const query = 'SELECT * FROM tasks WHERE id = $1';
      const result = await pgQuery(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting task ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Handle a draft response from Email MCP
   * @param {Object} draftData - The draft response data
   * @returns {Object} - Result of handling the draft
   */
  async handleDraftResponse(draftData) {
    try {
      logger.info(`Handling draft response for email: ${draftData.email_id}`);
      
      // Update task status
      await this.updateTask(draftData.task_id, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });
      
      // Save the response to database
      const responseId = uuidv4();
      
      const query = `
        INSERT INTO responses
        (id, email_id, task_id, body_text, body_html, is_auto_generated, is_approved)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        responseId,
        draftData.email_id,
        draftData.task_id,
        draftData.draft_response.body,
        draftData.draft_response.body_html || null, // If HTML is provided
        true, // Auto-generated
        false // Not approved yet
      ];
      
      const result = await pgQuery(query, values);
      const response = result.rows[0];
      
      // Create a new task for human review
      const reviewTask = await this.createTask({
        email_id: draftData.email_id,
        type: 'human_review',
        status: 'pending',
        priority: 1, // High priority for human review
        metadata: {
          response_id: response.id,
          confidence: draftData.metadata?.confidence || 0
        }
      });
      
      // Publish response generated event
      await queue.publish(
        queue.EXCHANGES.EMAIL_EVENTS, 
        queue.ROUTING_KEYS.RESPONSE_GENERATED, 
        { 
          emailId: draftData.email_id,
          responseId: response.id,
          taskId: reviewTask.id
        }
      );
      
      logger.info(`Draft response for email ${draftData.email_id} handled successfully`);
      
      return {
        response,
        reviewTask
      };
    } catch (error) {
      logger.error(`Error handling draft response for email ${draftData.email_id}:`, error);
      throw error;
    }
  }
  
  /**
   * Handle a reviewed response from Dashboard
   * @param {Object} reviewedData - The reviewed response data
   * @returns {Object} - Result of handling the reviewed response
   */
  async handleReviewedResponse(reviewedData) {
    try {
      logger.info(`Handling reviewed response for review ID: ${reviewedData.review_id}`);
      
      // Update task status
      const reviewTask = await this.getTaskById(reviewedData.review_id);
      
      if (!reviewTask) {
        throw new Error(`Review task with ID ${reviewedData.review_id} not found`);
      }
      
      await this.updateTask(reviewedData.review_id, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });
      
      // Update the response in database
      const responseQuery = `
        UPDATE responses
        SET body_text = $1, is_approved = $2, approved_by = $3, approved_at = $4
        WHERE id = $5
        RETURNING *
      `;
      
      const responseValues = [
        reviewedData.approved_response.body,
        true,
        reviewedData.approved_response.approved_by,
        reviewedData.approved_response.approved_at,
        reviewTask.metadata.response_id
      ];
      
      const responseResult = await pgQuery(responseQuery, responseValues);
      const response = responseResult.rows[0];
      
      // Save the feedback
      const feedbackQuery = `
        INSERT INTO feedback
        (id, response_id, user_id, quality_rating, comments, edit_distance)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const feedbackValues = [
        uuidv4(),
        response.id,
        reviewedData.approved_response.approved_by,
        reviewedData.feedback.quality_rating,
        reviewedData.feedback.comments || null,
        reviewedData.feedback.edit_distance || 0
      ];
      
      const feedbackResult = await pgQuery(feedbackQuery, feedbackValues);
      const feedback = feedbackResult.rows[0];
      
      // Publish response approved event
      await queue.publish(
        queue.EXCHANGES.EMAIL_EVENTS, 
        queue.ROUTING_KEYS.RESPONSE_APPROVED, 
        { 
          emailId: reviewedData.email_id,
          responseId: response.id,
          reviewId: reviewedData.review_id
        }
      );
      
      logger.info(`Reviewed response for review ID ${reviewedData.review_id} handled successfully`);
      
      return {
        response,
        feedback
      };
    } catch (error) {
      logger.error(`Error handling reviewed response for review ID ${reviewedData.review_id}:`, error);
      throw error;
    }
  }
}

module.exports = new EmailService(); 