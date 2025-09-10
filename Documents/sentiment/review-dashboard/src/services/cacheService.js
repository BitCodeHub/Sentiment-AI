import indexedDBService from './indexedDBService';

// Enhanced cache service with memory cache and IndexedDB persistence
class CacheService {
  constructor() {
    this.cache = new Map();
    this.DEFAULT_TTL = 3600000; // 1 hour in milliseconds
    this.useIndexedDB = true;
    this.checkIndexedDBSupport();
  }

  // Check if IndexedDB is supported and available
  async checkIndexedDBSupport() {
    try {
      await indexedDBService.init();
      this.useIndexedDB = true;
    } catch (error) {
      console.warn('IndexedDB not available, using memory cache only');
      this.useIndexedDB = false;
    }
  }

  // Generate a unique key for the cache based on function name and arguments
  generateKey(functionName, ...args) {
    return `${functionName}_${JSON.stringify(args)}`;
  }

  // Set an item in the cache with optional TTL
  set(key, value, ttl = this.DEFAULT_TTL) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, {
      value,
      expiresAt
    });
  }

  // Get an item from the cache
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if the item has expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  // Check if a key exists and is not expired
  has(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // Clear all cache entries
  clear() {
    this.cache.clear();
  }

  // Clear expired entries
  clearExpired() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    this.clearExpired();
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, item]) => ({
        key,
        expiresIn: Math.max(0, item.expiresAt - Date.now())
      }))
    };
  }
}

// Create a singleton instance
const cacheService = new CacheService();

// Decorator function to add caching to any async function
export const withCache = (fn, options = {}) => {
  const { ttl = cacheService.DEFAULT_TTL, keyPrefix = fn.name } = options;

  return async function(...args) {
    const cacheKey = cacheService.generateKey(keyPrefix, ...args);
    
    // Check if result exists in cache
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult !== null) {
      console.log(`Cache hit for ${keyPrefix}`);
      return cachedResult;
    }

    // Execute the function and cache the result
    console.log(`Cache miss for ${keyPrefix}, fetching...`);
    try {
      const result = await fn.apply(this, args);
      cacheService.set(cacheKey, result, ttl);
      return result;
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  };
};

// Specific cache for AI analysis results
export const aiAnalysisCache = {
  // Cache for review analysis
  setReviewAnalysis(reviews, analysis) {
    const key = cacheService.generateKey('reviewAnalysis', reviews.length, reviews[0]?.content);
    cacheService.set(key, analysis, 1800000); // 30 minutes
  },

  getReviewAnalysis(reviews) {
    const key = cacheService.generateKey('reviewAnalysis', reviews.length, reviews[0]?.content);
    return cacheService.get(key);
  },

  // Cache for insights
  setInsights(aggregatedData, insights) {
    const key = cacheService.generateKey('insights', aggregatedData.summary);
    cacheService.set(key, insights, 1800000); // 30 minutes
  },

  getInsights(aggregatedData) {
    const key = cacheService.generateKey('insights', aggregatedData.summary);
    return cacheService.get(key);
  },

  // Cache for categorized reviews
  setCategorizedReview(content, result) {
    const key = cacheService.generateKey('categorize', content);
    cacheService.set(key, result, 3600000); // 1 hour
  },

  getCategorizedReview(content) {
    const key = cacheService.generateKey('categorize', content);
    return cacheService.get(key);
  },

  // Cache for sentiment analysis
  setSentimentAnalysis(reviews, analysis) {
    // Handle both review array and custom key object
    const key = reviews.key 
      ? reviews.key  // Custom key provided
      : cacheService.generateKey('sentimentAnalysis', reviews.length, reviews[0]?.content);
    cacheService.set(key, analysis, 1800000); // 30 minutes
  },

  getSentimentAnalysis(reviews) {
    // Handle both review array and custom key object
    const key = reviews.key 
      ? reviews.key  // Custom key provided
      : cacheService.generateKey('sentimentAnalysis', reviews.length, reviews[0]?.content);
    return cacheService.get(key);
  },

  // Clear all AI-related cache
  async clearAll() {
    // Clear memory cache
    cacheService.clear();
    
    // Clear IndexedDB if available
    if (cacheService.useIndexedDB) {
      try {
        await indexedDBService.clearAll();
      } catch (error) {
        console.error('Error clearing IndexedDB:', error);
      }
    }
  }
};

