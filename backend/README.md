# Review Dashboard Backend Service

This backend service handles Apple App Store API integration for fetching app reviews.

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`

4. Start the server:
```bash
# Production
npm start

# Development with auto-reload
npm run dev
```

## API Endpoints

### POST /api/apple-reviews
Fetch reviews from Apple App Store.

**Request Body:**
```json
{
  "appId": "123456789",
  "issuerId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "privateKey": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
}
```

Or use multipart/form-data with privateKey as file upload.

**Response:**
```json
{
  "success": true,
  "reviews": [
    {
      "Review ID": "12345",
      "Rating": 5,
      "Review Title": "Great app!",
      "Body": "Love this app...",
      "Author": "User123",
      "Date": "2024-01-15",
      "App Version": "1.2.3",
      "Platform": "iOS",
      "Country": "USA"
    }
  ],
  "meta": {
    "total": 50,
    "appId": "123456789",
    "territory": "USA",
    "fetchedAt": "2024-01-15T12:00:00Z"
  }
}
```

### GET /api/health
Health check endpoint.

## Security Notes

- Never expose Apple credentials to the frontend
- Use HTTPS in production
- Implement rate limiting for production use
- Store private keys securely (consider using a key management service)
- Add authentication for API access in production

## Apple App Store Connect Setup

1. **Get App ID**: 
   - Log in to App Store Connect
   - Go to My Apps → Select your app
   - Find Apple ID in App Information

2. **Get Issuer ID**:
   - Go to Users and Access → Keys
   - Copy Issuer ID from the top of the page

3. **Generate Private Key**:
   - Go to Users and Access → Keys
   - Click + to create a new key
   - Select "App Store Connect API" access
   - Download the .p8 file (only downloadable once!)
   - Note the Key ID shown

## Deployment

For production deployment:

1. Use environment variables for all sensitive data
2. Enable CORS only for your frontend domain
3. Add request validation and sanitization
4. Implement proper error logging
5. Consider using PM2 or similar for process management
6. Set up HTTPS with SSL certificates

## Rate Limits

Apple App Store API has the following limits:
- 3,600 requests per hour per key
- Maximum 200 reviews per request

This service includes built-in error handling for rate limit responses.