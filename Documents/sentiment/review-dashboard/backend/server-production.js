console.log('Starting server initialization...');
const express = require('express');
console.log('Express loaded');
const cors = require('cors');
console.log('CORS loaded');
const jwt = require('jsonwebtoken');
console.log('JWT loaded');
const axios = require('axios');
console.log('Axios loaded');
const multer = require('multer');
console.log('Multer loaded');
require('dotenv').config();
console.log('Dotenv loaded');
const cacheService = require('./services/cacheService');
console.log('Cache service loaded');
const redditService = require('./services/redditService');
console.log('Reddit service loaded');
const appleRSSService = require('./services/appleRSSService');
console.log('Apple RSS service loaded');
const competitorService = require('./services/competitorService');
console.log('Competitor service loaded');
const { getAppleApps, getAppleCredentials } = require('./config/apple-credentials');
console.log('Apple credentials config loaded');

const app = express();
const PORT = process.env.PORT || 3001;

// Request logging middleware - MUST BE FIRST
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const origin = req.headers.origin || req.headers.referer || 'unknown';
  
  // Log all incoming requests
  console.log(`\n[${timestamp}] ${method} ${url}`);
  console.log(`  Origin: ${origin}`);
  console.log(`  User-Agent: ${req.headers['user-agent']}`);
  
  // Log request body for POST/PUT requests (but not for file uploads)
  if ((method === 'POST' || method === 'PUT') && req.body && !req.headers['content-type']?.includes('multipart/form-data')) {
    console.log(`  Body: ${JSON.stringify(req.body).substring(0, 200)}...`);
  }
  
  // Log response when it's sent
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`  Response Status: ${res.statusCode}`);
    if (res.statusCode >= 400) {
      console.log(`  Error Response: ${data}`);
    }
    originalSend.call(this, data);
  };
  
  next();
});

// CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Log CORS preflight requests
app.options('*', (req, res, next) => {
  console.log(`[CORS Preflight] ${req.method} ${req.url} from ${req.headers.origin}`);
  next();
});

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
  // Use the centralized function from apple-credentials.js
  const apps = getAppleApps();
  const sharedCredentials = getAppleCredentials();
  
  // If we have shared credentials, apply them to all apps
  if (sharedCredentials) {
    return apps.map(app => ({
      id: app.id,
      name: app.name,
      issuerId: sharedCredentials.issuerId,
      keyId: sharedCredentials.keyId,
      privateKey: sharedCredentials.privateKey
    }));
  }
  
  // Return apps without credentials if none are configured
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

