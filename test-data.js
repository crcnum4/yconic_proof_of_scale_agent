const mongoose = require('mongoose');
const User = require('./models/User');
const GrowthAnalytics = require('./models/GrowthAnalytics');
const MonitoringEvent = require('./models/MonitoringEvent');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/yconic_posc_agent', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function createTestData() {
    try {
        console.log('Creating test data...');

        // Create test users
        const users = await User.create([
            {
                name: 'John Smith',
                email: 'john@techstartup.com',
                company: 'TechStartup Inc',
                currentRevenue: 75000,
                currentGrowthRate: 0.25,
                currentSalesVolume: 120000,
                monthlyGrowth: [
                    {
                        month: '2024-01',
                        newAccounts: 15,
                        growthRate: 0.20,
                        revenue: 60000,
                        salesVolume: 95000
                    },
                    {
                        month: '2024-02',
                        newAccounts: 18,
                        growthRate: 0.25,
                        revenue: 75000,
                        salesVolume: 120000
                    }
                ],
                salesMilestones: [
                    {
                        milestone: '$50K',
                        achievedAt: new Date('2024-01-15'),
                        revenue: 50000
                    }
                ],
                monitoringEnabled: true
            },
            {
                name: 'Sarah Johnson',
                email: 'sarah@innovatecorp.com',
                company: 'InnovateCorp',
                currentRevenue: 120000,
                currentGrowthRate: 0.35,
                currentSalesVolume: 180000,
                monthlyGrowth: [
                    {
                        month: '2024-01',
                        newAccounts: 25,
                        growthRate: 0.30,
                        revenue: 90000,
                        salesVolume: 135000
                    },
                    {
                        month: '2024-02',
                        newAccounts: 32,
                        growthRate: 0.35,
                        revenue: 120000,
                        salesVolume: 180000
                    }
                ],
                salesMilestones: [
                    {
                        milestone: '$100K',
                        achievedAt: new Date('2024-02-01'),
                        revenue: 100000
                    }
                ],
                monitoringEnabled: true
            },
            {
                name: 'Mike Chen',
                email: 'mike@scalestartup.com',
                company: 'ScaleStartup',
                currentRevenue: 45000,
                currentGrowthRate: 0.15,
                currentSalesVolume: 70000,
                monthlyGrowth: [
                    {
                        month: '2024-01',
                        newAccounts: 10,
                        growthRate: 0.10,
                        revenue: 40000,
                        salesVolume: 60000
                    },
                    {
                        month: '2024-02',
                        newAccounts: 12,
                        growthRate: 0.15,
                        revenue: 45000,
                        salesVolume: 70000
                    }
                ],
                salesMilestones: [],
                monitoringEnabled: true
            }
        ]);

        console.log(`Created ${users.length} users`);

        // Create analytics for each user
        for (const user of users) {
            const analytics = new GrowthAnalytics({
                userId: user._id,
                revenueGrowth: {
                    currentMonth: user.currentRevenue,
                    previousMonth: user.monthlyGrowth[0]?.revenue || 0,
                    growthRate: user.currentGrowthRate,
                    trend: user.currentGrowthRate > 0.2 ? 'INCREASING' : 'STABLE'
                },
                newAccountGrowth: {
                    currentMonth: user.monthlyGrowth[1]?.newAccounts || 0,
                    previousMonth: user.monthlyGrowth[0]?.newAccounts || 0,
                    growthRate: 0.2,
                    trend: 'INCREASING'
                },
                salesVolumeGrowth: {
                    currentMonth: user.currentSalesVolume,
                    previousMonth: user.monthlyGrowth[0]?.salesVolume || 0,
                    growthRate: 0.18,
                    trend: 'INCREASING'
                },
                sustainedGrowthPeriods: {
                    count: 1,
                    averageDuration: 2,
                    longestPeriod: 2,
                    currentStreak: 2
                },
                achievedMilestones: user.salesMilestones,
                fundingEligibilityScore: Math.floor(Math.random() * 30) + 70,
                performanceScore: Math.floor(Math.random() * 20) + 80,
                growthScore: Math.floor(Math.random() * 25) + 75
            });

            await analytics.save();
        }

        console.log('Created analytics for all users');

        // Create monitoring events
        const events = await MonitoringEvent.create([
            {
                eventType: 'SALES_MILESTONE',
                userId: users[1]._id, // Sarah Johnson
                eventData: {
                    milestone: '$100K',
                    revenue: 120000,
                    timestamp: new Date()
                },
                triggerValue: 120000,
                thresholdValue: 100000,
                isTriggered: true,
                agentResponse: 'Congratulations! You have achieved the $100K MRR milestone. This qualifies you for Series A funding consideration.',
                severity: 'HIGH',
                priority: 'HIGH',
                fundingEligible: true
            },
            {
                eventType: 'GROWTH_THRESHOLD',
                userId: users[0]._id, // John Smith
                eventData: {
                    growthRate: 0.25,
                    threshold: 0.20,
                    timestamp: new Date()
                },
                triggerValue: 0.25,
                thresholdValue: 0.20,
                isTriggered: true,
                agentResponse: 'Strong growth rate detected! Your 25% month-over-month growth exceeds the 20% threshold.',
                severity: 'MEDIUM',
                priority: 'MEDIUM',
                fundingEligible: true
            },
            {
                eventType: 'MANUAL_TRIGGER',
                userId: users[2]._id, // Mike Chen
                eventData: {
                    analysis: 'User analysis completed',
                    timestamp: new Date()
                },
                triggerValue: 1,
                thresholdValue: 0,
                isTriggered: true,
                agentResponse: 'Analysis complete. Current growth rate of 15% shows steady progress. Consider optimizing sales processes for faster growth.',
                severity: 'LOW',
                priority: 'LOW',
                fundingEligible: false
            }
        ]);

        console.log(`Created ${events.length} monitoring events`);

        console.log('Test data created successfully!');
        console.log('\nYou can now view the dashboard at: http://localhost:3000');
        console.log('The dashboard will display real data from MongoDB.');

    } catch (error) {
        console.error('Error creating test data:', error);
    } finally {
        mongoose.connection.close();
    }
}

createTestData(); 