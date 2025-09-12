# Reddit Integration Setup Guide

## Overview
The Reddit Influence Monitor tracks mentions of your app on Reddit, analyzes engagement trends, and detects viral spikes in discussions.

## Why Reddit Component Might Not Show

The Reddit component requires two conditions to be displayed:
1. **App Name**: Your data must include an app name (from the "App Name" column in your Excel/CSV file)
2. **Reddit API Credentials**: Backend server must have Reddit API credentials configured

## Setup Steps

### 1. Reddit API Credentials

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Fill in the form:
   - **Name**: Your app name (e.g., "Review Dashboard")
   - **App type**: Select "script"
   - **Description**: Optional
   - **About URL**: Optional
   - **Redirect URI**: http://localhost:3001 (or your backend URL)
4. Click "Create app"
5. Note down:
   - **Client ID**: The string under "personal use script"
   - **Client Secret**: The secret key

### 2. Configure Backend Environment

Create a `.env` file in the backend directory:

```bash
cd Documents/sentiment/review-dashboard/backend
cp .env.example .env
```

Edit the `.env` file and add your Reddit credentials:

```env
# Reddit API Configuration
REDDIT_CLIENT_ID=your-reddit-client-id
REDDIT_CLIENT_SECRET=your-reddit-client-secret
REDDIT_USER_AGENT=ReviewDashboard/1.0.0
```

### 3. Ensure Your Data Has App Name

When uploading Excel/CSV files, ensure they have an "App Name" column:

| App Name | Rating | Review Text | ... |
|----------|--------|-------------|-----|
| MyApp    | 5      | Great app!  | ... |

For Apple App Store imports, the app name needs to be manually added to the data since Apple's API doesn't provide it.

### 4. Restart Backend Server

After configuring the credentials:

```bash
cd Documents/sentiment/review-dashboard/backend
npm start
```

## Troubleshooting

### Reddit Component Not Showing
1. Check if your data has `appName` field:
   - Open browser console (F12)
   - Look for the data object
   - Check if `data.appName` exists

2. Check backend logs for Reddit API errors:
   - Look for "Reddit service loaded" message
   - Check for authentication errors

### Common Issues
- **No App Name**: Add "App Name" column to your Excel/CSV file
- **Invalid Credentials**: Double-check Client ID and Secret from Reddit
- **Rate Limiting**: Reddit has API rate limits, wait before retrying
- **Backend Not Running**: Ensure backend server is running on port 3001

## Features Available

Once configured, the Reddit component provides:
- **Overview Tab**: Key metrics, trends, and top posts
- **Posts Tab**: Recent mentions with engagement scores
- **Subreddits Tab**: Relevant communities discussing your app
- **Spikes Tab**: Detection of viral discussions and trending topics

## Testing

To test if Reddit integration is working:
1. Upload a file with "App Name" column
2. Check if Reddit section appears in dashboard
3. If it shows a setup notice, follow the instructions
4. If it shows loading, wait for data to fetch
5. Check backend logs for any errors