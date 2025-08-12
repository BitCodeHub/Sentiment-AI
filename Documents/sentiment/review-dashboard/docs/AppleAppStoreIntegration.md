# Apple App Store Review Integration

This document explains how to integrate Apple App Store reviews into the Review Dashboard application.

## Overview

The integration allows you to import app reviews directly from Apple App Store Connect using their official API. Reviews are automatically filtered for the USA territory and transformed to match the dashboard's data format.

## Components

### 1. Frontend Components

- **`AppleImport.jsx`** - UI component for entering Apple credentials and triggering import
- **`AppleImport.css`** - Styles for the import component

### 2. Services

- **`appleAppStoreBrowser.js`** - Browser-compatible service with mock data for demonstration
- **`appleAppStore.js`** - Full service implementation for server-side use
- **`appleAppStoreAPI.example.js`** - Example backend API endpoint implementation

## Setup Instructions

### Prerequisites

1. **Apple Developer Account** with access to App Store Connect
2. **App Store Connect API Key** with the following permissions:
   - Access to app information
   - Access to customer reviews

### Getting Your Credentials

1. **App ID**:
   - Log in to [App Store Connect](https://appstoreconnect.apple.com)
   - Navigate to "My Apps"
   - Select your app
   - Go to "App Information"
   - Copy the "Apple ID" (numeric ID)

2. **Issuer ID**:
   - Go to "Users and Access"
   - Click on "Keys" tab
   - Your Issuer ID is displayed at the top of the page

3. **Private Key (.p8 file)**:
   - In "Users and Access" → "Keys"
   - Click the "+" button to create a new key
   - Give it a name and select "App Store Connect API" access
   - Download the .p8 file (you can only download it once!)
   - Store it securely

## Implementation

### Frontend Usage

The Apple import feature is integrated into the main upload screen:

```jsx
import AppleImport from './components/AppleImport';

// In your component
<AppleImport onImport={handleAppleImport} />

// Handler function
const handleAppleImport = async (reviews) => {
  // Process the imported reviews
  const aggregatedData = aggregateData(reviews);
  setData(aggregatedData);
};
```

### Data Format

Apple reviews are transformed to match the existing format:

```javascript
{
  'Review ID': 'apple_001',
  'Rating': 5,
  'Review Title': 'Great app!',
  'Body': 'Review content...',
  'Review Text': 'Review content...',
  'Author': 'UserNickname',
  'Date': '2024-01-15',
  'App Version': '5.3.2',
  'Device Model': 'iPhone',
  'Platform': 'iOS',
  'OS': '17.2',
  'Country': 'USA',
  'Language': 'English',
  'Developer Response': 'Response text...'
}
```

## Security Considerations

### Important Notes

1. **Never expose your private key in frontend code**
2. **Always implement the API integration on the backend**
3. **Use environment variables for sensitive data**
4. **Implement proper authentication for your API endpoints**

### Backend Implementation

For production use, implement a backend API endpoint:

```javascript
// Backend API endpoint
app.post('/api/apple-reviews', authenticate, async (req, res) => {
  const { appId, issuerId } = req.body;
  
  // Load private key from secure storage
  const privateKey = await loadPrivateKey();
  
  // Generate JWT and fetch reviews
  const reviews = await fetchAppleReviews(appId, issuerId, privateKey);
  
  res.json({ reviews });
});
```

## Current Limitations

1. **Demo Mode**: The current implementation shows mock data due to browser security restrictions
2. **JWT Generation**: Cannot be done securely in the browser
3. **CORS**: Apple's API doesn't support CORS for browser requests

## Production Deployment

For production deployment:

1. Implement the backend API endpoint (see `appleAppStoreAPI.example.js`)
2. Store the private key securely on your server
3. Update the frontend service to call your backend API
4. Add proper error handling and rate limiting
5. Implement caching to avoid hitting API limits

## API Rate Limits

Apple App Store Connect API has the following limits:
- 3,600 requests per hour per key
- Response includes rate limit headers

## Troubleshooting

### Common Issues

1. **Invalid JWT**: Ensure your private key and key ID match
2. **403 Forbidden**: Check API key permissions in App Store Connect
3. **No reviews returned**: Verify the app ID and territory filter
4. **Rate limiting**: Implement caching and respect rate limits

### Debug Mode

Enable debug logging in the service:

```javascript
// In appleAppStoreBrowser.js
console.log('App ID:', appId);
console.log('Issuer ID:', issuerId);
```

## Future Enhancements

1. Support for multiple territories
2. Incremental review updates
3. Review response management
4. Webhook integration for real-time updates
5. Batch import for multiple apps

## Support

For issues with the integration:
1. Check the browser console for errors
2. Verify your credentials are correct
3. Ensure your API key has proper permissions
4. Review Apple's [API documentation](https://developer.apple.com/documentation/appstoreconnectapi)