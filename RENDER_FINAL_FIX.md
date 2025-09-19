# Final Render Deployment Fix

## Most Common Issues and Solutions

### 1. Node Version Compatibility
Render may not support Node 22.x. I've updated render.yaml to use Node 20.11.1.

### 2. Directory Structure
Your repository has nested directories. The render.yaml now uses:
- Frontend: `Documents/sentiment/review-dashboard`
- Backend: `Documents/sentiment/review-dashboard/backend`

### 3. Build Commands
Updated to use explicit directory changes:
```
Frontend: cd Documents/sentiment/review-dashboard && npm install && npm run build
Backend: cd Documents/sentiment/review-dashboard/backend && npm install
```

### 4. Frontend Deployment
Changed to static site deployment which is more reliable for React apps.

## Step-by-Step Manual Deployment

If automatic deployment still fails:

### Deploy Backend First:
1. Go to https://dashboard.render.com/
2. Click "New +" → "Web Service"
3. Connect GitHub repo: `BitCodeHub/Sentiment-AI`
4. Settings:
   - Name: `sentiment-review-backend`
   - Region: Oregon
   - Branch: `main`
   - Root Directory: `Documents/sentiment/review-dashboard/backend`
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. Click "Advanced" and add environment variables:
   - `NODE_VERSION` = `20.11.1`
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = `https://sentiment-review-dashboard.onrender.com`

### Deploy Frontend:
1. Click "New +" → "Static Site"
2. Connect same GitHub repo
3. Settings:
   - Name: `sentiment-review-dashboard`
   - Branch: `main`
   - Root Directory: `Documents/sentiment/review-dashboard`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
4. Add environment variables:
   - `NODE_VERSION` = `20.11.1`
   - `VITE_OPENAI_API_KEY` = (your key)
   - `VITE_GEMINI_API_KEY` = (your key)

## Check Build Logs

In Render dashboard, check the build logs for specific errors:
- Timeout errors → Contact support to increase build time
- Memory errors → Upgrade to paid plan
- Module errors → Check package.json dependencies
- Permission errors → Check file permissions in repo

## Alternative: Netlify/Vercel for Frontend

If Render continues to fail for the frontend:
1. Deploy backend on Render
2. Deploy frontend on Netlify or Vercel
3. Update CORS settings in backend to allow the new frontend URL

## Emergency Fix

If you need to get it working immediately:
1. Fork the repository
2. Flatten the directory structure (move everything to root)
3. Update paths in package.json files
4. Deploy the simplified structure

The deployment configuration is now as simple as possible. If it still fails, the issue is likely with Render's build environment or your account settings.