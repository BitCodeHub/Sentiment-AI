// AI Cache Service for reducing API costs
import { generateHash } from '../utils/hash';

class AICache {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.cachePrefix = 'ai_analysis_cache_';
    this.tokenUsage = this.loadTokenUsage();
    this.loadCacheFromLocalStorage();
  }

  // Generate cache key based on reviews and filters
  generateCacheKey(reviews, filters, analysisType) {
    const sortedReviews = reviews
      .map(r => ({
        text: r.text || r.Text || r.review || r.Review || '',
        rating: r.rating || r.Rating || 0,
        date: r.date || r.Date || '',
        sentiment: r.sentiment || ''
      }))
      .sort((a, b) => a.text.localeCompare(b.text));
    
    const keyData = {
      analysisType,
      reviewCount: reviews.length,
      reviews: sortedReviews.slice(0, 10), // Sample for key generation
      filters: filters || {},
      timestamp: Math.floor(Date.now() / (1000 * 60 * 60 * 24)) // Daily cache
    };
    
    return generateHash(JSON.stringify(keyData));
  }

  // Get cached result
  get(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      console.log('🎯 Cache hit for:', cacheKey);
      return cached.data;
    }
    return null;
  }

  // Set cache with TTL
  set(cacheKey, data, ttlHours = 24) {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttlHours * 60 * 60 * 1000,
      hits: 0
    };
    
    this.cache.set(cacheKey, cacheEntry);
    this.saveCacheToLocalStorage();
    console.log('💾 Cached analysis for:', cacheKey);
  }

  // Check if cache is still valid
  isCacheValid(cached) {
    const now = Date.now();
    const age = now - cached.timestamp;
    return age < cached.ttl;
  }

  // Request deduplication
  async dedupedRequest(cacheKey, requestFn) {
    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      console.log('⏳ Waiting for pending request:', cacheKey);
      return this.pendingRequests.get(cacheKey);
    }

    // Create new request promise
    const requestPromise = requestFn()
      .then(result => {
        this.pendingRequests.delete(cacheKey);
        return result;
      })
      .catch(error => {
        this.pendingRequests.delete(cacheKey);
        throw error;
      });

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  // Estimate token count (rough approximation)
  estimateTokens(text) {
    // OpenAI's rule of thumb: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  // Track token usage
  trackTokenUsage(inputTokens, outputTokens, model = 'gpt-4') {
    const costs = {
      'gpt-4': { input: 0.03, output: 0.06 }, // per 1K tokens
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
    };

    const cost = costs[model] || costs['gpt-4'];
    const inputCost = (inputTokens / 1000) * cost.input;
    const outputCost = (outputTokens / 1000) * cost.output;
    const totalCost = inputCost + outputCost;

    this.tokenUsage.totalInputTokens += inputTokens;
    this.tokenUsage.totalOutputTokens += outputTokens;
    this.tokenUsage.totalCost += totalCost;
    this.tokenUsage.requests += 1;
    this.tokenUsage.lastUpdated = Date.now();

    this.saveTokenUsage();
    
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      cost: totalCost,
      totalCost: this.tokenUsage.totalCost
    };
  }

  // Get token usage stats
  getTokenUsageStats() {
    return {
      ...this.tokenUsage,
      averageTokensPerRequest: this.tokenUsage.requests > 0 
        ? Math.round((this.tokenUsage.totalInputTokens + this.tokenUsage.totalOutputTokens) / this.tokenUsage.requests)
        : 0,
      cacheHitRate: this.calculateCacheHitRate()
    };
  }

  // Calculate cache hit rate
  calculateCacheHitRate() {
    let hits = 0;
    let total = 0;
    
    this.cache.forEach(entry => {
      hits += entry.hits;
      total += entry.hits + 1; // +1 for initial miss
    });
    
    return total > 0 ? Math.round((hits / total) * 100) : 0;
  }

  // Clear cache
  clearCache(analysisType = null) {
    if (analysisType) {
      // Clear specific analysis type
      const keysToDelete = [];
      this.cache.forEach((value, key) => {
        if (key.includes(analysisType)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      // Clear all cache
      this.cache.clear();
    }
    
    this.saveCacheToLocalStorage();
    console.log('🗑️ Cache cleared:', analysisType || 'all');
  }

  // Save cache to localStorage
  saveCacheToLocalStorage() {
    try {
      const cacheData = {};
      this.cache.forEach((value, key) => {
        // Only save valid cache entries
        if (this.isCacheValid(value)) {
          cacheData[key] = value;
        }
      });
      
      localStorage.setItem(this.cachePrefix + 'data', JSON.stringify(cacheData));
    } catch (e) {
      console.warn('Failed to save cache to localStorage:', e);
      // If localStorage is full, clear old entries
      this.cleanupOldCache();
    }
  }

  // Load cache from localStorage
  loadCacheFromLocalStorage() {
    try {
      const savedCache = localStorage.getItem(this.cachePrefix + 'data');
      if (savedCache) {
        const cacheData = JSON.parse(savedCache);
        Object.entries(cacheData).forEach(([key, value]) => {
          if (this.isCacheValid(value)) {
            this.cache.set(key, value);
          }
        });
        console.log('📦 Loaded', this.cache.size, 'cached entries from localStorage');
      }
    } catch (e) {
      console.warn('Failed to load cache from localStorage:', e);
    }
  }

  // Cleanup old cache entries
  cleanupOldCache() {
    const entriesToKeep = [];
    const now = Date.now();
    
    this.cache.forEach((value, key) => {
      if (this.isCacheValid(value)) {
        entriesToKeep.push([key, value]);
      }
    });
    
    // Sort by timestamp and keep most recent
    entriesToKeep.sort((a, b) => b[1].timestamp - a[1].timestamp);
    
    // Keep only the 50 most recent valid entries
    this.cache.clear();
    entriesToKeep.slice(0, 50).forEach(([key, value]) => {
      this.cache.set(key, value);
    });
    
    this.saveCacheToLocalStorage();
  }

  // Save token usage
  saveTokenUsage() {
    try {
      localStorage.setItem(this.cachePrefix + 'token_usage', JSON.stringify(this.tokenUsage));
    } catch (e) {
      console.warn('Failed to save token usage:', e);
    }
  }

  // Load token usage
  loadTokenUsage() {
    try {
      const saved = localStorage.getItem(this.cachePrefix + 'token_usage');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load token usage:', e);
    }
    
    return {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      requests: 0,
      lastUpdated: Date.now()
    };
  }

  // Reset token usage stats
  resetTokenUsage() {
    this.tokenUsage = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      requests: 0,
      lastUpdated: Date.now()
    };
    this.saveTokenUsage();
  }

  // Get cache size info
  getCacheInfo() {
    let totalSize = 0;
    const entries = [];
    
    this.cache.forEach((value, key) => {
      const size = JSON.stringify(value).length;
      totalSize += size;
      entries.push({
        key,
        size,
        age: Date.now() - value.timestamp,
        hits: value.hits
      });
    });
    
    return {
      entries: entries.sort((a, b) => b.hits - a.hits),
      totalEntries: this.cache.size,
      totalSizeKB: Math.round(totalSize / 1024),
      oldestEntry: entries.reduce((oldest, entry) => 
        entry.age > oldest.age ? entry : oldest, { age: 0 }
      )
    };
  }
}

// Create singleton instance
const aiCache = new AICache();

export default aiCache;