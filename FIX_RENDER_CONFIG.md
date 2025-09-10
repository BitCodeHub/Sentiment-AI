# Fix Render Configuration

Based on the backend response, your environment variables need adjustment. Here's what's wrong and how to fix it:

## Current Issues:

1. **Apps are being read as one string**: "893514610, 867941329" 
2. **No server credentials detected**: hasServerCredentials is false

## Fix on Render Dashboard:

### Remove the space after the comma in APPLE_APP_IDS:

❌ Wrong:
```
APPLE_APP_IDS=893514610, 867941329
```

✅ Correct:
```
APPLE_APP_IDS=893514610,867941329
```

### Or use individual app variables (Recommended):

Add these environment variables:
```
APPLE_APP1_ID=893514610
APPLE_APP1_NAME=Your First App Name

APPLE_APP2_ID=867941329
APPLE_APP2_NAME=Your Second App Name
```

### Make sure you have ALL required credentials:

```
APPLE_ISSUER_ID=your-issuer-id-here
APPLE_KEY_ID=your-key-id-here
APPLE_PRIVATE_KEY_BASE64=your-base64-encoded-key
```

## Quick Test:

After updating, the `/api/health` endpoint should show:
```json
{
  "configuredApps": 2
}
```

And `/api/apple-apps` should show:
```json
{
  "apps": [
    { "id": "893514610", "name": "Your First App" },
    { "id": "867941329", "name": "Your Second App" }
  ],
  "hasServerCredentials": true
}
```

## Important: 
Make sure there are NO SPACES in your comma-separated values!