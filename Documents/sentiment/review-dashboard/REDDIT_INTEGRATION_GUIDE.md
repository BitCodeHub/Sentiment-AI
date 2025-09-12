# Reddit Integration Guide

This guide explains how to set up and use the Reddit integration feature to monitor influence spikes and mentions of your app on Reddit.

## What This Feature Does

The Reddit integration allows you to:
- **Track mentions** of your app across Reddit
- **Detect influence spikes** when your app is being discussed more than usual
- **Monitor engagement** with upvotes, comments, and awards
- **Find relevant subreddits** where your app is discussed
- **Analyze trends** over different time periods
- **View top posts** and comments about your app

## Setup Instructions

### 1. Create a Reddit App

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Fill in the form:
   - **Name**: Your app name (e.g., "Review Dashboard")
   - **App type**: Select "script"
   - **Description**: Optional
   - **About URL**: Optional
   - **Redirect URI**: http://localhost:3000 (not used but required)
4. Click "Create app"
5. Note down your:
   - **Client ID**: The string under "personal use script"
   - **Client Secret**: The secret string

### 2. Configure Environment Variables

Add your Reddit credentials to the backend `.env` file:

```bash
# Reddit API Configuration
REDDIT_CLIENT_ID=your-client-id-here
REDDIT_CLIENT_SECRET=your-client-secret-here
REDDIT_USER_AGENT=ReviewDashboard/1.0.0
```

### 3. Test the Integration

Run the test script to verify your setup:

```bash
cd backend
node test-reddit.js
```

You should see output showing posts, trends, and spikes related to your app.

## Using the Reddit Integration

### Dashboard Integration

The Reddit Influence section appears automatically in your dashboard when:
1. You have an app name available in your review data
2. Reddit credentials are properly configured

### Understanding the Metrics

#### Overview Tab
- **Weekly Mentions**: Total posts mentioning your app in the past week
- **Recent Spikes**: Number of times engagement exceeded normal levels
- **Avg Engagement**: Average score (upvotes + comments × 3 + awards × 10)
- **Relevant Subreddits**: Communities where your app is discussed

#### Posts Tab
- View all Reddit posts mentioning your app
- Filter by time period and sort by relevance/hot/new
- See engagement levels (viral/high/medium/low)
- Click to view comments on each post

#### Subreddits Tab
- Discover which subreddits discuss your app
- See subscriber counts and activity levels
- Visit subreddits directly

#### Spikes Tab
- View historical influence spikes
- See what caused engagement spikes
- Get recommendations on how to respond

### Spike Detection

The system detects spikes when:
- Daily engagement exceeds 2x the average (configurable)
- A post goes viral (>1000 engagement score)
- Multiple posts appear on the same day

### Recommendations

Based on spike analysis, you'll get recommendations:
- **Stable**: No spikes - suggestions to increase engagement
- **Trending**: Recent spikes - how to capitalize on momentum
- **Historical**: Past spikes - how to recreate success

## API Endpoints

The following endpoints are available:

- `POST /api/reddit/search` - Search for posts mentioning your app
- `GET /api/reddit/subreddit/:name` - Get subreddit info
- `GET /api/reddit/post/:id/comments` - Get post comments
- `POST /api/reddit/trends` - Analyze mention trends
- `POST /api/reddit/spikes` - Detect influence spikes
- `POST /api/reddit/relevant-subreddits` - Find relevant subreddits

## Troubleshooting

### "Failed to authenticate with Reddit"
- Check your client ID and secret are correct
- Ensure they're properly set in the `.env` file
- Make sure the backend server has been restarted

### "Rate limited"
- Reddit has API rate limits
- Wait the specified time before retrying
- Consider implementing caching for frequently accessed data

### No results found
- Try searching for variations of your app name
- Check if the app name has spaces or special characters
- Expand the time range or reduce filters

## Best Practices

1. **Monitor regularly** - Check for spikes at least weekly
2. **Engage thoughtfully** - When you see discussions, engage authentically
3. **Track competitors** - You can also monitor competitor apps
4. **Use insights** - Apply learnings from Reddit to improve your app
5. **Respect the community** - Follow Reddit's rules and subreddit guidelines

## Privacy and Ethics

- This integration only accesses public Reddit data
- No user authentication is required
- Respect Reddit's API terms of service
- Don't spam or manipulate discussions
- Be transparent when engaging with users