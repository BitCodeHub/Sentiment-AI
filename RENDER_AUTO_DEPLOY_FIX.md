# Render.com Auto-Deploy Fix Guide

## Issue
Render.com is not automatically deploying when new commits are pushed to GitHub.

## What I've Fixed
1. Added `branch: main` configuration to render.yaml files to explicitly specify which branch to watch
2. Identified duplicate render configuration files that may be causing confusion

## Current Render Configuration Files
You have multiple render.yaml files which could be causing issues:
- `/render.yaml` - Frontend service only
- `/render-backend.yaml` - Both frontend and backend services
- `/Documents/sentiment/review-dashboard/render.yaml` - Frontend service (duplicate)
- `/Documents/sentiment/review-dashboard/backend/render-deploy.yaml` - Backend deployment

## Actions You Need to Take in Render Dashboard

### 1. Check Auto-Deploy Settings
1. Log into [Render.com](https://render.com)
2. Go to your service (sentiment-review-dashboard)
3. Navigate to **Settings** → **Build & Deploy**
4. Ensure:
   - **Auto-Deploy** is set to **Yes**
   - **Branch** is set to **main** (not master)
   - **Root Directory** is empty or set correctly

### 2. Verify GitHub Integration
1. In the same Build & Deploy settings
2. Check that your GitHub repo is connected
3. If there's a "Reconnect" button, click it to refresh the connection

### 3. Check GitHub Webhooks
1. Go to your GitHub repository
2. Navigate to **Settings** → **Webhooks**
3. Look for Render webhook (usually contains "render.com" in the URL)
4. Check:
   - Status is Active (green checkmark)
   - Recent Deliveries show successful (200) responses
   - If failed, click "Redeliver" on a recent delivery

### 4. Manual Deploy Test
1. In Render dashboard, click **Manual Deploy** → **Deploy latest commit**
2. This will test if the build process works correctly
3. Check the deploy logs for any errors

### 5. Choose One Render Configuration
Since you have multiple render.yaml files, Render might be confused:
- **Recommended**: Use only `/render-backend.yaml` (it has both services)
- Delete or rename the other render.yaml files to avoid conflicts

### 6. If Still Not Working
1. Check if you're on Render's free tier - services might be suspended
2. Try deleting and recreating the GitHub webhook:
   - In Render: Settings → Delete Service
   - Recreate the service and reconnect GitHub
3. Contact Render support with your service URL

## Quick Checklist
- [ ] Auto-Deploy is enabled in Render dashboard
- [ ] Branch is set to "main" in Render settings
- [ ] GitHub webhook shows green/active status
- [ ] Recent webhook deliveries are successful (200)
- [ ] Manual deploy works without errors
- [ ] Only one render.yaml is being used

## Note
The most common issues are:
1. Auto-deploy disabled in dashboard
2. Branch mismatch (Render watching "master" instead of "main")
3. Expired or broken GitHub webhook
4. Multiple render.yaml files causing confusion