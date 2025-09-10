const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Apple App Store API configuration
const APPLE_API_BASE = 'https://api.appstoreconnect.apple.com/v1';

// Generate JWT token for Apple API
function generateAppleToken(keyId, issuerId, privateKey) {
  const header = {
    alg: 'ES256',
    kid: keyId,
    typ: 'JWT'
  };

  const payload = {
    iss: issuerId,
    exp: Math.floor(Date.now() / 1000) + (20 * 60), // 20 minutes
    aud: 'appstoreconnect-v1'
  };

  try {
    return jwt.sign(payload, privateKey, { 
      algorithm: 'ES256',
      header 
    });
  } catch (error) {
    console.error('Error generating JWT:', error);
    throw new Error('Failed to generate authentication token');
  }
}

// Fetch reviews from Apple API
async function fetchAppleReviews(token, appId, territory = 'USA', limit = 200) {
  try {
    const response = await axios.get(
      `${APPLE_API_BASE}/apps/${appId}/customerReviews`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        params: {
          'filter[territory]': territory,
          'limit': limit,
          'sort': '-createdDate',
          'include': 'response'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Apple API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.detail || 'Failed to fetch reviews');
  }
}

// Transform Apple review format to our format
function transformReview(review) {
  const attributes = review.attributes || {};
  const response = review.relationships?.response?.data;
  
  return {
    'Review ID': review.id,
    'Rating': attributes.rating || 0,
    'Review Title': attributes.title || '',
    'Body': attributes.body || '',
    'Review Text': attributes.body || '',
    'Author': attributes.reviewerNickname || 'Anonymous',
    'Date': attributes.createdDate ? new Date(attributes.createdDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    'App Version': attributes.appVersionString || '',
    'Device Model': 'iPhone', // Apple doesn't provide specific model
    'Platform': 'iOS',
    'Country': attributes.territory || 'USA',
    'Language': 'en',
    'Developer Response': response ? 'Yes' : ''
  };
}

// API endpoint for fetching Apple reviews
app.post('/api/apple-reviews', upload.single('privateKey'), async (req, res) => {
  try {
    const { appId, issuerId, keyId } = req.body;
    let privateKey = req.body.privateKey;

    // Validate required fields
    if (!appId || !issuerId) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'App ID and Issuer ID are required' 
      });
    }

    // Handle private key from file upload or text field
    if (req.file) {
      privateKey = req.file.buffer.toString('utf8');
    }

    if (!privateKey) {
      return res.status(400).json({ 
        error: 'Missing private key', 
        details: 'Private key (.p8 file) is required' 
      });
    }

    // Extract key ID from private key filename or use provided keyId
    const extractedKeyId = keyId || privateKey.match(/AuthKey_([A-Z0-9]+)\.p8/)?.[1];
    
    if (!extractedKeyId) {
      return res.status(400).json({ 
        error: 'Invalid key format', 
        details: 'Could not determine Key ID from private key' 
      });
    }

    // Generate JWT token
    const token = generateAppleToken(extractedKeyId, issuerId, privateKey);

    // Fetch reviews from Apple
    const reviewData = await fetchAppleReviews(token, appId);
    
    // Transform reviews to our format
    const reviews = reviewData.data.map(transformReview);

    // Send response
    res.json({
      success: true,
      reviews: reviews,
      meta: {
        total: reviews.length,
        appId: appId,
        territory: 'USA',
        fetchedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch reviews',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Apple App Store Review API',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Apple App Store API server running on port ${PORT}`);
  console.log(`Frontend should connect to: http://localhost:${PORT}/api/apple-reviews`);
});