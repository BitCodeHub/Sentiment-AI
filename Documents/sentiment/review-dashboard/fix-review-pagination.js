#!/usr/bin/env node

/**
 * Script to test and debug the review fetching issue
 * Run this to see exactly what's happening with the API
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_URL = 'http://localhost:5000'; // Change to your backend URL
const APP_ID = '1602851643'; // Your app ID

// Get credentials from environment or file
const getCredentials = () => {
  // Try to read from a local file first
  try {
    const configPath = path.join(__dirname, 'apple-credentials.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.log('No local credentials file found');
  }
  
  // Fall back to environment variables
  return {
    issuerId: process.env.APPLE_ISSUER_ID,
    keyId: process.env.APPLE_KEY_ID,
    privateKey: process.env.APPLE_PRIVATE_KEY
  };
};

async function testHybridEndpoint() {
  console.log('=== Testing Hybrid Endpoint ===\n');
  
  const credentials = getCredentials();
  
  // Calculate date range for last 90 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);
  
  const payload = {
    appId: APP_ID,
    issuerId: credentials.issuerId,
    keyId: credentials.keyId,
    privateKey: credentials.privateKey,
    countries: ['us'], // US only
    daysToFetch: 32850, // 90 years to ensure no limit
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
  
  console.log('Request payload:', {
    ...payload,
    privateKey: payload.privateKey ? '[REDACTED]' : undefined
  });
  
  try {
    const response = await fetch(`${API_URL}/api/apple-reviews/hybrid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('Error:', data.error);
      return;
    }
    
    console.log('\n=== Results ===');
    console.log(`Total reviews: ${data.totalCount}`);
    console.log('\nSource breakdown:');
    console.log(`- RSS: ${data.sources.rss.count} reviews (${data.sources.rss.success ? 'success' : 'failed'})`);
    if (data.sources.rss.error) {
      console.log(`  Error: ${data.sources.rss.error}`);
    }
    console.log(`- API: ${data.sources.api.count} reviews (${data.sources.api.success ? 'success' : 'failed'})`);
    if (data.sources.api.error) {
      console.log(`  Error: ${data.sources.api.error}`);
    }
    
    if (data.dateRange) {
      const newest = new Date(data.dateRange.newest);
      const oldest = new Date(data.dateRange.oldest);
      const newestDaysAgo = Math.floor((Date.now() - newest) / (1000 * 60 * 60 * 24));
      const oldestDaysAgo = Math.floor((Date.now() - oldest) / (1000 * 60 * 60 * 24));
      
      console.log('\nDate range:');
      console.log(`- Newest: ${newest.toISOString()} (${newestDaysAgo} days ago)`);
      console.log(`- Oldest: ${oldest.toISOString()} (${oldestDaysAgo} days ago)`);
    }
    
    // Save results for analysis
    fs.writeFileSync('hybrid-test-results.json', JSON.stringify(data, null, 2));
    console.log('\nFull results saved to hybrid-test-results.json');
    
    // Analysis
    console.log('\n=== Analysis ===');
    if (data.totalCount < 200) {
      console.log('⚠️  WARNING: Low review count detected!');
      console.log('Possible issues:');
      if (data.sources.api.count === 0) {
        console.log('- Apple API not working (check credentials)');
      }
      if (data.sources.rss.count < 200) {
        console.log('- RSS feed limited (this is normal)');
      }
      console.log('- Pagination might not be working properly');
    } else {
      console.log('✅ Review count looks healthy');
    }
    
  } catch (error) {
    console.error('Failed to test hybrid endpoint:', error);
  }
}

async function testDirectAPI() {
  console.log('\n\n=== Testing Direct API Endpoint ===\n');
  
  const credentials = getCredentials();
  
  // Calculate date range for last 90 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);
  
  const payload = {
    appId: APP_ID,
    issuerId: credentials.issuerId,
    keyId: credentials.keyId,
    privateKey: credentials.privateKey,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    forceRefresh: true
  };
  
  try {
    const response = await fetch(`${API_URL}/api/apple-reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('Error:', data.error);
      return;
    }
    
    console.log(`Total reviews from API: ${data.reviews.length}`);
    console.log(`From cache: ${data.fromCache}`);
    
    if (data.reviews.length > 0) {
      const newest = new Date(data.reviews[0].Date);
      const oldest = new Date(data.reviews[data.reviews.length - 1].Date);
      const newestDaysAgo = Math.floor((Date.now() - newest) / (1000 * 60 * 60 * 24));
      
      console.log(`Date range: ${newestDaysAgo} days ago to ${oldest.toISOString()}`);
    }
    
  } catch (error) {
    console.error('Failed to test direct API:', error);
  }
}

// Run tests
async function runTests() {
  await testHybridEndpoint();
  await testDirectAPI();
}

runTests().catch(console.error);