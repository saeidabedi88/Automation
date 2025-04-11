const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['info', 'warn', 'error', 'debug'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  source: {
    type: String,
    required: true,
    enum: ['conductor', 'email_mcp', 'dashboard']
  },
  component: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  actor: {
    type: String
  },
  emailId: {
    type: String
  },
  taskId: {
    type: String
  },
  ip: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient querying
LogSchema.index({ level: 1 });
LogSchema.index({ source: 1 });
LogSchema.index({ timestamp: -1 });
LogSchema.index({ emailId: 1 });
LogSchema.index({ taskId: 1 });

module.exports = mongoose.model('Log', LogSchema); 