// Review-specific cache methods
export const reviewCache = {
  // Store reviews in both memory and IndexedDB
  async setReviews(appId, reviews, territory = 'USA') {
    const key = cacheService.generateKey('reviews', appId, territory);
    
    // Store in memory cache
    cacheService.set(key, reviews, 7200000); // 2 hours
    
    // Store in IndexedDB if available
    if (cacheService.useIndexedDB) {
      try {
        await indexedDBService.storeReviews(appId, reviews, territory);
      } catch (error) {
        console.error('Error storing in IndexedDB:', error);
      }
    }
    
    return true;
  },
  
  // Get reviews from cache (memory first, then IndexedDB)
  async getReviews(appId, territory = 'USA') {
    const key = cacheService.generateKey('reviews', appId, territory);
    
    // Check memory cache first
    const memoryResult = cacheService.get(key);
    if (memoryResult) {
      return {
        reviews: memoryResult,
        fromCache: true,
        cacheType: 'memory'
      };
    }
    
    // Check IndexedDB if available
    if (cacheService.useIndexedDB) {
      try {
        const dbResult = await indexedDBService.getReviews(appId, territory);
        if (dbResult) {
          // Restore to memory cache for faster subsequent access
          cacheService.set(key, dbResult.reviews, 3600000); // 1 hour
          
          return {
            reviews: dbResult.reviews,
            fromCache: true,
            cacheType: 'indexedDB',
            metadata: dbResult.metadata
          };
        }
      } catch (error) {
        console.error('Error reading from IndexedDB:', error);
      }
    }
    
    return null;
  },
  
  // Get cache metadata
  async getMetadata(appId) {
    if (cacheService.useIndexedDB) {
      try {
        return await indexedDBService.getMetadata(appId);
      } catch (error) {
        console.error('Error getting metadata:', error);
      }
    }
    return null;
  },
  
  // Clear reviews for specific app
  async clearApp(appId) {
    // Clear from memory cache
    const keys = Array.from(cacheService.cache.keys());
    keys.forEach(key => {
      if (key.includes(`"${appId}"`)) {
        cacheService.cache.delete(key);
      }
    });
    
    // Clear from IndexedDB
    if (cacheService.useIndexedDB) {
      try {
        await indexedDBService.clearAppData(appId);
      } catch (error) {
        console.error('Error clearing app data from IndexedDB:', error);
      }
    }
  },
  
  // Get all cached apps
  async getCachedApps() {
    if (cacheService.useIndexedDB) {
      try {
        return await indexedDBService.getAllCachedApps();
      } catch (error) {
        console.error('Error getting cached apps:', error);
      }
    }
    return [];
  },
  
  // Get storage info
  async getStorageInfo() {
    if (cacheService.useIndexedDB) {
      try {
        return await indexedDBService.getStorageInfo();
      } catch (error) {
        console.error('Error getting storage info:', error);
      }
    }
    return { usage: 0, quota: 0, percentage: 0 };
  },
  
  // Clean up old data
  async cleanup(daysToKeep = 30) {
    // Clean expired memory cache
    cacheService.clearExpired();
    
    // Clean IndexedDB
    if (cacheService.useIndexedDB) {
      try {
        await indexedDBService.cleanupOldData(daysToKeep);
      } catch (error) {
        console.error('Error cleaning up IndexedDB:', error);
      }
    }
  }
};

export default cacheService;
export { reviewCache };