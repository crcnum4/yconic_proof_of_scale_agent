const express = require('express');
const GrowthAnalytics = require('../models/GrowthAnalytics');
const User = require('../models/User');
const MonitoringEvent = require('../models/MonitoringEvent');
const router = express.Router();

// GET overall analytics
router.get('/', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    const [
      totalAnalytics,
      averageFundingScore,
      topPerformers,
      fundingEligibleUsers,
      recentEvents
    ] = await Promise.all([
      GrowthAnalytics.countDocuments(),
      GrowthAnalytics.aggregate([
        { $group: { _id: null, avgScore: { $avg: '$fundingEligibilityScore' } } }
      ]),
      GrowthAnalytics.find().sort({ performanceScore: -1 }).limit(10).populate('userId', 'name email company'),
      GrowthAnalytics.find({ fundingEligibilityScore: { $gte: 70 } }).sort({ fundingEligibilityScore: -1 }).limit(10).populate('userId', 'name email company'),
      MonitoringEvent.find({ createdAt: { $gte: startDate } }).sort({ createdAt: -1 }).limit(20).populate('userId', 'name email company')
    ]);
    
    res.json({
      period,
      overview: {
        totalAnalytics,
        averageFundingScore: averageFundingScore[0]?.avgScore || 0,
        topPerformers: topPerformers.length,
        fundingEligibleUsers: fundingEligibleUsers.length,
        recentEvents: recentEvents.length
      },
      topPerformers,
      fundingEligibleUsers,
      recentEvents
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET user-specific analytics
router.get('/user/:userId', async (req, res) => {
  try {
    const analytics = await GrowthAnalytics.findOne({ userId: req.params.userId })
      .populate('userId', 'name email company currentRevenue currentGrowthRate');
    
    if (!analytics) {
      return res.status(404).json({ error: 'Analytics not found for this user' });
    }
    
    // Get user's recent events
    const recentEvents = await MonitoringEvent.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({
      analytics,
      recentEvents
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET funding eligible users
router.get('/funding-eligible', async (req, res) => {
  try {
    const { minScore = 70, limit = 20 } = req.query;
    
    const eligibleUsers = await GrowthAnalytics.find({ 
      fundingEligibilityScore: { $gte: parseInt(minScore) } 
    })
    .sort({ fundingEligibilityScore: -1 })
    .limit(parseInt(limit))
    .populate('userId', 'name email company currentRevenue currentGrowthRate');
    
    res.json({
      count: eligibleUsers.length,
      users: eligibleUsers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET growth trends
router.get('/growth-trends', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // Get analytics created in the period
    const analytics = await GrowthAnalytics.find({
      createdAt: { $gte: startDate }
    }).populate('userId', 'name email company');
    
    // Calculate trends
    const trends = {
      revenueGrowth: {
        increasing: analytics.filter(a => a.revenueGrowth.trend === 'INCREASING').length,
        decreasing: analytics.filter(a => a.revenueGrowth.trend === 'DECREASING').length,
        stable: analytics.filter(a => a.revenueGrowth.trend === 'STABLE').length
      },
      accountGrowth: {
        increasing: analytics.filter(a => a.newAccountGrowth.trend === 'INCREASING').length,
        decreasing: analytics.filter(a => a.newAccountGrowth.trend === 'DECREASING').length,
        stable: analytics.filter(a => a.newAccountGrowth.trend === 'STABLE').length
      },
      salesVolumeGrowth: {
        increasing: analytics.filter(a => a.salesVolumeGrowth.trend === 'INCREASING').length,
        decreasing: analytics.filter(a => a.salesVolumeGrowth.trend === 'DECREASING').length,
        stable: analytics.filter(a => a.salesVolumeGrowth.trend === 'STABLE').length
      }
    };
    
    res.json({
      period,
      totalAnalytics: analytics.length,
      trends
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET top performers
router.get('/top-performers', async (req, res) => {
  try {
    const { limit = 10, metric = 'performanceScore' } = req.query;
    
    const validMetrics = ['performanceScore', 'fundingEligibilityScore', 'growthScore'];
    const sortMetric = validMetrics.includes(metric) ? metric : 'performanceScore';
    
    const topPerformers = await GrowthAnalytics.find()
      .sort({ [sortMetric]: -1 })
      .limit(parseInt(limit))
      .populate('userId', 'name email company currentRevenue currentGrowthRate');
    
    res.json({
      metric: sortMetric,
      performers: topPerformers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST calculate analytics for a user
router.post('/calculate/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
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
      
      analytics.salesVolumeGrowth = {
        currentMonth: current.salesVolume,
        previousMonth: previous.salesVolume,
        growthRate: previous.salesVolume > 0 ? (current.salesVolume - previous.salesVolume) / previous.salesVolume : 0,
        trend: current.salesVolume > previous.salesVolume ? 'INCREASING' : current.salesVolume < previous.salesVolume ? 'DECREASING' : 'STABLE'
      };
    }
    
    // Calculate sustained growth periods
    if (user.monthlyGrowth.length >= 2) {
      let currentStreak = 0;
      let longestStreak = 0;
      let totalStreaks = 0;
      let totalDuration = 0;
      
      for (let i = 1; i < user.monthlyGrowth.length; i++) {
        const current = user.monthlyGrowth[i];
        const previous = user.monthlyGrowth[i - 1];
        
        if (current.growthRate > 0.05) {
          currentStreak++;
          longestStreak = Math.max(longestStreak, currentStreak);
        } else {
          if (currentStreak > 0) {
            totalStreaks++;
            totalDuration += currentStreak;
          }
          currentStreak = 0;
        }
      }
      
      analytics.sustainedGrowthPeriods = {
        count: totalStreaks,
        averageDuration: totalStreaks > 0 ? totalDuration / totalStreaks : 0,
        longestPeriod: longestStreak,
        currentStreak
      };
    }
    
    // Update achieved milestones
    analytics.achievedMilestones = user.salesMilestones.map(milestone => ({
      milestone: milestone.milestone,
      achievedAt: milestone.achievedAt,
      revenue: milestone.revenue
    }));
    
    // Calculate funding eligibility
    await analytics.calculateFundingEligibility();
    
    // Calculate performance scores
    analytics.performanceScore = Math.min(100, Math.max(0, 
      (analytics.fundingEligibilityScore * 0.4) + 
      (analytics.revenueGrowth.growthRate * 100 * 0.3) + 
      (analytics.sustainedGrowthPeriods.currentStreak * 10 * 0.3)
    ));
    
    analytics.growthScore = Math.min(100, Math.max(0,
      (analytics.revenueGrowth.growthRate * 100 * 0.5) +
      (analytics.newAccountGrowth.growthRate * 100 * 0.3) +
      (analytics.salesVolumeGrowth.growthRate * 100 * 0.2)
    ));
    
    analytics.lastCalculated = new Date();
    await analytics.save();
    
    res.json({ 
      message: 'Analytics calculated successfully', 
      analytics 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET analytics dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalAnalytics,
      averageFundingScore,
      topPerformers,
      fundingEligibleUsers,
      recentEvents,
      growthTrends
    ] = await Promise.all([
      GrowthAnalytics.countDocuments(),
      GrowthAnalytics.aggregate([
        { $group: { _id: null, avgScore: { $avg: '$fundingEligibilityScore' } } }
      ]),
      GrowthAnalytics.find().sort({ performanceScore: -1 }).limit(5).populate('userId', 'name email company'),
      GrowthAnalytics.find({ fundingEligibilityScore: { $gte: 70 } }).sort({ fundingEligibilityScore: -1 }).limit(5).populate('userId', 'name email company'),
      MonitoringEvent.find().sort({ createdAt: -1 }).limit(10).populate('userId', 'name email company'),
      GrowthAnalytics.aggregate([
        {
          $group: {
            _id: '$revenueGrowth.trend',
            count: { $sum: 1 }
          }
        }
      ])
    ]);
    
    res.json({
      overview: {
        totalAnalytics,
        averageFundingScore: averageFundingScore[0]?.avgScore || 0,
        topPerformers: topPerformers.length,
        fundingEligibleUsers: fundingEligibleUsers.length
      },
      topPerformers,
      fundingEligibleUsers,
      recentEvents,
      growthTrends
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 