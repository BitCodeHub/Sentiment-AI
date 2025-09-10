const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const multer = require('multer');
require('dotenv').config();
const cacheService = require('./services/cacheService');

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

// Get configured apps from environment or config
function getConfiguredApps() {
  // Check for configured apps in environment
  const apps = [];
  
  // Example: APPLE_APP_1234567890_NAME=MyApp
  Object.keys(process.env).forEach(key => {
    const match = key.match(/^APPLE_APP_(\d+)_NAME$/);
    if (match) {
      const appId = match[1];
      apps.push({
        id: appId,
        name: process.env[key],
        issuerId: process.env[`APPLE_ISSUER_ID_${appId}`],
        keyId: process.env[`APPLE_KEY_ID_${appId}`],
        privateKey: process.env[`APPLE_PRIVATE_KEY_${appId}`]
      });
    }
  });
  
  return apps;
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

// Fetch reviews from Apple API with pagination support
async function fetchAppleReviews(token, appId, territory = 'USA', limit = 200, nextLink = null) {
  try {
    const url = nextLink || `${APPLE_API_BASE}/apps/${appId}/customerReviews`;
    const response = await axios.get(
      url,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        params: nextLink ? {} : {
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

// Fetch all reviews with pagination
async function fetchAllReviews(token, appId, territory = 'USA', sinceDate = null, dateRange = null) {
  const allReviews = [];
  let nextLink = null;
  let hasMore = true;
  const limit = 200; // Max allowed by API
  
  // Parse date range if provided
  const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : null;
  const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : null;
  
  while (hasMore) {
    const response = await fetchAppleReviews(token, appId, territory, limit, nextLink);
    const reviews = response.data || [];
    
    // Filter reviews based on date criteria
    let filtered = reviews;
    
    if (startDate || endDate || sinceDate) {
      filtered = reviews.filter(review => {
        const reviewDate = new Date(review.attributes.createdDate);
        
        // Check sinceDate first (for incremental updates)
        if (sinceDate && reviewDate <= new Date(sinceDate)) {
          return false;
        }
        
        // Check date range
        if (startDate && reviewDate < startDate) {
          return false;
        }
        if (endDate && reviewDate > endDate) {
          return false;
        }
        
        return true;
      });
      
      allReviews.push(...filtered);
      
      // Stop early if we've reached reviews outside our date range
      if (filtered.length < reviews.length) {
        // Check if we should stop based on the oldest review in this batch
        const oldestReview = reviews[reviews.length - 1];
        const oldestDate = new Date(oldestReview.attributes.createdDate);
        
        // Stop if the oldest review is before our start date or sinceDate
        if ((startDate && oldestDate < startDate) || (sinceDate && oldestDate <= new Date(sinceDate))) {
          hasMore = false;
          break;
        }
      }
    } else {
      allReviews.push(...reviews);
    }
    
    // Check for next page
    nextLink = response.links?.next;
    hasMore = !!nextLink;
    
    // Rate limiting protection
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return allReviews;
}

// Helper function to map territory codes to languages
function getLanguageFromTerritory(territory) {
  // Map common territory codes to language codes
  const territoryToLanguage = {
    'USA': 'en', 'GBR': 'en', 'CAN': 'en', 'AUS': 'en', 'NZL': 'en',
    'FRA': 'fr', 'DEU': 'de', 'ESP': 'es', 'ITA': 'it', 'PRT': 'pt',
    'BRA': 'pt', 'MEX': 'es', 'ARG': 'es', 'CHL': 'es', 'COL': 'es',
    'JPN': 'ja', 'KOR': 'ko', 'CHN': 'zh', 'TWN': 'zh', 'HKG': 'zh',
    'IND': 'hi', 'RUS': 'ru', 'NLD': 'nl', 'BEL': 'nl', 'SWE': 'sv',
    'NOR': 'no', 'DNK': 'da', 'FIN': 'fi', 'POL': 'pl', 'TUR': 'tr'
  };
  
  return territoryToLanguage[territory] || 'en';
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
    'OS': attributes.osVersion || '',
    'Country': attributes.territory || 'USA',
    'Language': attributes.territory ? getLanguageFromTerritory(attributes.territory) : 'en',
    'Developer Response': response ? 'Yes' : ''
  };
}

// API endpoint for fetching Apple reviews with caching
app.post('/api/apple-reviews', upload.single('privateKey'), async (req, res) => {
  try {
    const { appId, issuerId, keyId, useCache, forceRefresh, startDate, endDate, useServerCredentials } = req.body;
    let privateKey = req.body.privateKey;

    // Validate required fields
    if (!appId) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'App ID is required' 
      });
    }

    // Check for server-configured credentials
    const configuredApps = getConfiguredApps();
    const hasServerCredentials = configuredApps.some(app => app.id === appId);

    // If using server credentials, get them
    if (useServerCredentials === 'true' && hasServerCredentials) {
      const config = configuredApps.find(app => app.id === appId);
      issuerId = config.issuerId || process.env[`APPLE_ISSUER_ID_${appId}`];
      privateKey = config.privateKey || process.env[`APPLE_PRIVATE_KEY_${appId}`];
      keyId = config.keyId || process.env[`APPLE_KEY_ID_${appId}`];
    } else if (!issuerId) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'Issuer ID is required when not using server credentials' 
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

    // Check cache first if not forcing refresh and no date range specified
    if (useCache !== false && !forceRefresh && !startDate && !endDate) {
      const cachedData = await cacheService.getCachedReviews(appId);
      if (cachedData.fromCache) {
        console.log(`Serving ${cachedData.reviews.length} reviews from cache for app ${appId}`);
        return res.json({
          success: true,
          reviews: cachedData.reviews,
          fromCache: true,
          meta: {
            ...cachedData.metadata,
            total: cachedData.reviews.length,
            appId: appId,
            territory: 'USA'
          }
        });
      }
    }

    // Generate JWT token
    const token = generateAppleToken(extractedKeyId, issuerId, privateKey);

    // Get last sync date for incremental updates (only if no date range specified)
    const cachedMetadata = await cacheService.getAppMetadata(appId);
    const sinceDate = (forceRefresh || startDate || endDate) ? null : cachedMetadata?.lastSync;

    // Create date range object if dates are provided
    const dateRange = (startDate || endDate) ? { startDate, endDate } : null;

    // Fetch reviews from Apple (all, incremental, or date range)
    const rawReviews = await fetchAllReviews(token, appId, 'USA', sinceDate, dateRange);
    
    // Transform reviews to our format
    const newReviews = rawReviews.map(transformReview);
    
    // Handle incremental updates
    let allReviews = newReviews;
    let incrementalUpdate = false;
    
    if (!forceRefresh && sinceDate && cachedMetadata) {
      // Get existing cached reviews
      const cachedData = await cacheService.getCachedReviews(appId);
      if (cachedData.reviews && cachedData.reviews.length > 0) {
        // Merge new reviews with existing ones
        const existingReviewIds = new Set(cachedData.reviews.map(r => r['Review ID']));
        const uniqueNewReviews = newReviews.filter(r => !existingReviewIds.has(r['Review ID']));
        
        allReviews = [...uniqueNewReviews, ...cachedData.reviews];
        allReviews.sort((a, b) => new Date(b.Date) - new Date(a.Date));
        incrementalUpdate = true;
        
        console.log(`Incremental update: ${uniqueNewReviews.length} new reviews, ${allReviews.length} total`);
      }
    }
    
    // Cache the updated reviews
    const metadata = await cacheService.setCachedReviews(appId, allReviews);

    // Send response
    res.json({
      success: true,
      reviews: allReviews,
      fromCache: false,
      incrementalUpdate,
      dateRangeFilter: dateRange ? {
        startDate: startDate,
        endDate: endDate,
        filteredCount: allReviews.length
      } : null,
      meta: {
        ...metadata,
        total: allReviews.length,
        newReviews: incrementalUpdate ? newReviews.length : allReviews.length,
        appId: appId,
        territory: 'USA'
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

// Review metadata endpoint - fetch date range and count without fetching all reviews
app.post('/api/apple-reviews/metadata', upload.single('privateKey'), async (req, res) => {
  try {
    const { appId, issuerId, keyId, useServerCredentials } = req.body;
    let privateKey = req.body.privateKey;

    // Validate required fields
    if (!appId) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'App ID is required' 
      });
    }

    // Check for server-configured credentials
    const configuredApps = getConfiguredApps();
    const hasServerCredentials = configuredApps.some(app => app.id === appId);

    // If using server credentials, get them
    if (useServerCredentials === 'true' && hasServerCredentials) {
      const config = configuredApps.find(app => app.id === appId);
      issuerId = config.issuerId || process.env[`APPLE_ISSUER_ID_${appId}`];
      privateKey = config.privateKey || process.env[`APPLE_PRIVATE_KEY_${appId}`];
      keyId = config.keyId || process.env[`APPLE_KEY_ID_${appId}`];
    } else if (!issuerId) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'Issuer ID is required when not using server credentials' 
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

    // Fetch just the first page to get metadata
    const firstPageData = await fetchAppleReviews(token, appId, 'USA', 200);
    const reviews = firstPageData.data || [];

    // Get date range from first and last review in the response
    let oldestDate = null;
    let newestDate = null;
    let estimatedTotal = 0;

    if (reviews.length > 0) {
      // The API returns reviews sorted by -createdDate (newest first)
      newestDate = reviews[0].attributes.createdDate;
      
      // To get the oldest date, we need to paginate to the end
      // For now, estimate based on the first page
      oldestDate = reviews[reviews.length - 1].attributes.createdDate;
      
      // Estimate total count based on pagination links
      if (firstPageData.meta && firstPageData.meta.paging) {
        estimatedTotal = firstPageData.meta.paging.total || reviews.length;
      } else {
        // If no paging info, count pages
        let pageCount = 1;
        let nextLink = firstPageData.links?.next;
        
        while (nextLink && pageCount < 5) { // Limit to 5 pages for metadata check
          const nextPage = await fetchAppleReviews(token, appId, 'USA', 200, nextLink);
          const nextReviews = nextPage.data || [];
          
          if (nextReviews.length > 0) {
            oldestDate = nextReviews[nextReviews.length - 1].attributes.createdDate;
          }
          
          nextLink = nextPage.links?.next;
          pageCount++;
          
          // Rate limiting protection
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        estimatedTotal = pageCount * 200; // Rough estimate
        if (nextLink) {
          estimatedTotal += '+'; // Indicate there are more
        }
      }
    }

    res.json({
      success: true,
      metadata: {
        appId,
        dateRange: {
          oldest: oldestDate,
          newest: newestDate
        },
        estimatedCount: estimatedTotal,
        hasReviews: reviews.length > 0
      }
    });

  } catch (error) {
    console.error('Metadata API Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch review metadata',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get configured apps endpoint
app.get('/api/apple-apps', (req, res) => {
  const apps = getConfiguredApps();
  res.json({
    apps: apps.map(app => ({ id: app.id, name: app.name })),
    hasServerCredentials: apps.length > 0
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Apple App Store Review API',
    timestamp: new Date().toISOString(),
    cacheEnabled: true
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Apple App Store API server running on port ${PORT}`);
  console.log(`Frontend should connect to: http://localhost:${PORT}/api/apple-reviews`);
  console.log(`Cache service initialized with ${process.env.REDIS_URL ? 'Redis' : 'in-memory'} storage`);
});