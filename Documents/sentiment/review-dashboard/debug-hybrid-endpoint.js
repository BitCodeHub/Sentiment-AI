#!/usr/bin/env node

/**
 * Debug script to test hybrid endpoint with exact parameters
 */

import fetch from 'node-fetch';
import FormData from 'form-data';

const API_URL = 'http://localhost:3001';
const APP_ID = '1602851643'; // Hyundai app

async function testHybridWithoutCredentials() {
  console.log('=== Test 1: Hybrid without credentials (RSS only) ===\n');
  
  const formData = new FormData();
  formData.append('appId', APP_ID);
  formData.append('useCache', 'false');
  formData.append('forceRefresh', 'true');
  formData.append('useServerCredentials', 'false');
  formData.append('countries', JSON.stringify(['us']));
  formData.append('daysToFetch', '90');
  
  try {
    const response = await fetch(`${API_URL}/api/apple-reviews/hybrid`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Total reviews:', data.totalCount || data.reviews?.length || 0);
    
    if (data.sources) {
      console.log('\nSource breakdown:');
      console.log('- RSS:', data.sources.rss);
      console.log('- API:', data.sources.api);
    }
    
    if (data.error) {
      console.error('\nError:', data.error);
    }
    
    return data;
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

async function testRSSDirectly() {
  console.log('\n\n=== Test 2: RSS endpoint directly ===\n');
  
  const formData = new FormData();
  formData.append('appId', APP_ID);
  formData.append('countries', JSON.stringify(['us']));
  formData.append('limit', '50');
  
  try {
    const response = await fetch(`${API_URL}/api/apple-reviews/rss`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    if (data.success) {
      console.log('Reviews found:', data.reviews.length);
      if (data.reviews.length > 0) {
        console.log('First review date:', data.reviews[0].Date);
        console.log('Last review date:', data.reviews[data.reviews.length - 1].Date);
      }
    } else {
      console.error('Error:', data.error);
    }
    
    return data;
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

async function testWithMockCredentials() {
  console.log('\n\n=== Test 3: Hybrid with mock credentials ===\n');
  
  const formData = new FormData();
  formData.append('appId', APP_ID);
  formData.append('useCache', 'false');
  formData.append('forceRefresh', 'true');
  formData.append('useServerCredentials', 'false');
  formData.append('countries', JSON.stringify(['us']));
  formData.append('daysToFetch', '90');
  formData.append('issuerId', 'mock-issuer-id');
  formData.append('keyId', 'mock-key-id');
  formData.append('privateKey', '-----BEGIN PRIVATE KEY-----\nMOCK_PRIVATE_KEY\n-----END PRIVATE KEY-----');
  
  try {
    const response = await fetch(`${API_URL}/api/apple-reviews/hybrid`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Total reviews:', data.totalCount || data.reviews?.length || 0);
    
    if (data.sources) {
      console.log('\nSource breakdown:');
      console.log('- RSS:', data.sources.rss);
      console.log('- API:', data.sources.api);
    }
    
    if (data.error) {
      console.error('\nError:', data.error);
    }
    
    return data;
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

// Run tests
async function runDebugTests() {
  console.log('Testing app:', APP_ID);
  console.log('Backend URL:', API_URL);
  console.log('');
  
  await testHybridWithoutCredentials();
  await testRSSDirectly();
  await testWithMockCredentials();
  
  console.log('\n\n=== Analysis ===');
  console.log('If RSS returns 0 reviews:');
  console.log('1. The app ID might be wrong');
  console.log('2. The app might not have recent reviews');
  console.log('3. The RSS service might be failing');
  console.log('');
  console.log('If API returns 0 with credentials:');
  console.log('1. Credentials might be invalid');
  console.log('2. JWT generation might be failing');
  console.log('3. Apple API might be returning errors');
}

runDebugTests().catch(console.error);