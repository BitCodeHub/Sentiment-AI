#!/usr/bin/env node
const axios = require('axios');
require('dotenv').config();

const APP_ID = process.env.APPLE_APP_ID || '284882215'; // Facebook app as default
const API_BASE = process.env.BACKEND_URL || 'http://localhost:3001';

async function testReviewCount() {
  console.log('\n=== Testing Review Count ===');
  console.log('App ID:', APP_ID);
  console.log('Backend URL:', API_BASE);
  console.log('----------------------------\n');
  
  try {
    // Test 1: RSS Feed
    console.log('1. Testing RSS Feed endpoint...');
    const rssResponse = await axios.post(`${API_BASE}/api/apple-reviews/rss`, {
      appId: APP_ID,
      countries: ['us', 'gb', 'ca', 'au', 'de', 'fr', 'jp', 'it', 'es', 'nl'],
      limit: 200
    });
    
    console.log(`   RSS Reviews: ${rssResponse.data.reviews.length}`);
    if (rssResponse.data.countryResults) {
      console.log('   By country:');
      Object.entries(rssResponse.data.countryResults).forEach(([country, result]) => {
        if (result.success) {
          console.log(`     - ${country}: ${result.count} reviews`);
        }
      });
    }
    
    // Test 2: Hybrid endpoint
    console.log('\n2. Testing Hybrid endpoint...');
    const hybridResponse = await axios.post(`${API_BASE}/api/apple-reviews/hybrid`, {
      appId: APP_ID,
      countries: ['us', 'gb', 'ca', 'au', 'de', 'fr', 'jp', 'it', 'es', 'nl'],
      daysToFetch: 90,
      useServerCredentials: 'true' // Assuming server has credentials configured
    });
    
    console.log(`   Total Reviews: ${hybridResponse.data.totalCount}`);
    console.log(`   Sources:`);
    console.log(`     - RSS: ${hybridResponse.data.sources.rss.count} reviews`);
    console.log(`     - API: ${hybridResponse.data.sources.api.count} reviews`);
    
    if (hybridResponse.data.dateRange) {
      const newest = new Date(hybridResponse.data.dateRange.newest);
      const oldest = new Date(hybridResponse.data.dateRange.oldest);
      const daysAgo = Math.floor((Date.now() - newest) / (1000 * 60 * 60 * 24));
      const daysCovered = Math.floor((newest - oldest) / (1000 * 60 * 60 * 24));
      console.log(`   Date range: ${daysCovered} days (most recent: ${daysAgo} days ago)`);
    }
    
    // Test 3: Check if we're getting reviews from last 90 days
    console.log('\n3. Analyzing review dates...');
    const now = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    let reviewsInLast90Days = 0;
    let reviewsByWeek = {};
    
    hybridResponse.data.reviews.forEach(review => {
      const reviewDate = new Date(review.Date);
      if (reviewDate >= ninetyDaysAgo) {
        reviewsInLast90Days++;
      }
      
      // Group by week
      const weekStart = new Date(reviewDate);
      weekStart.setDate(reviewDate.getDate() - reviewDate.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      reviewsByWeek[weekKey] = (reviewsByWeek[weekKey] || 0) + 1;
    });
    
    console.log(`   Reviews in last 90 days: ${reviewsInLast90Days}`);
    console.log(`   Reviews by week (last 4 weeks):`);
    
    const weekKeys = Object.keys(reviewsByWeek).sort().reverse().slice(0, 4);
    weekKeys.forEach(week => {
      console.log(`     - Week of ${week}: ${reviewsByWeek[week]} reviews`);
    });
    
    // Summary
    console.log('\n=== Summary ===');
    console.log(`Total unique reviews fetched: ${hybridResponse.data.totalCount}`);
    console.log(`Reviews in date range (90 days): ${reviewsInLast90Days}`);
    console.log(`Average reviews per day: ${(reviewsInLast90Days / 90).toFixed(1)}`);
    
    if (hybridResponse.data.totalCount < 200) {
      console.log('\n⚠️  WARNING: Still seeing low review count!');
      console.log('Possible issues:');
      console.log('- Apple API might have a delay (typically 4-7 days)');
      console.log('- RSS feeds might be limited by Apple');
      console.log('- Need to configure Apple API credentials for full access');
    }
    
  } catch (error) {
    console.error('\nError:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run the test
testReviewCount().catch(console.error);