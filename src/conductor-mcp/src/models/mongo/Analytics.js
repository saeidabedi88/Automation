const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
  // Email processing metrics
  emailProcessing: {
    totalReceived: { type: Number, default: 0 },
    totalProcessed: { type: Number, default: 0 },
    avgProcessingTime: { type: Number, default: 0 }, // in milliseconds
    intentDistribution: {
      inquiry: { type: Number, default: 0 },
      support: { type: Number, default: 0 },
      complaint: { type: Number, default: 0 },
      feedback: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    },
    riskDistribution: {
      low: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      high: { type: Number, default: 0 }
    }
  },
  
  // Response metrics
  responses: {
    totalGenerated: { type: Number, default: 0 },
    autoResponded: { type: Number, default: 0 },
    humanReviewed: { type: Number, default: 0 },
    avgGenerationTime: { type: Number, default: 0 }, // in milliseconds
    avgReviewTime: { type: Number, default: 0 }, // in milliseconds
    approvalRate: { type: Number, default: 0 }, // percentage
    editRate: { type: Number, default: 0 } // percentage
  },
  
  // System performance
  performance: {
    avgCpuUsage: { type: Number, default: 0 }, // percentage
    avgMemoryUsage: { type: Number, default: 0 }, // percentage
    avgResponseTime: { type: Number, default: 0 }, // in milliseconds
    avgQueueLength: { type: Number, default: 0 },
    errorRate: { type: Number, default: 0 } // percentage
  },
  
  // User activity
  userActivity: {
    totalLogins: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 },
    avgSessionDuration: { type: Number, default: 0 } // in seconds
  },
  
  // Time period
  period: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    required: true
  },
  
  // Timestamp for this analytics record
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
AnalyticsSchema.index({ period: 1, timestamp: -1 });

module.exports = mongoose.model('Analytics', AnalyticsSchema); 