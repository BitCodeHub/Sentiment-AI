require('dotenv').config();
const axios = require('axios');

console.log('=== Testing Reddit API Connection ===\n');

// Check environment variables
console.log('1. Checking environment variables:');
console.log('   REDDIT_CLIENT_ID:', process.env.REDDIT_CLIENT_ID ? `✓ Set (${process.env.REDDIT_CLIENT_ID.length} chars)` : '✗ Not set');
console.log('   REDDIT_CLIENT_SECRET:', process.env.REDDIT_CLIENT_SECRET ? `✓ Set (${process.env.REDDIT_CLIENT_SECRET.length} chars)` : '✗ Not set');
console.log('   Backend URL:', process.env.BACKEND_URL || 'http://localhost:3001');
console.log('');

if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
  console.error('❌ Reddit credentials are not configured in .env file');
  console.error('   Please add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET to your .env file');
  process.exit(1);
}

// Test direct Reddit API authentication
async function testRedditAuth() {
  console.log('2. Testing direct Reddit API authentication:');
  
  try {
    const auth = Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64');
    const response = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'ReviewDashboard/1.0.0'
        }
      }
    );
    
    console.log('   ✓ Authentication successful!');
    console.log('   Access token received:', response.data.access_token.substring(0, 20) + '...');
    console.log('   Token type:', response.data.token_type);
    console.log('   Expires in:', response.data.expires_in, 'seconds');
    return response.data.access_token;
  } catch (error) {
    console.error('   ✗ Authentication failed!');
    console.error('   Error:', error.response?.data || error.message);
    return null;
  }
}

// Test backend Reddit endpoints
async function testBackendEndpoints() {
  console.log('\n3. Testing backend Reddit endpoints:');
  
  const backendUrl = 'http://localhost:3001';
  
  // Test status endpoint
  try {
    console.log('   Testing /api/reddit/status...');
    const statusResponse = await axios.get(`${backendUrl}/api/reddit/status`);
    console.log('   ✓ Status endpoint working');
    console.log('   Response:', JSON.stringify(statusResponse.data, null, 2));
  } catch (error) {
    console.error('   ✗ Status endpoint failed:', error.message);
  }
  
  // Test search endpoint
  try {
    console.log('\n   Testing /api/reddit/search...');
    const searchResponse = await axios.post(`${backendUrl}/api/reddit/search`, {
      appName: 'Instagram',
      limit: 5,
      sort: 'new'
    });
    console.log('   ✓ Search endpoint working');
    console.log('   Found', searchResponse.data.count || 0, 'posts');
    if (searchResponse.data.posts && searchResponse.data.posts.length > 0) {
      console.log('   First post:', searchResponse.data.posts[0].title);
    }
  } catch (error) {
    console.error('   ✗ Search endpoint failed:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  const token = await testRedditAuth();
  
  if (token) {
    console.log('\n✅ Reddit API credentials are valid!');
  } else {
    console.log('\n❌ Reddit API credentials are invalid or there\'s a connection issue');
  }
  
  await testBackendEndpoints();
  
  console.log('\n=== Test Complete ===');
}

runTests().catch(console.error);