// Test Bright Data Integration
import { BrightDataService } from './bright_data_service';

async function testBrightDataIntegration() {
  console.log('🧪 Testing Bright Data Integration');
  console.log('='.repeat(50));

  try {
    // Initialize Bright Data service with hardcoded API key and customer ID
    const apiKey = 'a01eb59fb076fd01db9c9edd664c08b69d3b0b8202b1a2684bca6cf07871aa4b';
    const customerId = 'hl_290774ac'; // Your Bright Data Customer ID
    console.log(`🔑 Using API Key: ${apiKey.substring(0, 10)}...`);
    console.log(`👤 Using Customer ID: ${customerId}...`);
    
    const brightDataService = new BrightDataService(apiKey, customerId);

    // Test startup monitoring
    console.log('\n🚀 Testing startup monitoring...');
    const startupMentions = await brightDataService.monitorStartup('yc0n1c');

    console.log('\n📊 Test Results:');
    console.log(`✅ Total Mentions: ${startupMentions.totalMentions}`);
    console.log(`✅ Positive Mentions: ${startupMentions.positiveMentions}`);
    console.log(`✅ Negative Mentions: ${startupMentions.negativeMentions}`);
    console.log(`✅ Neutral Mentions: ${startupMentions.neutralMentions}`);
    console.log(`✅ Average Sentiment: ${startupMentions.averageSentimentScore.toFixed(3)}`);
    console.log(`✅ Trending Keywords: ${startupMentions.trendingKeywords.join(', ')}`);

    // Test sentiment trends
    console.log('\n📈 Testing sentiment trends...');
    const sentimentTrends = await brightDataService.getSentimentTrends('yc0n1c', 30);

    console.log('\n📊 Sentiment Trends:');
    console.log(`✅ Average Sentiment: ${sentimentTrends.averageSentiment}`);
    console.log(`✅ Trend: ${sentimentTrends.sentimentTrend}`);
    console.log(`✅ Mention Growth: ${sentimentTrends.mentionGrowth}%`);

    console.log('\n🎉 Bright Data integration test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testBrightDataIntegration(); 