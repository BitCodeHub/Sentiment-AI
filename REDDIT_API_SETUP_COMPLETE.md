# Reddit API Setup - Complete Guide

## Current Issue
The Reddit component is showing "Network Error" because the Reddit API credentials are not properly configured in the backend.

## Error Details
- **Backend Server**: Running successfully on http://localhost:3001
- **Error Message**: "Failed to authenticate with Reddit" (401 Unauthorized)
- **Root Cause**: Reddit Client Secret is not set in the backend .env file

## How to Fix

### Step 1: Get Reddit API Credentials

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App" at the bottom
3. Fill in the form:
   - **Name**: ReviewDashboard (or any name you prefer)
   - **App Type**: Select "script" (important!)
   - **Description**: (optional) App review sentiment dashboard
   - **About URL**: (leave blank)
   - **Redirect URI**: http://localhost:3001/callback (not used but required)
4. Click "Create app"

### Step 2: Copy Your Credentials

After creating the app, you'll see:
- **Client ID**: The string under "personal use script" (looks like: `_gRN6bEa2JTjI4d4gCkJDw`)
- **Client Secret**: The "secret" field (looks like: `xN8F5cK_mPq7wXyZ3vB2hA9uLmJk`)

### Step 3: Update Backend Configuration

1. Navigate to the backend directory:
   ```bash
   cd /Users/jimmylam/Documents/sentiment/review-dashboard/Documents/sentiment/review-dashboard/backend
   ```

2. Edit the `.env` file and update:
   ```env
   # Reddit API Configuration
   REDDIT_CLIENT_ID=YOUR_CLIENT_ID_HERE
   REDDIT_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
   REDDIT_USER_AGENT=ReviewDashboard/1.0.0
   ```

### Step 4: Restart the Backend Server

1. Stop the current server (Ctrl+C or kill the process)
2. Start it again:
   ```bash
   npm start
   ```

### Step 5: Test the Connection

Test the Reddit API directly:
```bash
curl -X POST http://localhost:3001/api/reddit/search \
  -H "Content-Type: application/json" \
  -d '{"appName": "YourAppName", "limit": 10}'
```

## Current Backend Status

- **Server Status**: Running ✓
- **Port**: 3001 ✓
- **Health Check**: Working ✓
- **CORS**: Configured for http://localhost:5173 ✓
- **Reddit Service**: Loaded but authentication failing ✗

## API Endpoints Available

Once credentials are configured, these endpoints will work:

1. **Search Posts**: `POST /api/reddit/search`
2. **Get Trends**: `POST /api/reddit/trends`
3. **Detect Spikes**: `POST /api/reddit/spikes`
4. **Find Subreddits**: `POST /api/reddit/relevant-subreddits`
5. **Get Comments**: `GET /api/reddit/post/:postId/comments`
6. **Subreddit Info**: `GET /api/reddit/subreddit/:subreddit`

## Troubleshooting

If you still see errors after updating credentials:

1. **Check the .env file** is in the correct location:
   `/Users/jimmylam/Documents/sentiment/review-dashboard/Documents/sentiment/review-dashboard/backend/.env`

2. **Verify credentials format** - no quotes needed:
   ```env
   REDDIT_CLIENT_ID=abc123
   REDDIT_CLIENT_SECRET=xyz789
   ```

3. **Check server logs** for specific error messages:
   ```bash
   tail -f server-output.log
   ```

4. **Test authentication directly** using the test script:
   ```bash
   node test-reddit.js
   ```

## Security Note

Never commit your Reddit Client Secret to version control. The .env file should be in your .gitignore.