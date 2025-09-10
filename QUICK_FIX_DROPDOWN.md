# Quick Fix: Apple App Store Dropdown Not Showing

## The Issue
The dropdown menu for selecting between your 2 apps isn't showing because `hasServerCredentials` is returning `false`.

## Why This Happens
The backend can see your apps but NOT your Apple credentials (Issuer ID, Key ID, Private Key).

## Quick Solution on Render

### 1. Check Your Environment Variables

Make sure you have ALL of these on your **backend** service:

```bash
# ✅ Apps (this part is working)
APPLE_APP1_ID=893514610
APPLE_APP1_NAME=myHyundai with Bluelink
APPLE_APP2_ID=867941329
APPLE_APP2_NAME=Genesis Intelligent Assistant

# ❌ Missing Credentials (add these)
APPLE_ISSUER_ID=your-issuer-id-here
APPLE_KEY_ID=your-key-id-here  
APPLE_PRIVATE_KEY_BASE64=your-base64-encoded-private-key
```

### 2. How to Get Your Credentials

**Issuer ID**: 
- Go to App Store Connect → Users and Access → Keys
- It's at the top of the page (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

**Key ID**:
- It's the XXXXXX part from your AuthKey_XXXXXX.p8 filename
- Example: If your file is AuthKey_ABC123.p8, then Key ID is ABC123

**Private Key Base64**:
```bash
# On your Mac, run:
cat AuthKey_XXXXXX.p8 | base64 | pbcopy
```
Then paste the result as APPLE_PRIVATE_KEY_BASE64

### 3. Test After Adding

Visit: https://sentiment-review-backend.onrender.com/api/apple-config-check

You should see:
```json
{
  "credentials": {
    "hasIssuerId": true,
    "hasKeyId": true,
    "hasPrivateKey": true
  },
  "storedCredentialsValid": true
}
```

## The dropdown will appear once ALL three credentials are set!