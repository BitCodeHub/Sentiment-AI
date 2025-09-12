const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const { getAppleCredentials, validateCredentials, getAppleApps } = require('./config/apple-credentials');
const cacheService = require('./services/cacheService');
const redditService = require('./services/redditService');
require('dotenv').config({ 
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' 
});

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy when running on Render or other platforms
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy
  console.log('Trust proxy enabled for production environment');
}

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
  // Skip successful requests from rate limit count
  skipSuccessfulRequests: false,
  // Use X-Forwarded-For header when behind proxy
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  }
});
app.use('/api/', limiter);

// Stricter rate limiting for Reddit API endpoints
const redditLimiter = rateLimit({
  windowMs: parseInt(process.env.REDDIT_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.REDDIT_RATE_LIMIT_MAX_REQUESTS) || 30,
  message: 'Too many Reddit API requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/reddit/', redditLimiter);

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
const storedCredentials = getAppleCredentials();
const configuredApps = getAppleApps();
if (storedCredentials && validateCredentials(storedCredentials)) {
  console.log('Loaded stored Apple shared credentials');
  console.log(`Configured apps: ${configuredApps.map(app => `${app.name} (${app.id})`).join(', ')}`);
} else if (storedCredentials) {
  console.error('Invalid stored credentials format');
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

// Helper function to convert territory to country code for iTunes API
function getCountryCodeFromTerritory(territory) {
  // Map common territories to their 2-letter country codes
  const territoryToCountryCode = {
    'USA': 'us',
    'GBR': 'gb',
    'CAN': 'ca',
    'AUS': 'au',
    'DEU': 'de',
    'FRA': 'fr',
    'JPN': 'jp',
    'CHN': 'cn',
    'KOR': 'kr',
    'IND': 'in',
    'BRA': 'br',
    'MEX': 'mx',
    'ESP': 'es',
    'ITA': 'it',
    'NLD': 'nl',
    'CHE': 'ch',
    'SWE': 'se',
    'NOR': 'no',
    'DNK': 'dk',
    'FIN': 'fi',
    'NZL': 'nz',
    'SGP': 'sg',
    'HKG': 'hk',
    'TWN': 'tw',
    'RUS': 'ru',
    'POL': 'pl',
    'TUR': 'tr',
    'ARE': 'ae',
    'SAU': 'sa',
    'ZAF': 'za'
  };
  
  return territoryToCountryCode[territory] || 'us';
}

// Fetch rating summaries (includes all ratings, not just written reviews)
// Uses iTunes Lookup API which provides overall ratings without authentication
async function fetchAppleReviewSummarizations(token, appId, territory = 'USA') {
  console.log('[fetchAppleReviewSummarizations] Starting...');
  console.log('[fetchAppleReviewSummarizations] Parameters:', { appId, territory });
  
  try {
    // Use iTunes Lookup API to get overall app ratings
    // This API doesn't require authentication and provides aggregate rating data
    const countryCode = getCountryCodeFromTerritory(territory);
    const url = `https://itunes.apple.com/lookup?id=${appId}&country=${countryCode}`;
    console.log('[fetchAppleReviewSummarizations] Using iTunes Lookup API:', url);
    
    const startTime = Date.now();
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json'
      }
    });
    const responseTime = Date.now() - startTime;
    
    console.log('[fetchAppleReviewSummarizations] Response received in', responseTime, 'ms');
    console.log('[fetchAppleReviewSummarizations] Response status:', response.status);
    console.log('[fetchAppleReviewSummarizations] Response data:', JSON.stringify(response.data, null, 2));

    // iTunes Lookup API returns results in an array
    if (!response.data.results || response.data.results.length === 0) {
      throw new Error('App not found or no rating data available');
    }

    const appData = response.data.results[0];
    
    // Transform iTunes data to match expected format
    const ratingData = {
      averageRating: appData.averageUserRatingForCurrentVersion || appData.averageUserRating || 0,
      totalRatings: appData.userRatingCountForCurrentVersion || appData.userRatingCount || 0,
      // iTunes doesn't provide rating distribution, so we'll estimate based on average
      ratingCounts: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0
      }
    };
    
    // If we have rating data, create a rough distribution
    // This is an estimation since iTunes doesn't provide the actual distribution
    if (ratingData.totalRatings > 0 && ratingData.averageRating > 0) {
      const avg = ratingData.averageRating;
      const total = ratingData.totalRatings;
      
      // Create a bell curve distribution around the average
      if (avg >= 4.5) {
        // High ratings app
        ratingData.ratingCounts[5] = Math.round(total * 0.7);
        ratingData.ratingCounts[4] = Math.round(total * 0.2);
        ratingData.ratingCounts[3] = Math.round(total * 0.05);
        ratingData.ratingCounts[2] = Math.round(total * 0.03);
        ratingData.ratingCounts[1] = Math.round(total * 0.02);
      } else if (avg >= 4.0) {
        // Good ratings app
        ratingData.ratingCounts[5] = Math.round(total * 0.4);
        ratingData.ratingCounts[4] = Math.round(total * 0.4);
        ratingData.ratingCounts[3] = Math.round(total * 0.1);
        ratingData.ratingCounts[2] = Math.round(total * 0.05);
        ratingData.ratingCounts[1] = Math.round(total * 0.05);
      } else if (avg >= 3.0) {
        // Average ratings app
        ratingData.ratingCounts[5] = Math.round(total * 0.2);
        ratingData.ratingCounts[4] = Math.round(total * 0.25);
        ratingData.ratingCounts[3] = Math.round(total * 0.3);
        ratingData.ratingCounts[2] = Math.round(total * 0.15);
        ratingData.ratingCounts[1] = Math.round(total * 0.1);
      } else {
        // Low ratings app
        ratingData.ratingCounts[5] = Math.round(total * 0.05);
        ratingData.ratingCounts[4] = Math.round(total * 0.1);
        ratingData.ratingCounts[3] = Math.round(total * 0.2);
        ratingData.ratingCounts[2] = Math.round(total * 0.3);
        ratingData.ratingCounts[1] = Math.round(total * 0.35);
      }
    }
    
    console.log('[fetchAppleReviewSummarizations] Transformed rating data:', ratingData);
    return ratingData;
  } catch (error) {
    console.error('[fetchAppleReviewSummarizations] ERROR occurred');
    console.error('[fetchAppleReviewSummarizations] Error type:', error.constructor.name);
    console.error('[fetchAppleReviewSummarizations] Error message:', error.message);
    console.error('[fetchAppleReviewSummarizations] Error code:', error.code);
    
    if (error.response) {
      console.error('[fetchAppleReviewSummarizations] Response status:', error.response.status);
      console.error('[fetchAppleReviewSummarizations] Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('[fetchAppleReviewSummarizations] Response headers:', error.response.headers);
    }
    
    throw new Error(error.response?.data?.errors?.[0]?.detail || 'Failed to fetch rating summaries');
  }
}

