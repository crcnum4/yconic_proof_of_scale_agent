const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testAllEndpoints() {
    console.log('🧪 Testing All API Endpoints Used by tabs.js\n');
    
    const tests = [
        {
            name: 'Agent Status',
            endpoint: '/posc-agent/status',
            description: 'Used in Overview tab'
        },
        {
            name: 'Analytics Dashboard',
            endpoint: '/analytics/dashboard',
            description: 'Used in Overview, Cashflow, Funding tabs'
        },
        {
            name: 'Monitoring Dashboard',
            endpoint: '/monitoring/dashboard',
            description: 'Used in Overview tab'
        },
        {
            name: 'Recent Events',
            endpoint: '/monitoring/events?limit=5&sortBy=createdAt&sortOrder=desc',
            description: 'Used in Cashflow tab'
        },
        {
            name: 'Funding Recommendations',
            endpoint: '/posc-agent/funding-recommendations?minScore=70&limit=10',
            description: 'Used in Funding tab'
        },
        {
            name: 'Top Performers',
            endpoint: '/analytics/top-performers?limit=5&metric=fundingEligibilityScore',
            description: 'Used in Funding tab'
        },
        {
            name: 'Agent Performance',
            endpoint: '/posc-agent/performance',
            description: 'Used in Metrics tab'
        },
        {
            name: 'Growth Trends',
            endpoint: '/analytics/growth-trends?period=30d',
            description: 'Used in Metrics tab'
        }
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    for (const test of tests) {
        try {
            console.log(`📋 Testing: ${test.name}`);
            console.log(`   Endpoint: ${test.endpoint}`);
            console.log(`   Description: ${test.description}`);
            
            const response = await axios.get(`${BASE_URL}${test.endpoint}`);
            
            if (response.status === 200) {
                console.log(`   ✅ Status: ${response.status}`);
                console.log(`   📊 Response keys: ${Object.keys(response.data).join(', ')}`);
                
                // Show sample data for key endpoints
                if (test.name === 'Analytics Dashboard') {
                    console.log(`   📈 Total Analytics: ${response.data.overview?.totalAnalytics || 0}`);
                    console.log(`   💰 Total Revenue: $${response.data.totalRevenue || 0}`);
                    console.log(`   🏦 Total Balance: $${response.data.totalBalance || 0}`);
                } else if (test.name === 'Agent Status') {
                    console.log(`   🤖 Agent Running: ${response.data.isRunning || false}`);
                    console.log(`   📊 Total Events: ${response.data.statistics?.totalEvents || 0}`);
                } else if (test.name === 'Funding Recommendations') {
                    console.log(`   🎯 Total Eligible: ${response.data.totalEligible || 0}`);
                    console.log(`   📋 Recommendations: ${response.data.recommendations?.length || 0}`);
                }
                
                passedTests++;
            } else {
                console.log(`   ❌ Status: ${response.status}`);
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            if (error.response) {
                console.log(`   📄 Response: ${error.response.status} - ${error.response.statusText}`);
            }
        }
        
        console.log(''); // Empty line for readability
    }
    
    console.log(`📊 Test Summary:`);
    console.log(`   ✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`   ❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    console.log(`   📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 All API endpoints are working correctly!');
        console.log('✅ tabs.js should be able to load all data properly.');
    } else {
        console.log('\n⚠️ Some API endpoints have issues.');
        console.log('🔧 Check the server logs for more details.');
    }
}

// Run the tests
testAllEndpoints().catch(console.error); 