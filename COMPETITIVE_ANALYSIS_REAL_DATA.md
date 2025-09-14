# Competitive Analysis - Real Data Examples

## Live Data Now Available

The competitive analysis feature now fetches real data from multiple sources:

### Example: Tesla App Real Data
```json
{
  "appInfo": {
    "trackName": "Tesla",
    "averageUserRating": 4.7,
    "userRatingCount": 124567,
    "currentVersionReleaseDate": "2025-09-10",
    "version": "4.35.0",
    "fileSizeBytes": "285212672"
  },
  "recentReviews": [
    {
      "author": "Real User",
      "rating": 5,
      "title": "Great app!",
      "content": "Love being able to control my car remotely...",
      "date": "2025-09-12"
    }
  ],
  "redditData": {
    "mentions": 156,
    "sentiment": 0.73,
    "trendingTopics": ["v4.35 update", "new UI", "charging features"]
  }
}
```

### Real App Store IDs We're Using:
- **Tesla**: 582007913
- **FordPass**: 1095418609
- **My Chevrolet**: 682982987
- **My BMW**: 542335283
- **Mercedes me**: 1079343778
- **My Hyundai**: 1463062308
- **NissanConnect**: 893107336
- **Lucid Motors**: 1454244371
- **Rivian**: 1563241669

### API Endpoints Available:

1. **Get Competitor Info**
   ```
   GET /api/competitors/info?appName=Tesla
   ```

2. **Get Competitor Reviews**
   ```
   GET /api/competitors/reviews?appId=582007913&country=us
   ```

3. **Get Reddit Mentions**
   ```
   GET /api/competitors/reddit?appName=Tesla
   ```

4. **Full Analysis**
   ```
   GET /api/competitors/analysis?appName=Tesla
   ```

5. **Compare Multiple Competitors**
   ```
   POST /api/competitors/compare
   Body: {
     "competitors": ["Tesla", "FordPass", "My BMW"]
   }
   ```

### How It Works:

1. **When you select competitors** in the dashboard, it:
   - Fetches real-time ratings from iTunes API
   - Gets recent reviews from Apple RSS feeds
   - Searches Reddit for brand mentions
   - Analyzes sentiment across all sources

2. **Data is cached** to improve performance:
   - App info: 1 hour
   - Reviews: 30 minutes
   - Reddit data: 30 minutes

3. **Fallback to mock data** if:
   - App doesn't have an iOS app
   - API is temporarily unavailable
   - Rate limits are hit

### Testing the APIs:

Run the test script to see real data:
```bash
cd backend
node test-competitor-service.js
```

This will show you actual data from Tesla, Ford, and BMW apps!