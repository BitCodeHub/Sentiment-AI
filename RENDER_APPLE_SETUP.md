# Setting Up Apple App Store Credentials on Render.com

## 🔒 Security First
**NEVER** commit your .p8 file or credentials to Git. We'll use Render's environment variables and secure file storage.

## Step 1: Prepare Your Credentials

You'll need:
- **App ID**: Your numeric Apple App ID (e.g., 123456789)
- **Issuer ID**: UUID format (e.g., 69a6de70-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
- **Key ID**: From your .p8 filename (e.g., if file is AuthKey_ABC123.p8, Key ID is ABC123)
- **.p8 Private Key File**: Your AuthKey_XXXXX.p8 file

## Step 2: Configure Environment Variables on Render

1. Go to your Render Dashboard: https://dashboard.render.com
2. Select your backend service
3. Go to **Environment** tab
4. Add these environment variables:

```
APPLE_APP_ID=your-numeric-app-id
APPLE_ISSUER_ID=your-uuid-issuer-id
APPLE_KEY_ID=your-key-id
NODE_ENV=production
FRONTEND_URL=https://sentiment-review-dashboard.onrender.com
```

5. Click **Save Changes**

## Step 3: Handle the .p8 Private Key File

### Option A: Environment Variable (Recommended for Render)

1. Convert your .p8 file to a single-line string:
```bash
# On your local machine
cat AuthKey_XXXXX.p8 | base64
```

2. Add to Render environment variables:
```
APPLE_PRIVATE_KEY_BASE64=paste-the-base64-string-here
```

3. Update your backend to decode it (I'll provide the code below)

### Option B: Secret Files (Alternative)

Render supports secret files, but environment variables are easier to manage.

## Step 4: Update Backend Code

Create a new file or update your existing backend configuration:

**backend/config/apple-credentials.js**:
```javascript
const fs = require('fs');
const path = require('path');

function getAppleCredentials() {
  // For Render.com deployment
  if (process.env.APPLE_PRIVATE_KEY_BASE64) {
    const privateKey = Buffer.from(
      process.env.APPLE_PRIVATE_KEY_BASE64, 
      'base64'
    ).toString('utf-8');
    
    return {
      appId: process.env.APPLE_APP_ID,
      issuerId: process.env.APPLE_ISSUER_ID,
      keyId: process.env.APPLE_KEY_ID,
      privateKey: privateKey
    };
  }
  
  // For local development with file
  if (process.env.APPLE_PRIVATE_KEY_PATH) {
    return {
      appId: process.env.APPLE_APP_ID,
      issuerId: process.env.APPLE_ISSUER_ID,
      keyId: process.env.APPLE_KEY_ID,
      privateKey: fs.readFileSync(process.env.APPLE_PRIVATE_KEY_PATH, 'utf8')
    };
  }
  
  return null;
}

module.exports = { getAppleCredentials };
```

## Step 5: Update Your API Endpoint

In your backend server file, update the Apple reviews endpoint:

```javascript
const { getAppleCredentials } = require('./config/apple-credentials');

app.post('/api/apple-reviews', upload.single('privateKey'), async (req, res) => {
  try {
    let credentials;
    
    // Check for server-stored credentials first
    const serverCreds = getAppleCredentials();
    if (serverCreds) {
      credentials = serverCreds;
    } else if (req.file && req.body) {
      // Use uploaded credentials
      credentials = {
        appId: req.body.appId,
        issuerId: req.body.issuerId,
        keyId: req.body.keyId,
        privateKey: req.file.buffer.toString('utf8')
      };
    } else {
      return res.status(400).json({ 
        error: 'No credentials provided' 
      });
    }
    
    // Your existing JWT and API logic here...
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Step 6: Deploy to Render

1. Commit your code changes (NOT the .p8 file!):
```bash
git add .
git commit -m "Add Apple credential configuration for Render"
git push origin main
```

2. Render will automatically deploy

## Step 7: Test Your Setup

1. Use the test script locally first:
```bash
node test-apple-credentials.js YOUR_APP_ID YOUR_ISSUER_ID ./AuthKey_XXXXX.p8
```

2. Once deployed, test the API:
```bash
curl -X POST https://your-render-backend.onrender.com/api/apple-reviews \
  -H "Content-Type: application/json" \
  -d '{"useServerCredentials": true}'
```

## Step 8: Update Frontend (if needed)

If your backend URL changed, update your frontend:

**.env.production**:
```
VITE_APPLE_API_ENDPOINT=https://your-backend-service.onrender.com/api/apple-reviews
```

Then rebuild and deploy frontend.

## 🚨 Troubleshooting

### "Invalid private key"
- Make sure the base64 encoding is correct
- Check that the private key includes BEGIN/END markers

### "Authentication failed"
- Verify all environment variables are set correctly
- Check that Key ID matches your .p8 filename

### "CORS error"
- Ensure FRONTEND_URL in backend matches your frontend URL exactly

## 📝 Quick Checklist

- [ ] Never committed .p8 file to Git
- [ ] Added all 4 environment variables to Render
- [ ] Converted .p8 to base64 and added as env var
- [ ] Updated backend code to handle credentials
- [ ] Tested locally with actual credentials
- [ ] Deployed and tested on Render

## 🔐 Security Notes

1. Render encrypts environment variables at rest
2. Use Render's access controls to limit who can view env vars
3. Rotate your Apple credentials periodically
4. Monitor API usage in Apple Developer Console

Need help? Check Render's docs: https://render.com/docs/environment-variables