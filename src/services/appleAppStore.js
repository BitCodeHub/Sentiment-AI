import jwt from 'jsonwebtoken';
import axios from 'axios';
import { readFileSync } from 'fs';

class AppleAppStoreService {
  constructor() {
    this.baseURL = 'https://api.appstoreconnect.apple.com/v1';
    this.keyId = 'K6C3OE75Z8CA';
    this.issuerId = null; // Will be set when initializing
    this.privateKey = null;
    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Initialize the service with credentials
   * @param {string} keyPath - Path to the .p8 private key file
   * @param {string} issuerId - Your App Store Connect issuer ID
   */
  async initialize(keyPath, issuerId) {
    try {
      this.issuerId = issuerId;
      // In a browser environment, we'll need to handle the key differently
      // For now, we'll expect the key content to be passed directly
      if (typeof keyPath === 'string' && keyPath.includes('BEGIN PRIVATE KEY')) {
        this.privateKey = keyPath;
      } else {
        // This would work in Node.js environment
        this.privateKey = readFileSync(keyPath, 'utf8');
      }
    } catch (error) {
      console.error('Error initializing Apple App Store service:', error);
      throw new Error('Failed to initialize Apple App Store service');
    }
  }

  /**
   * Generate JWT token for App Store Connect API
   */
  generateToken() {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + (20 * 60); // Token expires in 20 minutes

    const payload = {
      iss: this.issuerId,
      iat: now,
      exp: expiry,
      aud: 'appstoreconnect-v1',
      bid: 'com.yourcompany.yourapp' // Replace with your bundle ID
    };

    const token = jwt.sign(payload, this.privateKey, {
      algorithm: 'ES256',
      keyid: this.keyId
    });

    this.token = token;
    this.tokenExpiry = expiry;
    return token;
  }

  /**
   * Get current token or generate a new one if expired
   */
  getToken() {
    const now = Math.floor(Date.now() / 1000);
    if (!this.token || !this.tokenExpiry || now >= this.tokenExpiry - 60) {
      return this.generateToken();
    }
    return this.token;
  }

  /**
   * Fetch app reviews from App Store Connect
   * @param {string} appId - Your app's ID in App Store Connect
   * @param {object} options - Query options
   */
  async fetchReviews(appId, options = {}) {
    const {
      limit = 100,
      offset = 0,
      territory = 'USA',
      sort = '-createdDate'
    } = options;

    try {
      const token = this.getToken();
      const response = await axios.get(
        `${this.baseURL}/apps/${appId}/customerReviews`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params: {
            'filter[territory]': territory,
            'sort': sort,
            'limit': limit,
            'offset': offset,
            'include': 'response'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching reviews:', error);
      throw new Error('Failed to fetch reviews from App Store Connect');
    }
  }

  /**
   * Fetch all reviews with pagination
   * @param {string} appId - Your app's ID in App Store Connect
   * @param {string} territory - Territory code (default: USA)
   */
  async fetchAllReviews(appId, territory = 'USA') {
    const allReviews = [];
    let hasMore = true;
    let offset = 0;
    const limit = 200; // Max allowed by API

    while (hasMore) {
      try {
        const response = await this.fetchReviews(appId, {
          limit,
          offset,
          territory
        });

        const reviews = response.data || [];
        allReviews.push(...reviews);

        // Check if there are more reviews
        hasMore = reviews.length === limit;
        offset += limit;

        // Add a small delay to avoid rate limiting
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error('Error in pagination:', error);
        hasMore = false;
      }
    }

    return allReviews;
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
        // This would need another API call to get the actual response content
        developerResponse = 'Developer response available';
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
        'OS': '', // Not provided by Apple API
        'Country': attributes.territory || 'U.S.',
        'Language': 'English', // Apple API doesn't provide language info directly
        'Developer Response': developerResponse
      };
    });
  }

  /**
   * Main method to import reviews from Apple App Store
   * @param {string} appId - Your app's ID in App Store Connect
   * @param {string} issuerId - Your App Store Connect issuer ID
   * @param {string} privateKeyContent - Content of the .p8 private key
   */
  async importReviews(appId, issuerId, privateKeyContent) {
    try {
      // Initialize with credentials
      await this.initialize(privateKeyContent, issuerId);

      // Fetch all USA reviews
      const rawReviews = await this.fetchAllReviews(appId, 'USA');

      // Transform to match expected format
      const transformedReviews = this.transformReviews(rawReviews);

      return transformedReviews;
    } catch (error) {
      console.error('Error importing Apple reviews:', error);
      throw error;
    }
  }
}

// Create a singleton instance
const appleAppStoreService = new AppleAppStoreService();

export default appleAppStoreService;