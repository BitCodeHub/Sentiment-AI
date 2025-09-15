# Finding Your Apple Key ID

The `APPLE_KEY_ID` is missing from your Render configuration. Here's how to find it:

## Where to Find Your Key ID

### Option 1: From Your .p8 File Name
Your private key file should be named: `AuthKey_XXXXXXXXXX.p8`

The `XXXXXXXXXX` part is your Key ID.

Examples:
- File: `AuthKey_2X9R4HXF34.p8` → Key ID: `2X9R4HXF34`
- File: `AuthKey_ABC123DEF.p8` → Key ID: `ABC123DEF`

### Option 2: From App Store Connect
1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Go to **Users and Access**
3. Click **Keys** tab
4. Find your key in the list - the **KEY ID** column shows your Key ID

## Common Key ID Formats
- Usually 10 characters
- Contains uppercase letters and numbers
- Example: `2X9R4HXF34`, `P8K3J9H2F1`, etc.

## Add to Render

In your backend environment variables, add:
```
APPLE_KEY_ID=YOUR_KEY_ID_HERE
```

## Important Notes
- ✅ Your `APPLE_ISSUER_ID` with hyphens is correct (UUID format)
- ❌ `APPLE_KEY_ID` does NOT have hyphens - just letters/numbers
- Case sensitive - use exactly as shown in filename or App Store Connect

## After Adding
Once you add `APPLE_KEY_ID`, the dropdown will appear showing your 2 apps:
- myHyundai with Bluelink
- Genesis Intelligent Assistant