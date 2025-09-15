import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'https://sentiment-review-backend.onrender.com';
const APP_ID = '893514610'; // myHyundai with Bluelink

// Using server credentials
const USE_SERVER_CREDENTIALS = true;

async function testHybridEndpoint() {
  console.log('=== Testing Apple Hybrid Reviews Endpoint ===\n');
  console.log('Backend URL:', BACKEND_URL);
  console.log('App ID:', APP_ID);
  console.log('Using server credentials:', USE_SERVER_CREDENTIALS);
  
  try {
    // First, check if backend is running
    console.log('\nChecking backend health...');
    try {
      const healthResponse = await axios.get(`${BACKEND_URL}/api/health`);
      console.log('Backend is running:', healthResponse.data);
    } catch (error) {
      console.error('Backend is not accessible. Please ensure it\'s running on', BACKEND_URL);
      return;
    }
    
    // Check configured apps
    console.log('\nChecking configured apps...');
    const appsResponse = await axios.get(`${BACKEND_URL}/api/apple-apps`);
    console.log('Configured apps:', JSON.stringify(appsResponse.data, null, 2));
    
    // Test RSS-only endpoint first
    console.log('\n--- Testing RSS-only endpoint ---');
    const rssResponse = await axios.post(`${BACKEND_URL}/api/apple-reviews/rss`, {
      appId: APP_ID,
      countries: ['us'],
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
    
    // Test hybrid endpoint with server credentials
    console.log('\n--- Testing Hybrid endpoint with server credentials ---');
    const formData = new FormData();
    formData.append('appId', APP_ID);
    formData.append('useServerCredentials', 'true');
    formData.append('countries', JSON.stringify(['us']));
    formData.append('useCache', 'false');
    formData.append('forceRefresh', 'true');
    formData.append('daysToFetch', '90');
    
    console.log('\nRequest parameters:');
    console.log('- appId:', APP_ID);
    console.log('- useServerCredentials: true');
    console.log('- countries: ["us"]');
    console.log('- daysToFetch: 90');
    console.log('- useCache: false');
    console.log('- forceRefresh: true');
    
    const hybridResponse = await axios.post(`${BACKEND_URL}/api/apple-reviews/hybrid`, formData, {
      headers: formData.getHeaders(),
      timeout: 120000 // 2 minute timeout
    });
    
    if (hybridResponse.data.success) {
      console.log('\n=== Response Success ===');
      console.log('Total reviews:', hybridResponse.data.reviews?.length || 0);
      console.log('From cache:', hybridResponse.data.fromCache);
      
      // Check sources
      if (hybridResponse.data.sources) {
        console.log('\nSources breakdown:');
        console.log('- RSS:', hybridResponse.data.sources.rss || 0);
        console.log('- API:', hybridResponse.data.sources.api || 0);
      }
      
      // Count by source in reviews
      if (hybridResponse.data.reviews && hybridResponse.data.reviews.length > 0) {
        // Check both lowercase and uppercase Source field
        const rssCount = hybridResponse.data.reviews.filter(r => r.source === 'rss' || r.Source === 'RSS').length;
        const apiCount = hybridResponse.data.reviews.filter(r => r.source === 'api' || r.Source === 'API').length;
        console.log('\nActual reviews by source (checking source/Source field):');
        console.log('- RSS reviews:', rssCount);
        console.log('- API reviews:', apiCount);
        
        // Check the first review to see what fields it has
        console.log('\nFirst review fields:', Object.keys(hybridResponse.data.reviews[0]));
        console.log('First review Source field:', hybridResponse.data.reviews[0].Source);
        console.log('First review source field:', hybridResponse.data.reviews[0].source);
        
        // Based on the sources data, show the actual counts
        const totalFromSources = (hybridResponse.data.sources?.rss?.count || 0) + (hybridResponse.data.sources?.api?.count || 0);
        console.log('\nTotal from sources data:', totalFromSources);
        console.log('Total reviews returned:', hybridResponse.data.reviews.length);
        
        if (hybridResponse.data.sources?.api?.count > 0) {
          console.log('\n✅ Apple API returned', hybridResponse.data.sources.api.count, 'reviews');
          console.log('The backend successfully fetched data from Apple API!');
        } else {
          console.log('\n⚠️  WARNING: No reviews from Apple API!');
          console.log('This indicates Apple API authentication is failing.');
        }
      }
      
      if (hybridResponse.data.dateRange) {
        const newest = new Date(hybridResponse.data.dateRange.newest);
        const oldest = new Date(hybridResponse.data.dateRange.oldest);
        const newestDaysAgo = Math.floor((Date.now() - newest) / (1000 * 60 * 60 * 24));
        
        console.log(`\nDate range: ${oldest.toLocaleDateString()} to ${newest.toLocaleDateString()}`);
        console.log(`Most recent review: ${newestDaysAgo} days ago`);
        
        // Show sample of most recent reviews
        console.log('\nMost recent 5 reviews:');
        hybridResponse.data.reviews.slice(0, 5).forEach((review, index) => {
          const date = new Date(review.Date);
          const daysAgo = Math.floor((Date.now() - date) / (1000 * 60 * 60 * 24));
          console.log(`${index + 1}. ${date.toLocaleDateString()} (${daysAgo} days ago) - ${review.Rating}★ - ${review.Country} - Source: ${review.source || 'api'}`);
        });
      }
    } else {
      console.log('\n=== Response Failed ===');
      console.log('Success: false');
      console.log('Error:', hybridResponse.data.error);
      console.log('Details:', hybridResponse.data.details);
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