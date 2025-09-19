const axios = require('axios');
const { parseStringPromise } = require('xml2js');

class AppleRSSService {
  constructor() {
    this.baseURL = 'https://itunes.apple.com';
  }

  /**
   * Fetch recent reviews from Apple's RSS feed
   * RSS feeds typically have more current data than the App Store Connect API
   */
  async fetchRecentReviewsFromRSS(appId, country = 'us', limit = 500, page = 1) {
    try {
      // Apple RSS feed URL format
      // Example: https://itunes.apple.com/us/rss/customerreviews/id=284882215/sortby=mostrecent/page=1/xml
      const url = `${this.baseURL}/${country}/rss/customerreviews/page=${page}/id=${appId}/sortby=mostrecent/xml`;
      
      console.log(`[AppleRSS] Fetching from: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/xml',
          'User-Agent': 'Mozilla/5.0 (compatible; ReviewDashboard/1.0)'
        },
        timeout: 10000
      });

      // Parse XML response
      const result = await parseStringPromise(response.data);
      
      // Extract reviews from RSS feed
      const entries = result?.feed?.entry || [];
      const reviews = [];

      for (const entry of entries) {
        // Skip the first entry as it's usually app info, not a review
        if (!entry['im:rating']) continue;

        const review = {
          id: entry.id?.[0] || `rss_${Date.now()}_${Math.random()}`,
          rating: parseInt(entry['im:rating']?.[0] || '0'),
          title: entry.title?.[0] || '',
          content: entry.content?.[0]?._ || entry.content?.[0] || '',
          author: entry.author?.[0]?.name?.[0] || 'Anonymous',
          updated: entry.updated?.[0] || new Date().toISOString(),
          version: entry['im:version']?.[0] || '',
          voteSum: parseInt(entry['im:voteSum']?.[0] || '0'),
          voteCount: parseInt(entry['im:voteCount']?.[0] || '0')
        };

        reviews.push(review);
      }

      console.log(`[AppleRSS] Found ${reviews.length} reviews`);
      
      // Log the most recent review date for debugging
      if (reviews.length > 0) {
        const mostRecentDate = new Date(reviews[0].updated);
        const daysAgo = Math.floor((Date.now() - mostRecentDate) / (1000 * 60 * 60 * 24));
        console.log(`[AppleRSS] Most recent review: ${mostRecentDate.toISOString()} (${daysAgo} days ago)`);
      }

      return reviews;
    } catch (error) {
      console.error('[AppleRSS] Error fetching RSS feed:', error.message);
      throw error;
    }
  }

  /**
   * Transform RSS review format to match our standard format
   */
  transformRSSReview(rssReview, appId, country = 'us') {
    return {
      'Review ID': rssReview.id,
      'Rating': rssReview.rating,
      'Review Title': rssReview.title,
      'Body': rssReview.content,
      'Review Text': rssReview.content,
      'Author': rssReview.author,
      'Date': new Date(rssReview.updated).toISOString().split('T')[0],
      'App Version': rssReview.version,
      'Device Model': 'iPhone', // RSS doesn't provide device info
      'Platform': 'iOS',
      'OS': '', // RSS doesn't provide OS version
      'Country': country.toUpperCase(),
      'Language': this.getLanguageFromCountry(country),
      'Developer Response': '', // RSS doesn't include developer responses
      'Vote Count': rssReview.voteCount,
      'Vote Sum': rssReview.voteSum,
      'Source': 'RSS' // Mark source for tracking
    };
  }

  /**
   * Get all available countries for RSS feeds
   */
  getAvailableCountries() {
    return [
      { code: 'us', name: 'United States' },
      { code: 'gb', name: 'United Kingdom' },
      { code: 'ca', name: 'Canada' },
      { code: 'au', name: 'Australia' },
      { code: 'de', name: 'Germany' },
      { code: 'fr', name: 'France' },
      { code: 'it', name: 'Italy' },
      { code: 'es', name: 'Spain' },
      { code: 'jp', name: 'Japan' },
      { code: 'kr', name: 'South Korea' },
      { code: 'cn', name: 'China' },
      { code: 'br', name: 'Brazil' },
      { code: 'mx', name: 'Mexico' },
      { code: 'in', name: 'India' },
      { code: 'ru', name: 'Russia' },
      { code: 'nl', name: 'Netherlands' },
      { code: 'se', name: 'Sweden' },
      { code: 'no', name: 'Norway' },
      { code: 'dk', name: 'Denmark' },
      { code: 'fi', name: 'Finland' }
    ];
  }

  /**
   * Fetch reviews from multiple countries
   */
  async fetchMultiCountryReviews(appId, countries = ['us'], limit = 500) {
    const allReviews = [];
    const results = {};

    for (const country of countries) {
      try {
        console.log(`[AppleRSS] Fetching reviews for country: ${country}`);
        
        // Fetch up to 50 pages per country to get more reviews
        const maxPages = 50;
        let countryReviews = [];
        
        for (let page = 1; page <= maxPages; page++) {
          try {
            const pageReviews = await this.fetchRecentReviewsFromRSS(appId, country, limit, page);
            if (pageReviews.length === 0) break; // No more reviews
            
            countryReviews.push(...pageReviews);
            console.log(`[AppleRSS] Country ${country}, page ${page}: ${pageReviews.length} reviews`);
            
            // Small delay between pages
            if (page < maxPages) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          } catch (pageError) {
            // If page doesn't exist, just continue
            console.log(`[AppleRSS] No page ${page} for ${country}`);
            break;
          }
        }
        
        const transformedReviews = countryReviews.map(r => this.transformRSSReview(r, appId, country));
        
        allReviews.push(...transformedReviews);
        results[country] = {
          success: true,
          count: countryReviews.length,
          mostRecent: countryReviews[0]?.updated
        };
      } catch (error) {
        console.error(`[AppleRSS] Failed to fetch ${country}:`, error.message);
        results[country] = {
          success: false,
          error: error.message
        };
      }

      // Small delay between requests to be respectful
      if (countries.indexOf(country) < countries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Sort all reviews by date (newest first)
    allReviews.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    return {
      reviews: allReviews,
      totalCount: allReviews.length,
      countryResults: results
    };
  }

  /**
   * Helper to map country codes to languages
   */
  getLanguageFromCountry(countryCode) {
    const countryToLanguage = {
      'us': 'en', 'gb': 'en', 'ca': 'en', 'au': 'en',
      'de': 'de', 'fr': 'fr', 'it': 'it', 'es': 'es',
      'jp': 'ja', 'kr': 'ko', 'cn': 'zh', 'br': 'pt',
      'mx': 'es', 'in': 'hi', 'ru': 'ru', 'nl': 'nl',
      'se': 'sv', 'no': 'no', 'dk': 'da', 'fi': 'fi'
    };
    
    return countryToLanguage[countryCode.toLowerCase()] || 'en';
  }
}

module.exports = new AppleRSSService();