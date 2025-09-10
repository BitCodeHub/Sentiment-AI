# Quick Guide: Convert Your .p8 File for Render

Since you already have your Apple credentials, here's exactly how to add them to Render:

## Step 1: Convert Your .p8 File to Base64

Run this command on your Mac (replace with your actual .p8 filename):

```bash
cat AuthKey_XXXXX.p8 | base64 | pbcopy
```

This copies the base64 string to your clipboard.

## Step 2: Add to Render Environment Variables

1. Go to https://dashboard.render.com
2. Click on your backend service
3. Go to **Environment** tab
4. Add these variables:

| Key | Value |
|-----|-------|
| `APPLE_APP_ID` | Your numeric app ID (e.g., 123456789) |
| `APPLE_ISSUER_ID` | Your UUID issuer ID (e.g., 69a6de70-xxxx-xxxx-xxxx-xxxxxxxxxxxx) |
| `APPLE_KEY_ID` | The XXXXX part from AuthKey_XXXXX.p8 |
| `APPLE_PRIVATE_KEY_BASE64` | Paste the base64 string from your clipboard |
| `NODE_ENV` | production |
| `FRONTEND_URL` | https://sentiment-review-dashboard.onrender.com |

5. Click **Save Changes**

## Step 3: Verify It Works

After Render redeploys (takes ~2-3 minutes), test it:

```bash
curl https://your-backend.onrender.com/api/health
```

You should see the health check response with "Server configured with stored credentials".

## That's it! 🎉

Your app will now automatically use these credentials when importing from the App Store. Users won't need to upload anything - just click "Import from App Store" and it works!