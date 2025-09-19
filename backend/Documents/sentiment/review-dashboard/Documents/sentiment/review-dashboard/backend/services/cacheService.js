// In-memory cache service for Apple App Store reviews
// In production, this could be replaced with Redis or another caching solution

class CacheService {
  constructor() {
    this.cache = new Map();
    this.metadata = new Map();
    console.log('[CacheService] Initialized with in-memory storage');
  }

  // Generate cache key for reviews
  generateReviewKey(appId) {
    return `reviews:${appId}`;
  }

  // Generate cache key for metadata
  generateMetaKey(appId) {
    return `meta:${appId}`;
  }

  // Get cached reviews
  async getCachedReviews(appId) {
    const key = this.generateReviewKey(appId);
    const metaKey = this.generateMetaKey(appId);
    
    const reviews = this.cache.get(key);
    const metadata = this.metadata.get(metaKey);
    
    if (reviews) {
      console.log(`[CacheService] Cache hit for app ${appId} - ${reviews.length} reviews`);
      return {
        reviews,
        metadata,
        fromCache: true
      };
    }
    
    console.log(`[CacheService] Cache miss for app ${appId}`);
    return {
      reviews: null,
      metadata: null,
      fromCache: false
    };
  }

  // Set cached reviews
  async setCachedReviews(appId, reviews) {
    const key = this.generateReviewKey(appId);
    const metaKey = this.generateMetaKey(appId);
    
    const metadata = {
      appId,
      reviewCount: reviews.length,
      lastSync: new Date().toISOString(),
      cacheTime: new Date().toISOString()
    };
    
    this.cache.set(key, reviews);
    this.metadata.set(metaKey, metadata);
    
    console.log(`[CacheService] Cached ${reviews.length} reviews for app ${appId}`);
    return metadata;
  }

  // Get app metadata
  async getAppMetadata(appId) {
    const metaKey = this.generateMetaKey(appId);
    return this.metadata.get(metaKey) || null;
  }

  // Check if key exists
  async has(key) {
    return this.cache.has(key);
  }

  // Delete a key
  async delete(key) {
    this.cache.delete(key);
    console.log(`[CacheService] Deleted key: ${key}`);
  }

  // Clear all cache
  async clear() {
    this.cache.clear();
    this.metadata.clear();
    console.log('[CacheService] Cleared all cache');
  }

  // Get cache statistics
  async getStats() {
    return {
      size: this.cache.size,
      metadataSize: this.metadata.size,
      type: 'in-memory'
    };
  }
}

// Export singleton instance
module.exports = new CacheService();
EOF < /dev/null