// Fetch reviews from Apple API with pagination and retries
async function fetchAppleReviews(token, appId, territory = 'USA', limit = 200, retries = 3) {
  const allReviews = [];
  let nextUrl = null;
  let pageCount = 0;
  const maxPages = 50; // Safety limit to prevent infinite loops
  
  // Initial URL
  let url = `${APPLE_API_BASE}/apps/${appId}/customerReviews`;
  
  while ((url || nextUrl) && pageCount < maxPages) {
    pageCount++;
    console.log(`Fetching page ${pageCount} of reviews for app ${appId}...`);
    
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(
          nextUrl || url,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            },
            params: nextUrl ? {} : { // Only add params for initial request
              'filter[territory]': territory,
              'limit': limit,
              'sort': '-createdDate',
              'include': 'response'
            },
            timeout: 30000
          }
        );

        // Add reviews from this page
        if (response.data && response.data.data) {
          allReviews.push(...response.data.data);
          console.log(`Added ${response.data.data.length} reviews from page ${pageCount}. Total: ${allReviews.length}`);
        }
        
        // Check for next page
        nextUrl = response.data?.links?.next || null;
        url = null; // Clear initial URL after first request
        
        if (!nextUrl) {
          console.log(`No more pages. Total reviews fetched: ${allReviews.length}`);
        }
        
        // Small delay between pages to avoid rate limiting
        if (nextUrl && pageCount > 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        break; // Success, exit retry loop
      } catch (error) {
        if (i === retries - 1) {
          console.error('Apple API Error after retries:', error.response?.data || error.message);
          // If we've already fetched some reviews, return what we have
          if (allReviews.length > 0) {
            console.warn(`Returning ${allReviews.length} reviews fetched before error`);
            return { data: allReviews };
          }
          throw new Error(error.response?.data?.errors?.[0]?.detail || 'Failed to fetch reviews');
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    
    // If no next URL, we're done
    if (!nextUrl) break;
  }
  
  if (pageCount >= maxPages) {
    console.warn(`Reached maximum page limit of ${maxPages}. Some reviews may not have been fetched.`);
  }
  
  return { data: allReviews };
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

// API endpoint for fetching Apple reviews with caching support
app.post('/api/apple-reviews', upload.single('privateKey'), async (req, res) => {
  try {
    let credentials;
    
    // Check if appId is provided in the request
    const requestedAppId = req.body.appId;
    
    // Priority 1: Use server-stored credentials if available and valid
    if (storedCredentials && validateCredentials(storedCredentials)) {
      console.log('Using server-stored Apple credentials');
      // If server has credentials but no specific appId, use the requested one
      credentials = { ...storedCredentials };
      if (requestedAppId && !credentials.appId) {
        credentials.appId = requestedAppId;
      }
    } 
    // Priority 2: Use uploaded credentials
    else if (requestedAppId && req.body.issuerId) {
      console.log('Using uploaded Apple credentials');
      
      // Handle private key from file upload or text field
      let privateKey = req.body.privateKey;
      if (req.file) {
        privateKey = req.file.buffer.toString('utf8');
      }
      
      if (!privateKey) {
        return res.status(400).json({ 
          error: 'Missing private key', 
          details: 'Private key (.p8 file) is required' 
        });
      }
      
      credentials = {
        appId: requestedAppId,
        issuerId: req.body.issuerId,
        keyId: req.body.keyId,
        privateKey: privateKey
      };
      
      if (!validateCredentials(credentials)) {
        return res.status(400).json({ 
          error: 'Invalid credential format',
          details: 'Please check your App ID (numeric), Issuer ID (UUID), and private key format' 
        });
      }
    } 
    // No credentials provided
    else {
      return res.status(400).json({ 
        error: 'No credentials provided',
        details: 'Either configure server credentials or provide them in the request' 
      });
    }

    // Extract key ID if not provided
    if (!credentials.keyId && req.file?.originalname) {
      const keyMatch = req.file.originalname.match(/AuthKey_([A-Z0-9]+)\.p8/);
      if (keyMatch) {
        credentials.keyId = keyMatch[1];
      } else {
        return res.status(400).json({ 
          error: 'Invalid key format', 
          details: 'Could not determine Key ID. Please ensure your file is named AuthKey_KEYID.p8' 
        });
      }
    }
    
    if (!credentials.keyId) {
      return res.status(400).json({ 
        error: 'Missing Key ID',
        details: 'Key ID is required (from .p8 filename or explicitly provided)' 
      });
    }

    // Check for date range and cache options
    const { useCache, forceRefresh, startDate, endDate } = req.body;
    
    // Check cache first if not forcing refresh
    if (useCache !== false && !forceRefresh) {
      const cachedData = await cacheService.getCachedReviews(credentials.appId);
      if (cachedData.fromCache) {
        // Filter cached reviews by date range if specified
        let filteredReviews = cachedData.reviews;
        if (startDate || endDate) {
          const start = startDate ? new Date(startDate) : null;
          let end = endDate ? new Date(endDate) : null;
          
          // Set end date to end of day to include all reviews from that day
          if (end) {
            end.setHours(23, 59, 59, 999);
          }
          
          filteredReviews = cachedData.reviews.filter(review => {
            const reviewDate = new Date(review.Date);
            if (start && reviewDate < start) return false;
            if (end && reviewDate > end) return false;
            return true;
          });
          
          console.log(`Serving ${filteredReviews.length} reviews from cache (filtered from ${cachedData.reviews.length}) for date range ${startDate || 'any'} to ${endDate || 'any'}`);
        } else {
          console.log(`Serving ${cachedData.reviews.length} reviews from cache for app ${credentials.appId}`);
        }
        
        return res.json({
          success: true,
          reviews: filteredReviews,
          fromCache: true,
          dateRangeFilter: (startDate || endDate) ? {
            startDate,
            endDate,
            filteredCount: filteredReviews.length
          } : null,
          meta: {
            ...cachedData.metadata,
            total: filteredReviews.length,
            appId: credentials.appId,
            territory: 'USA',
            fetchedAt: new Date().toISOString()
          }
        });
      }
    }

    // Generate JWT token with caching
    const token = await getAppleToken(credentials.keyId, credentials.issuerId, credentials.privateKey);

    // Fetch reviews from Apple
    const reviewData = await fetchAppleReviews(token, credentials.appId);
    
    // Transform reviews to our format
    const reviews = reviewData.data.map(transformReview);
    
    // Cache the reviews
    const metadata = await cacheService.setCachedReviews(credentials.appId, reviews);

    // Log success for monitoring
    console.log(`Successfully fetched ${reviews.length} reviews for app ${credentials.appId}`);

    // Send response
    res.json({
      success: true,
      reviews: reviews,
      fromCache: false,
      meta: {
        ...metadata,
        total: reviews.length,
        appId: credentials.appId,
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
  const apps = getAppleApps();
  res.json({ 
    status: 'ok', 
    service: 'Apple App Store Review API with Reddit Integration',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    configuredApps: apps.length,
    features: {
      apple: true,
      reddit: true,
      cache: true,
      rateLimit: true
    },
    cacheType: process.env.REDIS_URL ? 'redis' : 'memory'
  });
});

// API endpoint for fetching Apple rating summaries (all ratings)
app.post('/api/apple-reviews/summarizations', upload.single('privateKey'), async (req, res) => {
  console.log('\n==== RATING SUMMARIES ENDPOINT HIT ====');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    const { appId, issuerId, keyId, territory } = req.body;
    let privateKey = req.body.privateKey;

    console.log('Parsed parameters:', {
      appId,
      issuerId,
      keyId,
      territory,
      hasPrivateKey: !!privateKey
    });

    // Validate required fields
    if (!appId) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'App ID is required' 
      });
    }

    let credentials;
    
    // Priority 1: Use server-stored credentials if available
    if (storedCredentials && validateCredentials(storedCredentials)) {
      console.log('Using server-stored Apple credentials');
      credentials = { ...storedCredentials };
      if (!credentials.appId && appId) {
        credentials.appId = appId;
      }
    } 
    // Priority 2: Use provided credentials
    else if (appId && issuerId && keyId) {
      console.log('Using provided Apple credentials');
      
      // Handle private key from file upload or text field
      if (req.file) {
        privateKey = req.file.buffer.toString('utf8');
      }
      
      if (!privateKey) {
        return res.status(400).json({ 
          error: 'Missing private key', 
          details: 'Private key is required' 
        });
      }

      // Handle base64 encoded key
      if (privateKey.includes('LS0tLS1CRUdJTi')) {
        console.log('Decoding base64 private key');
        privateKey = Buffer.from(privateKey, 'base64').toString();
      }
      
      credentials = {
        appId,
        issuerId,
        keyId,
        privateKey
      };
    } 
    else {
      return res.status(400).json({ 
        error: 'Missing credentials',
        details: 'Please provide issuer ID, key ID, and private key' 
      });
    }

    // Generate JWT token with caching
    const token = await getAppleToken(credentials.keyId, credentials.issuerId, credentials.privateKey);

    // Fetch rating summaries using iTunes Lookup API
    console.log('Fetching rating summaries from iTunes API...');
    const summarizationsData = await fetchAppleReviewSummarizations(token, credentials.appId, territory || 'USA');
    
    // The fetchAppleReviewSummarizations function now returns the data directly
    // in the format we need (not wrapped in a data array)
    if (!summarizationsData) {
      return res.json({
        success: true,
        data: {
          averageRating: 0,
          totalRatings: 0,
          ratingCounts: {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0
          }
        }
      });
    }

    console.log('Rating summary data:', {
      averageRating: summarizationsData.averageRating,
      totalRatings: summarizationsData.totalRatings
    });
    
    res.json({
      success: true,
      data: {
        averageRating: summarizationsData.averageRating || 0,
        totalRatings: summarizationsData.totalRatings || 0,
        ratingCounts: summarizationsData.ratingCounts || {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0
        }
      }
    });
    
    console.log('==== RATING SUMMARIES ENDPOINT COMPLETE ====\n');
  } catch (error) {
    console.error('==== ERROR in rating summaries endpoint ====');
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('API response error:', error.response.data);
    }
    console.error('==== END ERROR ====\n');
    
    res.status(500).json({ 
      error: 'Failed to fetch rating summaries',
      details: error.message 
    });
  }
});

