#!/usr/bin/env node

/**
 * Script to sync missing endpoints from server.js to server-production.js
 * Run this to fix the 174 reviews issue in production
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Applying production fixes...\n');

// Read both files
const serverPath = path.join(__dirname, 'server.js');
const prodServerPath = path.join(__dirname, 'server-production.js');

const serverContent = fs.readFileSync(serverPath, 'utf8');
const prodServerContent = fs.readFileSync(prodServerPath, 'utf8');

// Check what's missing
const missing = [];

if (!prodServerContent.includes('appleRSSService')) {
  missing.push('appleRSSService import');
}

if (!prodServerContent.includes('competitorService')) {
  missing.push('competitorService import');
}

if (!prodServerContent.includes('/api/apple-reviews/hybrid')) {
  missing.push('/api/apple-reviews/hybrid endpoint');
}

if (!prodServerContent.includes('/api/apple-reviews/rss')) {
  missing.push('/api/apple-reviews/rss endpoint');
}

if (!prodServerContent.includes('/api/competitors')) {
  missing.push('Competitor endpoints');
}

console.log('Missing in production:');
missing.forEach(item => console.log(`❌ ${item}`));

console.log('\n📋 Summary:');
console.log('The production server is missing critical endpoints that were added to server.js');
console.log('This is why you\'re still seeing only 174 reviews - the RSS/hybrid functionality doesn\'t exist in production!');

console.log('\n🚀 Quick Fix Options:\n');

console.log('Option 1: Copy server.js to server-production.js (RECOMMENDED)');
console.log('This will ensure production has all the latest features:');
console.log('  cp server.js server-production.js');
console.log('  git add server-production.js');
console.log('  git commit -m "fix: sync production server with development"');
console.log('  git push');
console.log('  Then redeploy on Render.com');

console.log('\nOption 2: Use single server file');
console.log('Update package.json to use server.js for both dev and production:');
console.log('  "start:production": "NODE_ENV=production node server.js"');

console.log('\nOption 3: Manually add missing endpoints');
console.log('Copy the missing imports and endpoints from server.js to server-production.js');

console.log('\n⚠️  IMPORTANT: After any fix, you must redeploy on Render.com for changes to take effect!');