// Fetch all reviews with pagination
async function fetchAllReviews(token, appId, territory = 'USA', sinceDate = null, dateRange = null) {
  console.log('\n[fetchAllReviews] STARTING with parameters:', {
    appId,
    territory,
    sinceDate,
    dateRange,
    hasToken: !!token,
    tokenLength: token?.length
  });
  
  const allReviews = [];
  let nextLink = null;
  let hasMore = true;
  const limit = 200; // Max allowed by API
  
  // Parse date range if provided
  const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : null;
  let endDate = dateRange?.endDate ? new Date(dateRange.endDate) : null;
  
  // If endDate is provided, set it to end of day (23:59:59.999) to include all reviews from that day
  if (endDate) {
    endDate = new Date(endDate);
    endDate.setHours(23, 59, 59, 999);
  }
  
  // Debug logging for date range
  console.log(`[fetchAllReviews] Date range parsing:
    - Input: ${JSON.stringify(dateRange)}
    - Parsed startDate: ${startDate ? startDate.toISOString() : 'null'}
    - Parsed endDate: ${endDate ? endDate.toISOString() : 'null'}`);
  
  let pageCount = 0;
  const maxPages = 1000; // Increased to fetch ALL reviews - no artificial limits
  
  while (hasMore && pageCount < maxPages) {
    pageCount++;
    console.log(`[fetchAllReviews] Fetching page ${pageCount}/${maxPages}...`);
    
    const response = await fetchAppleReviews(token, appId, territory, limit, nextLink);
    const reviews = response.data || [];
    
    console.log(`[fetchAllReviews] Page ${pageCount}: received ${reviews.length} reviews`);
    
    // Log pagination info
    if (response.links) {
      console.log(`[fetchAllReviews] Pagination links present: next=${!!response.links.next}`);
    }
    
    // Early exit if no reviews
    if (reviews.length === 0) {
      console.log(`[fetchAllReviews] No more reviews found, stopping pagination`);
      hasMore = false;
      break;
    }
    
    // Get date bounds for this batch
    const newestReview = new Date(reviews[0].attributes.createdDate);
    const oldestReview = new Date(reviews[reviews.length - 1].attributes.createdDate);
    
    // Log the most recent reviews for debugging
    if (!nextLink) {
      const daysAgo = Math.floor((Date.now() - newestReview) / (1000 * 60 * 60 * 24));
      console.log(`[fetchAllReviews] Batch ${allReviews.length > 0 ? 'next' : 'first'}:`);
      console.log(`  - Newest review: ${newestReview.toISOString()} (${daysAgo} days ago)`);
      console.log(`  - Oldest review: ${oldestReview.toISOString()}`);
      console.log(`  - Date filter: ${startDate ? startDate.toISOString() : 'none'} to ${endDate ? endDate.toISOString() : 'none'}`);
      
      // Log warning about Apple's typical delay
      if (daysAgo >= 4) {
        console.log(`  - WARNING: Apple API shows ${daysAgo}-day delay. This is typical for Apple's review API.`);
      }
    }
    
    // Early stopping: if we have a startDate and the newest review in this batch is before it, stop
    if (startDate && newestReview < startDate) {
      console.log(`[fetchAllReviews] Stopping early: newest review in batch is before start date`);
      hasMore = false;
      break;
    }
    
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
      
      // Debug logging for filtering
      if (reviews.length > 0 && filtered.length === 0) {
        console.log(`[fetchAllReviews] WARNING: All ${reviews.length} reviews filtered out!`);
        console.log(`  - Sample review date: ${new Date(reviews[0].attributes.createdDate).toISOString()}`);
        console.log(`  - Date range: ${startDate ? startDate.toISOString() : 'none'} to ${endDate ? endDate.toISOString() : 'none'}`);
      }
      
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
  
  console.log(`[fetchAllReviews] Completed: fetched ${allReviews.length} reviews across ${pageCount} pages`);
  if (pageCount >= maxPages) {
    console.log(`[fetchAllReviews] WARNING: Hit max page limit of ${maxPages}. There may be more reviews available.`);
  }
  
  // Log warning if we hit the page limit
  if (pageCount >= maxPages) {
    console.log(`[fetchAllReviews] WARNING: Hit maximum page limit (${maxPages}). There may be more reviews available.`);
  }
  
  return allReviews;
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

    // Check cache first if not forcing refresh
    if (useCache !== false && !forceRefresh) {
      const cachedData = await cacheService.getCachedReviews(appId);
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
          console.log(`Serving ${cachedData.reviews.length} reviews from cache for app ${appId}`);
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
            appId: appId,
            territory: 'USA'
          }
        });
      }
    }

    // Generate JWT token
    const token = generateAppleToken(extractedKeyId, issuerId, privateKey);

    // Get last sync date for incremental updates (disabled only for forceRefresh)
    const cachedMetadata = await cacheService.getAppMetadata(appId);
    const sinceDate = forceRefresh ? null : cachedMetadata?.lastSync;

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

