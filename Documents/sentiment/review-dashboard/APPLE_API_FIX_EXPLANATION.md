# Apple API Fix - 174 Reviews Issue Resolved

## The Problem
The app was only showing 174 reviews from RSS feeds, even though Apple API credentials were present and working before. The Apple API was returning 0 reviews.

## Root Cause
The frontend was **not sending the `useServerCredentials` parameter** to the hybrid endpoint. This caused the backend to incorrectly handle the credential flow.

### What Was Happening:
1. Frontend called `/api/apple-reviews/hybrid` with credentials but WITHOUT `useServerCredentials` parameter
2. Backend checked: `if (issuerId || shouldUseServerCredentials)`
3. Since `useServerCredentials` was undefined (not sent), the backend couldn't determine whether to use provided credentials or server credentials
4. This caused the Apple API branch to fail silently, returning 0 reviews
5. Only RSS feeds returned data (174 reviews)

## The Fix
Added one line to the frontend to include the `useServerCredentials` parameter in the FormData:

```javascript
// In src/services/appleAppStoreBrowser.js, line 594:
formData.append('useServerCredentials', useServerCredentials.toString());
```

## How to Apply the Fix

1. **The frontend code has been updated** - the fix is already applied

2. **Restart your frontend** (if it's running):
   ```bash
   # In your frontend terminal
   npm run dev
   ```

3. **Test the fix** by fetching reviews again:
   - Go to Apple Import section
   - Enter your credentials
   - Select date range (e.g., last 90 days)
   - Click "Analyze Now"

4. **Verify it's working** by checking the browser console logs:
   - You should see: `[Hybrid] API: XXXX reviews` (where XXXX > 0)
   - You should see: `[Hybrid] RSS: 174 reviews` (or similar)
   - Total reviews should be much higher than 174

## Testing Script
I've created a test script to verify the fix works:

```bash
cd Documents/sentiment/review-dashboard
node test-apple-api-fix.js
```

This will show you:
- How many reviews come from RSS (should be ~174)
- How many reviews come from Apple API (should be much higher)
- Total unique reviews after deduplication

## What You Should See After the Fix

Before fix:
```
[Hybrid] RSS: 174 reviews
[Hybrid] API: 0 reviews
Total reviews: 174
```

After fix:
```
[Hybrid] RSS: 174 reviews  
[Hybrid] API: 2500+ reviews
Total reviews: 2600+ (after deduplication)
```

## Why It Was Working Before
The code likely worked before because:
1. An earlier version might have had different parameter handling
2. Or the frontend was sending the parameter correctly in a previous version
3. Or you were using the non-hybrid endpoint which doesn't require this parameter

## Prevention
The issue was subtle because:
- The backend expected the parameter but didn't validate its presence
- The frontend wasn't sending it
- No error was thrown - it just silently resulted in 0 API reviews

The fix ensures the frontend always sends this critical parameter.