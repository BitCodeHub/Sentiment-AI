# Apple App Store Import Guide

This guide explains how to set up and use the Apple App Store review import feature.

## Overview

The Apple App Store import feature allows you to automatically fetch app reviews from Apple's App Store Connect API. It supports both real API integration (via backend service) and demo mode for testing.

## Features

- **Secure Authentication**: Uses Apple's JWT-based authentication
- **Real-time Import**: Fetches latest reviews from App Store Connect
- **Progress Tracking**: Visual feedback during import process
- **Credential Validation**: Validates format before API calls
- **Automatic Backend Detection**: Detects if backend service is running
- **Fallback Demo Mode**: Works without backend for UI testing

## Setup Instructions

### 1. Get Your Apple Credentials

1. **App ID**:
   - Log in to [App Store Connect](https://appstoreconnect.apple.com)
   - Navigate to "My Apps"
   - Select your app
   - Go to "App Information" → "General Information"
   - Copy the "Apple ID" (numeric value)

2. **Issuer ID**:
   - Go to "Users and Access" → "Keys"
   - Find your Issuer ID at the top of the page
   - It's a UUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

3. **Private Key (.p8 file)**:
   - In "Users and Access" → "Keys"
   - Click "+" to generate a new key
   - Name it (e.g., "Review API Key")
   - Select "App Store Connect API" access
   - Download the `.p8` file (⚠️ Only downloadable once!)
   - Note the Key ID shown on the page

### 2. Start the Backend Service

For security reasons, Apple API authentication must happen server-side.

```bash
# Navigate to backend directory
cd backend

# Install dependencies (first time only)
npm install

# Start the server
npm start
```

The server will run on `http://localhost:3001`

### 3. Import Reviews

1. Go to the upload page in the app
2. Click on "Import from App Store" tab
3. Enter your credentials:
   - App ID (e.g., `123456789`)
   - Issuer ID (e.g., `69a6de70-03db-47e3-adde-example`)
   - Upload the `.p8` private key file
4. Click "Import Reviews"

## Backend Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server port
PORT=3001

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5173
```

### Production Deployment

For production use:

1. Deploy the backend service to your server
2. Update the frontend `.env`:
   ```env
   VITE_APPLE_API_ENDPOINT=https://your-api-server.com/api/apple-reviews
   ```
3. Enable HTTPS for secure transmission
4. Implement authentication for API access
5. Store private keys securely (never in code)

## API Details

### Request Format

```http
POST /api/apple-reviews
Content-Type: multipart/form-data

appId: 123456789
issuerId: 69a6de70-03db-47e3-adde-example
privateKey: [.p8 file content]
```

### Response Format

```json
{
  "success": true,
  "reviews": [
    {
      "Review ID": "12345",
      "Rating": 5,
      "Review Title": "Great app!",
      "Body": "Love the features...",
      "Author": "User123",
      "Date": "2024-01-20",
      "App Version": "1.2.3",
      "Platform": "iOS",
      "Country": "USA"
    }
  ],
  "meta": {
    "total": 150,
    "appId": "123456789",
    "territory": "USA",
    "fetchedAt": "2024-01-20T15:30:00Z"
  }
}
```

## Security Considerations

1. **Never expose credentials**: Keep private keys server-side only
2. **Use HTTPS**: Always use encrypted connections in production
3. **Implement rate limiting**: Apple limits to 3,600 requests/hour
4. **Add authentication**: Protect your backend API endpoints
5. **Validate inputs**: Always sanitize user inputs
6. **Monitor usage**: Track API usage to avoid limits

## Troubleshooting

### "Backend service not available"
- Ensure the backend server is running (`npm start` in backend folder)
- Check if port 3001 is available
- Verify CORS settings match your frontend URL

### "Invalid credentials"
- App ID should be numeric only
- Issuer ID must be UUID format
- Private key must be the full .p8 file content

### "No reviews found"
- Verify the app has reviews in the selected territory (USA)
- Check if the API key has proper permissions
- Try a different time period or territory

### Rate Limiting
- Apple allows 3,600 requests per hour per key
- Implement caching to reduce API calls
- Consider fetching only new reviews incrementally

## Demo Mode

When the backend service is not running, the app automatically uses demo mode:
- Shows 5 sample reviews
- Allows testing the UI flow
- Displays warning about using mock data
- All features work except actual API calls

## Advanced Features

### Multiple Territories
To fetch reviews from different countries, modify the backend:
```javascript
const territory = req.body.territory || 'USA';
// Supported: USA, GBR, CAN, AUS, etc.
```

### Pagination
For apps with many reviews:
```javascript
const limit = 200; // Max per request
let hasMore = true;
let offset = 0;

while (hasMore) {
  const batch = await fetchReviews(token, appId, territory, limit, offset);
  reviews.push(...batch);
  hasMore = batch.length === limit;
  offset += limit;
}
```

### Review Responses
To include developer responses:
```javascript
params: {
  'include': 'response',
  'fields[customerReviewResponses]': 'responseBody'
}
```

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify backend logs for API errors
3. Ensure all dependencies are installed
4. Confirm Apple credentials are valid
5. Check Apple's API status page

For more information, see [Apple's App Store Connect API documentation](https://developer.apple.com/documentation/appstoreconnectapi).