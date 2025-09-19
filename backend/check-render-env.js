#!/usr/bin/env node

/**
 * Diagnostic script to check Render environment variables
 */

console.log('🔍 Checking Apple App Store Configuration\n');

// Check for apps
console.log('📱 Configured Apps:');
if (process.env.APPLE_APP1_ID || process.env.APPLE_APP_IDS) {
  if (process.env.APPLE_APP1_ID) {
    console.log('✅ Using individual app configuration:');
    let i = 1;
    while (process.env[`APPLE_APP${i}_ID`]) {
      console.log(`   - App ${i}: ${process.env[`APPLE_APP${i}_NAME`] || 'Unnamed'} (${process.env[`APPLE_APP${i}_ID`]})`);
      i++;
    }
  } else if (process.env.APPLE_APP_IDS) {
    console.log('✅ Using comma-separated configuration:');
    const ids = process.env.APPLE_APP_IDS.split(',');
    const names = process.env.APPLE_APP_NAMES?.split(',') || [];
    ids.forEach((id, index) => {
      console.log(`   - App ${index + 1}: ${names[index] || 'Unnamed'} (${id.trim()})`);
    });
  }
} else {
  console.log('❌ No apps configured!');
}

console.log('\n🔑 Checking Apple Credentials:');

// Check Issuer ID
if (process.env.APPLE_ISSUER_ID) {
  const issuerId = process.env.APPLE_ISSUER_ID;
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(issuerId);
  console.log(`✅ APPLE_ISSUER_ID: ${issuerId.substring(0, 8)}...${issuerId.slice(-4)} ${isValidUUID ? '(valid UUID)' : '❌ (INVALID FORMAT!)'}`);
} else {
  console.log('❌ APPLE_ISSUER_ID: Not set');
}

// Check Key ID
if (process.env.APPLE_KEY_ID) {
  console.log(`✅ APPLE_KEY_ID: ${process.env.APPLE_KEY_ID}`);
} else {
  console.log('❌ APPLE_KEY_ID: Not set');
}

// Check Private Key
if (process.env.APPLE_PRIVATE_KEY_BASE64) {
  try {
    const decoded = Buffer.from(process.env.APPLE_PRIVATE_KEY_BASE64, 'base64').toString('utf-8');
    const hasBeginMarker = decoded.includes('BEGIN PRIVATE KEY');
    console.log(`✅ APPLE_PRIVATE_KEY_BASE64: Set (${process.env.APPLE_PRIVATE_KEY_BASE64.length} chars)`);
    console.log(`   ${hasBeginMarker ? '✅' : '❌'} Contains "BEGIN PRIVATE KEY" marker`);
  } catch (e) {
    console.log('❌ APPLE_PRIVATE_KEY_BASE64: Invalid base64 encoding!');
  }
} else if (process.env.APPLE_PRIVATE_KEY_PATH) {
  console.log(`⚠️  APPLE_PRIVATE_KEY_PATH: ${process.env.APPLE_PRIVATE_KEY_PATH}`);
  console.log('   Note: For Render, use APPLE_PRIVATE_KEY_BASE64 instead');
} else {
  console.log('❌ APPLE_PRIVATE_KEY_BASE64: Not set');
}

console.log('\n📊 Summary:');
const hasAllCreds = process.env.APPLE_ISSUER_ID && 
                    process.env.APPLE_KEY_ID && 
                    process.env.APPLE_PRIVATE_KEY_BASE64;

if (hasAllCreds) {
  console.log('✅ All credentials are configured!');
  console.log('   The app dropdown should appear in the UI.');
} else {
  console.log('❌ Missing required credentials!');
  console.log('   The app dropdown will NOT appear until all credentials are set.');
  console.log('\n💡 To fix, add these environment variables on Render:');
  if (!process.env.APPLE_ISSUER_ID) console.log('   - APPLE_ISSUER_ID');
  if (!process.env.APPLE_KEY_ID) console.log('   - APPLE_KEY_ID');
  if (!process.env.APPLE_PRIVATE_KEY_BASE64) console.log('   - APPLE_PRIVATE_KEY_BASE64');
}

console.log('\n🌐 Other Settings:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || 'not set'}`);
console.log(`   PORT: ${process.env.PORT || 'not set'}`);