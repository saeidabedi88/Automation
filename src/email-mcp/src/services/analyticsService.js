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
        WHERE created_at >= CURRENT_DATE
      `);
      
      // Get count of auto processed emails
      const autoProcessedResult = await this.pool.query(`
        SELECT COUNT(*) FROM emails 
        WHERE status = 'auto_processed'
      `);
      
      // Get count of pending review emails
      const pendingReviewResult = await this.pool.query(`
        SELECT COUNT(*) FROM emails 
        WHERE status = 'pending_review'
      `);

      // Calculate trend (comparing today with yesterday)
      const yesterdayResult = await this.pool.query(`
        SELECT COUNT(*) FROM emails 
        WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' 
        AND created_at < CURRENT_DATE
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
        auto_processed: parseInt(autoProcessedResult.rows[0].count),
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

      return {
        labels: result.rows.map(row => row.intent),
        data: result.rows.map(row => parseInt(row.count))
      };
    } catch (error) {
      logger.error('Error retrieving intent distribution:', error);
      return {
        labels: [],
        data: []
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

      return {
        labels: result.rows.map(row => row.risk_level),
        data: result.rows.map(row => parseInt(row.count))
      };
    } catch (error) {
      logger.error('Error retrieving risk distribution:', error);
      return {
        labels: [],
        data: []
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
          date_trunc('day', created_at)::date as date,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'auto_processed') as auto_processed,
          COUNT(*) FILTER (WHERE status = 'pending_review' OR status = 'reviewed') as human_reviewed
        FROM emails
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY date_trunc('day', created_at)::date
        ORDER BY date
      `);

      return {
        labels: result.rows.map(row => row.date.toISOString().split('T')[0]),
        autoResponded: result.rows.map(row => parseInt(row.auto_processed)),
        humanReviewed: result.rows.map(row => parseInt(row.human_reviewed))
      };
    } catch (error) {
      logger.error('Error retrieving daily volume:', error);
      return {
        labels: [],
        autoResponded: [],
        humanReviewed: []
      };
    }
  }

  /**
   * Get processing metrics
   */
  async getProcessingMetrics() {
    try {
      // Get average processing time
      const processingTimeResult = await this.pool.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_time
        FROM emails
        WHERE processed_at IS NOT NULL
      `);
      
      // Get classification accuracy (mock for now)
      const classificationAccuracy = 0.95;
      
      // Get auto response rate
      const totalEmails = await this.pool.query('SELECT COUNT(*) FROM emails');
      const autoProcessed = await this.pool.query(`
        SELECT COUNT(*) FROM emails WHERE status = 'auto_processed'
      `);
      
      const totalCount = parseInt(totalEmails.rows[0].count);
      const autoCount = parseInt(autoProcessed.rows[0].count);
      
      const autoResponseRate = totalCount > 0 ? autoCount / totalCount : 0;

      return {
        avg_processing_time: parseFloat(processingTimeResult.rows[0]?.avg_time || 0),
        classification_accuracy: classificationAccuracy,
        auto_response_rate: autoResponseRate
      };
    } catch (error) {
      logger.error('Error retrieving processing metrics:', error);
      return {
        avg_processing_time: 0,
        classification_accuracy: 0,
        auto_response_rate: 0
      };
    }
  }
}

module.exports = new AnalyticsService(); 