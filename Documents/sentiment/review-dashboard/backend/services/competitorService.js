const axios = require('axios');
const appleRSSService = require('./appleRSSService');
const redditService = require('./redditService');
const cacheService = require('./cacheService');

class CompetitorService {
  constructor() {
    this.iTunesBaseURL = 'https://itunes.apple.com';
    this.cacheKeyPrefix = 'competitor_';
    this.cacheDuration = 3600000; // 1 hour cache
  }

  /**
   * Fetch competitor app info from iTunes API
   * @param {string} appId - The iTunes app ID
   * @param {string} country - Country code (default: 'us')
   */
  async fetchCompetitorAppInfo(appId, country = 'us') {
    const cacheKey = `${this.cacheKeyPrefix}info_${appId}_${country}`;
    
    // Check cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      console.log(`[CompetitorService] Returning cached app info for ${appId}`);
      return cached;
    }

    try {
      const url = `${this.iTunesBaseURL}/lookup`;
      console.log(`[CompetitorService] Fetching app info for ${appId} from iTunes API`);
      
      const response = await axios.get(url, {
        params: {
          id: appId,
          country: country
        },
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; ReviewDashboard/1.0)'
        },
        timeout: 10000
      });

      if (!response.data.results || response.data.results.length === 0) {
        throw new Error(`App not found with ID: ${appId}`);
      }

      const appData = response.data.results[0];
      
      const competitorInfo = {
        appId: appData.trackId,
        name: appData.trackName,
        bundleId: appData.bundleId,
        seller: appData.sellerName,
        price: appData.price,
        currency: appData.currency,
        icon: appData.artworkUrl512 || appData.artworkUrl100,
        rating: {
          current: appData.averageUserRatingForCurrentVersion || 0,
          currentCount: appData.userRatingCountForCurrentVersion || 0,
          overall: appData.averageUserRating || 0,
          overallCount: appData.userRatingCount || 0
        },
        version: appData.version,
        releaseDate: appData.releaseDate,
        lastUpdated: appData.currentVersionReleaseDate,
        description: appData.description,
        category: appData.primaryGenreName,
        contentRating: appData.contentAdvisoryRating,
        size: appData.fileSizeBytes,
        languages: appData.languageCodesISO2A,
        screenshots: {
          iphone: appData.screenshotUrls || [],
          ipad: appData.ipadScreenshotUrls || []
        },
        features: appData.features || [],
        supportedDevices: appData.supportedDevices || [],
        minimumOsVersion: appData.minimumOsVersion,
        url: appData.trackViewUrl
      };

      // Cache the result
      await cacheService.set(cacheKey, competitorInfo, this.cacheDuration);
      
      return competitorInfo;
    } catch (error) {
      console.error(`[CompetitorService] Error fetching app info for ${appId}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch multiple competitor apps info
   * @param {string[]} appIds - Array of iTunes app IDs
   * @param {string} country - Country code (default: 'us')
   */
  async fetchMultipleCompetitorInfo(appIds, country = 'us') {
    console.log(`[CompetitorService] Fetching info for ${appIds.length} competitors`);
    
    const results = {};
    const errors = {};

    // Fetch in parallel with rate limiting
    const promises = appIds.map(async (appId, index) => {
      // Add slight delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, index * 100));
      
      try {
        const info = await this.fetchCompetitorAppInfo(appId, country);
        results[appId] = info;
      } catch (error) {
        console.error(`[CompetitorService] Failed to fetch ${appId}:`, error.message);
        errors[appId] = error.message;
      }
    });

    await Promise.all(promises);

    return { results, errors };
  }

  /**
   * Fetch recent reviews for competitor apps using RSS feeds
   * @param {string} appId - The iTunes app ID
   * @param {string[]} countries - Array of country codes (default: ['us'])
   * @param {number} limit - Number of reviews per country (default: 50)
   */
  async fetchCompetitorReviews(appId, countries = ['us'], limit = 50) {
    const cacheKey = `${this.cacheKeyPrefix}reviews_${appId}_${countries.join('_')}`;
    
    // Check cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      console.log(`[CompetitorService] Returning cached reviews for ${appId}`);
      return cached;
    }

    try {
      console.log(`[CompetitorService] Fetching reviews for competitor ${appId}`);
      
      if (countries.length > 1) {
        // Fetch from multiple countries
        const result = await appleRSSService.fetchMultiCountryReviews(appId, countries, limit);
        
        // Cache the result
        await cacheService.set(cacheKey, result, this.cacheDuration / 2); // 30 min cache for reviews
        
        return result;
      } else {
        // Fetch from single country
        const reviews = await appleRSSService.fetchRecentReviewsFromRSS(appId, countries[0], limit);
        const transformedReviews = reviews.map(r => 
          appleRSSService.transformRSSReview(r, appId, countries[0])
        );
        
        const result = {
          reviews: transformedReviews,
          totalCount: transformedReviews.length,
          countryResults: {
            [countries[0]]: {
              success: true,
              count: transformedReviews.length,
              mostRecent: reviews[0]?.updated
            }
          }
        };
        
        // Cache the result
        await cacheService.set(cacheKey, result, this.cacheDuration / 2);
        
        return result;
      }
    } catch (error) {
      console.error(`[CompetitorService] Error fetching reviews for ${appId}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch Reddit mentions for competitor apps
   * @param {string} appName - The app name to search for
   * @param {object} options - Search options
   */
  async fetchCompetitorRedditMentions(appName, options = {}) {
    const {
      timeFilter = 'month',
      limit = 100,
      subreddit = 'all'
    } = options;

    const cacheKey = `${this.cacheKeyPrefix}reddit_${appName}_${timeFilter}_${subreddit}`;
    
    // Check cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      console.log(`[CompetitorService] Returning cached Reddit mentions for ${appName}`);
      return cached;
    }

    try {
      console.log(`[CompetitorService] Fetching Reddit mentions for ${appName}`);
      
      // Use existing Reddit service
      const posts = await redditService.searchPosts(appName, {
        timeFilter,
        limit,
        subreddit,
        sort: 'relevance'
      });

      // Calculate sentiment metrics
      const sentimentAnalysis = this.analyzeRedditSentiment(posts);

      const result = {
        posts,
        totalMentions: posts.length,
        sentiment: sentimentAnalysis,
        timeFilter,
        subreddit
      };

      // Cache the result
      await cacheService.set(cacheKey, result, this.cacheDuration / 2);
      
      return result;
    } catch (error) {
      console.error(`[CompetitorService] Error fetching Reddit mentions for ${appName}:`, error.message);
      throw error;
    }
  }

  /**
   * Analyze sentiment from Reddit posts
   * @param {array} posts - Array of Reddit posts
   */
  analyzeRedditSentiment(posts) {
    if (!posts || posts.length === 0) {
      return {
        score: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        totalEngagement: 0,
        averageEngagement: 0
      };
    }

    // Simple sentiment analysis based on engagement and keywords
    let positive = 0;
    let negative = 0;
    let neutral = 0;
    let totalEngagement = 0;

    const positiveKeywords = [
      'love', 'great', 'excellent', 'awesome', 'best', 'perfect', 
      'amazing', 'fantastic', 'good', 'works well', 'helpful', 'useful'
    ];
    
    const negativeKeywords = [
      'hate', 'terrible', 'awful', 'worst', 'broken', 'useless', 
      'horrible', 'bad', 'sucks', 'doesn\'t work', 'buggy', 'crash'
    ];

    posts.forEach(post => {
      const text = `${post.title} ${post.selftext}`.toLowerCase();
      totalEngagement += post.engagementScore;

      // Count keyword occurrences
      const positiveCount = positiveKeywords.filter(keyword => text.includes(keyword)).length;
      const negativeCount = negativeKeywords.filter(keyword => text.includes(keyword)).length;

      if (positiveCount > negativeCount) {
        positive++;
      } else if (negativeCount > positiveCount) {
        negative++;
      } else {
        neutral++;
      }
    });

    const total = posts.length;
    const sentimentScore = (positive - negative) / total;
    const averageEngagement = totalEngagement / total;

    return {
      score: sentimentScore,
      positive: (positive / total) * 100,
      neutral: (neutral / total) * 100,
      negative: (negative / total) * 100,
      totalEngagement,
      averageEngagement: Math.round(averageEngagement)
    };
  }

  /**
   * Get comprehensive competitor analysis data
   * @param {string} appId - The iTunes app ID
   * @param {object} options - Analysis options
   */
  async getCompetitorAnalysis(appId, options = {}) {
    const {
      countries = ['us'],
      reviewLimit = 50,
      redditTimeFilter = 'month',
      includeReviews = true,
      includeReddit = true
    } = options;

    try {
      console.log(`[CompetitorService] Starting comprehensive analysis for ${appId}`);

      // Fetch app info first
      const appInfo = await this.fetchCompetitorAppInfo(appId, countries[0]);
      
      const analysis = {
        appInfo,
        reviews: null,
        reddit: null,
        metrics: {
          appRating: appInfo.rating.overall,
          reviewCount: appInfo.rating.overallCount,
          lastUpdated: appInfo.lastUpdated
        }
      };

      // Fetch reviews if requested
      if (includeReviews) {
        try {
          const reviewData = await this.fetchCompetitorReviews(appId, countries, reviewLimit);
          analysis.reviews = reviewData;
          
          // Calculate review sentiment distribution
          if (reviewData.reviews && reviewData.reviews.length > 0) {
            const ratingDistribution = this.calculateRatingDistribution(reviewData.reviews);
            analysis.metrics.ratingDistribution = ratingDistribution;
          }
        } catch (error) {
          console.error(`[CompetitorService] Failed to fetch reviews:`, error.message);
          analysis.reviews = { error: error.message };
        }
      }

      // Fetch Reddit mentions if requested
      if (includeReddit) {
        try {
          const redditData = await this.fetchCompetitorRedditMentions(appInfo.name, {
            timeFilter: redditTimeFilter
          });
          analysis.reddit = redditData;
          analysis.metrics.redditMentions = redditData.totalMentions;
          analysis.metrics.redditSentiment = redditData.sentiment.score;
        } catch (error) {
          console.error(`[CompetitorService] Failed to fetch Reddit data:`, error.message);
          analysis.reddit = { error: error.message };
        }
      }

      return analysis;
    } catch (error) {
      console.error(`[CompetitorService] Error in competitor analysis:`, error.message);
      throw error;
    }
  }

  /**
   * Calculate rating distribution from reviews
   * @param {array} reviews - Array of reviews
   */
  calculateRatingDistribution(reviews) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    reviews.forEach(review => {
      const rating = review.Rating || review.rating;
      if (rating >= 1 && rating <= 5) {
        distribution[rating]++;
      }
    });

    const total = reviews.length;
    
    return {
      counts: distribution,
      percentages: {
        1: (distribution[1] / total) * 100,
        2: (distribution[2] / total) * 100,
        3: (distribution[3] / total) * 100,
        4: (distribution[4] / total) * 100,
        5: (distribution[5] / total) * 100
      }
    };
  }

  /**
   * Compare multiple competitors
   * @param {string[]} appIds - Array of app IDs to compare
   * @param {object} options - Comparison options
   */
  async compareCompetitors(appIds, options = {}) {
    console.log(`[CompetitorService] Comparing ${appIds.length} competitors`);
    
    const comparisons = {};
    const errors = {};

    // Fetch data for all competitors in parallel
    const promises = appIds.map(async (appId) => {
      try {
        const analysis = await this.getCompetitorAnalysis(appId, options);
        comparisons[appId] = analysis;
      } catch (error) {
        console.error(`[CompetitorService] Failed to analyze ${appId}:`, error.message);
        errors[appId] = error.message;
      }
    });

    await Promise.all(promises);

    // Calculate comparative metrics
    const rankings = this.calculateRankings(comparisons);

    return {
      comparisons,
      rankings,
      errors,
      summary: this.generateComparisonSummary(comparisons, rankings)
    };
  }

  /**
   * Calculate rankings across different metrics
   * @param {object} comparisons - Competitor comparison data
   */
  calculateRankings(comparisons) {
    const metrics = ['appRating', 'reviewCount', 'redditMentions', 'redditSentiment'];
    const rankings = {};

    metrics.forEach(metric => {
      const sorted = Object.entries(comparisons)
        .filter(([_, data]) => data.metrics && data.metrics[metric] !== undefined)
        .sort(([_, a], [__, b]) => (b.metrics[metric] || 0) - (a.metrics[metric] || 0))
        .map(([appId, data], index) => ({
          appId,
          appName: data.appInfo.name,
          value: data.metrics[metric] || 0,
          rank: index + 1
        }));

      rankings[metric] = sorted;
    });

    return rankings;
  }

  /**
   * Generate comparison summary
   * @param {object} comparisons - Competitor comparison data
   * @param {object} rankings - Calculated rankings
   */
  generateComparisonSummary(comparisons, rankings) {
    const appCount = Object.keys(comparisons).length;
    
    if (appCount === 0) {
      return { message: 'No competitor data available' };
    }

    const summary = {
      totalApps: appCount,
      averageRating: 0,
      totalReviews: 0,
      totalRedditMentions: 0,
      leaders: {}
    };

    // Calculate averages
    Object.values(comparisons).forEach(data => {
      if (data.metrics) {
        summary.averageRating += data.metrics.appRating || 0;
        summary.totalReviews += data.metrics.reviewCount || 0;
        summary.totalRedditMentions += data.metrics.redditMentions || 0;
      }
    });

    summary.averageRating = summary.averageRating / appCount;

    // Identify leaders in each category
    Object.entries(rankings).forEach(([metric, ranking]) => {
      if (ranking.length > 0) {
        summary.leaders[metric] = ranking[0];
      }
    });

    return summary;
  }

  /**
   * Get trending topics across competitors
   * @param {string[]} appNames - Array of app names
   * @param {object} options - Search options
   */
  async getTrendingTopics(appNames, options = {}) {
    const allPosts = [];
    
    // Fetch Reddit posts for all apps
    for (const appName of appNames) {
      try {
        const redditData = await this.fetchCompetitorRedditMentions(appName, options);
        allPosts.push(...redditData.posts);
      } catch (error) {
        console.error(`[CompetitorService] Failed to fetch Reddit data for ${appName}:`, error.message);
      }
    }

    // Extract and count topics/keywords
    const topicCounts = {};
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once']);

    allPosts.forEach(post => {
      const text = `${post.title} ${post.selftext}`.toLowerCase();
      const words = text.match(/\b\w{4,}\b/g) || []; // Words with 4+ characters
      
      words.forEach(word => {
        if (!commonWords.has(word) && !appNames.some(name => name.toLowerCase().includes(word))) {
          topicCounts[word] = (topicCounts[word] || 0) + 1;
        }
      });
    });

    // Sort by frequency and get top topics
    const trendingTopics = Object.entries(topicCounts)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 20)
      .map(([topic, count]) => ({ topic, count, percentage: (count / allPosts.length) * 100 }));

    return {
      topics: trendingTopics,
      totalPosts: allPosts.length,
      timeFilter: options.timeFilter || 'month'
    };
  }

  /**
   * Clear competitor cache
   * @param {string} appId - Optional app ID to clear specific cache
   */
  async clearCache(appId = null) {
    if (appId) {
      // Clear cache for specific app
      const patterns = [
        `${this.cacheKeyPrefix}info_${appId}_*`,
        `${this.cacheKeyPrefix}reviews_${appId}_*`,
        `${this.cacheKeyPrefix}reddit_*${appId}*`
      ];
      
      for (const pattern of patterns) {
        await cacheService.deletePattern(pattern);
      }
      
      console.log(`[CompetitorService] Cleared cache for app ${appId}`);
    } else {
      // Clear all competitor cache
      await cacheService.deletePattern(`${this.cacheKeyPrefix}*`);
      console.log(`[CompetitorService] Cleared all competitor cache`);
    }
  }
}

module.exports = new CompetitorService();