// API endpoint for fetching Apple rating summaries (all ratings)
app.post('/api/apple-reviews/summarizations', upload.single('privateKey'), async (req, res) => {
  console.log('\n==== RATING SUMMARIES ENDPOINT HIT ====');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request headers:', req.headers);
  console.log('Request body:', {
    ...req.body,
    privateKey: req.body.privateKey ? `[REDACTED ${req.body.privateKey.length} chars]` : undefined
  });
  console.log('Has file upload:', !!req.file);
  
  try {
    const { appId, issuerId, keyId, territory, useServerCredentials } = req.body;
    let privateKey = req.body.privateKey;

    console.log('Parsed parameters:', {
      appId,
      issuerId,
      keyId,
      territory,
      useServerCredentials,
      hasPrivateKey: !!privateKey,
      privateKeyLength: privateKey?.length
    });

    // Validate required fields
    if (!appId) {
      console.error('Missing app ID');
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'App ID is required' 
      });
    }

    let token;
    
    // Check if we should use server-configured credentials
    const configuredApps = getConfiguredApps();
    const hasServerCredentials = configuredApps.some(app => app.id === appId);
    console.log('Server credentials check:', { hasServerCredentials, configuredApps: configuredApps.length });
    
    if (useServerCredentials && hasServerCredentials) {
      console.log('Using server-configured credentials');
      // Use server credentials
      const config = configuredApps.find(app => app.id === appId);
      if (!config || !config.keyId) {
        console.error('Server credentials not properly configured');
        return res.status(400).json({
          error: 'Server credentials not properly configured',
          details: 'Please contact administrator'
        });
      }
      
      console.log('Generating token with server credentials');
      token = generateAppleToken(config.keyId, config.issuerId, config.privateKey);
    } else {
      console.log('Using user-provided credentials');
      // Use provided credentials
      if (!issuerId || !keyId || !privateKey) {
        console.error('Missing user credentials:', { hasIssuerId: !!issuerId, hasKeyId: !!keyId, hasPrivateKey: !!privateKey });
        return res.status(400).json({ 
          error: 'Missing credentials',
          details: 'Please provide issuer ID, key ID, and private key' 
        });
      }

      // Handle private key from file upload
      if (req.file) {
        console.log('Using private key from file upload');
        privateKey = req.file.buffer.toString('utf8');
      }

      // Handle base64 encoded key
      if (privateKey.includes('LS0tLS1CRUdJTi')) {
        console.log('Decoding base64 private key');
        privateKey = Buffer.from(privateKey, 'base64').toString();
      }
      
      console.log('Private key format:', {
        startsWithBEGIN: privateKey.startsWith('-----BEGIN'),
        endsWithEND: privateKey.endsWith('-----END PRIVATE KEY-----\n') || privateKey.endsWith('-----END PRIVATE KEY-----'),
        length: privateKey.length,
        lineCount: privateKey.split('\n').length
      });
      
      console.log('Generating JWT token...');
      try {
        token = generateAppleToken(keyId, issuerId, privateKey);
        console.log('JWT token generated successfully');
      } catch (tokenError) {
        console.error('JWT generation error:', tokenError);
        throw tokenError;
      }
    }

    // Fetch rating summaries
    console.log('Fetching rating summaries from Apple API...');
    console.log('Territory:', territory || 'USA');
    const startTime = Date.now();
    
    const ratingData = await fetchAppleReviewSummarizations(token, appId, territory || 'USA');
    
    const apiTime = Date.now() - startTime;
    console.log(`iTunes API response received in ${apiTime}ms`);
    console.log('Rating data received:', ratingData);
    const responseData = {
      success: true,
      data: ratingData
    };
    
    console.log('Sending response:', responseData);
    res.json(responseData);
    console.log('==== RATING SUMMARIES ENDPOINT COMPLETE ====\n');
  } catch (error) {
    console.error('==== ERROR in rating summaries endpoint ====');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
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
  const apps = getConfiguredApps();
  const appsWithCredentials = apps.filter(app => app.issuerId && app.keyId && app.privateKey);
  
  console.log('[Apple Apps] Configured apps:', apps.length);
  console.log('[Apple Apps] Apps with credentials:', appsWithCredentials.length);
  
  res.json({
    apps: apps.map(app => ({ 
      id: app.id, 
      name: app.name,
      hasCredentials: !!(app.issuerId && app.keyId && app.privateKey)
    })),
    hasServerCredentials: appsWithCredentials.length > 0
  });
});

