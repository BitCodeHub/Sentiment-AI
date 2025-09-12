# Reddit Spike Detection Algorithm

## Overview
The Reddit spike detection algorithm identifies periods of unusually high engagement for your app on Reddit. This helps you capitalize on viral moments and understand what drives community interest.

## How It Works

### 1. Data Collection
- Fetches Reddit posts mentioning your app from the past 30 days (configurable)
- Searches across all subreddits or specific ones
- Uses multiple search variations to catch different mentions of your app name

### 2. Engagement Score Calculation
Each post gets an engagement score based on:
```
Engagement Score = (Upvotes) + (Comments × 3) + (Awards × 10) × Upvote Ratio
```

This weighted formula prioritizes:
- **Comments** (3x weight): Indicates active discussion
- **Awards** (10x weight): Shows high-quality or impactful content
- **Upvote Ratio**: Acts as a quality multiplier (higher ratio = better reception)

### 3. Daily Aggregation
Posts are grouped by day to calculate:
- Total daily engagement
- Number of posts per day
- Average engagement per post
- Top post of the day

### 4. Spike Detection
A spike is detected when:
```
Daily Total Engagement > Average Daily Engagement × Spike Threshold
```

Default spike threshold is 2.0x (configurable), meaning engagement must be at least double the average.

### 5. Spike Classification
- **Regular Spike**: Engagement exceeds threshold
- **Viral Spike**: Top post has engagement score > 1,000

## Why You Might See "0 Recent Spikes"

### 1. **No Mentions Found**
- Your app name might not match Reddit posts exactly
- Try variations of your app name
- Check if the app name includes special characters or spaces

### 2. **Low Baseline Activity**
- If your app has very few Reddit mentions, the baseline is too low
- Even significant increases might not meet the 2x threshold
- Solution: Monitor over a longer period or adjust threshold

### 3. **Consistent Engagement**
- If engagement is steady without peaks, no spikes will be detected
- This can actually be good - indicates stable community interest
- Look at the average engagement metric instead

### 4. **Recent Time Window**
- Spikes might have occurred outside the analysis window
- Default looks back 30 days
- Try adjusting the timeframe in the settings

### 5. **Search Limitations**
- Reddit's search API has limitations
- Some posts might be missed if they use nicknames or abbreviations
- Monitor relevant subreddits directly for complete coverage

## Recommended Actions

### When You See 0 Spikes:
1. **Check Weekly Mentions**: Even without spikes, regular mentions are valuable
2. **Review Average Engagement**: Consistent moderate engagement can be better than rare spikes
3. **Expand Search Terms**: Add variations of your app name
4. **Engage Proactively**: Create content to generate discussion

### When Spikes Are Detected:
1. **Immediate Response** (within 24 hours):
   - Join the conversation in trending posts
   - Address any concerns or questions
   - Thank users for positive feedback

2. **Follow-up Actions**:
   - Analyze what caused the spike
   - Create similar content or announcements
   - Engage with active subreddit communities

3. **Long-term Strategy**:
   - Build relationships in relevant subreddits
   - Schedule AMAs or community events
   - Monitor for recurring spike patterns

## Technical Details

### API Endpoints
- Search: `/api/reddit/search`
- Trends: `/api/reddit/trends`
- Spikes: `/api/reddit/spikes`

### Configuration Options
```javascript
{
  lookbackDays: 30,        // How far back to analyze
  spikeThreshold: 2.0,     // Multiplier for spike detection
  subreddit: 'all',        // Specific subreddit or 'all'
  limit: 100               // Max posts to analyze
}
```

### Metrics Explained
- **Average Daily Engagement**: Total engagement divided by days with activity
- **Median Daily Engagement**: Middle value when all days sorted by engagement
- **Spike Multiplier**: How many times higher than average (e.g., "3.5x normal")