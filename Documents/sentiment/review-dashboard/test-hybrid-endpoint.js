const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const APP_ID = '416839124'; // Hyundai Blue Link app

// Read credentials from environment or files
const ISSUER_ID = process.env.APPLE_ISSUER_ID || '69a6de92-f10e-47e3-e053-5b8c7c11a4d1';
const KEY_ID = process.env.APPLE_KEY_ID || '34999638C7';
const PRIVATE_KEY_PATH = process.env.APPLE_PRIVATE_KEY_PATH || path.join(__dirname, '..', 'AuthKey_34999638C7.p8');

async function testHybridEndpoint() {
  console.log('=== Testing Apple Hybrid Reviews Endpoint ===\n');
  console.log('Backend URL:', BACKEND_URL);
  console.log('App ID:', APP_ID);
  
  try {
    // First, check if backend is running
    console.log('Checking backend health...');
    try {
      const healthResponse = await axios.get(`${BACKEND_URL}/api/health`);
      console.log('Backend is running:', healthResponse.data);
    } catch (error) {
      console.error('Backend is not accessible. Please ensure it\'s running on', BACKEND_URL);
      return;
    }
    
    // Read private key if path is provided
    let privateKey = '';
    if (PRIVATE_KEY_PATH && fs.existsSync(PRIVATE_KEY_PATH)) {
      privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
      console.log('Private key loaded from:', PRIVATE_KEY_PATH);
    }
    
    // Test RSS-only endpoint first
    console.log('\n--- Testing RSS-only endpoint ---');
    const rssResponse = await axios.post(`${BACKEND_URL}/api/apple-reviews/rss`, {
      appId: APP_ID,
      countries: ['us', 'gb', 'ca'],
      limit: 10
    });
    
    if (rssResponse.data.success) {
      console.log(`RSS endpoint returned ${rssResponse.data.reviews.length} reviews`);
      if (rssResponse.data.reviews.length > 0) {
        const newest = new Date(rssResponse.data.reviews[0].Date);
        const daysAgo = Math.floor((Date.now() - newest) / (1000 * 60 * 60 * 24));
        console.log(`Most recent RSS review: ${daysAgo} days ago (${newest.toLocaleDateString()})`);
      }
    }
    
    // Test hybrid endpoint
    console.log('\n--- Testing Hybrid endpoint ---');
    const formData = new FormData();
    formData.append('appId', APP_ID);
    formData.append('issuerId', ISSUER_ID);
    formData.append('keyId', KEY_ID);
    formData.append('privateKey', privateKey);
    formData.append('countries', JSON.stringify(['us', 'gb', 'ca', 'au']));
    
    // Note: Since we're using Node.js, we need to use a different approach for FormData
    // Using regular object instead
    const hybridResponse = await axios.post(`${BACKEND_URL}/api/apple-reviews/hybrid`, {
      appId: APP_ID,
      issuerId: ISSUER_ID,
      keyId: KEY_ID,
      privateKey: privateKey,
      countries: ['us', 'gb', 'ca', 'au']
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 1 minute timeout
    });
    
    if (hybridResponse.data.success) {
      console.log(`\nHybrid endpoint returned ${hybridResponse.data.totalCount} reviews`);
      console.log('Sources breakdown:');
      console.log('- RSS:', hybridResponse.data.sources.rss);
      console.log('- API:', hybridResponse.data.sources.api);
      
      if (hybridResponse.data.dateRange) {
        const newest = new Date(hybridResponse.data.dateRange.newest);
        const oldest = new Date(hybridResponse.data.dateRange.oldest);
        const newestDaysAgo = Math.floor((Date.now() - newest) / (1000 * 60 * 60 * 24));
        
        console.log(`\nDate range: ${newest.toLocaleDateString()} to ${oldest.toLocaleDateString()}`);
        console.log(`Most recent review: ${newestDaysAgo} days ago`);
        
        // Show sample of most recent reviews
        console.log('\nMost recent 5 reviews:');
        hybridResponse.data.reviews.slice(0, 5).forEach((review, index) => {
          const date = new Date(review.Date);
          const daysAgo = Math.floor((Date.now() - date) / (1000 * 60 * 60 * 24));
          console.log(`${index + 1}. ${date.toLocaleDateString()} (${daysAgo} days ago) - ${review.Rating}★ - ${review.Country} - Source: ${review.Source || 'API'}`);
        });
      }
    }
    
  } catch (error) {
    console.error('\nError testing hybrid endpoint:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testHybridEndpoint();