// Get configured apps endpoint
app.get('/api/apple-apps', (req, res) => {
  const apps = getAppleApps();
  res.json({ 
    apps: apps,
    hasServerCredentials: !!storedCredentials
  });
});

// Reddit API endpoints with production error handling
// Search for posts mentioning the app
app.post('/api/reddit/search', async (req, res) => {
  try {
    const { appName, limit = 100, sort = 'new', time = 'week', subreddit } = req.body;
    
    if (!appName) {
      return res.status(400).json({ error: 'App name is required' });
    }
    
    const posts = await redditService.searchPosts(appName, {
      limit,
      sort,
      timeFilter: time,
      subreddit
    });
    
    res.json({
      success: true,
      posts,
      count: posts.length
    });
  } catch (error) {
    console.error('Reddit search error:', error.message);
    res.status(500).json({ 
      error: 'Failed to search Reddit posts',
      details: process.env.NODE_ENV === 'production' ? 'Service temporarily unavailable' : error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get subreddit info
app.get('/api/reddit/subreddit/:subreddit', async (req, res) => {
  try {
    const { subreddit } = req.params;
    
    const info = await redditService.getSubredditInfo(subreddit);
    
    res.json({
      success: true,
      subreddit: info
    });
  } catch (error) {
    console.error('Reddit subreddit error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch subreddit info',
      details: process.env.NODE_ENV === 'production' ? 'Service temporarily unavailable' : error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get post comments
app.get('/api/reddit/post/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 100 } = req.query;
    
    const comments = await redditService.getPostComments(postId, {
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      comments,
      count: comments.length
    });
  } catch (error) {
    console.error('Reddit comments error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch post comments',
      details: process.env.NODE_ENV === 'production' ? 'Service temporarily unavailable' : error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Analyze mention trends
app.post('/api/reddit/trends', async (req, res) => {
  try {
    const { appName, timeframes = ['day', 'week', 'month', 'year'], subreddit = 'all' } = req.body;
    
    if (!appName) {
      return res.status(400).json({ error: 'App name is required' });
    }
    
    const trends = await redditService.analyzeMentionTrends(appName, {
      timeframes,
      subreddit
    });
    
    res.json({
      success: true,
      appName,
      trends
    });
  } catch (error) {
    console.error('Reddit trends error:', error.message);
    res.status(500).json({ 
      error: 'Failed to analyze mention trends',
      details: process.env.NODE_ENV === 'production' ? 'Service temporarily unavailable' : error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Detect influence spikes
app.post('/api/reddit/spikes', async (req, res) => {
  try {
    const { appName, lookbackDays = 30, spikeThreshold = 2.0, subreddit = 'all' } = req.body;
    
    if (!appName) {
      return res.status(400).json({ error: 'App name is required' });
    }
    
    const spikeData = await redditService.detectInfluenceSpikes(appName, {
      lookbackDays,
      spikeThreshold,
      subreddit
    });
    
    res.json({
      success: true,
      appName,
      ...spikeData
    });
  } catch (error) {
    console.error('Reddit spike detection error:', error.message);
    res.status(500).json({ 
      error: 'Failed to detect influence spikes',
      details: process.env.NODE_ENV === 'production' ? 'Service temporarily unavailable' : error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get relevant subreddits
app.post('/api/reddit/relevant-subreddits', async (req, res) => {
  try {
    const { appName, category = 'technology' } = req.body;
    
    if (!appName) {
      return res.status(400).json({ error: 'App name is required' });
    }
    
    const subreddits = await redditService.findRelevantSubreddits(appName, category);
    
    res.json({
      success: true,
      appName,
      category,
      subreddits
    });
  } catch (error) {
    console.error('Reddit relevant subreddits error:', error.message);
    res.status(500).json({ 
      error: 'Failed to find relevant subreddits',
      details: process.env.NODE_ENV === 'production' ? 'Service temporarily unavailable' : error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Cache status endpoint
app.get('/api/cache/status/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const metadata = await cacheService.getAppMetadata(appId);
    const hasCache = await cacheService.has(cacheService.generateReviewKey(appId));
    
    res.json({
      appId,
      hasCache,
      metadata,
      cacheStats: await cacheService.getStats()
    });
  } catch (error) {
    console.error('Cache status error:', error.message);
    res.status(500).json({ 
      error: 'Failed to get cache status',
      details: process.env.NODE_ENV === 'production' ? 'Service error' : error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Clear cache endpoint
app.delete('/api/cache/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    await cacheService.delete(cacheService.generateReviewKey(appId));
    await cacheService.delete(cacheService.generateMetaKey(appId));
    
    res.json({
      success: true,
      message: `Cache cleared for app ${appId}`
    });
  } catch (error) {
    console.error('Cache clear error:', error.message);
    res.status(500).json({ 
      error: 'Failed to clear cache',
      details: process.env.NODE_ENV === 'production' ? 'Service error' : error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Clear all cache endpoint
app.delete('/api/cache', async (req, res) => {
  try {
    await cacheService.clear();
    res.json({
      success: true,
      message: 'All cache cleared'
    });
  } catch (error) {
    console.error('Cache clear all error:', error.message);
    res.status(500).json({ 
      error: 'Failed to clear all cache',
      details: process.env.NODE_ENV === 'production' ? 'Service error' : error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Diagnostic endpoint (remove in production after testing)
app.get('/api/apple-config-check', (req, res) => {
  // More detailed diagnostics
  const envVars = {
    APPLE_ISSUER_ID: process.env.APPLE_ISSUER_ID ? `Set (${process.env.APPLE_ISSUER_ID.length} chars)` : 'Not set',
    APPLE_KEY_ID: process.env.APPLE_KEY_ID ? `Set (${process.env.APPLE_KEY_ID.length} chars)` : 'Not set',
    APPLE_PRIVATE_KEY_BASE64: process.env.APPLE_PRIVATE_KEY_BASE64 ? `Set (${process.env.APPLE_PRIVATE_KEY_BASE64.length} chars)` : 'Not set'
  };
  
  // Check for common issues
  const issues = [];
  if (process.env.APPLE_KEY_ID && process.env.APPLE_KEY_ID.includes(' ')) {
    issues.push('APPLE_KEY_ID contains spaces');
  }
  if (process.env.APPLE_KEY_ID && (process.env.APPLE_KEY_ID.includes('"') || process.env.APPLE_KEY_ID.includes("'"))) {
    issues.push('APPLE_KEY_ID contains quotes');
  }
  
  const diagnostics = {
    apps: getAppleApps(),
    credentials: {
      hasIssuerId: !!process.env.APPLE_ISSUER_ID,
      hasKeyId: !!process.env.APPLE_KEY_ID,
      hasPrivateKey: !!process.env.APPLE_PRIVATE_KEY_BASE64 || !!process.env.APPLE_PRIVATE_KEY_PATH,
      keyType: process.env.APPLE_PRIVATE_KEY_BASE64 ? 'base64' : (process.env.APPLE_PRIVATE_KEY_PATH ? 'file' : 'none')
    },
    storedCredentialsValid: !!storedCredentials && validateCredentials(storedCredentials),
    environment: process.env.NODE_ENV,
    envVars: envVars,
    issues: issues,
    credentialLoadAttempt: storedCredentials ? 'Success' : 'Failed'
  };
  res.json(diagnostics);
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
  if (storedCredentials && validateCredentials(storedCredentials)) {
    console.log('Server configured with stored credentials for app:', storedCredentials.appId);
  } else {
    console.log('No server credentials configured - will require upload');
  }
});