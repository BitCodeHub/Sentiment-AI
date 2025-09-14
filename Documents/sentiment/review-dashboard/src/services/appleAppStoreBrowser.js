import axios from 'axios';
import { reviewCache } from './cacheService';

class AppleAppStoreBrowserService {
  constructor() {
    // Use backend API endpoint from environment or default
    this.primaryBackendURL = import.meta.env.VITE_APPLE_API_ENDPOINT || 'https://sentiment-review-backend.onrender.com/api/apple-reviews';
    this.fallbackBackendURL = 'http://localhost:3001/api/apple-reviews';
    this.backendURL = this.primaryBackendURL;
    console.log('[appleAppStoreBrowser] Constructor - Primary Backend URL:', this.primaryBackendURL);
    console.log('[appleAppStoreBrowser] Constructor - Fallback Backend URL:', this.fallbackBackendURL);
    console.log('[appleAppStoreBrowser] Constructor - Environment variable:', import.meta.env.VITE_APPLE_API_ENDPOINT);
    this.isBackendAvailable = false;
    this.checkBackendAvailability();
  }

  /**
   * Check if backend service is available
   */
  async checkBackendAvailability() {
    // Try primary backend first
    try {
      const healthEndpoint = this.primaryBackendURL.replace('/apple-reviews', '/health');
      console.log('[appleAppStoreBrowser] Checking primary backend at:', healthEndpoint);
      
      const response = await axios.get(healthEndpoint, { timeout: 5000 });
      if (response.data.status === 'ok') {
        this.backendURL = this.primaryBackendURL;
        this.isBackendAvailable = true;
        console.log('[appleAppStoreBrowser] Primary backend service available');
        console.log('[appleAppStoreBrowser] Health check response:', response.data);
        return;
      }
    } catch (error) {
      console.warn('[appleAppStoreBrowser] Primary backend not available:', {
        message: error.message,
        code: error.code,
        endpoint: this.primaryBackendURL.replace('/apple-reviews', '/health')
      });
    }
    
    // Try fallback backend
    try {
      const healthEndpoint = this.fallbackBackendURL.replace('/apple-reviews', '/health');
      console.log('[appleAppStoreBrowser] Checking fallback backend at:', healthEndpoint);
      
      const response = await axios.get(healthEndpoint, { timeout: 5000 });
      if (response.data.status === 'ok') {
        this.backendURL = this.fallbackBackendURL;
        this.isBackendAvailable = true;
        console.log('[appleAppStoreBrowser] Fallback backend service available');
        console.log('[appleAppStoreBrowser] Health check response:', response.data);
        return;
      }
    } catch (error) {
      console.warn('[appleAppStoreBrowser] Fallback backend not available:', {
        message: error.message,
        code: error.code,
        endpoint: this.fallbackBackendURL.replace('/apple-reviews', '/health')
      });
    }
    
    // Neither backend is available
    this.isBackendAvailable = false;
    console.error('[appleAppStoreBrowser] No backend service available. Using demo mode.');
  }

  /**
   * Since we can't generate JWT tokens in the browser due to CORS and security,
   * this would typically be handled by a backend service.
   * For now, we'll create a mock implementation that demonstrates the structure.
   */
  async fetchReviewsFromBackend(appId, issuerId, privateKeyContent) {
    // In a real implementation, this would call your backend API
    // which would handle the JWT generation and Apple API calls
    
    console.warn('Apple App Store API requires server-side implementation due to JWT requirements');
    
    // For demonstration, returning mock data in the expected format
    return this.getMockReviews();
  }