// Reddit API endpoints
// Search for posts mentioning the app
app.post('/api/reddit/search', async (req, res) => {
  console.log('\n=== Reddit Search Request ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request headers:', {
    origin: req.headers.origin,
    referer: req.headers.referer,
    contentType: req.headers['content-type'],
    userAgent: req.headers['user-agent']
  });
  console.log('Request body:', req.body);
  console.log('Reddit service configured:', redditService.getStatus().configured);
  
  try {
    const { appName, limit = 100, sort = 'new', time = 'week', subreddit } = req.body;
    
    if (!appName) {
      console.log('[Reddit Search] Error: App name is required');
      return res.status(400).json({ error: 'App name is required' });
    }
    
    // Check if Reddit service is configured
    const redditStatus = redditService.getStatus();
    if (!redditStatus.configured) {
      console.error('[Reddit Search] Error: Reddit API not configured');
      return res.status(503).json({
        error: 'Reddit service not configured',
        details: 'Reddit API credentials are missing. Please configure REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.',
        configured: false
      });
    }
    
    console.log('[Reddit Search] Searching for:', appName);
    console.log('[Reddit Search] Request body values:', { limit, sort, time, subreddit });
    console.log('[Reddit Search] Passing to searchPosts:', {
      limit,
      sort,
      timeFilter: time,  // Note: mapping 'time' to 'timeFilter'
      subreddit
    });
    
    const startTime = Date.now();
    const posts = await redditService.searchPosts(appName, {
      limit,
      sort,
      timeFilter: time,
      subreddit
    });
    const searchTime = Date.now() - startTime;
    
    console.log(`[Reddit Search] Search completed in ${searchTime}ms`);
    console.log(`[Reddit Search] Found ${posts.length} posts`);
    
    res.json({
      success: true,
      posts,
      count: posts.length,
      searchTime
    });
  } catch (error) {
    console.error('[Reddit Search] Error:', error.message);
    console.error('[Reddit Search] Stack:', error.stack);
    
    // Provide more specific error responses
    if (error.message.includes('credentials')) {
      res.status(503).json({ 
        error: 'Reddit service configuration error',
        details: error.message,
        configured: false
      });
    } else if (error.message.includes('Rate limited')) {
      res.status(429).json({ 
        error: 'Reddit API rate limit exceeded',
        details: error.message 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to search Reddit posts',
        details: error.message 
      });
    }
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
    console.error('Reddit subreddit error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch subreddit info',
      details: error.message 
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
    console.error('Reddit comments error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch post comments',
      details: error.message 
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
    console.error('Reddit trends error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze mention trends',
      details: error.message 
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
    console.error('Reddit spike detection error:', error);
    res.status(500).json({ 
      error: 'Failed to detect influence spikes',
      details: error.message 
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
    console.error('Reddit relevant subreddits error:', error);
    res.status(500).json({ 
      error: 'Failed to find relevant subreddits',
      details: error.message 
    });
  }
});

// Reddit service status endpoint
app.get('/api/reddit/status', async (req, res) => {
  console.log('[Reddit Status] Checking Reddit service status...');
  
  try {
    const status = redditService.getStatus();
    
    // If configured, try to get an access token to verify credentials work
    let authTest = { tested: false, success: false, error: null };
    
    if (status.configured) {
      try {
        console.log('[Reddit Status] Testing authentication...');
        await redditService.getAccessToken();
        authTest = { tested: true, success: true, error: null };
        console.log('[Reddit Status] Authentication test successful');
      } catch (error) {
        authTest = { tested: true, success: false, error: error.message };
        console.error('[Reddit Status] Authentication test failed:', error.message);
      }
    }
    
    res.json({
      success: true,
      configured: status.configured,
      status: status.configured ? 'ready' : 'not configured',
      details: {
        ...status,
        authenticationTest: authTest
      },
      requiredEnvVars: {
        REDDIT_CLIENT_ID: !!process.env.REDDIT_CLIENT_ID,
        REDDIT_CLIENT_SECRET: !!process.env.REDDIT_CLIENT_SECRET
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Reddit Status] Error checking status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check Reddit service status',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('[Health Check] Request received from:', req.headers.origin || req.headers.referer || 'unknown');
  
  // Get Reddit service status
  const redditStatus = redditService.getStatus();
  
  res.json({ 
    status: 'ok', 
    service: 'Apple App Store Review API',
    timestamp: new Date().toISOString(),
    cacheEnabled: true,
    environment: {
      port: PORT,
      corsOrigin: process.env.FRONTEND_URL || 'http://localhost:5173',
      hasRedis: !!process.env.REDIS_URL,
      nodeEnv: process.env.NODE_ENV || 'development'
    },
    services: {
      reddit: {
        status: redditStatus.configured ? 'configured' : 'not configured',
        details: redditStatus
      }
    }
  });
});

// Test endpoint for debugging connectivity
app.get('/api/test', (req, res) => {
  console.log('[Test Endpoint] Hit at:', new Date().toISOString());
  console.log('[Test Endpoint] Headers:', req.headers);
  res.json({
    message: 'Backend is reachable',
    timestamp: new Date().toISOString(),
    receivedHeaders: {
      origin: req.headers.origin,
      referer: req.headers.referer,
      userAgent: req.headers['user-agent']
    }
  });
});

// Apple RSS Feed endpoint - for more recent reviews
app.post('/api/apple-reviews/rss', upload.none(), async (req, res) => {
  console.log('\n=== Apple RSS Feed Request ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request body:', req.body);
  
  try {
    const { appId, limit = 200 } = req.body;
    
    // Parse countries if it's a JSON string
    let countries = req.body.countries;
    if (countries) {
      try {
        countries = typeof countries === 'string' ? JSON.parse(countries) : countries;
      } catch (e) {
        console.log('[RSS] Failed to parse countries, using default:', e.message);
        countries = ['us'];
      }
    } else {
      countries = ['us'];
    }
    
    if (!appId) {
      return res.status(400).json({
        error: 'App ID is required'
      });
    }
    
    // Fetch reviews from RSS feeds
    const startTime = Date.now();
    const result = await appleRSSService.fetchMultiCountryReviews(
      appId,
      countries,
      limit
    );
    const fetchTime = Date.now() - startTime;
    
    console.log(`[RSS] Fetched ${result.reviews.length} reviews in ${fetchTime}ms`);
    console.log('[RSS] Country results:', result.countryResults);
    
    // Check if we have recent reviews
    if (result.reviews.length > 0) {
      const mostRecent = new Date(result.reviews[0].Date);
      const daysAgo = Math.floor((Date.now() - mostRecent) / (1000 * 60 * 60 * 24));
      console.log(`[RSS] Most recent review: ${daysAgo} days ago`);
    }
    
    res.json({
      success: true,
      reviews: result.reviews,
      totalCount: result.totalCount,
      countryResults: result.countryResults,
      fetchTime,
      source: 'RSS'
    });
    
  } catch (error) {
    console.error('[RSS] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch RSS reviews',
      details: error.message
    });
  }
});

// Hybrid endpoint - combines App Store Connect API and RSS feeds
app.post('/api/apple-reviews/hybrid', upload.single('privateKey'), async (req, res) => {
  console.log('\n=== Apple Hybrid Reviews Request ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    let { appId, issuerId, keyId, useServerCredentials, daysToFetch = 5475, startDate, endDate } = req.body; // Default to 15 years
    let privateKey = req.body.privateKey;
    
    // Parse countries if it's a JSON string
    let countries = req.body.countries;
    if (countries) {
      try {
        countries = typeof countries === 'string' ? JSON.parse(countries) : countries;
      } catch (e) {
        console.log('[Hybrid] Failed to parse countries, using default:', e.message);
        countries = ['us']; // Default to US only
      }
    } else {
      countries = ['us']; // Default to US only
    }
    
    console.log('[Hybrid] Request body params:', {
      appId,
      hasIssuerId: !!issuerId,
      hasKeyId: !!keyId,
      hasPrivateKey: !!privateKey,
      privateKeyLength: privateKey?.length,
      useServerCredentials,
      useServerCredentialsType: typeof useServerCredentials,
      countries: countries, // Now properly parsed
      countriesType: typeof countries, // Should be object/array
      daysToFetch,
      startDate,
      endDate
    });
    
    if (!appId) {
      return res.status(400).json({
        error: 'App ID is required'
      });
    }
    
    const results = {
      rss: { success: false, reviews: [], error: null },
      api: { success: false, reviews: [], error: null }
    };
    
    // Try RSS feed first (doesn't require auth)
    try {
      console.log(`[Hybrid] Fetching from RSS feeds for countries: ${countries.join(', ')}`);
      const rssResult = await appleRSSService.fetchMultiCountryReviews(appId, countries, 500);
      results.rss = {
        success: true,
        reviews: rssResult.reviews,
        error: null
      };
      console.log(`[Hybrid] RSS: ${rssResult.reviews.length} reviews`);
    } catch (rssError) {
      console.error('[Hybrid] RSS error:', rssError.message);
      results.rss.error = rssError.message;
    }
    
    // Try App Store Connect API if credentials provided
    // Check if useServerCredentials is truthy (handle both string "true" and boolean true)
    const shouldUseServerCredentials = useServerCredentials === 'true' || useServerCredentials === true;
    
    if (issuerId || shouldUseServerCredentials) {
      console.log('[Hybrid] Attempting to use Apple API with credentials');
      console.log(`[Hybrid] Has issuer ID: ${!!issuerId}, Use server credentials: ${shouldUseServerCredentials}`);
      try {
        console.log('[Hybrid] Fetching from App Store Connect API...');
        
        // Get configured apps for server credentials
        const configuredApps = getConfiguredApps();
        console.log('[Hybrid] Configured apps:', configuredApps.map(app => ({ id: app.id, hasCredentials: !!(app.issuerId && app.keyId && app.privateKey) })));
        const hasServerCredentials = configuredApps.some(app => app.id === appId);
        
        // Set up credentials
        if (shouldUseServerCredentials && hasServerCredentials) {
          const config = configuredApps.find(app => app.id === appId);
          issuerId = config.issuerId;
          privateKey = config.privateKey;
          keyId = config.keyId;
          console.log('[Hybrid] Using server credentials for app:', appId);
        } else {
          if (shouldUseServerCredentials && !hasServerCredentials) {
            console.log('[Hybrid] WARNING: Server credentials requested but not available for app:', appId);
            console.log('[Hybrid] Falling back to user-provided credentials if available');
          }
          
          if (!privateKey && req.file) {
            privateKey = req.file.buffer.toString('utf8');
            console.log('[Hybrid] Using uploaded private key file, size:', req.file.buffer.length);
          }
        }
        
        console.log('[Hybrid] Credential setup complete:', {
          hasIssuerId: !!issuerId,
          hasKeyId: !!keyId,
          hasPrivateKey: !!privateKey,
          privateKeyLength: privateKey?.length,
          shouldUseServerCredentials,
          hasServerCredentials
        });
        
        if (issuerId && privateKey) {
          const extractedKeyId = keyId || privateKey.match(/AuthKey_([A-Z0-9]+)\.p8/)?.[1];
          
          console.log('[Hybrid] Generating JWT token with:', {
            keyId: extractedKeyId,
            issuerId: issuerId,
            hasPrivateKey: !!privateKey,
            privateKeyLength: privateKey?.length
          });
          
          const token = generateAppleToken(extractedKeyId, issuerId, privateKey);
          
          // Fetch from API with date range
          let apiStartDate, apiEndDate;
          
          if (startDate || endDate) {
            // Use user-provided date range
            apiStartDate = startDate;
            apiEndDate = endDate || new Date().toISOString().split('T')[0];
          } else {
            // Default to daysToFetch (no limitation)
            apiEndDate = new Date();
            apiStartDate = new Date();
            apiStartDate.setDate(apiStartDate.getDate() - daysToFetch); // No limitation - fetch all requested days
            apiStartDate = apiStartDate.toISOString().split('T')[0];
            apiEndDate = apiEndDate.toISOString().split('T')[0];
          }
          
          console.log('[Hybrid] Calling fetchAllReviews with:', {
            appId,
            territory: 'USA',
            dateRange: { startDate: apiStartDate, endDate: apiEndDate }
          });
          
          const apiReviews = await fetchAllReviews(token, appId, 'USA', null, {
            startDate: apiStartDate,
            endDate: apiEndDate
          });
          
          console.log(`[Hybrid] Raw API reviews count: ${apiReviews.length}`);
          if (apiReviews.length > 0) {
            console.log('[Hybrid] First raw review sample:', JSON.stringify(apiReviews[0], null, 2));
          }
          
          const transformedReviews = apiReviews.map(transformReview);
          results.api = {
            success: true,
            reviews: transformedReviews,
            error: null
          };
          console.log(`[Hybrid] API: ${transformedReviews.length} reviews`);
          
          // Log warning if API returns 0 reviews
          if (transformedReviews.length === 0) {
            console.log('[Hybrid] WARNING: Apple API returned 0 reviews. Possible issues:');
            console.log('  - Date range might be too restrictive');
            console.log('  - App might not have reviews in the specified period');
            console.log('  - Credentials might be for a different app');
            console.log(`  - Date range requested: ${apiStartDate} to ${apiEndDate}`);
          }
        }
      } catch (apiError) {
        console.error('[Hybrid] API error:', apiError.message);
        results.api.error = apiError.message;
      }
    } else {
      console.log('[Hybrid] WARNING: No Apple API credentials provided');
      console.log('[Hybrid] Only RSS feeds will be used (limited to recent reviews)');
      console.log('[Hybrid] To get full review history, provide:');
      console.log('  - issuerId, keyId, and privateKey');
      console.log('  - OR use useServerCredentials=true with configured server credentials');
    }
    
    // Merge and deduplicate reviews
    const allReviews = [...results.rss.reviews, ...results.api.reviews];
    const uniqueReviews = [];
    const seenIds = new Set();
    
    // Log review sources for debugging
    console.log(`[Hybrid] Review sources breakdown:`);
    console.log(`  - RSS reviews: ${results.rss.reviews.length}`);
    console.log(`  - API reviews: ${results.api.reviews.length}`);
    console.log(`  - Total before deduplication: ${allReviews.length}`);
    
    for (const review of allReviews) {
      // Create a unique key based on author, date, and rating
      const key = `${review.Author}_${review.Date}_${review.Rating}`;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        uniqueReviews.push(review);
      }
    }
    
    // Sort by date (newest first)
    uniqueReviews.sort((a, b) => new Date(b.Date) - new Date(a.Date));
    
    console.log(`[Hybrid] Total unique reviews after deduplication: ${uniqueReviews.length}`);
    
    // Filter by date range if provided
    let filteredReviews = uniqueReviews;
    if (startDate || endDate) {
      const startDateObj = startDate ? new Date(startDate) : null;
      const endDateObj = endDate ? new Date(endDate) : null;
      
      filteredReviews = uniqueReviews.filter(review => {
        const reviewDate = new Date(review.Date);
        
        if (startDateObj && reviewDate < startDateObj) return false;
        if (endDateObj) {
          // Include all reviews up to end of the end date
          const endOfDay = new Date(endDateObj);
          endOfDay.setHours(23, 59, 59, 999);
          if (reviewDate > endOfDay) return false;
        }
        
        return true;
      });
      
      console.log(`[Hybrid] Filtered by date range: ${startDate || 'any'} to ${endDate || 'any'}`);
      console.log(`[Hybrid] Reviews after date filtering: ${filteredReviews.length} (from ${uniqueReviews.length})`);
    }
    
    // Log date range
    if (uniqueReviews.length > 0) {
      const newest = new Date(uniqueReviews[0].Date);
      const oldest = new Date(uniqueReviews[uniqueReviews.length - 1].Date);
      const newestDaysAgo = Math.floor((Date.now() - newest) / (1000 * 60 * 60 * 24));
      console.log(`[Hybrid] Date range: ${newestDaysAgo} days ago to ${oldest.toISOString()}`);
    }
    
    res.json({
      success: true,
      reviews: filteredReviews,
      totalCount: filteredReviews.length,
      sources: {
        rss: {
          success: results.rss.success,
          count: results.rss.reviews.length,
          error: results.rss.error
        },
        api: {
          success: results.api.success,
          count: results.api.reviews.length,
          error: results.api.error
        }
      },
      dateRange: filteredReviews.length > 0 ? {
        newest: filteredReviews[0].Date,
        oldest: filteredReviews[filteredReviews.length - 1].Date
      } : null,
      dateRangeFilter: (startDate || endDate) ? { startDate, endDate } : null
    });
    
  } catch (error) {
    console.error('[Hybrid] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch hybrid reviews',
      details: error.message
    });
  }
});

// ============== COMPETITIVE ANALYSIS ENDPOINTS ==============

// Fetch competitor app info from iTunes API
app.post('/api/competitors/info', async (req, res) => {
  console.log('\n=== Competitor Info Request ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request body:', req.body);
  
  try {
    const { appIds, country = 'us' } = req.body;
    
    if (!appIds || !Array.isArray(appIds) || appIds.length === 0) {
      return res.status(400).json({
        error: 'appIds array is required'
      });
    }
    
    const { results, errors } = await competitorService.fetchMultipleCompetitorInfo(appIds, country);
    
    res.json({
      success: true,
      results,
      errors,
      count: Object.keys(results).length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Competitor Info] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch competitor info',
      details: error.message
    });
  }
});

// Fetch competitor reviews from RSS feeds
app.post('/api/competitors/reviews', async (req, res) => {
  console.log('\n=== Competitor Reviews Request ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request body:', req.body);
  
  try {
    const { appId, countries = ['us'], limit = 50 } = req.body;
    
    if (!appId) {
      return res.status(400).json({
        error: 'appId is required'
      });
    }
    
    const reviewData = await competitorService.fetchCompetitorReviews(appId, countries, limit);
    
    res.json({
      success: true,
      ...reviewData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Competitor Reviews] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch competitor reviews',
      details: error.message
    });
  }
});

// Fetch competitor Reddit mentions
app.post('/api/competitors/reddit', async (req, res) => {
  console.log('\n=== Competitor Reddit Request ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request body:', req.body);
  
  try {
    const { appName, timeFilter = 'month', limit = 100, subreddit = 'all' } = req.body;
    
    if (!appName) {
      return res.status(400).json({
        error: 'appName is required'
      });
    }
    
    const redditData = await competitorService.fetchCompetitorRedditMentions(appName, {
      timeFilter,
      limit,
      subreddit
    });
    
    res.json({
      success: true,
      ...redditData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Competitor Reddit] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch competitor Reddit mentions',
      details: error.message
    });
  }
});

// Get comprehensive competitor analysis
app.post('/api/competitors/analysis', async (req, res) => {
  console.log('\n=== Competitor Analysis Request ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request body:', req.body);
  
  try {
    const { appId, options = {} } = req.body;
    
    if (!appId) {
      return res.status(400).json({
        error: 'appId is required'
      });
    }
    
    const analysis = await competitorService.getCompetitorAnalysis(appId, options);
    
    res.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Competitor Analysis] Error:', error);
    res.status(500).json({
      error: 'Failed to get competitor analysis',
      details: error.message
    });
  }
});

// Compare multiple competitors
app.post('/api/competitors/compare', async (req, res) => {
  console.log('\n=== Competitor Comparison Request ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request body:', req.body);
  
  try {
    const { appIds, options = {} } = req.body;
    
    if (!appIds || !Array.isArray(appIds) || appIds.length === 0) {
      return res.status(400).json({
        error: 'appIds array is required'
      });
    }
    
    const comparison = await competitorService.compareCompetitors(appIds, options);
    
    res.json({
      success: true,
      ...comparison,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Competitor Comparison] Error:', error);
    res.status(500).json({
      error: 'Failed to compare competitors',
      details: error.message
    });
  }
});

// Get trending topics across competitors
app.post('/api/competitors/trending', async (req, res) => {
  console.log('\n=== Competitor Trending Topics Request ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request body:', req.body);
  
  try {
    const { appNames, options = {} } = req.body;
    
    if (!appNames || !Array.isArray(appNames) || appNames.length === 0) {
      return res.status(400).json({
        error: 'appNames array is required'
      });
    }
    
    const trending = await competitorService.getTrendingTopics(appNames, options);
    
    res.json({
      success: true,
      ...trending,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Competitor Trending] Error:', error);
    res.status(500).json({
      error: 'Failed to get trending topics',
      details: error.message
    });
  }
});

// Clear competitor cache
app.delete('/api/competitors/cache/:appId?', async (req, res) => {
  try {
    const { appId } = req.params;
    await competitorService.clearCache(appId);
    
    res.json({
      success: true,
      message: appId ? `Cache cleared for competitor ${appId}` : 'All competitor cache cleared',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Competitor Cache] Error:', error);
    res.status(500).json({
      error: 'Failed to clear competitor cache',
      details: error.message
    });
  }
});

// Start server
console.log('About to start server on port:', PORT);
app.listen(PORT, () => {
  console.log('\n=== Server Started Successfully ===');
  console.log(`Apple App Store API server running on port ${PORT}`);
  console.log(`Frontend should connect to: http://localhost:${PORT}/api/apple-reviews`);
  console.log(`Cache service initialized with ${process.env.REDIS_URL ? 'Redis' : 'in-memory'} storage`);
  
  // Log Apple credentials status
  const configuredApps = getConfiguredApps();
  console.log('\n=== Apple App Store Credentials ===');
  if (configuredApps.length > 0) {
    console.log('✓ Configured apps:');
    configuredApps.forEach(app => {
      const hasCredentials = !!(app.issuerId && app.keyId && app.privateKey);
      console.log(`  - ${app.name} (${app.id}): ${hasCredentials ? 'credentials configured' : 'no credentials'}`);
    });
  } else {
    console.log('✗ No apps configured');
    console.log('  - Set APPLE_APP1_ID and APPLE_APP1_NAME environment variables');
  }
  
  // Log Reddit service status
  const redditStatus = redditService.getStatus();
  console.log('\n=== Reddit Service Status ===');
  if (redditStatus.configured) {
    console.log('✓ Reddit API configured successfully');
    console.log('  - Client ID present:', redditStatus.hasClientId);
    console.log('  - Client Secret present:', redditStatus.hasClientSecret);
    console.log('  - User Agent:', redditStatus.userAgent);
  } else {
    console.log('✗ Reddit API not configured');
    console.log('  - Missing REDDIT_CLIENT_ID:', !redditStatus.hasClientId);
    console.log('  - Missing REDDIT_CLIENT_SECRET:', !redditStatus.hasClientSecret);
    console.log('  - Please set these environment variables to enable Reddit integration');
  }
  
  console.log('\n=== Environment ===');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
  console.log('CORS Origin:', process.env.FRONTEND_URL || 'http://localhost:5173');
  console.log('================================\n');
}).on('error', (err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});