# Apple Credentials Configuration Fix

## Issue Summary

The frontend is asking for Apple API credentials even though they are configured on the backend. The logs show:
- "Configured apps: myHyundai with Bluelink (893514610), Genesis Intelligent Assistant (867941329)"
- "Server configured with stored credentials for app: undefined"

## Root Cause

There was a mismatch between how the backend was parsing environment variables:
1. The `getConfiguredApps()` function in `server.js` was looking for `APPLE_APP_{appId}_NAME` format
2. The actual configuration uses `APPLE_APP1_ID`, `APPLE_APP1_NAME` format (numbered apps)
3. The function wasn't using the centralized `getAppleApps()` from `apple-credentials.js`

## Fix Applied

Updated `server.js` to:
1. Import the `getAppleApps` and `getAppleCredentials` functions from `./config/apple-credentials.js`
2. Modified `getConfiguredApps()` to use the centralized functions
3. Updated the `/api/apple-apps` endpoint to properly check for credentials

## Environment Variable Configuration

The backend supports multiple ways to configure Apple apps:

### Option 1: Individual App Configuration (Recommended)
```
APPLE_APP1_ID=893514610
APPLE_APP1_NAME=myHyundai with Bluelink
APPLE_APP2_ID=867941329
APPLE_APP2_NAME=Genesis Intelligent Assistant
```

### Option 2: Comma-Separated Configuration
```
APPLE_APP_IDS=893514610,867941329
APPLE_APP_NAMES=myHyundai with Bluelink,Genesis Intelligent Assistant
```

### Shared Credentials (Required)
```
APPLE_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
APPLE_KEY_ID=XXXXXXXXXX
APPLE_PRIVATE_KEY_BASE64=base64_encoded_p8_file_content
```

## Frontend Behavior

When properly configured:
1. The frontend will detect server credentials via `/api/apple-apps` endpoint
2. A "Use server credentials" checkbox will appear (and be checked by default)
3. The app dropdown will show configured apps
4. Users won't need to upload credentials

## Testing

Run the test script to verify configuration:
```bash
node test-apple-config.js
```

This will show:
- Which apps are detected
- Whether credentials are loaded
- What the API endpoint will return

## Troubleshooting

If the frontend still asks for credentials:
1. Ensure all environment variables are set (especially the shared credentials)
2. Restart the backend server after setting variables
3. Check browser console for any errors
4. Verify the `/api/apple-apps` endpoint returns `hasServerCredentials: true`