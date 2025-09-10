# Deploy Backend to Render - Quick Guide

Your current Render deployment only serves the frontend. You need to deploy the backend separately.

## Option 1: Deploy Backend as Separate Service (Recommended)

### Step 1: Create New Web Service on Render

1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub repo
4. Configure the service:
   - **Name**: `sentiment-review-backend`
   - **Root Directory**: `Documents/sentiment/review-dashboard/backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:production`

### Step 2: Add Environment Variables

Add these in the Environment tab:

```
NODE_VERSION=22.16.0
NODE_ENV=production
FRONTEND_URL=https://sentiment-review-dashboard.onrender.com
APPLE_APP_ID=your-app-id
APPLE_ISSUER_ID=your-issuer-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY_BASE64=your-base64-encoded-key
```

### Step 3: Deploy

Click **Create Web Service** and wait for deployment.

### Step 4: Update Frontend

Once backend is deployed, get the URL (e.g., `https://sentiment-review-backend.onrender.com`)

1. Go to your frontend service on Render
2. Add environment variable:
   ```
   VITE_APPLE_API_ENDPOINT=https://sentiment-review-backend.onrender.com/api/apple-reviews
   ```
3. Trigger a redeploy

## Option 2: Use render.yaml Blueprint

1. Delete your current `render.yaml`
2. Rename `render-backend.yaml` to `render.yaml`
3. Commit and push:
   ```bash
   git add render-backend.yaml
   git rm render.yaml
   git mv render-backend.yaml render.yaml
   git commit -m "Add backend service to Render deployment"
   git push
   ```
4. This will create both services automatically

## Testing After Deployment

Once deployed, test:

```bash
# Check backend health
curl https://sentiment-review-backend.onrender.com/api/health

# Test Apple integration
curl -X POST https://sentiment-review-backend.onrender.com/api/apple-reviews \
  -H "Content-Type: application/json" \
  -d '{}'
```

You should see either:
- Success with reviews (if credentials are correct)
- Error message about credentials (if something's wrong)

## Important Notes

- Backend URL will be different from frontend URL
- Free Render services sleep after 15 minutes of inactivity
- First request after sleep takes ~30 seconds
- Consider upgrading to paid for better performance