#!/usr/bin/env node

/**
 * Test Apple App Store Credentials
 * This script helps verify your Apple credentials are valid
 * without exposing them or making actual API calls to your app
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

console.log('🍎 Apple App Store Credentials Tester');
console.log('=====================================\n');

// Function to validate UUID format
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Function to validate App ID
function isValidAppId(appId) {
  return /^\d+$/.test(appId);
}

// Function to extract Key ID from filename
function extractKeyId(filename) {
  const match = filename.match(/AuthKey_([A-Z0-9]+)\.p8/);
  return match ? match[1] : null;
}

// Function to test JWT generation
function testJWTGeneration(keyId, issuerId, privateKey) {
  try {
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

    const token = jwt.sign(payload, privateKey, { 
      algorithm: 'ES256',
      header 
    });

    // Decode to verify
    const decoded = jwt.decode(token, { complete: true });
    
    return {
      success: true,
      token: token.substring(0, 50) + '...', // Show partial token
      decoded: decoded
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Main test function
async function testCredentials() {
  try {
    // Get credentials from command line or prompt
    const args = process.argv.slice(2);
    
    let appId, issuerId, keyPath;
    
    if (args.length >= 3) {
      [appId, issuerId, keyPath] = args;
    } else {
      console.log('Usage: node test-apple-credentials.js <APP_ID> <ISSUER_ID> <PATH_TO_P8_FILE>\n');
      console.log('Example: node test-apple-credentials.js 123456789 69a6de70-xxxx-xxxx-xxxx-xxxxxxxxxxxx ./AuthKey_ABC123.p8\n');
      process.exit(1);
    }
    
    console.log('Testing credentials...\n');
    
    // Test 1: Validate App ID
    console.log('1. Validating App ID...');
    if (!isValidAppId(appId)) {
      console.log('❌ Invalid App ID format. Should be numeric only.');
      process.exit(1);
    }
    console.log('✅ App ID format is valid\n');
    
    // Test 2: Validate Issuer ID
    console.log('2. Validating Issuer ID...');
    if (!isValidUUID(issuerId)) {
      console.log('❌ Invalid Issuer ID format. Should be UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
      process.exit(1);
    }
    console.log('✅ Issuer ID format is valid\n');
    
    // Test 3: Read and validate private key
    console.log('3. Reading private key file...');
    if (!fs.existsSync(keyPath)) {
      console.log(`❌ File not found: ${keyPath}`);
      process.exit(1);
    }
    
    const privateKey = fs.readFileSync(keyPath, 'utf8');
    if (!privateKey.includes('BEGIN PRIVATE KEY')) {
      console.log('❌ Invalid private key format. File should contain "BEGIN PRIVATE KEY"');
      process.exit(1);
    }
    console.log('✅ Private key file read successfully\n');
    
    // Test 4: Extract Key ID
    console.log('4. Extracting Key ID...');
    const filename = path.basename(keyPath);
    const keyId = extractKeyId(filename);
    
    if (!keyId) {
      console.log('⚠️  Could not extract Key ID from filename.');
      console.log('   Filename should be: AuthKey_KEYID.p8');
      console.log('   You may need to specify the Key ID manually in production.');
    } else {
      console.log(`✅ Key ID extracted: ${keyId}\n`);
    }
    
    // Test 5: Generate JWT token
    console.log('5. Testing JWT token generation...');
    const jwtResult = testJWTGeneration(keyId || 'DUMMY_KEY_ID', issuerId, privateKey);
    
    if (jwtResult.success) {
      console.log('✅ JWT token generated successfully!');
      console.log(`   Token preview: ${jwtResult.token}`);
      console.log(`   Expires at: ${new Date(jwtResult.decoded.payload.exp * 1000).toLocaleString()}\n`);
    } else {
      console.log(`❌ JWT generation failed: ${jwtResult.error}`);
      process.exit(1);
    }
    
    // Summary
    console.log('========================================');
    console.log('✅ All credential tests passed!');
    console.log('========================================\n');
    console.log('Your credentials appear to be valid.');
    console.log('You can now use them in the app.\n');
    
    console.log('Credential Summary:');
    console.log(`- App ID: ${appId}`);
    console.log(`- Issuer ID: ${issuerId.substring(0, 8)}...${issuerId.substring(issuerId.length - 4)}`);
    console.log(`- Key ID: ${keyId || 'Need to specify manually'}`);
    console.log(`- Key File: ${filename}\n`);
    
    console.log('⚠️  Security Reminder:');
    console.log('- Never share these credentials');
    console.log('- Store the .p8 file securely');
    console.log('- Use environment variables in production');
    console.log('- Enable audit logging for API access\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
testCredentials();