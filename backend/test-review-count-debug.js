const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Test script to debug review fetching

const APPLE_API_BASE = 'https://api.appstoreconnect.apple.com/v1';

function generateAppleToken(keyId, issuerId, privateKey) {
  const header = {
    alg: 'ES256',
    kid: keyId,
    typ: 'JWT'
  };

  const payload = {
    iss: issuerId,
    exp: Math.floor(Date.now() / 1000) + (20 * 60), // 20 minutes
    aud: 'appstoreconnect-v1'
  };

  try {
    return jwt.sign(payload, privateKey, { 
      algorithm: 'ES256',
      header 
    });
  } catch (error) {
    console.error('Error generating JWT:', error);
    throw new Error('Failed to generate authentication token');
  }
}

async function fetchAppleReviews(token, appId, territory = 'USA', limit = 200, nextLink = null) {
  try {
    const url = nextLink || `${APPLE_API_BASE}/apps/${appId}/customerReviews`;
    const response = await axios.get(
      url,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        params: nextLink ? {} : {
          'filter[territory]': territory,
          'limit': limit,
          'sort': '-createdDate',
          'include': 'response'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Apple API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.detail || 'Failed to fetch reviews');
  }
}

async function testReviewCount() {
  // Get test app ID from environment or use default
  const appId = process.env.TEST_APP_ID || '310633997'; // WhatsApp as example
  const issuerId = process.env.APPLE_ISSUER_ID || process.env[`APPLE_ISSUER_ID_${appId}`];
  const keyId = process.env.APPLE_KEY_ID || process.env[`APPLE_KEY_ID_${appId}`];
  const privateKey = process.env.APPLE_PRIVATE_KEY || process.env[`APPLE_PRIVATE_KEY_${appId}`];

  if (!issuerId || !keyId || !privateKey) {
    console.error('Missing Apple API credentials. Please set environment variables.');
    return;
  }

  console.log('Testing Apple API review fetching...');
  console.log('App ID:', appId);
  console.log('Issuer ID:', issuerId);
  console.log('Key ID:', keyId);

  try {
    const token = generateAppleToken(keyId, issuerId, privateKey);
    console.log('JWT token generated successfully');

    let allReviews = [];
    let nextLink = null;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 10; // Test with 10 pages first

    console.log('\nFetching reviews page by page...\n');

    while (hasMore && pageCount < maxPages) {
      pageCount++;
      console.log(`Fetching page ${pageCount}...`);
      
      const response = await fetchAppleReviews(token, appId, 'USA', 200, nextLink);
      const reviews = response.data || [];
      
      console.log(`Page ${pageCount}: ${reviews.length} reviews`);
      
      if (reviews.length > 0) {
        const newest = new Date(reviews[0].attributes.createdDate);
        const oldest = new Date(reviews[reviews.length - 1].attributes.createdDate);
        console.log(`  Newest: ${newest.toISOString()} (${Math.floor((Date.now() - newest) / (1000 * 60 * 60 * 24))} days ago)`);
        console.log(`  Oldest: ${oldest.toISOString()} (${Math.floor((Date.now() - oldest) / (1000 * 60 * 60 * 24))} days ago)`);
      }
      
      allReviews.push(...reviews);
      
      // Check for next page
      nextLink = response.links?.next;
      hasMore = !!nextLink && reviews.length > 0;
      
      if (nextLink) {
        console.log(`  Next page available: ${nextLink.substring(0, 50)}...`);
      } else {
        console.log('  No more pages');
      }
      
      // Rate limiting
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Total pages fetched: ${pageCount}`);
    console.log(`Total reviews: ${allReviews.length}`);
    
    if (allReviews.length > 0) {
      const newest = new Date(allReviews[0].attributes.createdDate);
      const oldest = new Date(allReviews[allReviews.length - 1].attributes.createdDate);
      const daySpan = Math.floor((newest - oldest) / (1000 * 60 * 60 * 24));
      
      console.log(`Date range: ${daySpan} days`);
      console.log(`Newest review: ${newest.toISOString()}`);
      console.log(`Oldest review: ${oldest.toISOString()}`);
      
      // Count reviews in last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const reviewsLast90Days = allReviews.filter(r => new Date(r.attributes.createdDate) >= ninetyDaysAgo).length;
      console.log(`Reviews in last 90 days: ${reviewsLast90Days}`);
    }

    // Test RSS feed too
    console.log('\n=== Testing RSS Feed ===');
    const appleRSSService = require('./services/appleRSSService');
    const rssResult = await appleRSSService.fetchMultiCountryReviews(appId, ['us', 'gb', 'ca'], 500);
    console.log(`RSS reviews fetched: ${rssResult.reviews.length}`);
    console.log('Country results:', rssResult.countryResults);

  } catch (error) {
    console.error('Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testReviewCount();