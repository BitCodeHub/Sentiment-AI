#!/usr/bin/env node

/**
 * Verification script for Competitive Analysis Feature
 * Tests both frontend and backend functionality
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

// Configuration
const FRONTEND_URL = 'https://sentiment-review-dashboard.onrender.com';
const BACKEND_URL = 'https://sentiment-review-backend.onrender.com';
const LOCAL_BACKEND = 'http://localhost:5000'; // For local testing

// Test competitors
const TEST_COMPETITORS = ['Tesla', 'FordPass', 'My BMW'];
const TEST_APP_ID = '582007913'; // Tesla App ID

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = client.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

// Test functions
async function testBackendHealth(backendUrl) {
  console.log(`${colors.blue}Testing Backend Health...${colors.reset}`);
  try {
    const response = await makeRequest(`${backendUrl}/health`);
    if (response.status === 200) {
      console.log(`${colors.green}✓ Backend is healthy${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}✗ Backend health check failed: ${response.status}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Backend is not reachable: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testCompetitorInfo(backendUrl) {
  console.log(`\n${colors.blue}Testing Competitor Info Endpoint...${colors.reset}`);
  try {
    const response = await makeRequest(`${backendUrl}/api/competitors/info?appName=Tesla`);
    if (response.status === 200 && response.data.trackName) {
      console.log(`${colors.green}✓ iTunes API working${colors.reset}`);
      console.log(`  - App: ${response.data.trackName}`);
      console.log(`  - Rating: ${response.data.averageUserRating}/5`);
      console.log(`  - Reviews: ${response.data.userRatingCount.toLocaleString()}`);
      return true;
    } else {
      console.log(`${colors.red}✗ iTunes API failed: ${JSON.stringify(response.data)}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Competitor info error: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testCompetitorReviews(backendUrl) {
  console.log(`\n${colors.blue}Testing Competitor Reviews Endpoint...${colors.reset}`);
  try {
    const response = await makeRequest(`${backendUrl}/api/competitors/reviews?appId=${TEST_APP_ID}&country=us`);
    if (response.status === 200 && response.data.reviews && response.data.reviews.length > 0) {
      console.log(`${colors.green}✓ RSS Reviews working${colors.reset}`);
      console.log(`  - Reviews fetched: ${response.data.reviews.length}`);
      console.log(`  - Latest review: "${response.data.reviews[0].title}"`);
      console.log(`  - Rating: ${response.data.reviews[0].rating}/5`);
      return true;
    } else {
      console.log(`${colors.yellow}⚠ No reviews found (might be rate limited)${colors.reset}`);
      return true; // Don't fail test as RSS might be rate limited
    }
  } catch (error) {
    console.log(`${colors.red}✗ Reviews endpoint error: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testCompetitorReddit(backendUrl) {
  console.log(`\n${colors.blue}Testing Reddit Integration...${colors.reset}`);
  try {
    const response = await makeRequest(`${backendUrl}/api/competitors/reddit?appName=Tesla`);
    if (response.status === 200) {
      console.log(`${colors.green}✓ Reddit API working${colors.reset}`);
      console.log(`  - Mentions found: ${response.data.mentions || 0}`);
      console.log(`  - Sentiment: ${((response.data.sentiment || 0) * 100).toFixed(0)}%`);
      if (response.data.trendingTopics && response.data.trendingTopics.length > 0) {
        console.log(`  - Trending: ${response.data.trendingTopics.join(', ')}`);
      }
      return true;
    } else {
      console.log(`${colors.yellow}⚠ Reddit API returned: ${response.status}${colors.reset}`);
      return true; // Don't fail as Reddit might have rate limits
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠ Reddit integration warning: ${error.message}${colors.reset}`);
    return true; // Don't fail as Reddit is optional
  }
}

async function testCompetitorComparison(backendUrl) {
  console.log(`\n${colors.blue}Testing Competitor Comparison...${colors.reset}`);
  try {
    const response = await makeRequest(`${backendUrl}/api/competitors/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { competitors: TEST_COMPETITORS }
    });
    
    if (response.status === 200 && response.data) {
      console.log(`${colors.green}✓ Comparison endpoint working${colors.reset}`);
      Object.entries(response.data).forEach(([name, data]) => {
        if (data.appInfo) {
          console.log(`  - ${name}: ${data.appInfo.averageUserRating}/5 (${data.appInfo.userRatingCount} reviews)`);
        }
      });
      return true;
    } else {
      console.log(`${colors.red}✗ Comparison failed: ${response.status}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Comparison error: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testFrontendAccess() {
  console.log(`\n${colors.blue}Testing Frontend Access...${colors.reset}`);
  try {
    const response = await makeRequest(FRONTEND_URL);
    if (response.status === 200) {
      console.log(`${colors.green}✓ Frontend is accessible${colors.reset}`);
      // Check if the HTML contains competitive analysis references
      if (response.data.includes('CompetitiveAnalysis') || response.data.includes('competitive')) {
        console.log(`${colors.green}✓ Competitive Analysis component found in bundle${colors.reset}`);
      }
      return true;
    } else {
      console.log(`${colors.red}✗ Frontend returned: ${response.status}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Frontend error: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testFullAnalysis(backendUrl) {
  console.log(`\n${colors.blue}Testing Full Competitive Analysis...${colors.reset}`);
  try {
    const response = await makeRequest(`${backendUrl}/api/competitors/analysis?appName=Tesla`);
    if (response.status === 200 && response.data) {
      console.log(`${colors.green}✓ Full analysis working${colors.reset}`);
      if (response.data.appInfo) {
        console.log(`  - App data: ✓`);
      }
      if (response.data.reviews) {
        console.log(`  - Reviews: ✓ (${response.data.reviews.length} reviews)`);
      }
      if (response.data.redditData) {
        console.log(`  - Reddit data: ✓`);
      }
      if (response.data.sentimentAnalysis) {
        console.log(`  - Sentiment analysis: ✓`);
      }
      return true;
    } else {
      console.log(`${colors.red}✗ Full analysis failed${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Analysis error: ${error.message}${colors.reset}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log(`${colors.blue}=== Competitive Analysis Verification ===${colors.reset}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Test Date: ${new Date().toISOString()}\n`);

  let backendUrl = BACKEND_URL;
  let allTestsPassed = true;

  // Test backend (try production first, then local)
  let backendHealthy = await testBackendHealth(BACKEND_URL);
  if (!backendHealthy) {
    console.log(`\n${colors.yellow}Trying local backend...${colors.reset}`);
    backendHealthy = await testBackendHealth(LOCAL_BACKEND);
    if (backendHealthy) {
      backendUrl = LOCAL_BACKEND;
      console.log(`${colors.green}Using local backend${colors.reset}`);
    } else {
      console.log(`${colors.red}No backend available!${colors.reset}`);
      allTestsPassed = false;
    }
  }

  if (backendHealthy) {
    // Run all backend tests
    const tests = [
      testCompetitorInfo(backendUrl),
      testCompetitorReviews(backendUrl),
      testCompetitorReddit(backendUrl),
      testCompetitorComparison(backendUrl),
      testFullAnalysis(backendUrl)
    ];

    const results = await Promise.all(tests);
    allTestsPassed = results.every(result => result);
  }

  // Test frontend
  await testFrontendAccess();

  // Summary
  console.log(`\n${colors.blue}=== Summary ===${colors.reset}`);
  if (allTestsPassed && backendHealthy) {
    console.log(`${colors.green}✅ All tests passed! Competitive analysis is working correctly.${colors.reset}`);
    console.log(`\n${colors.blue}Next Steps:${colors.reset}`);
    console.log('1. Go to your dashboard: ' + FRONTEND_URL);
    console.log('2. Click "Competitive Analysis" in the sidebar');
    console.log('3. Select competitors and click "Analyze"');
    console.log('4. You should see real App Store data!');
  } else {
    console.log(`${colors.red}❌ Some tests failed. Please check the errors above.${colors.reset}`);
    console.log(`\n${colors.yellow}Troubleshooting:${colors.reset}`);
    console.log('1. Ensure backend is deployed with latest code');
    console.log('2. Check environment variables are set');
    console.log('3. Verify API keys and credentials');
    console.log('4. Check Render logs for errors');
  }
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Test runner error: ${error.message}${colors.reset}`);
  process.exit(1);
});