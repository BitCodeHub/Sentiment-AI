const axios = require('axios');
const fs = require('fs');

async function testHybridEndpoint() {
  console.log('Testing hybrid endpoint fix...\n');
  
  // Test configuration
  const appId = '1234567890'; // Replace with actual app ID
  const backendUrl = 'http://localhost:3001/api/apple-reviews/hybrid';
  
  // Read credentials from files
  const keyFiles = fs.readdirSync('.').filter(f => f.endsWith('.p8'));
  if (keyFiles.length === 0) {
    console.log('No .p8 files found. Please add your Apple private key file.');
    return;
  }
  
  const privateKey = fs.readFileSync(keyFiles[0], 'utf8');
  const keyId = keyFiles[0].match(/AuthKey_([A-Z0-9]+)\.p8/)?.[1] || '';
  
  // Try to get issuer ID from VERIFY_KEY_ID.md
  let issuerId = '';
  if (fs.existsSync('VERIFY_KEY_ID.md')) {
    const content = fs.readFileSync('VERIFY_KEY_ID.md', 'utf8');
    const match = content.match(/Issuer ID: ([a-f0-9-]+)/i);
    if (match) {
      issuerId = match[1];
    }
  }
  
  if (!issuerId) {
    console.log('Could not find Issuer ID. Please check VERIFY_KEY_ID.md');
    return;
  }
  
  console.log('Configuration:');
  console.log(`- App ID: ${appId}`);
  console.log(`- Issuer ID: ${issuerId}`);
  console.log(`- Key ID: ${keyId}`);
  console.log(`- Private Key: ${privateKey.substring(0, 50)}...`);
  
  // Test 1: With credentials (should use Apple API)
  console.log('\n=== Test 1: With Credentials (should use Apple API) ===');
  try {
    const response = await axios.post(backendUrl, {
      appId,
      issuerId,
      keyId,
      privateKey,
      useServerCredentials: false,
      countries: ['us'],
      daysToFetch: 90
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    });
    
    console.log('Response:', {
      success: response.data.success,
      totalCount: response.data.totalCount,
      sources: response.data.sources
    });
    
    if (response.data.sources?.api) {
      console.log('Apple API results:', {
        success: response.data.sources.api.success,
        count: response.data.sources.api.count,
        error: response.data.sources.api.error
      });
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
  
  // Test 2: Without credentials (should only use RSS)
  console.log('\n=== Test 2: Without Credentials (should only use RSS) ===');
  try {
    const response = await axios.post(backendUrl, {
      appId,
      useServerCredentials: false,
      countries: ['us'],
      daysToFetch: 90
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    });
    
    console.log('Response:', {
      success: response.data.success,
      totalCount: response.data.totalCount,
      sources: response.data.sources
    });
    
    if (response.data.sources?.api) {
      console.log('Apple API results:', {
        success: response.data.sources.api.success,
        count: response.data.sources.api.count,
        error: response.data.sources.api.error
      });
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Wait a bit for server to start
setTimeout(() => {
  testHybridEndpoint().catch(console.error);
}, 2000);