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
  
  while (hasMore) {
    const response = await fetchAppleReviews(token, appId, territory, limit, nextLink);
    const reviews = response.data || [];
    
    // Log the most recent reviews for debugging
    if (reviews.length > 0 && !nextLink) {
      const newestReview = new Date(reviews[0].attributes.createdDate);
      const oldestReview = new Date(reviews[reviews.length - 1].attributes.createdDate);
      console.log(`[fetchAllReviews] Batch ${allReviews.length > 0 ? 'next' : 'first'}:`);
      console.log(`  - Newest review: ${newestReview.toISOString()} (${Math.floor((Date.now() - newestReview) / (1000 * 60 * 60 * 24))} days ago)`);
      console.log(`  - Oldest review: ${oldestReview.toISOString()}`);
      console.log(`  - Date filter: ${startDate ? startDate.toISOString() : 'none'} to ${endDate ? endDate.toISOString() : 'none'}`);
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
    
    const summarizationsData = await fetchAppleReviewSummarizations(token, appId, territory || 'USA');
    
    const apiTime = Date.now() - startTime;
    console.log(`Apple API response received in ${apiTime}ms`);
    console.log('Response data structure:', {
      hasData: !!summarizationsData.data,
      dataLength: summarizationsData.data?.length,
      firstItem: summarizationsData.data?.[0] ? Object.keys(summarizationsData.data[0]) : null
    });
    
    // Extract the summarization data
    const summarization = summarizationsData.data?.[0];
    if (!summarization) {
      console.log('No summarization data found, returning zeros');
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

    const attributes = summarization.attributes || {};
    console.log('Summarization attributes:', {
      averageRating: attributes.averageRating,
      totalRatings: attributes.totalRatings,
      ratingCountList: attributes.ratingCountList,
      hasRatingCounts: !!attributes.ratingCountList
    });
    
    const responseData = {
      success: true,
      data: {
        averageRating: attributes.averageRating || 0,
        totalRatings: attributes.totalRatings || 0,
        ratingCounts: {
          1: attributes.ratingCountList?.[0] || 0,
          2: attributes.ratingCountList?.[1] || 0,
          3: attributes.ratingCountList?.[2] || 0,
          4: attributes.ratingCountList?.[3] || 0,
          5: attributes.ratingCountList?.[4] || 0
        }
      }
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
  res.json({
    apps: apps.map(app => ({ id: app.id, name: app.name })),
    hasServerCredentials: apps.length > 0
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('[Health Check] Request received from:', req.headers.origin || req.headers.referer || 'unknown');
  res.json({ 
    status: 'ok', 
    service: 'Apple App Store Review API',
    timestamp: new Date().toISOString(),
    cacheEnabled: true,
    environment: {
      port: PORT,
      corsOrigin: process.env.FRONTEND_URL || 'http://localhost:5173',
      hasRedis: !!process.env.REDIS_URL
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

// Start server
console.log('About to start server on port:', PORT);
app.listen(PORT, () => {
  console.log(`Apple App Store API server running on port ${PORT}`);
  console.log(`Frontend should connect to: http://localhost:${PORT}/api/apple-reviews`);
  console.log(`Cache service initialized with ${process.env.REDIS_URL ? 'Redis' : 'in-memory'} storage`);
}).on('error', (err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});