  /**
   * Transform Apple review format to match the app's expected format
   * @param {array} appleReviews - Raw reviews from Apple API
   */
  transformReviews(appleReviews) {
    return appleReviews.map(review => {
      const attributes = review.attributes || {};
      const relationships = review.relationships || {};

      // Extract developer response if available
      let developerResponse = '';
      if (relationships.response && relationships.response.data) {
        developerResponse = 'Thank you for your feedback! We appreciate your input and are working to improve the app.';
      }

      return {
        'Review ID': review.id,
        'Rating': attributes.rating || 0,
        'Review Title': attributes.title || '',
        'Body': attributes.body || '',
        'Review Text': attributes.body || '',
        'Author': attributes.reviewerNickname || 'Anonymous',
        'Date': attributes.createdDate ? new Date(attributes.createdDate).toISOString().split('T')[0] : '',
        'App Version': attributes.appVersionString || '',
        'Device Model': 'iPhone', // Apple doesn't provide specific device model
        'Platform': 'iOS',
        'OS': attributes.osVersion || '',
        'Country': attributes.territory || 'U.S.',
        'Language': 'English', // Default to English for USA
        'Developer Response': developerResponse
      };
    });
  }

  /**
   * Get mock reviews for demonstration purposes
   */
  getMockReviews() {
    const mockReviews = [
      {
        id: 'apple_001',
        attributes: {
          rating: 5,
          title: 'Excellent app!',
          body: 'This app is amazing! The remote start feature works perfectly and the UI is very intuitive.',
          reviewerNickname: 'TechEnthusiast',
          createdDate: '2024-01-15T10:30:00Z',
          appVersionString: '5.3.2',
          territory: 'USA',
          osVersion: '17.2'
        },
        relationships: {}
      },
      {
        id: 'apple_002',
        attributes: {
          rating: 1,
          title: 'Needs improvement',
          body: 'App crashes frequently when trying to connect to my vehicle. Very frustrating experience.',
          reviewerNickname: 'DisappointedUser',
          createdDate: '2024-01-14T15:45:00Z',
          appVersionString: '5.3.2',
          territory: 'USA',
          osVersion: '17.1'
        },
        relationships: {
          response: { data: true }
        }
      },
      {
        id: 'apple_003',
        attributes: {
          rating: 4,
          title: 'Good but could be better',
          body: 'Overall a good app for managing my Hyundai. The scheduled maintenance reminders are helpful.',
          reviewerNickname: 'CarOwner2024',
          createdDate: '2024-01-13T09:20:00Z',
          appVersionString: '5.3.1',
          territory: 'USA',
          osVersion: '16.6'
        },
        relationships: {}
      },
      {
        id: 'apple_004',
        attributes: {
          rating: 3,
          title: 'Average experience',
          body: 'The app does what it needs to do but the interface could use some modernization.',
          reviewerNickname: 'NeutralReviewer',
          createdDate: '2024-01-12T14:00:00Z',
          appVersionString: '5.3.2',
          territory: 'USA',
          osVersion: '17.2'
        },
        relationships: {}
      },
      {
        id: 'apple_005',
        attributes: {
          rating: 5,
          title: 'Love the new features!',
          body: 'The latest update added great features. Remote climate control is a game changer!',
          reviewerNickname: 'HappyDriver',
          createdDate: '2024-01-11T11:30:00Z',
          appVersionString: '5.3.2',
          territory: 'USA',
          osVersion: '17.0'
        },
        relationships: {}
      }
    ];

    return this.transformReviews(mockReviews);
  }

