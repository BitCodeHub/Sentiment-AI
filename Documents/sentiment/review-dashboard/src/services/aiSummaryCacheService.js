// Simple in-memory cache for AI summaries to reduce API calls
class AISummaryCacheService {
  constructor() {
    this.cache = new Map();
    this.ttl = 30 * 60 * 1000; // 30 minutes TTL
  }

  // Generate cache key from reviews and date range
  generateCacheKey(reviews, dateRange) {
    const reviewCount = reviews?.length || 0;
    const dateKey = dateRange ? `${dateRange.start}-${dateRange.end}` : 'all';
    const contentHash = this.simpleHash(JSON.stringify(reviews.slice(0, 10))); // Hash first 10 reviews
    return `summary-${reviewCount}-${dateKey}-${contentHash}`;
  }

  // Simple hash function
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Get cached summary
  get(reviews, dateRange) {
    const key = this.generateCacheKey(reviews, dateRange);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      console.log('[AISummaryCache] Cache hit for key:', key);
      return cached.data;
    }
    
    if (cached) {
      console.log('[AISummaryCache] Cache expired for key:', key);
      this.cache.delete(key);
    }
    
    return null;
  }

  // Set cached summary
  set(reviews, dateRange, summary) {
    const key = this.generateCacheKey(reviews, dateRange);
    console.log('[AISummaryCache] Caching summary for key:', key);
    
    this.cache.set(key, {
      data: summary,
      timestamp: Date.now()
    });

    // Clean up old entries
    this.cleanup();
  }

  // Remove expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Clear all cache
  clear() {
    console.log('[AISummaryCache] Clearing all cache');
    this.cache.clear();
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp < this.ttl) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      cacheSize: JSON.stringify([...this.cache.entries()]).length
    };
  }
}

// Export singleton instance
export const aiSummaryCache = new AISummaryCacheService();