#!/usr/bin/env node

/**
 * Debug environment variables
 */

console.log('🔍 Debugging Apple Environment Variables\n');

// Check each variable individually
console.log('1. APPLE_ISSUER_ID:');
console.log(`   Value: ${process.env.APPLE_ISSUER_ID ? '✅ Set' : '❌ Not set'}`);
if (process.env.APPLE_ISSUER_ID) {
  console.log(`   Length: ${process.env.APPLE_ISSUER_ID.length} characters`);
  console.log(`   First 8 chars: ${process.env.APPLE_ISSUER_ID.substring(0, 8)}...`);
}

console.log('\n2. APPLE_KEY_ID:');
console.log(`   Value: ${process.env.APPLE_KEY_ID ? '✅ Set' : '❌ Not set'}`);
if (process.env.APPLE_KEY_ID) {
  console.log(`   Length: ${process.env.APPLE_KEY_ID.length} characters`);
  console.log(`   Value: ${process.env.APPLE_KEY_ID}`);
  console.log(`   Has spaces: ${process.env.APPLE_KEY_ID.includes(' ') ? 'YES ⚠️' : 'NO'}`);
  console.log(`   Has quotes: ${process.env.APPLE_KEY_ID.includes('"') || process.env.APPLE_KEY_ID.includes("'") ? 'YES ⚠️' : 'NO'}`);
}

console.log('\n3. APPLE_PRIVATE_KEY_BASE64:');
console.log(`   Value: ${process.env.APPLE_PRIVATE_KEY_BASE64 ? '✅ Set' : '❌ Not set'}`);
if (process.env.APPLE_PRIVATE_KEY_BASE64) {
  console.log(`   Length: ${process.env.APPLE_PRIVATE_KEY_BASE64.length} characters`);
}

// Check all environment variables that start with APPLE
console.log('\n4. All APPLE_* variables:');
Object.keys(process.env)
  .filter(key => key.startsWith('APPLE_'))
  .forEach(key => {
    const value = process.env[key];
    console.log(`   ${key}: ${value ? `Set (${value.length} chars)` : 'Not set'}`);
  });

// Common issues
console.log('\n⚠️  Common Issues to Check:');
console.log('1. Variable names are case-sensitive');
console.log('2. No quotes around values in Render');
console.log('3. No spaces before/after values');
console.log('4. Restart/redeploy after adding variables');

// Try to load credentials
console.log('\n5. Testing credential loading...');
try {
  const { getAppleCredentials } = require('./config/apple-credentials');
  const creds = getAppleCredentials();
  console.log(`   Result: ${creds ? '✅ Credentials loaded' : '❌ Failed to load'}`);
  if (!creds) {
    console.log('   This is why the dropdown is not showing!');
  }
} catch (e) {
  console.log(`   Error: ${e.message}`);
}