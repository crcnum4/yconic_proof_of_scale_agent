const mongoose = require('mongoose');

const monitoringEventSchema = new mongoose.Schema({
  // Event Information
  eventType: {
    type: String,
    required: true,
    enum: [
      'SALES_MILESTONE',
      'GROWTH_THRESHOLD',
      'SUSTAINED_GROWTH',
      'FUNDING_ELIGIBLE',
      'REVENUE_DECLINE',
      'ACCOUNT_CREATION',
      'MANUAL_TRIGGER'
    ]
  },
  
  // User Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Event Data
  eventData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Trigger Information
  triggerValue: {
    type: Number,
    required: true
  },
  thresholdValue: {
    type: Number,
    required: true
  },
  
  // Status
  isTriggered: {
    type: Boolean,
    default: false
  },
  isNotified: {
    type: Boolean,
    default: false
  },
  
  // Funding Details
  fundingEligible: {
    type: Boolean,
    default: false
  },
  fundingAmount: {
    type: Number,
    default: 0
  },
  fundingRecommendation: {
    type: String,
    enum: ['APPROVE', 'REVIEW', 'DECLINE', 'PENDING'],
    default: 'PENDING'
  },
  
  // Agent Response
  agentResponse: {
    type: String,
    default: ''
  },
  agentActions: [{
    action: String,
    timestamp: Date,
    details: mongoose.Schema.Types.Mixed
  }],
  
  // Metadata
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  triggeredAt: {
    type: Date,
    default: null
  },
  notifiedAt: {
    type: Date,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  }
});

// Indexes for better query performance
monitoringEventSchema.index({ userId: 1 });
monitoringEventSchema.index({ eventType: 1 });
monitoringEventSchema.index({ isTriggered: 1 });
monitoringEventSchema.index({ createdAt: -1 });
monitoringEventSchema.index({ fundingEligible: 1 });

// Pre-save middleware
monitoringEventSchema.pre('save', function(next) {
  if (this.isTriggered && !this.triggeredAt) {
    this.triggeredAt = new Date();
  }
  if (this.isNotified && !this.notifiedAt) {
    this.notifiedAt = new Date();
  }
  next();
});

// Method to trigger the event
monitoringEventSchema.methods.trigger = function() {
  this.isTriggered = true;
  this.triggeredAt = new Date();
  return this.save();
};

// Method to mark as notified
monitoringEventSchema.methods.markNotified = function() {
  this.isNotified = true;
  this.notifiedAt = new Date();
  return this.save();
};

// Method to resolve the event
monitoringEventSchema.methods.resolve = function() {
  this.resolvedAt = new Date();
  return this.save();
};

// Method to add agent action
monitoringEventSchema.methods.addAgentAction = function(action, details = {}) {
  this.agentActions.push({
    action,
    timestamp: new Date(),
    details
  });
  return this.save();
};

// Static method to get recent events
monitoringEventSchema.statics.getRecentEvents = function(limit = 50) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name email company');
};

// Static method to get funding eligible events
monitoringEventSchema.statics.getFundingEligibleEvents = function() {
  return this.find({ fundingEligible: true })
    .sort({ createdAt: -1 })
    .populate('userId', 'name email company currentRevenue');
};

module.exports = mongoose.model('MonitoringEvent', monitoringEventSchema); 