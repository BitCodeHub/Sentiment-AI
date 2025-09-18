const fs = require('fs');
const path = require('path');

/**
 * Get Apple credentials from environment variables
 * Supports both base64-encoded private key (for Render) and file path
 */
function getAppleCredentials() {
  // Check if all required environment variables exist
  const requiredVars = ['APPLE_APP_ID', 'APPLE_ISSUER_ID', 'APPLE_KEY_ID'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('Apple credentials not configured on server');
    return null;
  }
  
  // For Render.com deployment with base64-encoded private key
  if (process.env.APPLE_PRIVATE_KEY_BASE64) {
    try {
      const privateKey = Buffer.from(
        process.env.APPLE_PRIVATE_KEY_BASE64, 
        'base64'
      ).toString('utf-8');
      
      // Validate that it's a proper private key
      if (!privateKey.includes('BEGIN PRIVATE KEY')) {
        console.error('Invalid private key format in APPLE_PRIVATE_KEY_BASE64');
        return null;
      }
      
      return {
        appId: process.env.APPLE_APP_ID,
        issuerId: process.env.APPLE_ISSUER_ID,
        keyId: process.env.APPLE_KEY_ID,
        privateKey: privateKey
      };
    } catch (error) {
      console.error('Error decoding base64 private key:', error.message);
      return null;
    }
  }
  
  // For local development or traditional deployment with file path
  if (process.env.APPLE_PRIVATE_KEY_PATH) {
    try {
      const privateKeyPath = process.env.APPLE_PRIVATE_KEY_PATH;
      
      if (!fs.existsSync(privateKeyPath)) {
        console.error(`Private key file not found at: ${privateKeyPath}`);
        return null;
      }
      
      const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      
      return {
        appId: process.env.APPLE_APP_ID,
        issuerId: process.env.APPLE_ISSUER_ID,
        keyId: process.env.APPLE_KEY_ID,
        privateKey: privateKey
      };
    } catch (error) {
      console.error('Error reading private key file:', error.message);
      return null;
    }
  }
  
  console.log('No Apple private key configured (neither base64 nor file path)');
  return null;
}

/**
 * Validate Apple credentials format
 */
function validateCredentials(credentials) {
  if (!credentials) return false;
  
  // Validate App ID (should be numeric)
  if (!/^\d+$/.test(credentials.appId)) {
    console.error('Invalid App ID format - should be numeric');
    return false;
  }
  
  // Validate Issuer ID (UUID format)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(credentials.issuerId)) {
    console.error('Invalid Issuer ID format - should be UUID');
    return false;
  }
  
  // Validate Key ID (alphanumeric)
  if (!/^[A-Z0-9]+$/.test(credentials.keyId)) {
    console.error('Invalid Key ID format');
    return false;
  }
  
  // Validate private key
  if (!credentials.privateKey.includes('BEGIN PRIVATE KEY')) {
    console.error('Invalid private key format');
    return false;
  }
  
  return true;
}

module.exports = {
  getAppleCredentials,
  validateCredentials
};