/**
 * Analytics Service
 * 
 * Provides methods for retrieving and calculating various analytics metrics related to email processing.
 */

const { Pool } = require('pg');
const winston = require('winston');

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'analytics-service' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/analytics-service-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/analytics-service-combined.log' })
  ]
});

class AnalyticsService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.POSTGRES_URI
    });
    logger.info('Analytics service initialized');
  }

  /**
   * Gets comprehensive analytics data for email processing
   */
  async getEmailAnalytics() {
    logger.info('Fetching email analytics data');
    try {
      const emailCounts = await this.getEmailCounts();
      const intentDistribution = await this.getIntentDistribution();
      const riskDistribution = await this.getRiskDistribution();
      const dailyVolume = await this.getDailyVolume();
      const processingMetrics = await this.getProcessingMetrics();

      return {
        emailCounts,
        intentDistribution,
        riskDistribution,
        dailyVolume,
        processingMetrics
      };
    } catch (error) {
      logger.error('Error retrieving email analytics:', error);
      throw error;
    }
  }

  /**
   * Get counts of emails by status
   */
  async getEmailCounts() {
    try {
      // Get total count
      const totalResult = await this.pool.query('SELECT COUNT(*) FROM emails');
      
      // Get count of emails processed today
      const todayResult = await this.pool.query(`
        SELECT COUNT(*) FROM emails 
        WHERE received_at >= CURRENT_DATE
      `);
      
      // Get count of processed emails (instead of auto_processed)
      const processedResult = await this.pool.query(`
        SELECT COUNT(*) FROM emails 
        WHERE status = 'processed'
      `);
      
      // Get count of pending review emails
      const pendingReviewResult = await this.pool.query(`
        SELECT COUNT(*) FROM emails 
        WHERE status = 'pending'
      `);

      // Calculate trend (comparing today with yesterday)
      const yesterdayResult = await this.pool.query(`
        SELECT COUNT(*) FROM emails 
        WHERE received_at >= CURRENT_DATE - INTERVAL '1 day' 
        AND received_at < CURRENT_DATE
      `);

      const yesterdayCount = parseInt(yesterdayResult.rows[0].count);
      const todayCount = parseInt(todayResult.rows[0].count);
      
      // Calculate trend as a percentage change (0.1 = 10% increase)
      const trend = yesterdayCount > 0 
        ? (todayCount - yesterdayCount) / yesterdayCount 
        : 0;

      return {
        total: parseInt(totalResult.rows[0].count),
        today: parseInt(todayResult.rows[0].count),
        auto_processed: parseInt(processedResult.rows[0].count), // Keeping the same field name for dashboard compatibility
        pending_review: parseInt(pendingReviewResult.rows[0].count),
        trend
      };
    } catch (error) {
      logger.error('Error retrieving email counts:', error);
      return {
        total: 0,
        today: 0,
        auto_processed: 0,
        pending_review: 0,
        trend: 0
      };
    }
  }

  /**
   * Get distribution of emails by intent
   */
  async getIntentDistribution() {
    try {
      const result = await this.pool.query(`
        SELECT c.intent, COUNT(*) as count
        FROM emails e
        JOIN classifications c ON e.id = c.email_id
        GROUP BY c.intent
        ORDER BY count DESC
        LIMIT 7
      `);

      // If there are no results, return default labels
      if (result.rows.length === 0) {
        return {
          labels: ['Support', 'Inquiry', 'Complaint', 'Feedback', 'Other'],
          data: [0, 0, 0, 0, 0]
        };
      }

      return {
        labels: result.rows.map(row => row.intent),
        data: result.rows.map(row => parseInt(row.count))
      };
    } catch (error) {
      logger.error('Error retrieving intent distribution:', error);
      return {
        labels: ['Support', 'Inquiry', 'Complaint', 'Feedback', 'Other'],
        data: [0, 0, 0, 0, 0]
      };
    }
  }

  /**
   * Get distribution of emails by risk level
   */
  async getRiskDistribution() {
    try {
      const result = await this.pool.query(`
        SELECT c.risk_level, COUNT(*) as count
        FROM emails e
        JOIN classifications c ON e.id = c.email_id
        GROUP BY c.risk_level
        ORDER BY 
          CASE 
            WHEN c.risk_level = 'low' THEN 1
            WHEN c.risk_level = 'medium' THEN 2
            WHEN c.risk_level = 'high' THEN 3
            ELSE 4
          END
      `);
      
      // If there are no results, return default labels
      if (result.rows.length === 0) {
        return {
          labels: ['Low', 'Medium', 'High'],
          data: [0, 0, 0]
        };
      }

      return {
        labels: result.rows.map(row => row.risk_level),
        data: result.rows.map(row => parseInt(row.count))
      };
    } catch (error) {
      logger.error('Error retrieving risk distribution:', error);
      return {
        labels: ['Low', 'Medium', 'High'],
        data: [0, 0, 0]
      };
    }
  }

  /**
   * Get daily volume of emails processed
   */
  async getDailyVolume() {
    try {
      const result = await this.pool.query(`
        SELECT 
          date_trunc('day', received_at)::date as date,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'processed') as processed,
          COUNT(*) FILTER (WHERE status = 'pending') as pending
        FROM emails
        WHERE received_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY date_trunc('day', received_at)::date
        ORDER BY date
      `);

      // Ensure we have 7 days of data
      const today = new Date();
      const dates = [];
      const autoResponded = [];
      const humanReviewed = [];

      // Generate 7 days of dates
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
        
        // Find matching data in query results or default to 0
        const matchingRow = result.rows.find(row => 
          row.date.toISOString().split('T')[0] === date.toISOString().split('T')[0]
        );
        
        autoResponded.push(matchingRow ? parseInt(matchingRow.processed) : 0);
        humanReviewed.push(matchingRow ? parseInt(matchingRow.pending) : 0);
      }

      return {
        labels: dates,
        autoResponded: autoResponded,
        humanReviewed: humanReviewed
      };
    } catch (error) {
      logger.error('Error retrieving daily volume:', error);
      // Return 7 days of data with zeros
      const today = new Date();
      const dates = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }
      
      return {
        labels: dates,
        autoResponded: Array(7).fill(0),
        humanReviewed: Array(7).fill(0)
      };
    }
  }

  /**
   * Get processing metrics
   */
  async getProcessingMetrics() {
    try {
      // Get average time difference between received_at and now for pending emails
      // and between received_at and updated_at for processed emails
      const processingTimeResult = await this.pool.query(`
        SELECT AVG(
          CASE 
            WHEN status = 'pending' THEN EXTRACT(EPOCH FROM (NOW() - received_at))
            WHEN status = 'processed' THEN EXTRACT(EPOCH FROM (updated_at - received_at))
            ELSE 0
          END
        ) as avg_time
        FROM emails
        WHERE status IN ('pending', 'processed')
      `);
      
      // Mock classification accuracy for now
      const classificationAccuracy = 0.95;
      
      // Get auto response rate
      const totalEmails = await this.pool.query('SELECT COUNT(*) FROM emails');
      const processedEmails = await this.pool.query(`
        SELECT COUNT(*) FROM emails WHERE status = 'processed'
      `);
      
      const totalCount = parseInt(totalEmails.rows[0].count);
      const processedCount = parseInt(processedEmails.rows[0].count);
      
      const autoResponseRate = totalCount > 0 ? processedCount / totalCount : 0;

      return {
        avg_processing_time: parseFloat(processingTimeResult.rows[0]?.avg_time || 0),
        classification_accuracy: classificationAccuracy,
        auto_response_rate: autoResponseRate
      };
    } catch (error) {
      logger.error('Error retrieving processing metrics:', error);
      return {
        avg_processing_time: 0,
        classification_accuracy: 0.95,
        auto_response_rate: 0
      };
    }
  }
}

module.exports = new AnalyticsService(); 