  /**
   * Get review metadata (date range and count) without fetching all reviews
   */
  async getReviewMetadata(appId, issuerId, keyId, privateKeyContent, useServerCredentials = false) {
    try {
      console.log('Fetching review metadata for app:', appId);
      
      // Validate required parameters
      if (!appId) {
        throw new Error('App ID is required');
      }
      
      if (!useServerCredentials && (!issuerId || !keyId || !privateKeyContent)) {
        console.error('[getReviewMetadata] Missing credentials:', {
          hasIssuerId: !!issuerId,
          hasKeyId: !!keyId,
          hasPrivateKey: !!privateKeyContent
        });
        throw new Error('Issuer ID, Key ID, and Private Key are required when not using server credentials');
      }
      
      if (!this.isBackendAvailable) {
        await this.checkBackendAvailability();
      }
      
      if (this.isBackendAvailable) {
        const formData = new FormData();
        formData.append('appId', appId);
        
        if (!useServerCredentials) {
          formData.append('issuerId', issuerId);
          formData.append('keyId', keyId);
          
          // Ensure private key is a string
          if (privateKeyContent instanceof File) {
            console.error('[getReviewMetadata] ERROR: privateKeyContent is a File object, expected string');
            throw new Error('Private key must be provided as text content, not a File object');
          }
          
          formData.append('privateKey', privateKeyContent);
        }
        
        const response = await axios.post(
          this.backendURL.replace('/apple-reviews', '/apple-reviews/metadata'),
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            timeout: 30000 // 30 second timeout for metadata
          }
        );
        
        if (response.data.success) {
          return response.data.metadata;
        } else {
          throw new Error(response.data.error || 'Failed to fetch metadata');
        }
      }
      
      // Mock metadata for demo mode
      return {
        appId,
        dateRange: {
          oldest: '2024-01-01T00:00:00Z',
          newest: '2024-01-15T00:00:00Z'
        },
        estimatedCount: 5,
        hasReviews: true
      };
    } catch (error) {
      console.error('Error fetching review metadata:', error);
      throw error;
    }
  }

  /**
   * Get review summarizations (includes all ratings, not just written reviews)
   * This provides the same overall rating users see on the App Store
   */
  async getReviewSummarizations(appId, issuerId, keyId, privateKeyContent, useServerCredentials = false) {
    console.log('[appleAppStoreBrowser] ==== getReviewSummarizations START ====');
    console.log('[appleAppStoreBrowser] Parameters:', {
      appId,
      issuerId,
      keyId,
      hasPrivateKey: !!privateKeyContent,
      privateKeyLength: privateKeyContent?.length,
      privateKeyType: privateKeyContent?.constructor?.name,
      useServerCredentials,
      isBackendAvailable: this.isBackendAvailable,
      backendURL: this.backendURL
    });
    
    // Validate required parameters
    if (!appId) {
      console.error('[appleAppStoreBrowser] ERROR: appId is required');
      throw new Error('App ID is required');
    }
    
    if (!useServerCredentials) {
      if (!issuerId || !keyId || !privateKeyContent) {
        console.error('[appleAppStoreBrowser] ERROR: Missing credentials for non-server auth', {
          hasIssuerId: !!issuerId,
          hasKeyId: !!keyId,
          hasPrivateKey: !!privateKeyContent
        });
        throw new Error('Issuer ID, Key ID, and Private Key are required when not using server credentials');
      }
    }
    
    // Re-check backend availability
    if (!this.isBackendAvailable) {
      console.log('[appleAppStoreBrowser] Backend marked as unavailable, rechecking...');
      await this.checkBackendAvailability();
      console.log('[appleAppStoreBrowser] Backend availability after recheck:', this.isBackendAvailable);
    }
    
    if (!this.isBackendAvailable) {
      console.log('[appleAppStoreBrowser] Backend still not available, returning mock data');
      // Return mock data for demo
      return {
        averageRating: 4.5,
        totalRatings: 12543,
        ratingCounts: {
          1: 523,
          2: 892,
          3: 1843,
          4: 3285,
          5: 6000
        }
      };
    }

    const summarizationsUrl = this.backendURL.replace('/apple-reviews', '/apple-reviews/summarizations');
    console.log('[appleAppStoreBrowser] Full backend URL:', summarizationsUrl);
    
    try {
      console.log('[appleAppStoreBrowser] Creating FormData...');
      const formData = new FormData();
      formData.append('appId', appId);
      formData.append('useServerCredentials', useServerCredentials.toString());
      
      if (!useServerCredentials) {
        formData.append('issuerId', issuerId);
        formData.append('keyId', keyId);
        
        // Ensure private key is a string, not a File object
        if (privateKeyContent instanceof File) {
          console.error('[appleAppStoreBrowser] ERROR: privateKeyContent is a File object, expected string');
          throw new Error('Private key must be provided as text content, not a File object');
        }
        
        formData.append('privateKey', privateKeyContent);
        
        console.log('[appleAppStoreBrowser] FormData entries:');
        for (let [key, value] of formData.entries()) {
          if (key === 'privateKey') {
            console.log(`  - ${key}:`, value instanceof File ? `File(${value.name}, ${value.size} bytes)` : `String(${value?.length} chars)`);
            // Log first few characters of private key for debugging (safely)
            if (typeof value === 'string' && value.length > 0) {
              console.log(`    Preview: ${value.substring(0, 50)}...`);
            }
          } else {
            console.log(`  - ${key}:`, value);
          }
        }
      } else {
        console.log('[appleAppStoreBrowser] Using server credentials, only appId sent');
      }

      console.log('[appleAppStoreBrowser] Making axios POST request...');
      console.log('[appleAppStoreBrowser] Request config:', {
        method: 'POST',
        url: summarizationsUrl,
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: axios.defaults.timeout
      });
      
      const startTime = Date.now();
      const response = await axios.post(summarizationsUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 30 second timeout
      });
      const responseTime = Date.now() - startTime;

      console.log('[appleAppStoreBrowser] Request completed in', responseTime, 'ms');
      console.log('[appleAppStoreBrowser] Response details:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        dataKeys: Object.keys(response.data || {}),
        data: response.data
      });
      
      if (response.data && response.data.data) {
        console.log('[appleAppStoreBrowser] Summarization data received:', response.data.data);
        return response.data.data;
      } else {
        console.error('[appleAppStoreBrowser] Unexpected response format:', response.data);
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error('[appleAppStoreBrowser] ==== ERROR in getReviewSummarizations ====');
      console.error('[appleAppStoreBrowser] Error type:', error.constructor.name);
      console.error('[appleAppStoreBrowser] Error message:', error.message);
      console.error('[appleAppStoreBrowser] Error code:', error.code);
      
      if (error.response) {
        console.error('[appleAppStoreBrowser] Response error details:', {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data
        });
      } else if (error.request) {
        console.error('[appleAppStoreBrowser] Request error (no response received):', {
          request: error.request,
          config: error.config
        });
      } else {
        console.error('[appleAppStoreBrowser] Setup error:', error.message);
      }
      
      console.error('[appleAppStoreBrowser] Full error object:', error);
      console.error('[appleAppStoreBrowser] Stack trace:', error.stack);
      
      // Return default values on error
      console.log('[appleAppStoreBrowser] Returning default zero values due to error');
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingCounts: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0
        }
      };
    } finally {
      console.log('[appleAppStoreBrowser] ==== getReviewSummarizations END ====');
    }
  }

  /**
   * Get cache status for an app
   */
  async getCacheStatus(appId) {
    if (this.isBackendAvailable) {
      try {
        const cacheStatusUrl = this.backendURL.replace('/apple-reviews', `/cache/status/${appId}`);
        const response = await axios.get(cacheStatusUrl);
        return response.data;
      } catch (error) {
        console.error('Error getting cache status:', error);
      }
    }
    
    // Frontend cache status
    const metadata = await reviewCache.getMetadata(appId);
    const storageInfo = await reviewCache.getStorageInfo();
    
    return {
      appId,
      hasCache: !!metadata,
      metadata,
      storageInfo
    };
  }

  /**
   * Clear cache for an app
   */
  async clearCache(appId) {
    // Clear frontend cache
    await reviewCache.clearApp(appId);
    
    // Clear backend cache if available
    if (this.isBackendAvailable) {
      try {
        const clearCacheUrl = this.backendURL.replace('/apple-reviews', `/cache/${appId}`);
        await axios.delete(clearCacheUrl);
      } catch (error) {
        console.error('Error clearing backend cache:', error);
      }
    }
  }

  /**
   * Fetch recent reviews using RSS feed (no authentication required)
   * This can provide more current reviews than the App Store Connect API
   */
  async fetchRecentReviewsViaRSS(appId, countries = ['us', 'gb', 'ca', 'au']) {
    try {
      console.log('[RSS] Fetching recent reviews via RSS feed...');
      
      if (!this.isBackendAvailable) {
        await this.checkBackendAvailability();
      }
      
      if (!this.isBackendAvailable) {
        console.warn('[RSS] Backend not available for RSS fetch');
        return [];
      }
      
      const rssUrl = this.backendURL.replace('/apple-reviews', '/apple-reviews/rss');
      console.log('[RSS] Using RSS endpoint:', rssUrl);
      
      const response = await axios.post(rssUrl, {
        appId,
        countries,
        limit: 50
      }, {
        timeout: 30000
      });
      
      if (response.data.success) {
        console.log(`[RSS] Fetched ${response.data.reviews.length} reviews`);
        if (response.data.reviews.length > 0) {
          const newest = new Date(response.data.reviews[0].Date);
          const daysAgo = Math.floor((Date.now() - newest) / (1000 * 60 * 60 * 24));
          console.log(`[RSS] Most recent review: ${daysAgo} days ago`);
        }
        return response.data.reviews;
      }
      
      return [];
    } catch (error) {
      console.error('[RSS] Error fetching RSS reviews:', error);
      return [];
    }
  }

  /**
   * Main method to import reviews from Apple App Store
   * Calls backend API if available, otherwise returns mock data
   */
  async importReviews(appId, issuerId, keyId, privateKeyContent, useServerCredentials = false, options = {}) {
    const { useCache = true, forceRefresh = false, startDate = null, endDate = null, useHybrid = true } = options;
    
    try {
      console.log('Importing Apple App Store reviews...');
      console.log('App ID:', appId);
      console.log('Backend available:', this.isBackendAvailable);
      console.log('Use cache:', useCache, 'Force refresh:', forceRefresh);
      console.log('Date range:', startDate, 'to', endDate);
      console.log('Credentials:', {
        hasIssuerId: !!issuerId,
        hasKeyId: !!keyId,
        hasPrivateKey: !!privateKeyContent,
        privateKeyType: privateKeyContent?.constructor?.name,
        useServerCredentials
      });
      
      // Validate required parameters
      if (!appId) {
        throw new Error('App ID is required');
      }
      
      if (!useServerCredentials && (!issuerId || !keyId || !privateKeyContent)) {
        throw new Error('Issuer ID, Key ID, and Private Key are required when not using server credentials');
      }
      
      // Check frontend cache first if not forcing refresh and no date range
      if (useCache && !forceRefresh && !startDate && !endDate) {
        const cachedData = await reviewCache.getReviews(appId);
        if (cachedData) {
          console.log(`Serving ${cachedData.reviews.length} reviews from ${cachedData.cacheType} cache`);
          return cachedData.reviews;
        }
      }
      
      // Check if backend is available
      if (!this.isBackendAvailable) {
        // Re-check availability in case it came online
        await this.checkBackendAvailability();
      }
      
      if (this.isBackendAvailable) {
        try {
          // Use hybrid endpoint if enabled and no specific date range
          const endpoint = useHybrid && !startDate && !endDate 
            ? this.backendURL.replace('/apple-reviews', '/apple-reviews/hybrid')
            : this.backendURL;
          
          console.log(`[importReviews] Using endpoint: ${endpoint}`);
          
          // Always use FormData because backend has multer middleware
          const formData = new FormData();
          formData.append('appId', appId);
          formData.append('useCache', useCache.toString());
          formData.append('forceRefresh', forceRefresh.toString());
          
          // Add countries for hybrid endpoint
          if (useHybrid) {
            formData.append('countries', JSON.stringify(['us', 'gb', 'ca', 'au', 'de', 'fr', 'jp', 'it', 'es', 'nl']));
          }
          
          // Add date range parameters if provided
          if (startDate) {
            // Convert to ISO date string (YYYY-MM-DD) if it's a Date object
            const startDateStr = startDate instanceof Date 
              ? startDate.toISOString().split('T')[0] 
              : startDate;
            formData.append('startDate', startDateStr);
            console.log('[importReviews] Start date:', startDateStr);
          }
          if (endDate) {
            // Convert to ISO date string (YYYY-MM-DD) if it's a Date object
            const endDateStr = endDate instanceof Date 
              ? endDate.toISOString().split('T')[0] 
              : endDate;
            formData.append('endDate', endDateStr);
            console.log('[importReviews] End date:', endDateStr);
          }
          
          // Only send credentials if not using server credentials
          if (!useServerCredentials) {
            formData.append('issuerId', issuerId);
            formData.append('keyId', keyId);
            
            // Ensure private key is always sent as text
            if (privateKeyContent instanceof File) {
              console.error('[importReviews] ERROR: privateKeyContent is a File object, expected string');
              throw new Error('Private key must be provided as text content, not a File object');
            }
            
            formData.append('privateKey', privateKeyContent);
            console.log('[importReviews] Private key added to form data, length:', privateKeyContent.length);
          }
          
          const response = await axios.post(endpoint, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            timeout: 120000 // 2 minute timeout for API calls with pagination
          });
          
          if (response.data.success) {
            const reviews = response.data.reviews;
            console.log(`Successfully fetched ${reviews.length} reviews from Apple App Store`);
            console.log(`From cache: ${response.data.fromCache}, Incremental update: ${response.data.incrementalUpdate}`);
            
            // Log source information if using hybrid
            if (response.data.sources) {
              console.log('Review sources:', response.data.sources);
              if (response.data.dateRange) {
                const newest = new Date(response.data.dateRange.newest);
                const daysAgo = Math.floor((Date.now() - newest) / (1000 * 60 * 60 * 24));
                console.log(`Most recent review: ${daysAgo} days ago (${newest.toLocaleDateString()})`);
              }
            }
            
            // Cache the reviews in frontend if not from backend cache
            if (!response.data.fromCache) {
              await reviewCache.setReviews(appId, reviews);
            }
            
            return reviews;
          } else {
            throw new Error(response.data.error || 'Failed to fetch reviews');
          }
        } catch (backendError) {
          console.error('Backend API error:', backendError);
          
          // If backend fails, inform user but fall back to mock data
          if (backendError.response?.status === 400) {
            throw new Error(backendError.response.data.details || 'Invalid credentials provided');
          } else if (backendError.response?.status === 401) {
            throw new Error('Authentication failed. Please check your Apple credentials.');
          } else if (backendError.code === 'ECONNABORTED') {
            throw new Error('Request timed out. Please try again.');
          } else {
            console.warn('Backend unavailable, using mock data as fallback');
            this.isBackendAvailable = false;
          }
        }
      }
      
      // Fallback to mock data with warning
      console.warn('Using mock data. To fetch real reviews, please ensure the backend service is running.');
      
      // Simulate API delay for mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return mock data with a warning flag
      const mockReviews = this.getMockReviews();
      
      // Add a flag to indicate this is mock data
      if (mockReviews.length > 0) {
        mockReviews[0]._isMockData = true;
      }
      
      return mockReviews;
    } catch (error) {
      console.error('Error importing Apple reviews:', error);
      throw error;
    }
  }
}

// Create a singleton instance
const appleAppStoreBrowserService = new AppleAppStoreBrowserService();

export default appleAppStoreBrowserService;