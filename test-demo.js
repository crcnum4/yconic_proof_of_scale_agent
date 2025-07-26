const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

// Demo data
const demoUsers = [
  {
    name: 'Alice Johnson',
    email: 'alice@techstartup.com',
    company: 'TechStartup Inc'
  },
  {
    name: 'Bob Smith',
    email: 'bob@innovatecorp.com',
    company: 'InnovateCorp'
  },
  {
    name: 'Carol Davis',
    email: 'carol@growthventures.com',
    company: 'GrowthVentures LLC'
  }
];

const growthData = [
  {
    month: '2024-01',
    newAccounts: 120,
    growthRate: 0.20,
    revenue: 18000,
    salesVolume: 35000
  },
  {
    month: '2024-02',
    newAccounts: 150,
    growthRate: 0.25,
    revenue: 25000,
    salesVolume: 50000
  },
  {
    month: '2024-03',
    newAccounts: 200,
    growthRate: 0.33,
    revenue: 35000,
    salesVolume: 75000
  }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function demo() {
  console.log('🚀 Starting yc0n1c PoSC Agent Demo...\n');

  try {
    // 1. Health Check
    console.log('1️⃣ Checking server health...');
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ Server is healthy:', healthResponse.data.status);
    console.log('');

    // 2. Create Demo Users
    console.log('2️⃣ Creating demo users...');
    const createdUsers = [];
    
    for (const userData of demoUsers) {
      const response = await axios.post(`${BASE_URL}/users`, userData);
      createdUsers.push(response.data);
      console.log(`✅ Created user: ${response.data.name} (${response.data.email})`);
    }
    console.log('');

    // 3. Add Growth Data for Each User
    console.log('3️⃣ Adding growth data...');
    for (let i = 0; i < createdUsers.length; i++) {
      const user = createdUsers[i];
      console.log(`📊 Adding growth data for ${user.name}...`);
      
      for (const growth of growthData) {
        await axios.post(`${BASE_URL}/users/${user._id}/growth`, growth);
        console.log(`   ✅ Added ${growth.month}: $${growth.revenue.toLocaleString()} revenue`);
      }
    }
    console.log('');

    // 4. Check Milestones
    console.log('4️⃣ Checking milestones...');
    for (const user of createdUsers) {
      const milestonesResponse = await axios.get(`${BASE_URL}/users/${user._id}/milestones`);
      const milestones = milestonesResponse.data;
      
      if (milestones.milestones.length > 0) {
        console.log(`🎯 ${user.name} achieved milestones:`, milestones.milestones.map(m => m.milestone).join(', '));
      } else {
        console.log(`📈 ${user.name} - No milestones yet (Current: $${milestones.currentRevenue.toLocaleString()})`);
      }
    }
    console.log('');

    // 5. Trigger Agent Analysis
    console.log('5️⃣ Triggering PoSC Agent analysis...');
    for (const user of createdUsers) {
      console.log(`🤖 Analyzing ${user.name}...`);
      const analysisResponse = await axios.post(`${BASE_URL}/posc-agent/analyze/${user._id}`);
      console.log(`   ✅ Analysis completed for ${user.name}`);
      
      // Show some insights
      const analysis = analysisResponse.data.analysis;
      if (analysis.insights.length > 0) {
        console.log(`   💡 Insights: ${analysis.insights.length} found`);
      }
      if (analysis.recommendations.length > 0) {
        console.log(`   💰 Recommendations: ${analysis.recommendations.length} found`);
      }
    }
    console.log('');

    // 6. Get Dashboard Data
    console.log('6️⃣ Fetching dashboard data...');
    const dashboardResponse = await axios.get(`${BASE_URL}/monitoring/dashboard`);
    const dashboard = dashboardResponse.data;
    
    console.log('📊 Dashboard Overview:');
    console.log(`   👥 Total Users: ${dashboard.overview.totalUsers}`);
    console.log(`   ✅ Active Users: ${dashboard.overview.activeUsers}`);
    console.log(`   📈 Total Events: ${dashboard.overview.totalEvents}`);
    console.log(`   🎯 Triggered Events: ${dashboard.overview.triggeredEvents}`);
    console.log(`   💰 Funding Eligible: ${dashboard.overview.fundingEligibleEvents}`);
    console.log('');

    // 7. Get Funding Recommendations
    console.log('7️⃣ Getting funding recommendations...');
    const fundingResponse = await axios.get(`${BASE_URL}/posc-agent/funding-recommendations`);
    const funding = fundingResponse.data;
    
    console.log(`💰 Found ${funding.count} funding-eligible users:`);
    funding.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec.user.name} (${rec.user.company})`);
      console.log(`      📊 Score: ${rec.analytics.fundingEligibilityScore.toFixed(1)}%`);
      console.log(`      💵 Recommended: $${rec.recommendation.amount.toLocaleString()}`);
      console.log(`      📈 Growth Rate: ${(rec.user.currentGrowthRate * 100).toFixed(1)}%`);
      console.log(`      💰 Current Revenue: $${rec.user.currentRevenue.toLocaleString()}`);
      console.log('');
    });

    // 8. Get Analytics
    console.log('8️⃣ Fetching analytics...');
    const analyticsResponse = await axios.get(`${BASE_URL}/analytics`);
    const analytics = analyticsResponse.data;
    
    console.log('📈 Analytics Overview:');
    console.log(`   📊 Total Analytics: ${analytics.overview.totalAnalytics}`);
    console.log(`   🎯 Average Funding Score: ${analytics.overview.averageFundingScore.toFixed(1)}%`);
    console.log(`   🏆 Top Performers: ${analytics.overview.topPerformers}`);
    console.log(`   💰 Funding Eligible: ${analytics.overview.fundingEligibleUsers}`);
    console.log('');

    // 9. Get Agent Status
    console.log('9️⃣ Checking PoSC Agent status...');
    const agentStatusResponse = await axios.get(`${BASE_URL}/posc-agent/status`);
    const agentStatus = agentStatusResponse.data;
    
    console.log('🤖 PoSC Agent Status:');
    console.log(`   🚀 Running: ${agentStatus.isRunning ? 'Yes' : 'No'}`);
    console.log(`   ⏱️  Monitoring Interval: ${agentStatus.monitoringInterval / 1000}s`);
    console.log(`   📊 Total Events: ${agentStatus.statistics.totalEvents}`);
    console.log(`   🎯 Triggered Events: ${agentStatus.statistics.triggeredEvents}`);
    console.log(`   💰 Funding Eligible Events: ${agentStatus.statistics.fundingEligibleEvents}`);
    console.log('');

    // 10. Get Recent Events
    console.log('🔟 Getting recent monitoring events...');
    const eventsResponse = await axios.get(`${BASE_URL}/monitoring/events?limit=5`);
    const events = eventsResponse.data;
    
    console.log(`📋 Recent Events (${events.events.length}):`);
    events.events.forEach((event, index) => {
      const user = event.userId;
      console.log(`   ${index + 1}. ${event.eventType} - ${user.name} (${user.company})`);
      console.log(`      📅 ${new Date(event.createdAt).toLocaleString()}`);
      console.log(`      🎯 Triggered: ${event.isTriggered ? 'Yes' : 'No'}`);
      if (event.fundingEligible) {
        console.log(`      💰 Funding Eligible: $${event.fundingAmount?.toLocaleString() || 'N/A'}`);
      }
      console.log('');
    });

    console.log('🎉 Demo completed successfully!');
    console.log('');
    console.log('📚 Available endpoints:');
    console.log('   Health: http://localhost:3000/health');
    console.log('   Users: http://localhost:3000/api/v1/users');
    console.log('   Monitoring: http://localhost:3000/api/v1/monitoring/dashboard');
    console.log('   Analytics: http://localhost:3000/api/v1/analytics');
    console.log('   PoSC Agent: http://localhost:3000/api/v1/posc-agent/status');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the demo
if (require.main === module) {
  demo();
}

module.exports = { demo }; 