// Simple in-memory cache with TTL (Time To Live)
class CacheService {
  constructor() {
    this.cache = new Map();
    this.DEFAULT_TTL = 3600000; // 1 hour in milliseconds
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
  clearAll() {
    // In a real implementation, we might want to clear only AI-related keys
    cacheService.clear();
  }
};

export default cacheService;