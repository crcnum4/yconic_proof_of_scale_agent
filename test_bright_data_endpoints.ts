import axios from 'axios';

async function testBrightDataEndpoints() {
  const apiKey = 'a01eb59fb076fd01db9c9edd664c08b69d3b0b8202b1a2684bca6cf07871aa4b';
  const customerId = 'hl_290774ac';
  const baseUrl = 'https://api.brightdata.com';

  console.log('🔍 Testing different Bright Data API endpoints...\n');

  const endpoints = [
    '/scrape',
    '/dca/scrape',
    '/web-scraper',
    '/serp/google',
    '/account',
    '/datasets'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing endpoint: ${endpoint}`);
      
      let requestBody = {};
      if (endpoint === '/scrape' || endpoint === '/dca/scrape') {
        requestBody = {
          url: 'https://www.google.com',
          format: 'json',
          render: true,
          customer_id: customerId
        };
      } else if (endpoint === '/web-scraper') {
        requestBody = {
          url: 'https://www.google.com',
          country: 'us'
        };
      } else if (endpoint === '/serp/google') {
        requestBody = {
          query: 'test',
          country: 'us',
          num: 5
        };
      }

      const response = await axios.post(
        `${baseUrl}${endpoint}`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ ${endpoint}: ${response.status} - Success`);
      console.log(`   Response keys: ${Object.keys(response.data || {}).join(', ')}`);
    } catch (error: any) {
      console.log(`❌ ${endpoint}: ${error.response?.status || 'Unknown'} - ${error.response?.statusText || error.message}`);
    }
    console.log('');
  }
}

testBrightDataEndpoints().catch(console.error); 