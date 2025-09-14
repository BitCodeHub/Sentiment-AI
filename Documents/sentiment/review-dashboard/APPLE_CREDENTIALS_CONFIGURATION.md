# Apple Credentials Configuration Fix

## The Issue
The frontend is asking for Apple API credentials even though they're configured in the backend environment variables. This happens because the backend wasn't properly exposing which apps have credentials configured.

## What Was Fixed

### 1. Updated Server Code
- Both `server.js` and `server-production.js` now use the centralized credential configuration from `config/apple-credentials.js`
- The `/api/apple-apps` endpoint now properly reports which apps have credentials

### 2. Environment Variable Format
The backend supports these environment variable formats:

```bash
# Apps configuration
APPLE_APP1_ID=893514610
APPLE_APP1_NAME=myHyundai with Bluelink
APPLE_APP2_ID=867941329  
APPLE_APP2_NAME=Genesis Intelligent Assistant

# Shared credentials (used for all apps)
APPLE_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
APPLE_KEY_ID=XXXXXXXXXX
APPLE_PRIVATE_KEY_BASE64=base64_encoded_p8_file_content
```

## How It Works Now

1. **Backend detects configured apps** from `APPLE_APP1_ID`, `APPLE_APP2_ID`, etc.
2. **Backend checks for credentials** - either shared (`APPLE_ISSUER_ID`) or app-specific
3. **Frontend calls `/api/apple-apps`** to see which apps have server credentials
4. **Frontend shows configured apps** in a dropdown if server credentials exist
5. **Frontend uses server credentials** automatically when available

## Testing the Configuration

1. **Check your current configuration**:
   ```bash
   node test-apple-config.js
   ```

2. **Expected output** when properly configured:
   ```
   ✅ Found 2 configured apps:
     - myHyundai with Bluelink (893514610): ✅ has credentials
     - Genesis Intelligent Assistant (867941329): ✅ has credentials
   
   ✅ Server credentials are configured
   Frontend should automatically use server credentials
   ```

## What You Need to Do

1. **Ensure your Render environment variables are set correctly**:
   - `APPLE_APP1_ID=893514610`
   - `APPLE_APP1_NAME=myHyundai with Bluelink`
   - `APPLE_ISSUER_ID=your-issuer-id`
   - `APPLE_KEY_ID=your-key-id`
   - `APPLE_PRIVATE_KEY_BASE64=base64-encoded-private-key`

2. **Redeploy on Render** to load the new code

3. **In the frontend**, you should see:
   - A dropdown showing "myHyundai with Bluelink"
   - "Use server credentials" checkbox (checked by default)
   - No need to upload credentials

## Troubleshooting

If the frontend still asks for credentials:

1. **Check backend logs** - Look for:
   ```
   === Apple App Store Credentials ===
   ✓ Configured apps:
     - myHyundai with Bluelink (893514610): credentials configured
   ```

2. **Test the endpoint directly**:
   ```bash
   curl https://sentiment-review-backend.onrender.com/api/apple-apps
   ```
   
   Should return:
   ```json
   {
     "apps": [
       {
         "id": "893514610",
         "name": "myHyundai with Bluelink",
         "hasCredentials": true
       }
     ],
     "hasServerCredentials": true
   }
   ```

3. **Verify environment variables** in Render dashboard:
   - Go to Environment tab
   - Check all required variables are set
   - Make sure there are no typos

## Frontend Behavior

When server credentials are properly configured:
- The app dropdown will show configured apps
- "Use server credentials" will be checked by default
- Credential upload fields will be hidden/disabled
- The app will use server credentials automatically

When server credentials are NOT configured:
- The frontend will ask for credentials
- Users must upload their .p8 file
- Enter issuer ID and key ID manually