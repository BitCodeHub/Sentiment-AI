// IndexedDB service for frontend persistent storage
class IndexedDBService {
  constructor() {
    this.dbName = 'ReviewDashboardDB';
    this.version = 1;
    this.db = null;
  }

  // Initialize the database
  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('reviews')) {
          const reviewStore = db.createObjectStore('reviews', { keyPath: 'appId' });
          reviewStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
          reviewStore.createIndex('territory', 'territory', { unique: false });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'appId' });
        }

        if (!db.objectStoreNames.contains('analysis')) {
          const analysisStore = db.createObjectStore('analysis', { keyPath: 'key' });
          analysisStore.createIndex('appId', 'appId', { unique: false });
          analysisStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  // Store reviews
  async storeReviews(appId, reviews, territory = 'USA') {
    const db = await this.init();
    const transaction = db.transaction(['reviews', 'metadata'], 'readwrite');
    const reviewStore = transaction.objectStore('reviews');
    const metaStore = transaction.objectStore('metadata');

    const reviewData = {
      appId,
      territory,
      reviews,
      lastUpdated: new Date().toISOString(),
      reviewCount: reviews.length
    };

    const metadata = {
      appId,
      territory,
      lastUpdated: new Date().toISOString(),
      reviewCount: reviews.length,
      oldestReview: reviews[reviews.length - 1]?.Date || null,
      newestReview: reviews[0]?.Date || null,
      version: '1.0'
    };

    return Promise.all([
      this.promisifyRequest(reviewStore.put(reviewData)),
      this.promisifyRequest(metaStore.put(metadata))
    ]);
  }

  // Get reviews
  async getReviews(appId, territory = 'USA') {
    const db = await this.init();
    const transaction = db.transaction(['reviews'], 'readonly');
    const store = transaction.objectStore('reviews');
    
    const result = await this.promisifyRequest(store.get(appId));
    
    if (result && result.territory === territory) {
      return {
        reviews: result.reviews,
        metadata: {
          lastUpdated: result.lastUpdated,
          reviewCount: result.reviewCount,
          fromCache: true
        }
      };
    }
    
    return null;
  }

  // Get metadata
  async getMetadata(appId) {
    const db = await this.init();
    const transaction = db.transaction(['metadata'], 'readonly');
    const store = transaction.objectStore('metadata');
    
    return await this.promisifyRequest(store.get(appId));
  }

  // Store analysis results
  async storeAnalysis(key, data, appId) {
    const db = await this.init();
    const transaction = db.transaction(['analysis'], 'readwrite');
    const store = transaction.objectStore('analysis');

    const analysisData = {
      key,
      appId,
      data,
      createdAt: new Date().toISOString()
    };

    return this.promisifyRequest(store.put(analysisData));
  }

  // Get analysis results
  async getAnalysis(key) {
    const db = await this.init();
    const transaction = db.transaction(['analysis'], 'readonly');
    const store = transaction.objectStore('analysis');
    
    const result = await this.promisifyRequest(store.get(key));
    return result?.data || null;
  }

  // Clear all data for an app
  async clearAppData(appId) {
    const db = await this.init();
    const transaction = db.transaction(['reviews', 'metadata', 'analysis'], 'readwrite');
    
    const reviewStore = transaction.objectStore('reviews');
    const metaStore = transaction.objectStore('metadata');
    const analysisStore = transaction.objectStore('analysis');
    
    // Delete reviews and metadata
    await Promise.all([
      this.promisifyRequest(reviewStore.delete(appId)),
      this.promisifyRequest(metaStore.delete(appId))
    ]);
    
    // Delete all analysis for this app
    const analysisIndex = analysisStore.index('appId');
    const analysisRecords = await this.promisifyRequest(analysisIndex.getAllKeys(appId));
    
    await Promise.all(
      analysisRecords.map(key => this.promisifyRequest(analysisStore.delete(key)))
    );
  }

  // Clear all data
  async clearAll() {
    const db = await this.init();
    const transaction = db.transaction(['reviews', 'metadata', 'analysis'], 'readwrite');
    
    await Promise.all([
      this.promisifyRequest(transaction.objectStore('reviews').clear()),
      this.promisifyRequest(transaction.objectStore('metadata').clear()),
      this.promisifyRequest(transaction.objectStore('analysis').clear())
    ]);
  }

  // Get storage size estimate
  async getStorageInfo() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        percentage: ((estimate.usage || 0) / (estimate.quota || 1)) * 100
      };
    }
    
    return {
      usage: 0,
      quota: 0,
      percentage: 0,
      error: 'Storage API not supported'
    };
  }

  // Get all cached apps
  async getAllCachedApps() {
    const db = await this.init();
    const transaction = db.transaction(['metadata'], 'readonly');
    const store = transaction.objectStore('metadata');
    
    const allMetadata = await this.promisifyRequest(store.getAll());
    return allMetadata.map(meta => ({
      appId: meta.appId,
      territory: meta.territory,
      lastUpdated: meta.lastUpdated,
      reviewCount: meta.reviewCount
    }));
  }

  // Helper to promisify IndexedDB requests
  promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Clean up old data (older than specified days)
  async cleanupOldData(daysToKeep = 30) {
    const db = await this.init();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffISO = cutoffDate.toISOString();

    // Clean up old reviews
    const reviewTransaction = db.transaction(['reviews'], 'readwrite');
    const reviewStore = reviewTransaction.objectStore('reviews');
    const reviewIndex = reviewStore.index('lastUpdated');
    
    const oldReviews = await this.promisifyRequest(
      reviewIndex.getAllKeys(IDBKeyRange.upperBound(cutoffISO))
    );
    
    await Promise.all(
      oldReviews.map(key => this.promisifyRequest(reviewStore.delete(key)))
    );

    // Clean up old analysis
    const analysisTransaction = db.transaction(['analysis'], 'readwrite');
    const analysisStore = analysisTransaction.objectStore('analysis');
    const analysisIndex = analysisStore.index('createdAt');
    
    const oldAnalysis = await this.promisifyRequest(
      analysisIndex.getAllKeys(IDBKeyRange.upperBound(cutoffISO))
    );
    
    await Promise.all(
      oldAnalysis.map(key => this.promisifyRequest(analysisStore.delete(key)))
    );

    console.log(`Cleaned up ${oldReviews.length} old review sets and ${oldAnalysis.length} old analysis results`);
  }
}

// Create singleton instance
const indexedDBService = new IndexedDBService();

// Initialize on first import
indexedDBService.init().catch(console.error);

export default indexedDBService;