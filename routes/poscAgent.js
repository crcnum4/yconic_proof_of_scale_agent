const express = require('express');
const User = require('../models/User');
const MonitoringEvent = require('../models/MonitoringEvent');
const GrowthAnalytics = require('../models/GrowthAnalytics');
const monitoringService = require('../services/monitoringService');
const router = express.Router();

// GET PoSC Agent status
router.get('/status', async (req, res) => {
  try {
    const status = monitoringService.getStatus();
    
    // Get additional agent statistics
    const [
      totalEvents,
      triggeredEvents,
      fundingEligibleEvents,
      recentResponses
    ] = await Promise.all([
      MonitoringEvent.countDocuments(),
      MonitoringEvent.countDocuments({ isTriggered: true }),
      MonitoringEvent.countDocuments({ fundingEligible: true }),
      MonitoringEvent.find({ 
        eventType: 'MANUAL_TRIGGER',
        agentResponse: { $exists: true, $ne: '' }
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name email company')
    ]);
    
    res.json({
      ...status,
      statistics: {
        totalEvents,
        triggeredEvents,
        fundingEligibleEvents,
        recentResponses: recentResponses.length
      },
      recentResponses
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET agent responses
router.get('/responses', async (req, res) => {
  try {
    const { page = 1, limit = 20, userId } = req.query;
    
    const query = {
      eventType: 'MANUAL_TRIGGER',
      agentResponse: { $exists: true, $ne: '' }
    };
    
    if (userId) {
      query.userId = userId;
    }
    
    const responses = await MonitoringEvent.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'name email company currentRevenue')
      .select('-__v');
    
    const total = await MonitoringEvent.countDocuments(query);
    
    res.json({
      responses,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalResponses: total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST analyze user for agent insights
router.post('/analyze/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user metrics
    await user.updateGrowthMetrics();
    
    // Check for milestones and triggers
    const achievedMilestones = user.checkGrowthMilestones();
    const growthTriggers = user.currentGrowthRate >= 0.15 ? [{
      type: 'GROWTH_THRESHOLD',
      value: user.currentGrowthRate,
      threshold: 0.15
    }] : [];
    
    // Check for sustained growth
    let sustainedGrowth = false;
    if (user.monthlyGrowth.length >= 3) {
      const recentMonths = user.monthlyGrowth.slice(-3);
      sustainedGrowth = recentMonths.every(growth => growth.growthRate > 0.05);
    }
    
    // Generate agent analysis
    const analysis = {
      user: {
        name: user.name,
        email: user.email,
        company: user.company,
        currentRevenue: user.currentRevenue,
        currentGrowthRate: user.currentGrowthRate,
        currentSalesVolume: user.currentSalesVolume
      },
      triggers: {
        milestones: achievedMilestones,
        growthTriggers,
        sustainedGrowth
      },
      insights: [],
      recommendations: []
    };
    
    // Generate insights based on user data
    if (achievedMilestones.length > 0) {
      analysis.insights.push({
        type: 'MILESTONE',
        message: `User achieved ${achievedMilestones.length} new sales milestone(s)`,
        severity: 'HIGH',
        actionable: true
      });
    }
    
    if (growthTriggers.length > 0) {
      analysis.insights.push({
        type: 'GROWTH',
        message: `Strong growth rate detected: ${(user.currentGrowthRate * 100).toFixed(1)}%`,
        severity: 'MEDIUM',
        actionable: true
      });
    }
    
    if (sustainedGrowth) {
      analysis.insights.push({
        type: 'SUSTAINED_GROWTH',
        message: 'Sustained growth pattern detected over 3+ months',
        severity: 'HIGH',
        actionable: true
      });
    }
    
    // Generate recommendations
    if (user.currentRevenue >= 50000 && user.currentGrowthRate >= 0.2) {
      analysis.recommendations.push({
        type: 'FUNDING',
        message: 'Consider funding approval - high revenue and growth',
        confidence: 0.85,
        amount: 100000
      });
    }
    
    if (user.currentGrowthRate < 0.05) {
      analysis.recommendations.push({
        type: 'WARNING',
        message: 'Low growth rate detected - consider intervention',
        confidence: 0.7,
        action: 'REVIEW'
      });
    }
    
    // Create monitoring event for this analysis
    await MonitoringEvent.create({
      eventType: 'MANUAL_TRIGGER',
      userId: user._id,
      eventData: {
        analysis,
        timestamp: new Date()
      },
      triggerValue: 1,
      thresholdValue: 0,
      isTriggered: true,
      agentResponse: JSON.stringify(analysis),
      severity: 'MEDIUM',
      priority: 'MEDIUM'
    });
    
    res.json({
      message: 'User analysis completed',
      analysis
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST manually trigger agent for user
router.post('/trigger/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Trigger monitoring check for this user
    await monitoringService.checkUserMetrics(user);
    
    // Generate agent response
    const response = monitoringService.generateAgentResponse(user, {
      milestones: user.checkGrowthMilestones(),
      growthTriggers: user.currentGrowthRate >= 0.15 ? [user.currentGrowthRate] : [],
      sustainedGrowth: false
    });
    
    res.json({
      message: 'PoSC Agent triggered successfully',
      response
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET funding recommendations
router.get('/funding-recommendations', async (req, res) => {
  try {
    const { minScore = 70, limit = 20 } = req.query;
    
    const eligibleUsers = await GrowthAnalytics.find({ 
      fundingEligibilityScore: { $gte: parseInt(minScore) } 
    })
    .sort({ fundingEligibilityScore: -1 })
    .limit(parseInt(limit))
    .populate('userId', 'name email company currentRevenue currentGrowthRate');
    
    const recommendations = eligibleUsers.map(analytics => {
      const user = analytics.userId;
      const baseAmount = 50000;
      const growthMultiplier = Math.min(user.currentGrowthRate * 10, 3);
      const revenueMultiplier = Math.min(user.currentRevenue / 10000, 2);
      const recommendedAmount = Math.round(baseAmount * growthMultiplier * revenueMultiplier);
      
      return {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          company: user.company,
          currentRevenue: user.currentRevenue,
          currentGrowthRate: user.currentGrowthRate
        },
        analytics: {
          fundingEligibilityScore: analytics.fundingEligibilityScore,
          performanceScore: analytics.performanceScore,
          growthScore: analytics.growthScore
        },
        recommendation: {
          amount: recommendedAmount,
          confidence: analytics.fundingEligibilityScore / 100,
          reason: `High growth rate (${(user.currentGrowthRate * 100).toFixed(1)}%) and sustained performance`,
          status: 'APPROVE'
        }
      };
    });
    
    res.json({
      count: recommendations.length,
      recommendations
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST start monitoring service
router.post('/start', async (req, res) => {
  try {
    await monitoringService.start();
    res.json({ message: 'PoSC Agent monitoring service started successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST stop monitoring service
router.post('/stop', async (req, res) => {
  try {
    await monitoringService.stop();
    res.json({ message: 'PoSC Agent monitoring service stopped successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET agent insights for user
router.get('/insights/:userId', async (req, res) => {
  try {
    const analytics = await GrowthAnalytics.findOne({ userId: req.params.userId });
    if (!analytics) {
      return res.status(404).json({ error: 'Analytics not found for this user' });
    }
    
    const insights = analytics.agentInsights || [];
    
    res.json({
      userId: req.params.userId,
      insights,
      totalInsights: insights.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST add agent insight
router.post('/insights/:userId', async (req, res) => {
  try {
    const { insight, category, actionable } = req.body;
    
    if (!insight) {
      return res.status(400).json({ error: 'Insight is required' });
    }
    
    let analytics = await GrowthAnalytics.findOne({ userId: req.params.userId });
    if (!analytics) {
      analytics = new GrowthAnalytics({ userId: req.params.userId });
    }
    
    await analytics.addAgentInsight(insight, category || 'GROWTH', actionable || false);
    
    res.json({ message: 'Agent insight added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET agent performance metrics
router.get('/performance', async (req, res) => {
  try {
    const [
      totalEvents,
      triggeredEvents,
      fundingEligibleEvents,
      averageResponseTime,
      recentActivity
    ] = await Promise.all([
      MonitoringEvent.countDocuments(),
      MonitoringEvent.countDocuments({ isTriggered: true }),
      MonitoringEvent.countDocuments({ fundingEligible: true }),
      MonitoringEvent.aggregate([
        { $match: { isTriggered: true } },
        {
          $group: {
            _id: null,
            avgTime: { $avg: { $subtract: ['$triggeredAt', '$createdAt'] } }
          }
        }
      ]),
      MonitoringEvent.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'name email company')
    ]);
    
    res.json({
      metrics: {
        totalEvents,
        triggeredEvents,
        fundingEligibleEvents,
        averageResponseTime: averageResponseTime[0]?.avgTime || 0
      },
      recentActivity
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 