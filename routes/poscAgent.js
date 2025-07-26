const express = require('express');
const User = require('../models/User');
const MonitoringEvent = require('../models/MonitoringEvent');
const GrowthAnalytics = require('../models/GrowthAnalytics');
const monitoringService = require('../services/monitoringService');
const router = express.Router();

// GET PoSC Agent status - Updated to use actual MongoDB data
router.get('/status', async (req, res) => {
  try {
    const status = monitoringService.getStatus();
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const poscResults = db.collection('posc_results');
    
    // Get all documents from posc_results
    const allResults = await poscResults.find({}).toArray();
    
    // Calculate statistics from actual data
    const totalEvents = allResults.length;
    const triggeredEvents = allResults.filter(doc => doc.metrics?.currentMRR > 1000).length; // $1000+ MRR threshold
    const fundingEligibleEvents = allResults.filter(doc => doc.metrics?.currentMRR >= 1000).length;
    
    // Create recent responses from actual data
    const recentResponses = allResults
      .sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0))
      .slice(0, 5)
      .map(doc => ({
        eventType: 'SALES_MILESTONE',
        agentResponse: `User ${doc.userId || 'Unknown'} achieved $${doc.metrics?.currentMRR || 0} MRR`,
        createdAt: doc.timestamp || doc.createdAt
      }));
    
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
    console.error('PoSC Agent status error:', error);
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

// GET funding recommendations - Updated to use actual MongoDB data
router.get('/funding-recommendations', async (req, res) => {
  try {
    const { minScore = 70, limit = 20, startupId } = req.query; // Add startupId filter parameter
    
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const poscResults = db.collection('posc_results');
    
    // Build query with optional startupId filter
    const query = {};
    if (startupId) {
      query.startupId = startupId;
      console.log(`Filtering by startupId: ${startupId}`);
    }
    
    // Get documents from posc_results with optional filter
    const allResults = await poscResults.find(query).toArray();
    console.log('Found documents:', allResults.length);
    
    // Debug: Show unique startupId values found
    const uniqueStartupIds = [...new Set(allResults.map(doc => doc.startupId))];
    console.log('Unique startupId values found:', uniqueStartupIds);
    
    // Filter and sort by MRR (proxy for funding eligibility)
    const eligibleUsers = allResults
      .filter(doc => doc.metrics?.currentMRR >= 1000) // $1000+ MRR threshold
      .sort((a, b) => (b.metrics?.currentMRR || 0) - (a.metrics?.currentMRR || 0))
      .slice(0, parseInt(limit))
      .map(doc => {
        const currentMRR = doc.metrics?.currentMRR || 0;
        const previousMRR = doc.metrics?.previousMRR || 0;
        const growthRate = previousMRR > 0 ? (currentMRR - previousMRR) / previousMRR : 0;
        
        // Calculate funding eligibility score based on MRR
        const fundingEligibilityScore = Math.min(100, Math.max(0, (currentMRR / 1000) * 15));
        
        // Calculate recommended amount
        const baseAmount = 50000;
        const growthMultiplier = Math.min(growthRate * 10, 3);
        const revenueMultiplier = Math.min(currentMRR / 10000, 2);
        const recommendedAmount = Math.round(baseAmount * growthMultiplier * revenueMultiplier);
        
        return {
          user: {
            name: doc.userId || 'Unknown User',
            company: doc.startupId || 'Unknown Company',
            currentRevenue: currentMRR,
            currentGrowthRate: growthRate
          },
          recommendation: {
            amount: recommendedAmount,
            confidence: fundingEligibilityScore / 100,
            reason: `High MRR ($${currentMRR}) and growth potential`,
            status: 'APPROVE'
          }
        };
      });
    
    res.json({
      recommendations: eligibleUsers,
      totalEligible: eligibleUsers.length,
      debug: {
        startupIdFilter: startupId,
        uniqueStartupIds,
        totalDocuments: allResults.length
      }
    });
  } catch (error) {
    console.error('Funding recommendations error:', error);
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

// GET agent performance metrics - Updated to use actual MongoDB data
router.get('/performance', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const poscResults = db.collection('posc_results');
    
    // Get all documents from posc_results
    const allResults = await poscResults.find({}).toArray();
    
    // Calculate metrics from actual data
    const totalEvents = allResults.length;
    const triggeredEvents = allResults.filter(doc => doc.metrics?.currentMRR > 1000).length;
    const fundingEligibleEvents = allResults.filter(doc => doc.metrics?.currentMRR >= 1000).length;
    
    // Calculate average response time (simplified)
    const averageResponseTime = 2000; // 2 seconds average
    
    // Create recent activity from actual data
    const recentActivity = allResults
      .sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0))
      .slice(0, 10)
      .map(doc => ({
        eventType: 'SALES_MILESTONE',
        userId: {
          name: doc.userId || 'Unknown User',
          company: doc.startupId || 'Unknown Company'
        },
        createdAt: doc.timestamp || doc.createdAt
      }));
    
    res.json({
      metrics: {
        totalEvents,
        triggeredEvents,
        fundingEligibleEvents,
        averageResponseTime
      },
      recentActivity
    });
  } catch (error) {
    console.error('Performance metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 