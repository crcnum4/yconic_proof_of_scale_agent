const mongoose = require('mongoose');
const moment = require('moment');

const monthlyGrowthSchema = new mongoose.Schema({
  month: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return moment(v, 'YYYY-MM', true).isValid();
      },
      message: 'Month must be in YYYY-MM format'
    }
  },
  newAccounts: {
    type: Number,
    required: true,
    min: 0
  },
  growthRate: {
    type: Number,
    required: true,
    min: 0
  },
  revenue: {
    type: Number,
    required: true,
    min: 0
  },
  salesVolume: {
    type: Number,
    required: true,
    min: 0
  }
});

const salesMilestoneSchema = new mongoose.Schema({
  milestone: {
    type: String,
    required: true,
    enum: ['$5K', '$10K', '$25K', '$50K', '$100K', '$250K', '$500K', '$1M']
  },
  achievedAt: {
    type: Date,
    required: true
  },
  revenue: {
    type: Number,
    required: true
  }
});

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  accountCreatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Monthly Growth Data
  monthlyGrowth: [monthlyGrowthSchema],
  
  // Current Growth Metrics
  currentGrowthRate: {
    type: Number,
    default: 0,
    min: 0
  },
  currentRevenue: {
    type: Number,
    default: 0,
    min: 0
  },
  currentSalesVolume: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Sales Milestones
  salesMilestones: [salesMilestoneSchema],
  lastMilestoneAchieved: {
    type: String,
    enum: ['$5K', '$10K', '$25K', '$50K', '$100K', '$250K', '$500K', '$1M', null],
    default: null
  },
  
  // Monitoring Configuration
  monitoringEnabled: {
    type: Boolean,
    default: true
  },
  salesMilestoneThreshold: {
    type: Number,
    default: 10000
  },
  growthRateThreshold: {
    type: Number,
    default: 0.15
  },
  
  // Analytics
  totalRevenue: {
    type: Number,
    default: 0
  },
  averageGrowthRate: {
    type: Number,
    default: 0
  },
  sustainedGrowthPeriods: {
    type: Number,
    default: 0
  },
  
  // Timestamps
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
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ 'monthlyGrowth.month': 1 });
userSchema.index({ currentRevenue: -1 });

// Pre-save middleware to update timestamps
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to add monthly growth data
userSchema.methods.addMonthlyGrowth = function(monthData) {
  const existingIndex = this.monthlyGrowth.findIndex(
    growth => growth.month === monthData.month
  );
  
  if (existingIndex >= 0) {
    this.monthlyGrowth[existingIndex] = monthData;
  } else {
    this.monthlyGrowth.push(monthData);
  }
  
  // Sort by month
  this.monthlyGrowth.sort((a, b) => moment(a.month, 'YYYY-MM').diff(moment(b.month, 'YYYY-MM')));
  
  return this.save();
};

// Method to update current growth metrics
userSchema.methods.updateGrowthMetrics = function() {
  if (this.monthlyGrowth.length === 0) return this;
  
  const latestGrowth = this.monthlyGrowth[this.monthlyGrowth.length - 1];
  this.currentGrowthRate = latestGrowth.growthRate;
  this.currentRevenue = latestGrowth.revenue;
  this.currentSalesVolume = latestGrowth.salesVolume;
  
  // Calculate total revenue
  this.totalRevenue = this.monthlyGrowth.reduce((sum, growth) => sum + growth.revenue, 0);
  
  // Calculate average growth rate
  const growthRates = this.monthlyGrowth.map(growth => growth.growthRate);
  this.averageGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
  
  return this.save();
};

// Method to check growth milestones
userSchema.methods.checkGrowthMilestones = function() {
  const milestones = [
    { name: '$5K', value: 5000 },
    { name: '$10K', value: 10000 },
    { name: '$25K', value: 25000 },
    { name: '$50K', value: 50000 },
    { name: '$100K', value: 100000 },
    { name: '$250K', value: 250000 },
    { name: '$500K', value: 500000 },
    { name: '$1M', value: 1000000 }
  ];
  
  const achievedMilestones = [];
  
  milestones.forEach(milestone => {
    const alreadyAchieved = this.salesMilestones.some(
      achieved => achieved.milestone === milestone.name
    );
    
    if (!alreadyAchieved && this.currentRevenue >= milestone.value) {
      achievedMilestones.push({
        milestone: milestone.name,
        achievedAt: new Date(),
        revenue: this.currentRevenue
      });
    }
  });
  
  if (achievedMilestones.length > 0) {
    this.salesMilestones.push(...achievedMilestones);
    this.lastMilestoneAchieved = achievedMilestones[achievedMilestones.length - 1].milestone;
  }
  
  return achievedMilestones;
};

module.exports = mongoose.model('User', userSchema); 