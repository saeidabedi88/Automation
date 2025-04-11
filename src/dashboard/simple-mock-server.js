const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Enable CORS
app.use(cors());
app.use(express.json());

// Mock data for analytics
const mockData = {
  emailCounts: {
    total: 2450,
    today: 120,
    pending_review: 18,
    auto_processed: 102,
    trend: 0.12, // 12% increase
  },
  processingMetrics: {
    avg_processing_time: 0.42, // seconds
    classification_accuracy: 0.95,
    auto_response_rate: 0.85,
  },
  intentDistribution: {
    labels: ['Support', 'Inquiry', 'Complaint', 'Feedback', 'Order', 'Partnership', 'Other'],
    data: [35, 25, 15, 10, 8, 5, 2],
  },
  riskDistribution: {
    labels: ['Low', 'Medium', 'High'],
    data: [65, 20, 15],
  },
  dailyVolume: {
    labels: ['2023-05-26', '2023-05-27', '2023-05-28', '2023-05-29', '2023-05-30', '2023-05-31', '2023-06-01'],
    autoResponded: [85, 90, 92, 95, 88, 70, 65],
    humanReviewed: [15, 20, 18, 25, 22, 10, 5],
  }
};

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '0.1.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Analytics endpoint
app.get('/api/analytics', (req, res) => {
  res.json(mockData);
});

// Start server
app.listen(PORT, () => {
  console.log(`Mock API server running on port ${PORT}`);
}); 