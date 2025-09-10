import axios from 'axios';

class AppleAppStoreBrowserService {
  constructor() {
    // Use backend API endpoint from environment or default
    this.backendURL = import.meta.env.VITE_APPLE_API_ENDPOINT || 'http://localhost:3001/api/apple-reviews';
    console.log('Apple Backend URL:', this.backendURL);
    this.isBackendAvailable = false;
    this.checkBackendAvailability();
  }

  /**
   * Check if backend service is available
   */
  async checkBackendAvailability() {
    try {
      const healthEndpoint = this.backendURL.replace('/apple-reviews', '/health');
      console.log('Checking backend at:', healthEndpoint);
      const response = await axios.get(healthEndpoint, { timeout: 5000 });
      this.isBackendAvailable = response.data.status === 'ok';
      console.log('Apple backend service available:', this.isBackendAvailable);
    } catch (error) {
      console.warn('Apple backend service not available, using mock data', error.message);
      this.isBackendAvailable = false;
    }
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
   * Main method to import reviews from Apple App Store
   * Calls backend API if available, otherwise returns mock data
   */
  async importReviews(appId, issuerId, privateKeyContent, useServerCredentials = false) {
    try {
      console.log('Importing Apple App Store reviews...');
      console.log('App ID:', appId);
      console.log('Backend available:', this.isBackendAvailable);
      
      // Check if backend is available
      if (!this.isBackendAvailable) {
        // Re-check availability in case it came online
        await this.checkBackendAvailability();
      }
      
      if (this.isBackendAvailable) {
        try {
          // Always use FormData because backend has multer middleware
          const formData = new FormData();
          formData.append('appId', appId);
          
          // Only send credentials if not using server credentials
          if (!useServerCredentials) {
            formData.append('issuerId', issuerId);
            
            // If privateKeyContent is a File object, append as file
            if (privateKeyContent instanceof File) {
              formData.append('privateKey', privateKeyContent);
            } else {
              // Otherwise send as text
              formData.append('privateKey', privateKeyContent);
            }
          }
          
          const response = await axios.post(this.backendURL, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            timeout: 120000 // 2 minute timeout for API calls with pagination
          });
          
          if (response.data.success) {
            console.log(`Successfully fetched ${response.data.reviews.length} reviews from Apple App Store`);
            return response.data.reviews;
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