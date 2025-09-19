// Test Reddit API authentication
require('dotenv').config();
const axios = require('axios');

async function testRedditAuth() {
  console.log('\n=== Reddit API Authentication Test ===\n');
  
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const userAgent = process.env.REDDIT_USER_AGENT || 'ReviewDashboard/1.0.0';
  
  // Check if credentials are set
  console.log('1. Checking environment variables:');
  console.log(`   Client ID: ${clientId ? `✓ Set (${clientId.substring(0, 4)}...)` : '✗ Not set'}`);
  console.log(`   Client Secret: ${clientSecret ? `✓ Set (${clientSecret.substring(0, 4)}...)` : '✗ Not set'}`);
  console.log(`   User Agent: ${userAgent}`);
  
  if (!clientId || !clientSecret) {
    console.log('\n❌ Error: Reddit API credentials are not set!');
    console.log('\nPlease follow these steps:');
    console.log('1. Go to https://www.reddit.com/prefs/apps');
    console.log('2. Create a new app (select "script" type)');
    console.log('3. Copy the Client ID and Client Secret');
    console.log('4. Update the .env file in this directory');
    return;
  }
  
  // Test authentication
  console.log('\n2. Testing authentication...');
  
  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': userAgent
        }
      }
    );
    
    console.log('   ✓ Authentication successful!');
    console.log(`   Access token: ${response.data.access_token.substring(0, 10)}...`);
    console.log(`   Expires in: ${response.data.expires_in} seconds`);
    
    // Test a simple API call
    console.log('\n3. Testing API access...');
    
    const apiResponse = await axios.get('https://oauth.reddit.com/api/v1/me', {
      headers: {
        'Authorization': `Bearer ${response.data.access_token}`,
        'User-Agent': userAgent
      }
    });
    
    console.log('   ✓ API access working!');
    console.log('\n✅ Reddit API is properly configured and working!\n');
    
  } catch (error) {
    console.log('   ✗ Authentication failed!');
    console.log(`   Error: ${error.response?.data?.error || error.message}`);
    
    if (error.response?.status === 401) {
      console.log('\n❌ Invalid credentials! Please check your Client ID and Client Secret.');
    } else {
      console.log('\n❌ Authentication error:', error.message);
    }
  }
}

testRedditAuth();