# Fix for 174 Review Limitation Issue

## The Problem
You're only seeing 174 reviews for 90 days when there should be hundreds or thousands more.

## Root Causes Identified

1. **RSS Feed Limitations**
   - Apple RSS feeds only return recent reviews (up to 500 max)
   - RSS feeds typically only have reviews from the last 1-2 weeks
   - This explains why you might only see 174 reviews from RSS

2. **Apple API Not Being Used**
   - The hybrid endpoint uses BOTH RSS feeds AND Apple API
   - But Apple API requires valid credentials (issuer ID, key ID, private key)
   - If credentials are missing/invalid, only RSS feeds are used

3. **Multi-Country Issue (Now Fixed)**
   - Was fetching from multiple countries (US, GB, CA, AU)
   - Now fixed to US-only as requested

## How to Verify the Issue

### 1. Check Backend Logs
When you fetch reviews, the backend logs should show:
```
[Hybrid] RSS: 174 reviews
[Hybrid] API: 0 reviews   <-- This is the problem!
```

If API shows 0 reviews, it means credentials aren't working.

### 2. Test Your Credentials
Run this test script:
```bash
cd Documents/sentiment/review-dashboard
node fix-review-pagination.js
```

## Solutions

### Solution 1: Ensure Apple API Credentials Are Provided

For the hybrid endpoint to work properly, you need to provide:
1. **Issuer ID** - From App Store Connect
2. **Key ID** - From your .p8 file name (e.g., AuthKey_ABC123.p8)
3. **Private Key** - The .p8 file content

### Solution 2: Use Direct API Endpoint

Instead of the hybrid endpoint, you can use the direct Apple API endpoint:
- Change `useHybrid` to `false` in your frontend settings
- This will use `/api/apple-reviews` instead of `/api/apple-reviews/hybrid`
- Requires valid credentials but will fetch ALL reviews

### Solution 3: Check Server Credentials

If using server credentials:
1. Ensure environment variables are set:
   - `APPLE_ISSUER_ID`
   - `APPLE_KEY_ID`
   - `APPLE_PRIVATE_KEY_BASE64`
2. Make sure `useServerCredentials` is set to `true`

## What We Fixed

1. **Changed to US-only** (was fetching from 4 countries)
2. **Increased pagination limit** to 1000 pages (was 500)
3. **Improved logging** to diagnose issues
4. **No date limitations** - fetches all requested data

## Expected Results After Fix

With proper Apple API credentials:
- **RSS**: ~150-200 recent reviews (1-2 weeks)
- **API**: 1000+ historical reviews (up to 90 days or more)
- **Total**: 1200+ reviews for 90 days

## Quick Checklist

- [ ] Apple API credentials are provided
- [ ] Backend is deployed with latest changes
- [ ] Using US-only setting
- [ ] Check backend logs for API vs RSS counts
- [ ] If API shows 0, credentials are the issue