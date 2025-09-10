const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ 
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' 
});

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.FRONTEND_URL?.split(',') || ['http://localhost:5173'];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.p8')) {
      cb(null, true);
    } else {
      cb(new Error('Only .p8 files are allowed'));
    }
  }
});

// Logging middleware (production)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Apple App Store API configuration
const APPLE_API_BASE = 'https://api.appstoreconnect.apple.com/v1';

// Load stored credentials if available
let storedCredentials = null;
if (process.env.APPLE_APP_ID && process.env.APPLE_ISSUER_ID && process.env.APPLE_PRIVATE_KEY_PATH) {
  try {
    const privateKey = fs.readFileSync(process.env.APPLE_PRIVATE_KEY_PATH, 'utf8');
    storedCredentials = {
      appId: process.env.APPLE_APP_ID,
      issuerId: process.env.APPLE_ISSUER_ID,
      keyId: process.env.APPLE_KEY_ID,
      privateKey: privateKey
    };
    console.log('Loaded stored Apple credentials');
  } catch (error) {
    console.error('Failed to load stored credentials:', error.message);
  }
}

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

// Cache for storing tokens
const tokenCache = new Map();

// Get or generate token with caching
async function getAppleToken(keyId, issuerId, privateKey) {
  const cacheKey = `${issuerId}-${keyId}`;
  const cached = tokenCache.get(cacheKey);
  
  if (cached && cached.expiry > Date.now()) {
    return cached.token;
  }
  
  const token = generateAppleToken(keyId, issuerId, privateKey);
  tokenCache.set(cacheKey, {
    token,
    expiry: Date.now() + (19 * 60 * 1000) // 19 minutes
  });
  
  return token;
}

// Fetch reviews from Apple API with retries
async function fetchAppleReviews(token, appId, territory = 'USA', limit = 200, retries = 3) {
  for (let i = 0; i < retries; i++) {
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
          },
          timeout: 30000
        }
      );

      return response.data;
    } catch (error) {
      if (i === retries - 1) {
        console.error('Apple API Error after retries:', error.response?.data || error.message);
        throw new Error(error.response?.data?.errors?.[0]?.detail || 'Failed to fetch reviews');
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
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
    let { appId, issuerId, keyId } = req.body;
    let privateKey = req.body.privateKey;

    // Use stored credentials if available and not provided in request
    if (storedCredentials && !appId) {
      appId = storedCredentials.appId;
      issuerId = storedCredentials.issuerId;
      keyId = storedCredentials.keyId;
      privateKey = storedCredentials.privateKey;
    }

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
      // Try to extract from the private key content if it's in the filename
      const keyMatch = req.file?.originalname?.match(/AuthKey_([A-Z0-9]+)\.p8/);
      if (keyMatch) {
        keyId = keyMatch[1];
      } else {
        return res.status(400).json({ 
          error: 'Invalid key format', 
          details: 'Could not determine Key ID. Please ensure your file is named AuthKey_KEYID.p8' 
        });
      }
    } else {
      keyId = extractedKeyId;
    }

    // Generate JWT token with caching
    const token = await getAppleToken(keyId, issuerId, privateKey);

    // Fetch reviews from Apple
    const reviewData = await fetchAppleReviews(token, appId);
    
    // Transform reviews to our format
    const reviews = reviewData.data.map(transformReview);

    // Log success for monitoring
    console.log(`Successfully fetched ${reviews.length} reviews for app ${appId}`);

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
    
    // Determine appropriate error response
    let statusCode = 500;
    let errorMessage = 'Failed to fetch reviews';
    let errorDetails = error.message;

    if (error.message.includes('authentication')) {
      statusCode = 401;
      errorMessage = 'Authentication failed';
      errorDetails = 'Please check your Apple credentials';
    } else if (error.message.includes('required')) {
      statusCode = 400;
      errorMessage = 'Invalid request';
    }

    res.status(statusCode).json({ 
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Apple App Store Review API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Apple App Store API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  if (storedCredentials) {
    console.log('Using stored credentials for app:', storedCredentials.appId);
  }
});