# Apple Import Credentials Fix

## Issue
When clicking "Import from Apple App Store", the app was showing credential input fields even though Apple API credentials were already configured in the backend.

## Root Cause
The AppleImport component was trying to fetch configured apps from the wrong endpoint:
- **Incorrect**: `/api/apple-reviews/apps`
- **Correct**: `/api/apple-apps`

## Solution
1. Fixed the endpoint URL in AppleImport.jsx to use the correct endpoint
2. Added a `baseBackendUrl` getter to appleAppStoreBrowserService for cleaner URL handling
3. Added detailed logging to help debug app detection issues

## How It Works Now
1. When AppleImport component mounts, it checks if the backend is available
2. If backend is available, it fetches configured apps from `/api/apple-apps`
3. If apps are found with credentials, it shows a dropdown to select the app
4. If no apps are configured, it shows the manual credential input fields

## Backend Configuration
The backend detects configured apps from environment variables:
- `APPLE_APP1_ID`, `APPLE_APP1_NAME`
- `APPLE_APP2_ID`, `APPLE_APP2_NAME`
- `APPLE_ISSUER_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_BASE64`

## User Experience
- **Before**: Always shows credential input fields
- **After**: Shows app dropdown when credentials are configured in backend

This provides a much better user experience as users don't need to enter credentials that are already configured on the server.