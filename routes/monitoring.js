const express = require('express');
const MonitoringEvent = require('../models/MonitoringEvent');
const User = require('../models/User');
const GrowthAnalytics = require('../models/GrowthAnalytics');
const monitoringService = require('../services/monitoringService');
const router = express.Router();

// GET all monitoring events - Updated to use actual MongoDB data
router.get('/events', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      eventType, 
      triggered, 
      fundingEligible,
      startupId, // Add startupId filter parameter
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const poscResults = db.collection('posc_results');
    
    // Build query with optional filters
    const query = {};
    if (startupId) {
      query.startupId = startupId;
      console.log(`Filtering by startupId: ${startupId}`);
    }
    
    // Get documents from posc_results with optional filter
    let allResults = await poscResults.find(query).toArray();
    console.log('Found documents:', allResults.length);
    
    // Debug: Show unique startupId values found
    const uniqueStartupIds = [...new Set(allResults.map(doc => doc.startupId))];
    console.log('Unique startupId values found:', uniqueStartupIds);
    
    // Apply filters based on actual data
    if (fundingEligible === 'true') {
      allResults = allResults.filter(doc => doc.metrics?.currentMRR >= 1000);
    }
    
    // Sort by timestamp/createdAt
    allResults.sort((a, b) => {
      const dateA = new Date(a.timestamp || a.createdAt || 0);
      const dateB = new Date(b.timestamp || b.createdAt || 0);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedResults = allResults.slice(startIndex, endIndex);
    
    // Transform to match expected format
    const events = paginatedResults.map(doc => ({
      eventType: 'SALES_MILESTONE',
      userId: {
        name: doc.userId || 'Unknown User',
        company: doc.startupId || 'Unknown Company'
      },
      createdAt: doc.timestamp || doc.createdAt,
      eventData: {
        currentMRR: doc.metrics?.currentMRR || 0,
        previousMRR: doc.metrics?.previousMRR || 0,
        transactionCount: doc.metrics?.transactionCount || 0,
        customerCount: doc.metrics?.customerCount || 0
      }
    }));
    
    res.json({
      events,
      totalPages: Math.ceil(allResults.length / parseInt(limit)),
      currentPage: parseInt(page),
      totalEvents: allResults.length,
      debug: {
        startupIdFilter: startupId,
        uniqueStartupIds,
        totalDocuments: allResults.length
      }
    });
  } catch (error) {
    console.error('Events error:', error);
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

// GET dashboard data - Updated to use actual MongoDB data
router.get('/dashboard', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const poscResults = db.collection('posc_results');
    
    // Get all documents from posc_results
    const allResults = await poscResults.find({}).toArray();
    
    // Calculate metrics from actual data
    const totalUsers = allResults.length;
    const activeUsers = allResults.filter(doc => doc.metrics?.currentMRR > 0).length;
    const totalEvents = allResults.length; // Each document represents an event
    const triggeredEvents = allResults.filter(doc => doc.metrics?.currentMRR > 1000).length; // $1000+ MRR threshold
    const fundingEligibleEvents = allResults.filter(doc => doc.metrics?.currentMRR >= 1000).length;
    
    // Create recent events from actual data
    const recentEvents = allResults
      .sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0))
      .slice(0, 5)
      .map(doc => ({
        eventType: 'SALES_MILESTONE',
        userId: {
          name: doc.userId || 'Unknown User',
          company: doc.startupId || 'Unknown Company'
        },
        createdAt: doc.timestamp || doc.createdAt
      }));
    
    // Create top performers from actual data
    const topPerformers = allResults
      .filter(doc => doc.metrics?.currentMRR > 0)
      .sort((a, b) => (b.metrics?.currentMRR || 0) - (a.metrics?.currentMRR || 0))
      .slice(0, 5)
      .map(doc => ({
        userId: {
          name: doc.userId || 'Unknown User',
          company: doc.startupId || 'Unknown Company',
          currentRevenue: doc.metrics?.currentMRR || 0
        },
        performanceScore: Math.min(100, Math.max(0, (doc.metrics?.currentMRR / 1000) * 20))
      }));
    
    // Create funding eligible users
    const fundingEligibleUsers = allResults
      .filter(doc => doc.metrics?.currentMRR >= 1000)
      .map(doc => ({
        userId: {
          name: doc.userId || 'Unknown User',
          company: doc.startupId || 'Unknown Company',
          currentRevenue: doc.metrics?.currentMRR || 0
        },
        fundingEligibilityScore: Math.min(100, Math.max(0, (doc.metrics?.currentMRR / 1000) * 15))
      }));
    
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
    console.error('Monitoring dashboard error:', error);
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