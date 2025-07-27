import axios from 'axios';

async function testBrightDataAuth() {
  const apiKey = 'a01eb59fb076fd01db9c9edd664c08b69d3b0b8202b1a2684bca6cf07871aa4b';
  const customerId = 'hl_290774ac';
  
  console.log('🔍 Testing Bright Data authentication methods...\n');

  // Test different base URLs
  const baseUrls = [
    'https://api.brightdata.com',
    'https://brightdata.com/api',
    'https://api.brightdata.com/v1',
    'https://api.brightdata.com/v2'
  ];

  // Test different authentication headers
  const authMethods = [
    { name: 'Bearer Token', header: `Bearer ${apiKey}` },
    { name: 'API Key', header: apiKey },
    { name: 'X-API-Key', header: apiKey },
    { name: 'Authorization API Key', header: `API-Key ${apiKey}` }
  ];

  for (const baseUrl of baseUrls) {
    for (const authMethod of authMethods) {
      try {
        console.log(`Testing: ${baseUrl} with ${authMethod.name}`);
        
        const response = await axios.get(
          `${baseUrl}/account`,
          {
            headers: {
              'Authorization': authMethod.header,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log(`✅ Success: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(response.data, null, 2).substring(0, 200)}...`);
        return; // If we find a working method, stop testing
      } catch (error: any) {
        console.log(`❌ Failed: ${error.response?.status || 'Unknown'} - ${error.response?.statusText || error.message}`);
      }
    }
    console.log('');
  }

  console.log('❌ No working authentication method found');
}

testBrightDataAuth().catch(console.error); 