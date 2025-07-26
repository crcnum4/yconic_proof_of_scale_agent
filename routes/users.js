const express = require('express');
const Joi = require('joi');
const User = require('../models/User');
const GrowthAnalytics = require('../models/GrowthAnalytics');
const router = express.Router();

// Validation schemas
const userSchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  email: Joi.string().email().required(),
  company: Joi.string().required().min(2).max(100)
});

const monthlyGrowthSchema = Joi.object({
  month: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
  newAccounts: Joi.number().min(0).required(),
  growthRate: Joi.number().min(0).required(),
  revenue: Joi.number().min(0).required(),
  salesVolume: Joi.number().min(0).required()
});

const monitoringThresholdSchema = Joi.object({
  salesMilestoneThreshold: Joi.number().min(0),
  growthRateThreshold: Joi.number().min(0).max(1)
});

// GET all users
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, active, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const query = {};
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const users = await User.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');
    
    const total = await User.countDocuments(query);
    
    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalUsers: total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new user
router.post('/', async (req, res) => {
  try {
    const { error, value } = userSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const existingUser = await User.findOne({ email: value.email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    const user = new User(value);
    await user.save();
    
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update user
router.put('/:id', async (req, res) => {
  try {
    const { error, value } = userSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      value,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE user
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Also delete associated analytics
    await GrowthAnalytics.findOneAndDelete({ userId: req.params.id });
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST add monthly growth data
router.post('/:id/growth', async (req, res) => {
  try {
    const { error, value } = monthlyGrowthSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await user.addMonthlyGrowth(value);
    await user.updateGrowthMetrics();
    
    // Update analytics
    let analytics = await GrowthAnalytics.findOne({ userId: user._id });
    if (!analytics) {
      analytics = new GrowthAnalytics({ userId: user._id });
    }
    await analytics.save();
    
    res.json({ message: 'Growth data added successfully', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET user growth data
router.get('/:id/growth', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('monthlyGrowth currentGrowthRate currentRevenue currentSalesVolume');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      monthlyGrowth: user.monthlyGrowth,
      currentMetrics: {
        growthRate: user.currentGrowthRate,
        revenue: user.currentRevenue,
        salesVolume: user.currentSalesVolume
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET user milestones
router.get('/:id/milestones', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('salesMilestones lastMilestoneAchieved currentRevenue');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      milestones: user.salesMilestones,
      lastMilestone: user.lastMilestoneAchieved,
      currentRevenue: user.currentRevenue
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update monitoring thresholds
router.put('/:id/monitoring', async (req, res) => {
  try {
    const { error, value } = monitoringThresholdSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      value,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'Monitoring thresholds updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT toggle monitoring status
router.put('/:id/monitoring/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.monitoringEnabled = !user.monitoringEnabled;
    await user.save();
    
    res.json({ 
      message: `Monitoring ${user.monitoringEnabled ? 'enabled' : 'disabled'} successfully`,
      monitoringEnabled: user.monitoringEnabled
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET user analytics
router.get('/:id/analytics', async (req, res) => {
  try {
    const analytics = await GrowthAnalytics.findOne({ userId: req.params.id })
      .populate('userId', 'name email company currentRevenue');
    
    if (!analytics) {
      return res.status(404).json({ error: 'Analytics not found for this user' });
    }
    
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST calculate analytics for user
router.post('/:id/analytics/calculate', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    let analytics = await GrowthAnalytics.findOne({ userId: user._id });
    if (!analytics) {
      analytics = new GrowthAnalytics({ userId: user._id });
    }
    
    // Update analytics based on user data
    if (user.monthlyGrowth.length >= 2) {
      const current = user.monthlyGrowth[user.monthlyGrowth.length - 1];
      const previous = user.monthlyGrowth[user.monthlyGrowth.length - 2];
      
      analytics.newAccountGrowth = {
        currentMonth: current.newAccounts,
        previousMonth: previous.newAccounts,
        growthRate: previous.newAccounts > 0 ? (current.newAccounts - previous.newAccounts) / previous.newAccounts : 0,
        trend: current.newAccounts > previous.newAccounts ? 'INCREASING' : current.newAccounts < previous.newAccounts ? 'DECREASING' : 'STABLE'
      };
      
      analytics.revenueGrowth = {
        currentMonth: current.revenue,
        previousMonth: previous.revenue,
        growthRate: previous.revenue > 0 ? (current.revenue - previous.revenue) / previous.revenue : 0,
        trend: current.revenue > previous.revenue ? 'INCREASING' : current.revenue < previous.revenue ? 'DECREASING' : 'STABLE'
      };
    }
    
    await analytics.calculateFundingEligibility();
    await analytics.save();
    
    res.json({ message: 'Analytics calculated successfully', analytics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 