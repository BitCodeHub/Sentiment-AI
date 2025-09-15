# Render.com Deployment Guide

This guide explains how to deploy the Sentiment Review Dashboard to Render.com with automatic deployments from GitHub.

## Overview

The application consists of two services:
1. **Frontend** - React/Vite application (`sentiment-review-dashboard`)
2. **Backend** - Node.js API server (`sentiment-review-backend`)

## Automatic Deployment Setup

### 1. Prerequisites
- GitHub repository connected to Render.com
- Render account with both services created

### 2. render.yaml Configuration
The `render.yaml` file in the root directory defines both services:

```yaml
services:
  # Frontend Service
  - type: web
    name: sentiment-review-dashboard
    runtime: node
    repo: https://github.com/BitCodeHub/Sentiment-AI
    branch: main
    rootDir: Documents/sentiment/review-dashboard
    buildCommand: npm install && npm run build
    startCommand: npx serve -s dist -p $PORT

  # Backend Service
  - type: web
    name: sentiment-review-backend
    runtime: node
    repo: https://github.com/BitCodeHub/Sentiment-AI
    branch: main
    rootDir: Documents/sentiment/review-dashboard/backend
    buildCommand: npm install
    startCommand: npm run start:production
```

### 3. Environment Variables

#### Frontend Environment Variables
- `NODE_VERSION`: 22.16.0
- `VITE_OPENAI_API_KEY`: Your OpenAI API key (set in Render dashboard)
- `VITE_REDDIT_API_ENDPOINT`: https://sentiment-review-backend.onrender.com/api/reddit
- `VITE_APPLE_API_ENDPOINT`: https://sentiment-review-backend.onrender.com/api/apple-reviews

#### Backend Environment Variables
- `NODE_VERSION`: 22.16.0
- `NODE_ENV`: production
- `PORT`: 3001
- **Apple API Credentials** (set in Render dashboard):
  - `APPLE_ISSUER_ID`
  - `APPLE_KEY_ID`
  - `APPLE_PRIVATE_KEY_BASE64`
- **Reddit API Credentials** (set in Render dashboard):
  - `REDDIT_CLIENT_ID`
  - `REDDIT_CLIENT_SECRET`
- `FRONTEND_URL`: https://sentiment-review-dashboard.onrender.com

### 4. Deployment Process

#### Automatic Deployment
Every push to the `main` branch triggers automatic deployment:
1. Push changes to GitHub: `git push origin main`
2. Render detects the push and starts deployment
3. Both frontend and backend are deployed automatically
4. Check deployment status in Render dashboard

#### Manual Deployment
To manually trigger a deployment:
1. Go to Render dashboard
2. Select the service
3. Click "Manual Deploy" → "Deploy latest commit"

### 5. Important Files

#### Frontend Production Files
- `.env.production` - Production environment variables
- `vite.config.js` - Build configuration
- `package.json` - Dependencies and scripts

#### Backend Production Files
- `server-production.js` - Production server configuration
- `.env` - Local environment variables (not committed)
- `package.json` - Dependencies and scripts

### 6. Deployment Checklist

Before deploying:
- [ ] Test locally with production build
- [ ] Ensure all environment variables are set in Render
- [ ] Verify API endpoints are correct
- [ ] Check CORS configuration
- [ ] Test with production data

### 7. Monitoring Deployments

1. **Render Dashboard**: Monitor deployment progress
2. **Logs**: Check service logs for errors
3. **Metrics**: Monitor performance and usage

### 8. Troubleshooting

Common issues:
- **Build failures**: Check Node version and dependencies
- **Runtime errors**: Check environment variables
- **CORS issues**: Verify FRONTEND_URL is correct
- **API connection**: Ensure backend URL is accessible

### 9. URLs

Production URLs:
- Frontend: https://sentiment-review-dashboard.onrender.com
- Backend: https://sentiment-review-backend.onrender.com

API Endpoints:
- Apple Reviews: https://sentiment-review-backend.onrender.com/api/apple-reviews
- Reddit: https://sentiment-review-backend.onrender.com/api/reddit
- Health Check: https://sentiment-review-backend.onrender.com/health