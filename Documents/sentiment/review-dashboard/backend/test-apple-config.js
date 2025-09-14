#!/usr/bin/env node

/**
 * Test Apple configuration
 */

require('dotenv').config();
const { getAppleApps, getAppleCredentials } = require('./config/apple-credentials');

console.log('=== Testing Apple Configuration ===\n');

// Test getAppleApps
console.log('1. Testing getAppleApps():');
const apps = getAppleApps();
console.log('   Found apps:', apps.length);
apps.forEach((app, index) => {
  console.log(`   App ${index + 1}: ${app.name} (ID: ${app.id})`);
});

// Test getAppleCredentials
console.log('\n2. Testing getAppleCredentials():');
const creds = getAppleCredentials();
if (creds) {
  console.log('   ✅ Credentials loaded successfully');
  console.log('   - Issuer ID:', creds.issuerId.substring(0, 8) + '...');
  console.log('   - Key ID:', creds.keyId);
  console.log('   - Private Key:', creds.privateKey.includes('BEGIN PRIVATE KEY') ? 'Valid' : 'Invalid');
} else {
  console.log('   ❌ No credentials found');
}

// Test getConfiguredApps function from server.js
console.log('\n3. Testing getConfiguredApps() function:');
function getConfiguredApps() {
  // Use the centralized function from apple-credentials.js
  const apps = getAppleApps();
  const sharedCredentials = getAppleCredentials();
  
  // If we have shared credentials, apply them to all apps
  if (sharedCredentials) {
    return apps.map(app => ({
      id: app.id,
      name: app.name,
      issuerId: sharedCredentials.issuerId,
      keyId: sharedCredentials.keyId,
      privateKey: sharedCredentials.privateKey
    }));
  }
  
  // Return apps without credentials if none are configured
  return apps;
}

const configuredApps = getConfiguredApps();
console.log('   Configured apps with credentials:', configuredApps.length);
configuredApps.forEach((app, index) => {
  console.log(`   App ${index + 1}: ${app.name} (ID: ${app.id})`);
  console.log(`     - Has credentials: ${!!(app.issuerId && app.keyId && app.privateKey)}`);
});

// Test the endpoint response
console.log('\n4. Testing /api/apple-apps endpoint response:');
const hasCredentials = configuredApps.length > 0 && configuredApps.some(app => app.issuerId && app.keyId && app.privateKey);
const response = {
  apps: configuredApps.map(app => ({ id: app.id, name: app.name })),
  hasServerCredentials: hasCredentials
};
console.log('   Response:', JSON.stringify(response, null, 2));

console.log('\n=== End Test ===');