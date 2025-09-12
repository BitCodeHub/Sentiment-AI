const axios = require('axios');

class RedditService {
  constructor() {
    this.clientId = process.env.REDDIT_CLIENT_ID;
    this.clientSecret = process.env.REDDIT_CLIENT_SECRET;
    this.userAgent = process.env.REDDIT_USER_AGENT || 'ReviewDashboard/1.0.0';
    this.baseUrl = 'https://oauth.reddit.com';
    this.tokenUrl = 'https://www.reddit.com/api/v1/access_token';
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // Log initialization status
    console.log('[RedditService] Initializing with:', {
      hasClientId: !!this.clientId,
      clientIdLength: this.clientId?.length || 0,
      hasClientSecret: !!this.clientSecret,
      clientSecretLength: this.clientSecret?.length || 0,
      userAgent: this.userAgent,
      environment: process.env.NODE_ENV || 'development'
    });
    
    // Validate credentials
    if (!this.clientId || !this.clientSecret) {
      console.error('[RedditService] WARNING: Reddit credentials not found in environment variables!');
      console.error('[RedditService] Please set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET');
    }
  }

  // Get OAuth access token
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      console.log('[RedditService] Using cached access token');
      return this.accessToken;
    }

    // Check credentials before attempting authentication
    if (!this.clientId || !this.clientSecret) {
      const error = new Error('Reddit API credentials not configured');
      console.error('[RedditService] getAccessToken error:', error.message);
      throw error;
    }

    console.log('[RedditService] Requesting new access token...');
    const startTime = Date.now();
    
    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const response = await axios.post(
        this.tokenUrl,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': this.userAgent
          }
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry 5 minutes before actual expiry for safety
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000);
      
      const responseTime = Date.now() - startTime;
      console.log('[RedditService] Access token obtained successfully in', responseTime, 'ms');
      console.log('[RedditService] Token expires at:', this.tokenExpiry.toISOString());
      
      return this.accessToken;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error('[RedditService] Failed to get access token after', responseTime, 'ms');
      console.error('[RedditService] Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        code: error.code
      });
      
      // Provide more specific error messages
      if (error.response?.status === 401) {
        throw new Error('Invalid Reddit API credentials. Please check REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.');
      } else if (error.response?.status === 403) {
        throw new Error('Reddit API access forbidden. Please check your app configuration.');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to Reddit API. Please check your network connection.');
      }
      
      throw new Error(`Failed to authenticate with Reddit: ${error.message}`);
    }
  }

  // Make authenticated request to Reddit API
  async makeRequest(endpoint, params = {}) {
    console.log('[RedditService] Making request to:', endpoint, 'with params:', params);
    const startTime = Date.now();
    
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': this.userAgent
        },
        params
      });
      
      const responseTime = Date.now() - startTime;
      console.log('[RedditService] Request successful in', responseTime, 'ms');
      console.log('[RedditService] Response data keys:', Object.keys(response.data));
      
      return response.data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error('[RedditService] Request failed after', responseTime, 'ms');
      console.error('[RedditService] Reddit API Error:', {
        endpoint,
        status: error.response?.status,
        message: error.response?.data || error.message,
        headers: error.response?.headers
      });
      
      // Handle rate limiting
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['x-ratelimit-reset'] || 60;
        throw new Error(`Rate limited. Retry after ${retryAfter} seconds`);
      }
      
      throw error;
    }
  }

  // Search for posts mentioning the app
  async searchPosts(appName, options = {}) {
    console.log('[Backend RedditService] searchPosts called with:', {
      appName,
      options,
      optionKeys: Object.keys(options)
    });
    
    const {
      subreddit = 'all',
      timeFilter = 'month',
      limit = 100,
      sort = 'relevance'
    } = options;
    
    console.log('[Backend RedditService] Extracted parameters:', {
      subreddit,
      timeFilter,
      limit,
      sort
    });
    
    // Reddit API has a hard limit of 100 per request, but we can make multiple requests
    const maxLimit = Math.min(limit, 1000); // Cap at 1000 to prevent abuse
    const requestLimit = Math.min(maxLimit, 100); // Reddit's per-request limit

    try {
      console.log('[RedditService] searchPosts called with:', { appName, options });
      
      // Create multiple search variations for complex app names
      const searchVariations = [];
      
      // Add exact match with quotes
      searchVariations.push(`"${appName}"`);
      
      // Add version without spaces
      const noSpaces = appName.replace(/\s+/g, '');
      if (noSpaces !== appName) {
        searchVariations.push(noSpaces);
      }
      
      // For apps with "with" in the name, try both full name and shortened version
      if (appName.toLowerCase().includes(' with ')) {
        const shortened = appName.split(' with ')[0].trim();
        searchVariations.push(`"${shortened}"`);
        searchVariations.push(shortened);
      }
      
      // For MyHyundai specifically, also search for "Hyundai Bluelink" and "Bluelink"
      if (appName.toLowerCase().includes('hyundai')) {
        searchVariations.push('"Hyundai Bluelink"');
        searchVariations.push('Bluelink');
        searchVariations.push('"Hyundai app"');
      }
      
      const searchQuery = searchVariations.join(' OR ');
      console.log('[RedditService] Final search query:', searchQuery);
      
      const endpoint = subreddit === 'all' ? '/search' : `/r/${subreddit}/search`;
      
      // If we need more than 100 posts, we'll need to make multiple requests
      let allPosts = [];
      let after = null;
      let remainingLimit = maxLimit;
      
      while (remainingLimit > 0 && allPosts.length < maxLimit) {
        const currentLimit = Math.min(remainingLimit, requestLimit);
        
        const params = {
          q: searchQuery,
          type: 'link',
          sort,
          t: timeFilter,
          limit: currentLimit,
          restrict_sr: subreddit !== 'all'
        };
        
        console.log('[Backend RedditService] Reddit API params:', params);
        
        if (after) {
          params.after = after;
        }
        
        const data = await this.makeRequest(endpoint, params);
        const posts = this.processSearchResults(data, appName, timeFilter);
        
        if (posts.length === 0) {
          break; // No more posts
        }
        
        allPosts = allPosts.concat(posts);
        remainingLimit -= posts.length;
        
        // Get the 'after' token for pagination
        if (data.data && data.data.after) {
          after = data.data.after;
        } else {
          break; // No more pages
        }
        
        // For limits <= 100, don't paginate
        if (maxLimit <= 100) {
          break;
        }
      }
      
      return allPosts.slice(0, maxLimit);
    } catch (error) {
      console.error('Error searching Reddit posts:', error);
      throw error;
    }
  }

  // Process search results to extract relevant data
  processSearchResults(data, appName, timeFilter) {
    if (!data.data || !data.data.children) {
      return [];
    }

    // Get time cutoff based on filter
    const now = new Date();
    let cutoffDate = null;
    
    switch(timeFilter) {
      case 'day':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        cutoffDate = null;
        break;
    }

    console.log('[RedditService] Filtering posts with cutoff:', {
      timeFilter,
      cutoffDate: cutoffDate ? cutoffDate.toISOString() : 'none',
      totalPosts: data.data.children.length
    });

    const posts = data.data.children
      .map(child => {
        const post = child.data;
        return {
          id: post.id,
          title: post.title,
          subreddit: post.subreddit,
          author: post.author,
          created: new Date(post.created_utc * 1000),
          score: post.score,
          upvoteRatio: post.upvote_ratio,
          numComments: post.num_comments,
          permalink: `https://reddit.com${post.permalink}`,
          selftext: post.selftext,
          url: post.url,
          isVideo: post.is_video,
          thumbnail: post.thumbnail !== 'self' && post.thumbnail !== 'default' ? post.thumbnail : null,
          awards: post.total_awards_received || 0,
          engagementScore: this.calculateEngagementScore(post)
        };
      })
      .filter(post => {
        // Apply time filter if cutoffDate is set
        if (cutoffDate) {
          return post.created >= cutoffDate;
        }
        return true;
      });

    console.log('[RedditService] Posts after filtering:', {
      filtered: posts.length,
      original: data.data.children.length
    });

    return posts;
  }

  // Calculate engagement score for a post
  calculateEngagementScore(post) {
    // Weighted scoring: upvotes + (comments * 3) + (awards * 10)
    const baseScore = post.score + (post.num_comments * 3) + ((post.total_awards_received || 0) * 10);
    
    // Apply upvote ratio as a quality multiplier
    const qualityMultiplier = post.upvote_ratio || 1;
    
    return Math.round(baseScore * qualityMultiplier);
  }

  // Analyze mention trends over time
  async analyzeMentionTrends(appName, options = {}) {
    const {
      timeframes = ['day', 'week', 'month', 'year'],
      subreddit = 'all'
    } = options;

    const trends = {};
    
    for (const timeframe of timeframes) {
      try {
        const results = await this.searchPosts(appName, {
          subreddit,
          timeFilter: timeframe,
          limit: 100,
          sort: 'new'
        });
        
        trends[timeframe] = {
          totalMentions: results.length,
          totalEngagement: results.reduce((sum, post) => sum + post.engagementScore, 0),
          averageEngagement: results.length > 0 ? 
            Math.round(results.reduce((sum, post) => sum + post.engagementScore, 0) / results.length) : 0,
          topPost: results.sort((a, b) => b.engagementScore - a.engagementScore)[0] || null,
          posts: results
        };
      } catch (error) {
        console.error(`Error fetching ${timeframe} trends:`, error);
        trends[timeframe] = { error: error.message };
      }
    }
    
    return trends;
  }

  // Detect influence spikes
  async detectInfluenceSpikes(appName, options = {}) {
    const {
      lookbackDays = 30,
      spikeThreshold = 2.0, // Spike if engagement is 2x average
      subreddit = 'all'
    } = options;

    try {
      // Get posts from the lookback period
      const results = await this.searchPosts(appName, {
        subreddit,
        timeFilter: 'month',
        limit: 100,
        sort: 'new'
      });

      if (results.length === 0) {
        return { spikes: [], message: 'No mentions found in the specified period' };
      }

      // Group posts by day
      const postsByDay = {};
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - (lookbackDays * 24 * 60 * 60 * 1000));

      results
        .filter(post => post.created >= cutoffDate)
        .forEach(post => {
          const dayKey = post.created.toISOString().split('T')[0];
          if (!postsByDay[dayKey]) {
            postsByDay[dayKey] = [];
          }
          postsByDay[dayKey].push(post);
        });

      // Calculate daily engagement scores
      const dailyEngagement = Object.entries(postsByDay).map(([date, posts]) => ({
        date,
        posts: posts.length,
        totalEngagement: posts.reduce((sum, post) => sum + post.engagementScore, 0),
        averageEngagement: posts.length > 0 ? 
          Math.round(posts.reduce((sum, post) => sum + post.engagementScore, 0) / posts.length) : 0,
        topPost: posts.sort((a, b) => b.engagementScore - a.engagementScore)[0]
      }));

      // Calculate baseline metrics
      const engagementValues = dailyEngagement.map(d => d.totalEngagement);
      const avgEngagement = engagementValues.reduce((sum, val) => sum + val, 0) / engagementValues.length;
      const medianEngagement = this.calculateMedian(engagementValues);

      // Detect spikes
      const spikes = dailyEngagement
        .filter(day => day.totalEngagement > avgEngagement * spikeThreshold)
        .map(day => ({
          ...day,
          spikeMultiplier: (day.totalEngagement / avgEngagement).toFixed(2),
          isViral: day.topPost && day.topPost.engagementScore > 1000
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      return {
        spikes,
        metrics: {
          averageDailyEngagement: Math.round(avgEngagement),
          medianDailyEngagement: Math.round(medianEngagement),
          totalMentions: results.length,
          daysAnalyzed: Object.keys(postsByDay).length,
          spikeThreshold: `${spikeThreshold}x average`
        },
        recommendation: this.generateRecommendation(spikes, avgEngagement)
      };
    } catch (error) {
      console.error('Error detecting influence spikes:', error);
      throw error;
    }
  }

  // Calculate median value
  calculateMedian(values) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0 ?
      (sorted[mid - 1] + sorted[mid]) / 2 :
      sorted[mid];
  }

  // Generate recommendation based on spike analysis
  generateRecommendation(spikes, avgEngagement) {
    if (spikes.length === 0) {
      return {
        status: 'stable',
        message: 'No significant spikes detected. Consider increasing community engagement.',
        actions: [
          'Create engaging content about your app',
          'Participate in relevant subreddit discussions',
          'Consider an AMA (Ask Me Anything) session'
        ]
      };
    }

    const recentSpikes = spikes.filter(s => 
      new Date(s.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    if (recentSpikes.length > 0) {
      return {
        status: 'trending',
        message: `${recentSpikes.length} recent spike(s) detected! Capitalize on this momentum.`,
        actions: [
          'Engage with users in trending discussions',
          'Address any concerns raised in popular posts',
          'Share updates or announcements while visibility is high',
          'Monitor sentiment in comments'
        ]
      };
    }

    return {
      status: 'historical',
      message: 'Past spikes detected. Work to recreate this engagement.',
      actions: [
        'Analyze what caused previous spikes',
        'Plan similar content or announcements',
        'Engage with communities that showed interest'
      ]
    };
  }

  // Get post comments
  async getPostComments(postId, options = {}) {
    const { limit = 100, sort = 'best' } = options;
    
    try {
      const data = await this.makeRequest(`/comments/${postId}`, {
        limit,
        sort
      });

      // Reddit returns an array with post and comments
      if (!Array.isArray(data) || data.length < 2) {
        return [];
      }

      const comments = data[1].data.children
        .filter(child => child.kind === 't1')
        .map(child => ({
          id: child.data.id,
          author: child.data.author,
          body: child.data.body,
          score: child.data.score,
          created: new Date(child.data.created_utc * 1000),
          replies: child.data.replies ? child.data.replies.data.children.length : 0
        }));

      return comments;
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  }

  // Get service status (for health checks)
  getStatus() {
    return {
      configured: !!(this.clientId && this.clientSecret),
      hasClientId: !!this.clientId,
      hasClientSecret: !!this.clientSecret,
      userAgent: this.userAgent,
      hasAccessToken: !!this.accessToken,
      tokenExpiry: this.tokenExpiry?.toISOString() || null,
      tokenValid: this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry
    };
  }

  // Get subreddit info
  async getSubredditInfo(subredditName) {
    console.log('[RedditService] Getting info for subreddit:', subredditName);
    try {
      const data = await this.makeRequest(`/r/${subredditName}/about`);
      return {
        name: data.data.display_name,
        subscribers: data.data.subscribers,
        description: data.data.public_description,
        created: new Date(data.data.created_utc * 1000),
        url: `https://reddit.com/r/${data.data.display_name}`
      };
    } catch (error) {
      console.error('[RedditService] Error fetching subreddit info:', error.message);
      throw error;
    }
  }

  // Find relevant subreddits for the app
  async findRelevantSubreddits(appName, category = 'technology') {
    try {
      console.log('[RedditService] findRelevantSubreddits called with:', { appName, category });
      
      // Create search terms based on app name
      let searchTerms = [category];
      
      // Extract key terms from app name
      const words = appName.split(' ').filter(word => 
        word.length > 2 && !['with', 'for', 'and', 'the'].includes(word.toLowerCase())
      );
      searchTerms = searchTerms.concat(words);
      
      // For car apps, add automotive-related terms
      if (appName.toLowerCase().includes('hyundai') || 
          appName.toLowerCase().includes('toyota') || 
          appName.toLowerCase().includes('ford')) {
        searchTerms.push('cars', 'automotive', 'vehicles');
      }
      
      // For Hyundai specifically, add relevant subreddits
      if (appName.toLowerCase().includes('hyundai')) {
        // We'll manually add these after the search
      }
      
      const searchQuery = searchTerms.join(' ');
      console.log('[RedditService] Subreddit search query:', searchQuery);
      
      const data = await this.makeRequest('/subreddits/search', {
        q: searchQuery,
        limit: 10
      });

      const subreddits = data.data.children.map(child => ({
        name: child.data.display_name,
        subscribers: child.data.subscribers,
        description: child.data.public_description,
        url: `https://reddit.com/r/${child.data.display_name}`,
        active: child.data.accounts_active || 0
      }));

      // For Hyundai apps, manually add relevant car subreddits
      if (appName.toLowerCase().includes('hyundai')) {
        const carSubreddits = [
          { name: 'Hyundai', subscribers: 50000, description: 'Hyundai vehicles discussion', url: 'https://reddit.com/r/Hyundai' },
          { name: 'cars', subscribers: 3000000, description: 'General car discussion', url: 'https://reddit.com/r/cars' },
          { name: 'CarTalk', subscribers: 500000, description: 'Car advice and discussion', url: 'https://reddit.com/r/CarTalk' }
        ];
        
        // Merge with search results, avoiding duplicates
        carSubreddits.forEach(carSub => {
          if (!subreddits.find(sub => sub.name.toLowerCase() === carSub.name.toLowerCase())) {
            subreddits.push(carSub);
          }
        });
      }
      
      // Sort by subscriber count
      return subreddits.sort((a, b) => b.subscribers - a.subscribers);
    } catch (error) {
      console.error('Error finding relevant subreddits:', error);
      throw error;
    }
  }

  // Monitor for real-time spikes (to be called periodically)
  async monitorForSpikes(appName, callback, options = {}) {
    const {
      checkInterval = 3600000, // 1 hour default
      subreddit = 'all'
    } = options;

    const check = async () => {
      try {
        const spikes = await this.detectInfluenceSpikes(appName, { 
          lookbackDays: 1,
          spikeThreshold: 1.5,
          subreddit 
        });
        
        if (spikes.spikes.length > 0) {
          callback({
            type: 'spike_detected',
            data: spikes,
            timestamp: new Date()
          });
        }
      } catch (error) {
        callback({
          type: 'error',
          error: error.message,
          timestamp: new Date()
        });
      }
    };

    // Initial check
    await check();
    
    // Set up periodic checking
    const intervalId = setInterval(check, checkInterval);
    
    // Return function to stop monitoring
    return () => clearInterval(intervalId);
  }
}

module.exports = new RedditService();