# Multi-App Setup for Apple App Store Integration

Since your two iOS apps share the same issuer ID and key ID (from the same Apple Developer account), here's how to configure them on Render:

## Environment Variables Setup

Add these to your backend service on Render:

```bash
# Shared Apple credentials
APPLE_ISSUER_ID=your-shared-issuer-id
APPLE_KEY_ID=your-shared-key-id
APPLE_PRIVATE_KEY_BASE64=your-shared-base64-key

# App configurations
APPLE_APP1_ID=123456789
APPLE_APP1_NAME=Your First App Name

APPLE_APP2_ID=987654321
APPLE_APP2_NAME=Your Second App Name

# Other required variables
NODE_ENV=production
FRONTEND_URL=https://sentiment-review-dashboard.onrender.com
```

## How It Works

1. **Shared Credentials**: Since both apps use the same Apple Developer account, you only need one set of issuer ID, key ID, and private key.

2. **App Selection**: Users will see a dropdown menu with both apps:
   - Your First App Name (123456789)
   - Your Second App Name (987654321)

3. **Easy Switching**: Users can switch between apps without re-entering credentials.

## Alternative Configuration

If you prefer a comma-separated list:

```bash
# Shared credentials (same as above)
APPLE_ISSUER_ID=your-shared-issuer-id
APPLE_KEY_ID=your-shared-key-id
APPLE_PRIVATE_KEY_BASE64=your-shared-base64-key

# Apps as comma-separated lists
APPLE_APP_IDS=123456789,987654321
APPLE_APP_NAMES=First App,Second App
```

## Adding More Apps Later

To add a third app, just add:
```bash
APPLE_APP3_ID=555555555
APPLE_APP3_NAME=Your Third App Name
```

Or append to the comma-separated list:
```bash
APPLE_APP_IDS=123456789,987654321,555555555
APPLE_APP_NAMES=First App,Second App,Third App
```

## Testing

After updating environment variables:
1. Render will automatically redeploy
2. Visit your app
3. Go to "Import from App Store"
4. You'll see a dropdown with both apps
5. Select the app you want to analyze
6. Click "Import Reviews"

## Benefits

- ✅ No need to duplicate credentials
- ✅ Easy switching between apps
- ✅ Clean UI with dropdown selector
- ✅ Secure - credentials stay on server
- ✅ Scalable - add more apps easily