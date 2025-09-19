# Simple Render Deployment Guide

Since automatic deployment is failing, here's a step-by-step manual approach:

## Option 1: Deploy Services Separately in Render UI

### Frontend Deployment:
1. In Render Dashboard, click "New +" → "Static Site"
2. Connect your GitHub repository
3. Configure:
   ```
   Name: sentiment-review-dashboard
   Branch: main
   Root Directory: Documents/sentiment/review-dashboard
   Build Command: npm install && npm run build
   Publish Directory: dist
   ```
4. Add Environment Variables:
   - `NODE_VERSION` = `20.11.1`
   - `VITE_OPENAI_API_KEY` = (your key)
   - `VITE_REDDIT_API_ENDPOINT` = `https://sentiment-review-backend.onrender.com/api/reddit`
   - `VITE_APPLE_API_ENDPOINT` = `https://sentiment-review-backend.onrender.com/api/apple-reviews`
   - `VITE_GEMINI_API_KEY` = (your key)
   - `VITE_API_ENDPOINT` = `https://sentiment-review-backend.onrender.com`

### Backend Deployment:
1. In Render Dashboard, click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   ```
   Name: sentiment-review-backend
   Branch: main
   Root Directory: Documents/sentiment/review-dashboard/backend
   Runtime: Node
   Build Command: npm install
   Start Command: node server-production.js
   ```
4. Add Environment Variables:
   - `NODE_VERSION` = `20.11.1`
   - `NODE_ENV` = `production`
   - `PORT` = `3001`
   - `FRONTEND_URL` = `https://sentiment-review-dashboard.onrender.com`
   - Add Apple/Reddit credentials if available

## Option 2: Fork and Simplify Repository Structure

1. Fork the repository
2. Move files to root:
   ```bash
   # In your fork
   mv Documents/sentiment/review-dashboard/* .
   mv Documents/sentiment/review-dashboard/.* .
   rm -rf Documents
   git add -A
   git commit -m "Simplify repository structure"
   git push
   ```
3. Update render.yaml to use simple paths
4. Deploy using Render Blueprint

## Option 3: Use Deployment Scripts

Create these files in repository root:

### deploy-frontend.sh
```bash
#!/bin/bash
cd Documents/sentiment/review-dashboard
npm install
npm run build
```

### deploy-backend.sh
```bash
#!/bin/bash
cd Documents/sentiment/review-dashboard/backend
npm install
```

Then in render.yaml use:
- Frontend build: `bash deploy-frontend.sh`
- Backend build: `bash deploy-backend.sh`

## Common Issues and Solutions:

1. **Node Version Error**: Use Node 20.11.1 instead of 22.x
2. **Build Timeout**: Contact Render support to increase build timeout
3. **Environment Variables**: Ensure all `sync: false` variables are set
4. **CORS Errors**: Backend FRONTEND_URL must match frontend URL exactly
5. **Memory Issues**: Upgrade to paid plan if build runs out of memory

## Quick Debug Steps:

1. Check build logs in Render dashboard
2. Look for specific error messages
3. Try deploying backend first, then frontend
4. Ensure GitHub integration has access to the repository
5. Try clearing Render cache and redeploying