const User = require('../models/User');
const MonitoringEvent = require('../models/MonitoringEvent');
const GrowthAnalytics = require('../models/GrowthAnalytics');
const moment = require('moment');

class MonitoringService {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.monitoringInterval = parseInt(process.env.MONITORING_INTERVAL_MS) || 300000; // 5 minutes
    this.salesMilestoneThreshold = parseInt(process.env.SALES_MILESTONE_THRESHOLD) || 10000;
    this.growthRateThreshold = parseFloat(process.env.GROWTH_RATE_THRESHOLD) || 0.15;
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ Monitoring service is already running');
      return;
    }

    console.log('🚀 Starting yc0n1c PoSC Agent monitoring service...');
    this.isRunning = true;
    
    // Run initial check
    await this.performMonitoringCheck();
    
    // Set up interval
    this.interval = setInterval(async () => {
      await this.performMonitoringCheck();
    }, this.monitoringInterval);
    
    console.log(`✅ Monitoring service started. Checking every ${this.monitoringInterval / 1000} seconds`);
  }

  async stop() {
    if (!this.isRunning) {
      console.log('⚠️ Monitoring service is not running');
      return;
    }

    console.log('🛑 Stopping monitoring service...');
    this.isRunning = false;
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    console.log('✅ Monitoring service stopped');
  }

  async performMonitoringCheck() {
    try {
      console.log(`🔍 Performing monitoring check at ${new Date().toISOString()}`);
      
      // Get all active users
      const activeUsers = await User.find({ isActive: true, monitoringEnabled: true });
      console.log(`📊 Found ${activeUsers.length} active users to monitor`);
      
      for (const user of activeUsers) {
        await this.checkUserMetrics(user);
      }
      
      console.log('✅ Monitoring check completed');
    } catch (error) {
      console.error('❌ Error during monitoring check:', error);
    }
  }

  async checkUserMetrics(user) {
    try {
      // Update user's growth metrics
      await user.updateGrowthMetrics();
      
      // Check for sales milestones
      const achievedMilestones = await this.checkSalesMilestones(user);
      
      // Check for growth rate triggers
      const growthTriggers = await this.checkGrowthRateTriggers(user);
      
      // Check for sustained growth
      const sustainedGrowth = await this.checkSustainedGrowth(user);
      
      // Update analytics
      await this.updateUserAnalytics(user);
      
      // Determine funding eligibility
      await this.determineFundingEligibility(user);
      
      // Trigger PoSC Agent responses
      if (achievedMilestones.length > 0 || growthTriggers.length > 0 || sustainedGrowth) {
        await this.triggerPoSCAgentResponse(user, {
          milestones: achievedMilestones,
          growthTriggers,
          sustainedGrowth
        });
      }
      
    } catch (error) {
      console.error(`❌ Error checking metrics for user ${user.email}:`, error);
    }
  }

  async checkSalesMilestones(user) {
    const achievedMilestones = user.checkGrowthMilestones();
    
    if (achievedMilestones.length > 0) {
      console.log(`🎯 User ${user.email} achieved ${achievedMilestones.length} new milestone(s)`);
      
      for (const milestone of achievedMilestones) {
        await MonitoringEvent.create({
          eventType: 'SALES_MILESTONE',
          userId: user._id,
          eventData: {
            milestone: milestone.milestone,
            revenue: milestone.revenue,
            achievedAt: milestone.achievedAt
          },
          triggerValue: milestone.revenue,
          thresholdValue: this.salesMilestoneThreshold,
          isTriggered: true,
          severity: 'HIGH',
          priority: 'HIGH'
        });
      }
    }
    
    return achievedMilestones;
  }

  async checkGrowthRateTriggers(user) {
    const triggers = [];
    
    if (user.currentGrowthRate >= this.growthRateThreshold) {
      console.log(`📈 User ${user.email} triggered growth rate threshold: ${user.currentGrowthRate}`);
      
      const event = await MonitoringEvent.create({
        eventType: 'GROWTH_THRESHOLD',
        userId: user._id,
        eventData: {
          currentGrowthRate: user.currentGrowthRate,
          threshold: this.growthRateThreshold,
          revenue: user.currentRevenue
        },
        triggerValue: user.currentGrowthRate,
        thresholdValue: this.growthRateThreshold,
        isTriggered: true,
        severity: 'MEDIUM',
        priority: 'MEDIUM'
      });
      
      triggers.push(event);
    }
    
    return triggers;
  }

  async checkSustainedGrowth(user) {
    if (user.monthlyGrowth.length < 3) return false;
    
    const recentMonths = user.monthlyGrowth.slice(-3);
    const allGrowing = recentMonths.every(growth => growth.growthRate > 0.05);
    
    if (allGrowing) {
      console.log(`🔥 User ${user.email} showing sustained growth over 3 months`);
      
      await MonitoringEvent.create({
        eventType: 'SUSTAINED_GROWTH',
        userId: user._id,
        eventData: {
          growthRates: recentMonths.map(g => g.growthRate),
          averageGrowthRate: recentMonths.reduce((sum, g) => sum + g.growthRate, 0) / recentMonths.length,
          period: '3 months'
        },
        triggerValue: recentMonths[recentMonths.length - 1].growthRate,
        thresholdValue: 0.05,
        isTriggered: true,
        severity: 'HIGH',
        priority: 'HIGH'
      });
      
      return true;
    }
    
    return false;
  }

  async updateUserAnalytics(user) {
    let analytics = await GrowthAnalytics.findOne({ userId: user._id });
    
    if (!analytics) {
      analytics = new GrowthAnalytics({ userId: user._id });
    }
    
    if (user.monthlyGrowth.length >= 2) {
      const current = user.monthlyGrowth[user.monthlyGrowth.length - 1];
      const previous = user.monthlyGrowth[user.monthlyGrowth.length - 2];
      
      // Update growth metrics
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
    
    // Update sustained growth periods
    analytics.sustainedGrowthPeriods = this.calculateSustainedGrowthPeriods(user);
    
    // Update achieved milestones
    analytics.achievedMilestones = user.salesMilestones.map(milestone => ({
      milestone: milestone.milestone,
      achievedAt: milestone.achievedAt,
      revenue: milestone.revenue
    }));
    
    analytics.lastCalculated = new Date();
    await analytics.save();
  }

  calculateSustainedGrowthPeriods(user) {
    if (user.monthlyGrowth.length < 2) {
      return { count: 0, averageDuration: 0, longestPeriod: 0, currentStreak: 0 };
    }
    
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
    
    return {
      count: totalStreaks,
      averageDuration: totalStreaks > 0 ? totalDuration / totalStreaks : 0,
      longestPeriod: longestStreak,
      currentStreak
    };
  }

  async determineFundingEligibility(user) {
    let analytics = await GrowthAnalytics.findOne({ userId: user._id });
    
    if (!analytics) {
      analytics = new GrowthAnalytics({ userId: user._id });
    }
    
    // Calculate funding eligibility score
    await analytics.calculateFundingEligibility();
    
    if (analytics.fundingEligibilityScore >= 70) {
      console.log(`💰 User ${user.email} is funding eligible with score: ${analytics.fundingEligibilityScore}`);
      
      const fundingAmount = this.calculateRecommendedFundingAmount(user);
      
      await MonitoringEvent.create({
        eventType: 'FUNDING_ELIGIBLE',
        userId: user._id,
        eventData: {
          eligibilityScore: analytics.fundingEligibilityScore,
          recommendedAmount: fundingAmount,
          currentRevenue: user.currentRevenue,
          growthRate: user.currentGrowthRate
        },
        triggerValue: analytics.fundingEligibilityScore,
        thresholdValue: 70,
        isTriggered: true,
        fundingEligible: true,
        fundingAmount,
        fundingRecommendation: 'APPROVE',
        severity: 'HIGH',
        priority: 'URGENT'
      });
      
      // Add funding recommendation
      analytics.addFundingRecommendation(
        'APPROVE_FUNDING',
        fundingAmount,
        `High growth rate (${user.currentGrowthRate}) and sustained performance`,
        0.85
      );
    }
  }

  calculateRecommendedFundingAmount(user) {
    const baseAmount = 50000;
    const growthMultiplier = Math.min(user.currentGrowthRate * 10, 3);
    const revenueMultiplier = Math.min(user.currentRevenue / 10000, 2);
    
    return Math.round(baseAmount * growthMultiplier * revenueMultiplier);
  }

  async triggerPoSCAgentResponse(user, triggers) {
    console.log(`🤖 Triggering PoSC Agent response for user ${user.email}`);
    
    const response = this.generateAgentResponse(user, triggers);
    
    // Create monitoring event for agent response
    await MonitoringEvent.create({
      eventType: 'MANUAL_TRIGGER',
      userId: user._id,
      eventData: {
        triggers,
        agentResponse: response,
        timestamp: new Date()
      },
      triggerValue: 1,
      thresholdValue: 0,
      isTriggered: true,
      agentResponse: response,
      severity: 'MEDIUM',
      priority: 'MEDIUM'
    });
    
    // Add agent insight to analytics
    let analytics = await GrowthAnalytics.findOne({ userId: user._id });
    if (analytics) {
      analytics.addAgentInsight(response, 'GROWTH', true);
    }
  }

  generateAgentResponse(user, triggers) {
    let response = `yc0n1c PoSC Agent Analysis for ${user.name}:\n\n`;
    
    if (triggers.milestones.length > 0) {
      response += `🎯 Achieved ${triggers.milestones.length} new sales milestone(s)\n`;
    }
    
    if (triggers.growthTriggers.length > 0) {
      response += `📈 Growth rate threshold exceeded (${user.currentGrowthRate})\n`;
    }
    
    if (triggers.sustainedGrowth) {
      response += `🔥 Sustained growth detected over 3+ months\n`;
    }
    
    response += `\nCurrent Metrics:\n`;
    response += `- Revenue: $${user.currentRevenue.toLocaleString()}\n`;
    response += `- Growth Rate: ${(user.currentGrowthRate * 100).toFixed(1)}%\n`;
    response += `- Sales Volume: ${user.currentSalesVolume.toLocaleString()}\n`;
    
    return response;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      monitoringInterval: this.monitoringInterval,
      lastCheck: this.lastCheck,
      activeUsers: this.activeUsers || 0
    };
  }
}

module.exports = new MonitoringService(); 