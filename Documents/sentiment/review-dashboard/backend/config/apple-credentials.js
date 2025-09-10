const fs = require('fs');
const path = require('path');

/**
 * Get Apple apps configuration from environment variables
 */
function getAppleApps() {
  const apps = [];
  
  // Check for multiple apps configuration
  if (process.env.APPLE_APP1_ID) {
    // Multiple apps configuration
    let appIndex = 1;
    while (process.env[`APPLE_APP${appIndex}_ID`]) {
      apps.push({
        id: process.env[`APPLE_APP${appIndex}_ID`],
        name: process.env[`APPLE_APP${appIndex}_NAME`] || `App ${appIndex}`
      });
      appIndex++;
    }
  } else if (process.env.APPLE_APP_IDS) {
    // Comma-separated list of app IDs
    const appIds = process.env.APPLE_APP_IDS.split(',').map(id => id.trim());
    const appNames = process.env.APPLE_APP_NAMES?.split(',').map(name => name.trim()) || [];
    
    appIds.forEach((id, index) => {
      apps.push({
        id: id,
        name: appNames[index] || `App ${index + 1}`
      });
    });
  } else if (process.env.APPLE_APP_ID) {
    // Single app configuration (legacy)
    apps.push({
      id: process.env.APPLE_APP_ID,
      name: process.env.APPLE_APP_NAME || 'Default App'
    });
  }
  
  return apps;
}

/**
 * Get Apple credentials from environment variables
 * Supports both base64-encoded private key (for Render) and file path
 */
function getAppleCredentials(appId = null) {
  // Check shared credentials
  const requiredVars = ['APPLE_ISSUER_ID', 'APPLE_KEY_ID'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('Apple shared credentials not configured on server');
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
      
      // If appId is provided, use it; otherwise return credentials without appId
      const credentials = {
        issuerId: process.env.APPLE_ISSUER_ID,
        keyId: process.env.APPLE_KEY_ID,
        privateKey: privateKey
      };
      
      if (appId) {
        credentials.appId = appId;
      }
      
      return credentials;
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
      
      // If appId is provided, use it; otherwise return credentials without appId
      const credentials = {
        issuerId: process.env.APPLE_ISSUER_ID,
        keyId: process.env.APPLE_KEY_ID,
        privateKey: privateKey
      };
      
      if (appId) {
        credentials.appId = appId;
      }
      
      return credentials;
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
  
  // Validate App ID (should be numeric) - but only if appId is provided
  if (credentials.appId && !/^\d+$/.test(credentials.appId)) {
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
  validateCredentials,
  getAppleApps
};