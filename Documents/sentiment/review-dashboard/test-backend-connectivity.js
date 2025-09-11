import axios from 'axios';

const BACKEND_URL = 'http://localhost:3001';

async function testBackendConnectivity() {
  console.log('Testing backend connectivity...\n');
  
  // Test 1: Basic connectivity
  console.log('1. Testing basic connectivity...');
  try {
    const testResponse = await axios.get(`${BACKEND_URL}/api/test`);
    console.log('✓ Test endpoint reached:', testResponse.data);
  } catch (error) {
    console.error('✗ Test endpoint failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Backend server is not running on port 3001');
      console.error('   Run: cd backend && npm start');
    }
  }
  
  // Test 2: Health check
  console.log('\n2. Testing health check...');
  try {
    const healthResponse = await axios.get(`${BACKEND_URL}/api/health`);
    console.log('✓ Health check passed:', healthResponse.data);
  } catch (error) {
    console.error('✗ Health check failed:', error.message);
  }
  
  // Test 3: CORS headers
  console.log('\n3. Testing CORS...');
  try {
    const corsResponse = await axios.get(`${BACKEND_URL}/api/health`, {
      headers: {
        'Origin': 'http://localhost:5173'
      }
    });
    console.log('✓ CORS test passed, headers:', corsResponse.headers);
  } catch (error) {
    console.error('✗ CORS test failed:', error.message);
  }
  
  // Test 4: POST to summarizations (without credentials)
  console.log('\n4. Testing summarizations endpoint (expecting credential error)...');
  try {
    const formData = new FormData();
    formData.append('appId', '123456789');
    formData.append('useServerCredentials', 'false');
    
    const summResponse = await axios.post(`${BACKEND_URL}/api/apple-reviews/summarizations`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    console.log('Response:', summResponse.data);
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✓ Endpoint reachable, expected error:', error.response.data);
    } else {
      console.error('✗ Unexpected error:', error.message);
    }
  }
  
  console.log('\n✅ Backend connectivity test complete');
}

testBackendConnectivity().catch(console.error);