#!/usr/bin/env node

/**
 * Test script to verify Apple API is working correctly after the fix
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_URL = 'http://localhost:3001'; // Your backend URL
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

async function testHybridEndpointWithFormData() {
  console.log('=== Testing Hybrid Endpoint with FormData (mimics frontend) ===\n');
  
  const credentials = getCredentials();
  
  if (!credentials.issuerId || !credentials.keyId || !credentials.privateKey) {
    console.error('ERROR: Apple API credentials not found!');
    console.error('Please set APPLE_ISSUER_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY environment variables');
    console.error('Or create an apple-credentials.json file with these fields');
    return;
  }
  
  // Calculate date range for last 90 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);
  
  // Create FormData to mimic frontend
  const formData = new FormData();
  formData.append('appId', APP_ID);
  formData.append('useCache', 'false');
  formData.append('forceRefresh', 'true');
  formData.append('useServerCredentials', 'false'); // This was missing!
  formData.append('countries', JSON.stringify(['us']));
  formData.append('daysToFetch', '5475'); // 15 years
  formData.append('startDate', startDate.toISOString().split('T')[0]);
  formData.append('endDate', endDate.toISOString().split('T')[0]);
  formData.append('issuerId', credentials.issuerId);
  formData.append('keyId', credentials.keyId);
  formData.append('privateKey', credentials.privateKey);
  
  console.log('Request details:');
  console.log(`- App ID: ${APP_ID}`);
  console.log(`- Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  console.log(`- useServerCredentials: false`);
  console.log(`- Credentials provided: yes`);
  
  try {
    const response = await fetch(`${API_URL}/api/apple-reviews/hybrid`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('\nError:', data.error);
      if (data.details) {
        console.error('Details:', data.details);
      }
      return;
    }
    
    console.log('\n=== Results ===');
    console.log(`Total reviews: ${data.totalCount || data.reviews?.length || 0}`);
    
    if (data.sources) {
      console.log('\nSource breakdown:');
      console.log(`- RSS: ${data.sources.rss.count} reviews (${data.sources.rss.success ? 'success' : 'failed'})`);
      if (data.sources.rss.error) {
        console.log(`  Error: ${data.sources.rss.error}`);
      }
      console.log(`- API: ${data.sources.api.count} reviews (${data.sources.api.success ? 'success' : 'failed'})`);
      if (data.sources.api.error) {
        console.log(`  Error: ${data.sources.api.error}`);
      }
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
    
    // Analysis
    console.log('\n=== Analysis ===');
    const apiCount = data.sources?.api?.count || 0;
    const rssCount = data.sources?.rss?.count || 0;
    const totalCount = data.totalCount || data.reviews?.length || 0;
    
    if (apiCount === 0 && rssCount > 0) {
      console.log('❌ PROBLEM: Apple API returned 0 reviews!');
      console.log('   This means the Apple API credentials are not working correctly.');
      console.log('   Please verify:');
      console.log('   1. Your credentials are correct (issuer ID, key ID, private key)');
      console.log('   2. The private key is in the correct format');
      console.log('   3. The credentials have access to the app ID:', APP_ID);
    } else if (apiCount > 0) {
      console.log('✅ SUCCESS: Apple API is working correctly!');
      console.log(`   Retrieved ${apiCount} reviews from Apple API`);
      console.log(`   Retrieved ${rssCount} reviews from RSS feeds`);
      console.log(`   Total unique reviews: ${totalCount}`);
    } else {
      console.log('⚠️  WARNING: No reviews found from either source');
    }
    
    // Save results for analysis
    fs.writeFileSync('test-results.json', JSON.stringify(data, null, 2));
    console.log('\nFull results saved to test-results.json');
    
  } catch (error) {
    console.error('Failed to test hybrid endpoint:', error);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n❌ Backend server is not running!');
      console.error('Please start the backend server with: npm start');
    }
  }
}

// Run test
testHybridEndpointWithFormData().catch(console.error);