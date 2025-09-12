#!/usr/bin/env node

// Test script to verify Reddit API configuration
require('dotenv').config();

console.log('=== Reddit Configuration Test ===\n');

// Check environment variables
const hasClientId = !!process.env.REDDIT_CLIENT_ID;
const hasClientSecret = !!process.env.REDDIT_CLIENT_SECRET;

console.log('Environment Variables:');
console.log(`- REDDIT_CLIENT_ID: ${hasClientId ? 'SET' : 'NOT SET'} ${hasClientId ? `(${process.env.REDDIT_CLIENT_ID.length} characters)` : ''}`);
console.log(`- REDDIT_CLIENT_SECRET: ${hasClientSecret ? 'SET' : 'NOT SET'} ${hasClientSecret ? `(${process.env.REDDIT_CLIENT_SECRET.length} characters)` : ''}`);
console.log(`- REDDIT_USER_AGENT: ${process.env.REDDIT_USER_AGENT || 'ReviewDashboard/1.0.0 (default)'}`);
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

if (!hasClientId || !hasClientSecret) {
  console.log('\n❌ Reddit API credentials are missing!');
  console.log('\nTo configure Reddit API:');
  console.log('1. Go to https://www.reddit.com/prefs/apps');
  console.log('2. Create a new app (choose "script" type)');
  console.log('3. Copy the client ID (under "personal use script")');
  console.log('4. Copy the client secret');
  console.log('5. Add them to your .env file:');
  console.log('   REDDIT_CLIENT_ID=your-client-id');
  console.log('   REDDIT_CLIENT_SECRET=your-client-secret');
  process.exit(1);
}

console.log('\n✅ Reddit credentials found!');

// Test the Reddit service
console.log('\nTesting Reddit service initialization...');
const redditService = require('./services/redditService');
const status = redditService.getStatus();

console.log('\nReddit Service Status:');
console.log(JSON.stringify(status, null, 2));

// Try to authenticate
console.log('\nTesting Reddit authentication...');
redditService.getAccessToken()
  .then(token => {
    console.log('✅ Authentication successful!');
    console.log(`Token: ${token.substring(0, 10)}...${token.substring(token.length - 10)}`);
    
    // Try a simple API call
    console.log('\nTesting API call (fetching r/technology info)...');
    return redditService.getSubredditInfo('technology');
  })
  .then(info => {
    console.log('✅ API call successful!');
    console.log('\nSubreddit info:');
    console.log(JSON.stringify(info, null, 2));
    
    console.log('\n🎉 Reddit API is fully configured and working!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  });