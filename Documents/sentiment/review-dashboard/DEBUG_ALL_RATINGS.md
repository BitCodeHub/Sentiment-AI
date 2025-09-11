# Debug Guide: All Ratings Showing 0

## Fixed Issues
1. ✅ Added missing Key ID field to Apple import form
2. ✅ Fixed private key file upload - now reads content as text
3. ✅ Added comprehensive debug logging
4. ✅ Added backend connectivity test script
5. ✅ Fixed credential validation

## To Debug the Issue

### 1. Verify Backend is Running
```bash
# Check if backend is accessible
curl http://localhost:3001/api/health

# Test backend connectivity
cd Documents/sentiment/review-dashboard
node test-backend-connectivity.js
```

### 2. Clear Browser Data and Start Fresh
1. Open browser console (F12)
2. Go to Application tab → Storage → Clear site data
3. OR use an incognito/private window

### 3. Enter Credentials Properly
When importing Apple data, make sure to:
1. **App ID**: Your app's numeric ID (e.g., 1234567890)
2. **Issuer ID**: UUID from App Store Connect (e.g., 69a6de7e-xxxx-47e3-e053-5b8c7c11a4d1)
3. **Key ID**: 10-character ID (e.g., K6C3OE75Z8CA)
4. **Private Key**: Upload the .p8 file (AuthKey_XXXXXXXXXX.p8)

### 4. Check Console Logs
With debug logging enabled, you should see:

**In Browser Console:**
```
[appleAppStoreBrowser] Backend service available: true
[EnhancedDashboard] fetchAllRatingsData triggered
[EnhancedDashboard] Key ID specifically: K6C3OE75Z8CA
[appleAppStoreBrowser] ==== getReviewSummarizations START ====
[appleAppStoreBrowser] Backend response: {success: true, data: {...}}
```

**In Backend Terminal:**
```
==== SUMMARIZATIONS ENDPOINT HIT ====
Received parameters: {appId, issuerId, keyId, hasPrivateKey: true}
JWT token generated successfully
Apple API Response: {data: [...]}
```

### 5. Common Issues to Check

#### ❌ Backend Not Running
- Error: `Backend service available: false`
- Fix: Start backend with `cd backend && npm start`

#### ❌ Missing Credentials
- Error: `Missing required credentials`
- Fix: Ensure all 4 fields are filled (App ID, Issuer ID, Key ID, Private Key)

#### ❌ Invalid Key Format
- Error: `Failed to generate authentication token`
- Fix: Ensure .p8 file is valid and contains `-----BEGIN PRIVATE KEY-----`

#### ❌ Wrong Key ID
- Error: `401 Unauthorized` from Apple
- Fix: Key ID must match the .p8 file (e.g., AuthKey_K6C3OE75Z8CA.p8 → Key ID is K6C3OE75Z8CA)

#### ❌ Network/CORS Issues
- Error: Network errors in console
- Fix: Ensure backend is on port 3001 and frontend on 5173

### 6. Test Directly
Test the backend endpoint directly with your actual credentials:
```bash
curl -X POST http://localhost:3001/api/apple-reviews/summarizations \
  -H "Content-Type: multipart/form-data" \
  -F "appId=YOUR_APP_ID" \
  -F "issuerId=YOUR_ISSUER_ID" \
  -F "keyId=YOUR_KEY_ID" \
  -F "privateKey=@/path/to/AuthKey_XXXXXX.p8"
```

If this returns data, the issue is in the frontend. If it fails, check the error message.

## Still Having Issues?
1. Share the browser console logs
2. Share the backend terminal output
3. Share the result of the test script