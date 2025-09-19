const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testHybridEndpoint() {
  console.log('Testing hybrid endpoint...\n');
  
  // Check for .p8 key files
  const keyFiles = fs.readdirSync('.').filter(f => f.endsWith('.p8'));
  console.log('Found .p8 files:', keyFiles);
  
  if (keyFiles.length === 0) {
    console.log('No .p8 key files found in current directory');
    return;
  }
  
  // Read the first .p8 file
  const keyFile = keyFiles[0];
  const privateKey = fs.readFileSync(keyFile, 'utf8');
  console.log(`Using key file: ${keyFile}`);
  console.log('Key starts with:', privateKey.substring(0, 50) + '...');
  
  // Extract key ID from filename
  const keyIdMatch = keyFile.match(/AuthKey_([A-Z0-9]+)\.p8/);
  const keyId = keyIdMatch ? keyIdMatch[1] : null;
  console.log('Extracted Key ID:', keyId);
  
  // Look for issuer ID in environment or files
  const issuerIdFile = 'VERIFY_KEY_ID.md';
  let issuerId = '';
  if (fs.existsSync(issuerIdFile)) {
    const content = fs.readFileSync(issuerIdFile, 'utf8');
    const issuerMatch = content.match(/Issuer ID: ([a-f0-9-]+)/i);
    if (issuerMatch) {
      issuerId = issuerMatch[1];
      console.log('Found Issuer ID:', issuerId);
    }
  }
  
  if (!issuerId) {
    console.log('Could not find Issuer ID');
    return;
  }
  
  // Test the hybrid endpoint with different parameter combinations
  const testCases = [
    {
      name: 'Test 1: With credentials as strings',
      data: {
        appId: '1234567890', // Replace with actual app ID
        issuerId: issuerId,
        keyId: keyId,
        privateKey: privateKey,
        useServerCredentials: false,
        countries: ['us'],
        daysToFetch: 90
      }
    },
    {
      name: 'Test 2: With useServerCredentials as string "true"',
      data: {
        appId: '1234567890', // Replace with actual app ID
        issuerId: issuerId,
        keyId: keyId,
        privateKey: privateKey,
        useServerCredentials: 'true',
        countries: ['us'],
        daysToFetch: 90
      }
    },
    {
      name: 'Test 3: With useServerCredentials as boolean true',
      data: {
        appId: '1234567890', // Replace with actual app ID
        issuerId: issuerId,
        keyId: keyId,
        privateKey: privateKey,
        useServerCredentials: true,
        countries: ['us'],
        daysToFetch: 90
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`);
    console.log('Sending data:', {
      ...testCase.data,
      privateKey: '[REDACTED]'
    });
    
    try {
      const response = await axios.post('http://localhost:3001/api/apple-reviews/hybrid', testCase.data, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response:', {
        success: response.data.success,
        reviewCount: response.data.totalCount,
        sources: response.data.sources
      });
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
    }
  }
}

testHybridEndpoint().catch(console.error);