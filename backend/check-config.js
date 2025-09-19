#!/usr/bin/env node

// Configuration check script for production debugging
require('dotenv').config();

console.log('=== Service Configuration Check ===');
console.log('Time:', new Date().toISOString());
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', process.env.PORT || 3001);

console.log('\n--- Apple API Configuration ---');
console.log('Default Issuer ID:', process.env.APPLE_ISSUER_ID ? 'SET' : 'NOT SET');
console.log('Default Key ID:', process.env.APPLE_KEY_ID ? 'SET' : 'NOT SET');

// Check for app-specific configs
const appleApps = [];
Object.keys(process.env).forEach(key => {
  const match = key.match(/^APPLE_APP_(\d+)_NAME$/);
  if (match) {
    appleApps.push({
      id: match[1],
      name: process.env[key]
    });
  }
});
console.log('Configured Apple Apps:', appleApps.length);
appleApps.forEach(app => {
  console.log(`  - ${app.name} (${app.id})`);
});

console.log('\n--- Reddit API Configuration ---');
console.log('Client ID:', process.env.REDDIT_CLIENT_ID ? `SET (${process.env.REDDIT_CLIENT_ID.length} chars)` : 'NOT SET');
console.log('Client Secret:', process.env.REDDIT_CLIENT_SECRET ? `SET (${process.env.REDDIT_CLIENT_SECRET.length} chars)` : 'NOT SET');
console.log('User Agent:', process.env.REDDIT_USER_AGENT || 'ReviewDashboard/1.0.0 (default)');

console.log('\n--- Cache Configuration ---');
console.log('Redis URL:', process.env.REDIS_URL ? 'SET' : 'NOT SET (using in-memory cache)');

console.log('\n--- CORS Configuration ---');
console.log('Frontend URL:', process.env.FRONTEND_URL || 'http://localhost:5173 (default)');

console.log('\n--- Rate Limiting ---');
console.log('Window (ms):', process.env.RATE_LIMIT_WINDOW_MS || '900000 (default)');
console.log('Max Requests:', process.env.RATE_LIMIT_MAX_REQUESTS || '100 (default)');

// Check critical configurations
console.log('\n=== Status Summary ===');
const issues = [];

if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
  issues.push('❌ Reddit API not configured - Reddit features will be disabled');
}

if (issues.length === 0) {
  console.log('✅ All services configured properly');
} else {
  console.log('Issues found:');
  issues.forEach(issue => console.log(issue));
}

console.log('\n=== End Configuration Check ===\n');