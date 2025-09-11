// const Redis = require('redis');  // Temporarily disabled

class CacheService {
  constructor() {
    this.memoryCache = new Map();
    this.redisClient = null;
    this.useRedis = false;
    this.DEFAULT_TTL = 3600; // 1 hour in seconds for Redis
    this.initializeRedis();
  }

  async initializeRedis() {
    // Skip Redis initialization for now - use in-memory cache only
    console.log('Using in-memory cache only (Redis disabled)');
    this.useRedis = false;
    return;
    
    try {
      // Try to connect to Redis if available
      if (process.env.REDIS_URL || process.env.REDIS_HOST) {
        this.redisClient = Redis.createClient({
          url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
          password: process.env.REDIS_PASSWORD
        });

        this.redisClient.on('error', (err) => {
          console.log('Redis Client Error:', err);
          this.useRedis = false;
        });

        this.redisClient.on('connect', () => {
          console.log('Connected to Redis cache');
          this.useRedis = true;
        });

        await this.redisClient.connect();
      }
    } catch (error) {
      console.log('Redis not available, using in-memory cache');
      this.useRedis = false;
    }
  }

  // Generate cache key for reviews
  generateReviewKey(appId, options = {}) {
    const { territory = 'USA', lastSync = null } = options;
    return `reviews:${appId}:${territory}${lastSync ? `:${lastSync}` : ''}`;
  }

  // Generate cache key for metadata
  generateMetaKey(appId) {
    return `meta:${appId}`;
  }

  // Set data in cache
  async set(key, value, ttl = this.DEFAULT_TTL) {
    const stringValue = JSON.stringify(value);
    
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.setEx(key, ttl, stringValue);
        return true;
      } catch (error) {
        console.error('Redis set error:', error);
      }
    }
    
    // Fallback to memory cache
    this.memoryCache.set(key, {
      value: stringValue,
      expiresAt: Date.now() + (ttl * 1000)
    });
    return true;
  }

  // Get data from cache
  async get(key) {
    if (this.useRedis && this.redisClient) {
      try {
        const value = await this.redisClient.get(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.error('Redis get error:', error);
      }
    }
    
    // Fallback to memory cache
    const item = this.memoryCache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return JSON.parse(item.value);
  }

  // Check if key exists
  async has(key) {
    if (this.useRedis && this.redisClient) {
      try {
        const exists = await this.redisClient.exists(key);
        return exists === 1;
      } catch (error) {
        console.error('Redis exists error:', error);
      }
    }
    
    // Fallback to memory cache
    const item = this.memoryCache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return false;
    }
    
    return true;
  }

  // Delete a key
  async delete(key) {
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        console.error('Redis delete error:', error);
      }
    }
    
    this.memoryCache.delete(key);
  }

  // Clear all cache
  async clear() {
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.flushDb();
      } catch (error) {
        console.error('Redis clear error:', error);
      }
    }
    
    this.memoryCache.clear();
  }

  // Get cache metadata for an app
  async getAppMetadata(appId) {
    const metaKey = this.generateMetaKey(appId);
    return await this.get(metaKey);
  }

  // Set cache metadata for an app
  async setAppMetadata(appId, metadata) {
    const metaKey = this.generateMetaKey(appId);
    const metaData = {
      ...metadata,
      lastUpdated: new Date().toISOString(),
      cacheVersion: '1.0'
    };
    await this.set(metaKey, metaData, 86400); // 24 hours
    return metaData;
  }

  // Get cached reviews
  async getCachedReviews(appId, territory = 'USA') {
    const reviewKey = this.generateReviewKey(appId, { territory });
    const reviews = await this.get(reviewKey);
    const metadata = await this.getAppMetadata(appId);
    
    return {
      reviews: reviews || [],
      metadata: metadata || null,
      fromCache: !!reviews
    };
  }

  // Set cached reviews
  async setCachedReviews(appId, reviews, territory = 'USA') {
    const reviewKey = this.generateReviewKey(appId, { territory });
    const metadata = {
      appId,
      territory,
      reviewCount: reviews.length,
      lastSync: new Date().toISOString(),
      oldestReview: reviews[reviews.length - 1]?.Date || null,
      newestReview: reviews[0]?.Date || null
    };
    
    await this.set(reviewKey, reviews, 7200); // 2 hours for reviews
    await this.setAppMetadata(appId, metadata);
    
    return metadata;
  }

  // Get reviews since last sync (incremental update)
  async getReviewsSinceLastSync(appId, currentReviews, territory = 'USA') {
    const cachedData = await this.getCachedReviews(appId, territory);
    
    if (!cachedData.metadata || !cachedData.metadata.lastSync) {
      // No previous sync, return all reviews
      return {
        newReviews: currentReviews,
        existingReviews: [],
        metadata: null
      };
    }
    
    const lastSyncDate = new Date(cachedData.metadata.lastSync);
    const cachedReviewIds = new Set(cachedData.reviews.map(r => r['Review ID']));
    
    // Find new reviews (not in cache)
    const newReviews = currentReviews.filter(review => 
      !cachedReviewIds.has(review['Review ID'])
    );
    
    // Merge new reviews with cached ones
    const allReviews = [...newReviews, ...cachedData.reviews];
    
    // Sort by date (newest first)
    allReviews.sort((a, b) => new Date(b.Date) - new Date(a.Date));
    
    return {
      newReviews,
      allReviews,
      metadata: cachedData.metadata,
      newReviewCount: newReviews.length
    };
  }

  // Clean expired entries from memory cache
  cleanExpiredMemoryCache() {
    const now = Date.now();
    for (const [key, item] of this.memoryCache.entries()) {
      if (now > item.expiresAt) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Get cache statistics
  async getStats() {
    const stats = {
      type: this.useRedis ? 'redis' : 'memory',
      memorySize: this.memoryCache.size
    };
    
    if (this.useRedis && this.redisClient) {
      try {
        const info = await this.redisClient.info('memory');
        stats.redisMemory = info;
      } catch (error) {
        stats.redisError = error.message;
      }
    }
    
    return stats;
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Clean memory cache periodically
setInterval(() => {
  cacheService.cleanExpiredMemoryCache();
}, 300000); // Every 5 minutes

module.exports = cacheService;