const mongoose = require('mongoose');

const growthAnalyticsSchema = new mongoose.Schema({
  // User Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Growth Metrics
  newAccountGrowth: {
    currentMonth: { type: Number, default: 0 },
    previousMonth: { type: Number, default: 0 },
    growthRate: { type: Number, default: 0 },
    trend: { type: String, enum: ['INCREASING', 'DECREASING', 'STABLE'], default: 'STABLE' }
  },
  
  revenueGrowth: {
    currentMonth: { type: Number, default: 0 },
    previousMonth: { type: Number, default: 0 },
    growthRate: { type: Number, default: 0 },
    trend: { type: String, enum: ['INCREASING', 'DECREASING', 'STABLE'], default: 'STABLE' }
  },
  
  salesVolumeGrowth: {
    currentMonth: { type: Number, default: 0 },
    previousMonth: { type: Number, default: 0 },
    growthRate: { type: Number, default: 0 },
    trend: { type: String, enum: ['INCREASING', 'DECREASING', 'STABLE'], default: 'STABLE' }
  },
  
  // Sustained Growth Analysis
  sustainedGrowthPeriods: {
    count: { type: Number, default: 0 },
    averageDuration: { type: Number, default: 0 },
    longestPeriod: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 }
  },
  
  // Milestone Tracking
  achievedMilestones: [{
    milestone: String,
    achievedAt: Date,
    revenue: Number
  }],
  
  // Predictive Analytics
  predictedRevenue: {
    nextMonth: { type: Number, default: 0 },
    nextQuarter: { type: Number, default: 0 },
    confidence: { type: Number, default: 0, min: 0, max: 1 }
  },
  
  predictedGrowth: {
    nextMonth: { type: Number, default: 0 },
    nextQuarter: { type: Number, default: 0 },
    confidence: { type: Number, default: 0, min: 0, max: 1 }
  },
  
  // Risk Factors
  riskFactors: [{
    factor: String,
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    description: String,
    impact: Number
  }],
  
  // Agent Insights
  agentInsights: [{
    insight: String,
    category: { type: String, enum: ['GROWTH', 'RISK', 'OPPORTUNITY', 'MILESTONE'] },
    timestamp: Date,
    actionable: Boolean
  }],
  
  // Funding Eligibility
  fundingEligibilityScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  fundingRecommendations: [{
    recommendation: String,
    amount: Number,
    reason: String,
    confidence: Number,
    timestamp: Date
  }],
  
  // Performance Metrics
  performanceScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  growthScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  riskScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Timestamps
  lastCalculated: {
    type: Date,
    default: Date.now
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
growthAnalyticsSchema.index({ userId: 1 });
growthAnalyticsSchema.index({ fundingEligibilityScore: -1 });
growthAnalyticsSchema.index({ performanceScore: -1 });
growthAnalyticsSchema.index({ lastCalculated: -1 });

// Pre-save middleware
growthAnalyticsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to calculate funding eligibility
growthAnalyticsSchema.methods.calculateFundingEligibility = function() {
  let score = 0;
  
  // Revenue growth contribution (40% weight)
  if (this.revenueGrowth.growthRate > 0.2) score += 40;
  else if (this.revenueGrowth.growthRate > 0.1) score += 30;
  else if (this.revenueGrowth.growthRate > 0.05) score += 20;
  else if (this.revenueGrowth.growthRate > 0) score += 10;
  
  // Sustained growth contribution (30% weight)
  if (this.sustainedGrowthPeriods.currentStreak >= 3) score += 30;
  else if (this.sustainedGrowthPeriods.currentStreak >= 2) score += 20;
  else if (this.sustainedGrowthPeriods.currentStreak >= 1) score += 10;
  
  // Milestone achievement contribution (20% weight)
  const milestoneCount = this.achievedMilestones.length;
  if (milestoneCount >= 3) score += 20;
  else if (milestoneCount >= 2) score += 15;
  else if (milestoneCount >= 1) score += 10;
  
  // Risk factor deduction (10% weight)
  const highRiskFactors = this.riskFactors.filter(risk => risk.severity === 'HIGH' || risk.severity === 'CRITICAL').length;
  score -= Math.min(10, highRiskFactors * 3);
  
  this.fundingEligibilityScore = Math.max(0, Math.min(100, score));
  return this.save();
};

// Method to add agent insight
growthAnalyticsSchema.methods.addAgentInsight = function(insight, category, actionable = false) {
  this.agentInsights.push({
    insight,
    category,
    timestamp: new Date(),
    actionable
  });
  return this.save();
};

// Method to add risk factor
growthAnalyticsSchema.methods.addRiskFactor = function(factor, severity, description, impact) {
  this.riskFactors.push({
    factor,
    severity,
    description,
    impact
  });
  return this.save();
};

// Method to add funding recommendation
growthAnalyticsSchema.methods.addFundingRecommendation = function(recommendation, amount, reason, confidence) {
  this.fundingRecommendations.push({
    recommendation,
    amount,
    reason,
    confidence,
    timestamp: new Date()
  });
  return this.save();
};

// Static method to get top performers
growthAnalyticsSchema.statics.getTopPerformers = function(limit = 10) {
  return this.find()
    .sort({ performanceScore: -1 })
    .limit(limit)
    .populate('userId', 'name email company currentRevenue');
};

// Static method to get funding eligible users
growthAnalyticsSchema.statics.getFundingEligibleUsers = function(minScore = 70) {
  return this.find({ fundingEligibilityScore: { $gte: minScore } })
    .sort({ fundingEligibilityScore: -1 })
    .populate('userId', 'name email company currentRevenue');
};

module.exports = mongoose.model('GrowthAnalytics', growthAnalyticsSchema); 