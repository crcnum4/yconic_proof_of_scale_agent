const express = require('express');
const MonitoringEvent = require('../models/MonitoringEvent');
const User = require('../models/User');
const GrowthAnalytics = require('../models/GrowthAnalytics');
const monitoringService = require('../services/monitoringService');
const router = express.Router();

// GET all monitoring events
router.get('/events', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      eventType, 
      triggered, 
      fundingEligible,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const query = {};
    if (eventType) query.eventType = eventType;
    if (triggered !== undefined) query.isTriggered = triggered === 'true';
    if (fundingEligible !== undefined) query.fundingEligible = fundingEligible === 'true';
    
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const events = await MonitoringEvent.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'name email company currentRevenue')
      .select('-__v');
    
    const total = await MonitoringEvent.countDocuments(query);
    
    res.json({
      events,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalEvents: total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET monitoring event by ID
router.get('/events/:id', async (req, res) => {
  try {
    const event = await MonitoringEvent.findById(req.params.id)
      .populate('userId', 'name email company currentRevenue')
      .select('-__v');
    
    if (!event) {
      return res.status(404).json({ error: 'Monitoring event not found' });
    }
    
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalEvents,
      triggeredEvents,
      fundingEligibleEvents,
      recentEvents
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      MonitoringEvent.countDocuments(),
      MonitoringEvent.countDocuments({ isTriggered: true }),
      MonitoringEvent.countDocuments({ fundingEligible: true }),
      MonitoringEvent.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'name email company')
    ]);
    
    // Get top performers
    const topPerformers = await GrowthAnalytics.find()
      .sort({ performanceScore: -1 })
      .limit(5)
      .populate('userId', 'name email company currentRevenue');
    
    // Get funding eligible users
    const fundingEligibleUsers = await GrowthAnalytics.find({ fundingEligibilityScore: { $gte: 70 } })
      .sort({ fundingEligibilityScore: -1 })
      .limit(5)
      .populate('userId', 'name email company currentRevenue');
    
    res.json({
      overview: {
        totalUsers,
        activeUsers,
        totalEvents,
        triggeredEvents,
        fundingEligibleEvents
      },
      recentEvents,
      topPerformers,
      fundingEligibleUsers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET monitoring service status
router.get('/status', async (req, res) => {
  try {
    const status = monitoringService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST manually trigger monitoring for a user
router.post('/trigger/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Trigger monitoring check for this user
    await monitoringService.checkUserMetrics(user);
    
    res.json({ message: 'Monitoring triggered successfully for user' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST manually trigger an event
router.post('/events/trigger', async (req, res) => {
  try {
    const { userId, eventType, eventData, triggerValue, thresholdValue } = req.body;
    
    if (!userId || !eventType || !eventData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const event = await MonitoringEvent.create({
      eventType,
      userId,
      eventData,
      triggerValue: triggerValue || 0,
      thresholdValue: thresholdValue || 0,
      isTriggered: true,
      severity: 'MEDIUM',
      priority: 'MEDIUM'
    });
    
    res.status(201).json({ message: 'Event triggered successfully', event });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET recent alerts
router.get('/alerts', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const alerts = await MonitoringEvent.find({
      isTriggered: true,
      severity: { $in: ['HIGH', 'CRITICAL'] }
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .populate('userId', 'name email company')
    .select('-__v');
    
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT mark event as notified
router.put('/events/:id/notify', async (req, res) => {
  try {
    const event = await MonitoringEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Monitoring event not found' });
    }
    
    await event.markNotified();
    
    res.json({ message: 'Event marked as notified', event });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT resolve event
router.put('/events/:id/resolve', async (req, res) => {
  try {
    const event = await MonitoringEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Monitoring event not found' });
    }
    
    await event.resolve();
    
    res.json({ message: 'Event resolved', event });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST add agent action to event
router.post('/events/:id/action', async (req, res) => {
  try {
    const { action, details } = req.body;
    
    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }
    
    const event = await MonitoringEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Monitoring event not found' });
    }
    
    await event.addAgentAction(action, details);
    
    res.json({ message: 'Agent action added successfully', event });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET event statistics
router.get('/stats', async (req, res) => {
  try {
    const [
      totalEvents,
      triggeredEvents,
      fundingEligibleEvents,
      salesMilestoneEvents,
      growthThresholdEvents,
      sustainedGrowthEvents
    ] = await Promise.all([
      MonitoringEvent.countDocuments(),
      MonitoringEvent.countDocuments({ isTriggered: true }),
      MonitoringEvent.countDocuments({ fundingEligible: true }),
      MonitoringEvent.countDocuments({ eventType: 'SALES_MILESTONE' }),
      MonitoringEvent.countDocuments({ eventType: 'GROWTH_THRESHOLD' }),
      MonitoringEvent.countDocuments({ eventType: 'SUSTAINED_GROWTH' })
    ]);
    
    // Get events by severity
    const severityStats = await MonitoringEvent.aggregate([
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get events by priority
    const priorityStats = await MonitoringEvent.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      totalEvents,
      triggeredEvents,
      fundingEligibleEvents,
      byType: {
        salesMilestone: salesMilestoneEvents,
        growthThreshold: growthThresholdEvents,
        sustainedGrowth: sustainedGrowthEvents
      },
      bySeverity: severityStats,
      byPriority: priorityStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 