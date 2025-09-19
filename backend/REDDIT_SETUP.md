# Reddit API Setup Guide

## Overview
The backend supports Reddit API integration to search for posts mentioning your app, analyze trends, and detect influence spikes.

## Setup Steps

### 1. Create a Reddit App
1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Fill in the form:
   - **Name**: Your app name (e.g., "Review Dashboard")
   - **App type**: Select **script** (important!)
   - **Description**: Optional
   - **About URL**: Optional
   - **Redirect URI**: http://localhost:3001 (not used for script apps)
4. Click "Create app"

### 2. Get Your Credentials
After creating the app, you'll see:
- **Client ID**: The string under "personal use script" (looks like: `Ab1CdEfGhIjKlM`)
- **Client Secret**: The secret string (looks like: `nO-pQrStUvWxYz1234567890AbC`)

### 3. Configure Environment Variables
Add these to your `.env` file:
```env
REDDIT_CLIENT_ID=your-client-id-here
REDDIT_CLIENT_SECRET=your-client-secret-here
REDDIT_USER_AGENT=ReviewDashboard/1.0.0  # Optional, defaults to this
```

### 4. Test Your Configuration
Run the test script to verify everything is working:
```bash
npm run test-reddit
```

You should see:
- ✅ Reddit credentials found!
- ✅ Authentication successful!
- ✅ API call successful!

## Troubleshooting

### Common Issues

1. **"Reddit API credentials not configured"**
   - Make sure both `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` are set in your `.env` file
   - Run `npm run check-config` to see what's missing

2. **"Invalid Reddit API credentials"**
   - Double-check that you copied the credentials correctly
   - Make sure you selected "script" as the app type
   - The client ID is the short string under "personal use script", not the longer one

3. **"Rate limited"**
   - Reddit has strict rate limits (60 requests per minute)
   - The service automatically handles rate limiting, but you may need to wait

4. **No results when searching**
   - Try broader search terms
   - Check different time ranges (day, week, month)
   - Some apps may not have many Reddit mentions

## Production Deployment

For production environments:

1. Set the environment variables on your hosting platform
2. The backend will log Reddit service status on startup
3. Check the health endpoint to verify configuration: `GET /api/health`
4. Use the Reddit status endpoint for detailed info: `GET /api/reddit/status`

## Monitoring

The backend provides extensive logging for Reddit operations:
- Service initialization status
- Authentication attempts
- API request details
- Error messages with specific causes

Check your application logs if Reddit features aren't working in production.

## Security Notes

- Never commit your Reddit credentials to version control
- The client secret should remain confidential
- Consider using environment-specific credentials for production