# Render Deployment Fix

## Issue Identified
The repository has a nested directory structure that's causing deployment issues on Render.com.

## Current Structure
```
GitHub Repository Root
└── Documents/
    └── sentiment/
        └── review-dashboard/
            ├── src/           (frontend code)
            ├── backend/       (backend code)
            ├── package.json   (frontend)
            └── render.yaml    (deployment config)
```

## Solution

### Option 1: Update render.yaml with Correct Paths (Recommended)
Update the render.yaml at the repository root with the correct paths:

```yaml
services:
  # Frontend Service
  - type: web
    name: sentiment-review-dashboard
    runtime: node
    repo: https://github.com/BitCodeHub/Sentiment-AI
    branch: main
    rootDir: Documents/sentiment/review-dashboard
    buildCommand: npm ci && npm run build
    startCommand: npx serve -s dist -p $PORT
    healthCheckPath: /health.html
    envVars:
      - key: NODE_VERSION
        value: 22.16.0
      - key: VITE_OPENAI_API_KEY
        sync: false
      - key: VITE_REDDIT_API_ENDPOINT
        value: https://sentiment-review-backend.onrender.com/api/reddit
      - key: VITE_APPLE_API_ENDPOINT
        value: https://sentiment-review-backend.onrender.com/api/apple-reviews
      - key: VITE_GEMINI_API_KEY
        sync: false

  # Backend Service
  - type: web
    name: sentiment-review-backend
    runtime: node
    repo: https://github.com/BitCodeHub/Sentiment-AI
    branch: main
    rootDir: Documents/sentiment/review-dashboard/backend
    buildCommand: npm ci
    startCommand: npm run start:production
    healthCheckPath: /health
    envVars:
      # ... (keep existing env vars)
```

### Option 2: Deploy Services Individually in Render Dashboard

1. **Frontend Service**:
   - Service name: `sentiment-review-dashboard`
   - Root Directory: `Documents/sentiment/review-dashboard`
   - Build Command: `npm ci && npm run build`
   - Start Command: `npx serve -s dist -p $PORT`

2. **Backend Service**:
   - Service name: `sentiment-review-backend`
   - Root Directory: `Documents/sentiment/review-dashboard/backend`
   - Build Command: `npm ci`
   - Start Command: `npm run start:production`

## Environment Variables to Set

### Frontend (sentiment-review-dashboard)
- `NODE_VERSION`: 22.16.0
- `VITE_OPENAI_API_KEY`: (your OpenAI key)
- `VITE_GEMINI_API_KEY`: (your Gemini key)

### Backend (sentiment-review-backend)
- `NODE_VERSION`: 22.16.0
- `NODE_ENV`: production
- `PORT`: 3001
- `APPLE_ISSUER_ID`: (if you have Apple credentials)
- `APPLE_KEY_ID`: (if you have Apple credentials)
- `APPLE_PRIVATE_KEY_BASE64`: (if you have Apple credentials)
- `REDDIT_CLIENT_ID`: (if you have Reddit credentials)
- `REDDIT_CLIENT_SECRET`: (if you have Reddit credentials)
- `FRONTEND_URL`: https://sentiment-review-dashboard.onrender.com

## Steps to Deploy

1. **Commit the render.yaml to repository root**:
   ```bash
   cd /path/to/repository/root
   cp Documents/sentiment/review-dashboard/render.yaml .
   git add render.yaml
   git commit -m "Add render.yaml to repository root"
   git push
   ```

2. **In Render Dashboard**:
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect the render.yaml
   - Set all required environment variables
   - Deploy

3. **Verify Deployment**:
   - Frontend: https://sentiment-review-dashboard.onrender.com/health.html
   - Backend: https://sentiment-review-backend.onrender.com/health

## Common Issues

1. **Build Timeout**: The frontend bundle is large (1.8MB). If build times out, contact Render support to increase build timeout.

2. **Missing Environment Variables**: Double-check all environment variables are set in Render dashboard.

3. **CORS Errors**: Ensure `FRONTEND_URL` in backend matches your frontend URL exactly.

4. **Path Issues**: Make sure the rootDir paths match your repository structure exactly.