import axios from 'axios';

// Get backend URL from environment or default
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

class RedditService {
  constructor() {
    this.baseUrl = `${BACKEND_URL}/api/reddit`;
  }

  // Search for posts mentioning the app
  async searchPosts(appName, options = {}) {
    try {
      const response = await axios.post(`${this.baseUrl}/search`, {
        appName,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('Error searching Reddit posts:', error);
      throw error;
    }
  }

  // Get subreddit info
  async getSubredditInfo(subredditName) {
    try {
      const response = await axios.get(`${this.baseUrl}/subreddit/${subredditName}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching subreddit info:', error);
      throw error;
    }
  }

  // Get post comments
  async getPostComments(postId, limit = 100) {
    try {
      const response = await axios.get(`${this.baseUrl}/post/${postId}/comments`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching post comments:', error);
      throw error;
    }
  }

  // Analyze mention trends
  async analyzeMentionTrends(appName, options = {}) {
    try {
      const response = await axios.post(`${this.baseUrl}/trends`, {
        appName,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('Error analyzing mention trends:', error);
      throw error;
    }
  }

  // Detect influence spikes
  async detectInfluenceSpikes(appName, options = {}) {
    try {
      const response = await axios.post(`${this.baseUrl}/spikes`, {
        appName,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('Error detecting influence spikes:', error);
      throw error;
    }
  }

  // Find relevant subreddits
  async findRelevantSubreddits(appName, category = 'technology') {
    try {
      const response = await axios.post(`${this.baseUrl}/relevant-subreddits`, {
        appName,
        category
      });
      return response.data;
    } catch (error) {
      console.error('Error finding relevant subreddits:', error);
      throw error;
    }
  }

  // Helper function to format engagement score
  formatEngagementScore(score) {
    if (score > 10000) return `${(score / 1000).toFixed(1)}k`;
    if (score > 1000) return `${(score / 1000).toFixed(1)}k`;
    return score.toString();
  }

  // Helper function to get engagement level
  getEngagementLevel(score) {
    if (score > 10000) return { level: 'viral', color: '#ff4500' };
    if (score > 1000) return { level: 'high', color: '#ff8c00' };
    if (score > 100) return { level: 'medium', color: '#ffd700' };
    return { level: 'low', color: '#87ceeb' };
  }

  // Helper function to format time ago
  formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };
    
    for (const [unit, seconds_in_unit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / seconds_in_unit);
      if (interval >= 1) {
        return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
      }
    }
    
    return 'just now';
  }

  // Helper function to generate chart data from trends
  generateTrendChartData(trends) {
    const chartData = [];
    const timeframes = ['day', 'week', 'month'];
    
    timeframes.forEach(timeframe => {
      if (trends[timeframe] && !trends[timeframe].error) {
        chartData.push({
          timeframe: timeframe.charAt(0).toUpperCase() + timeframe.slice(1),
          mentions: trends[timeframe].totalMentions,
          engagement: trends[timeframe].averageEngagement
        });
      }
    });
    
    return chartData;
  }

  // Helper function to generate spike chart data
  generateSpikeChartData(spikes) {
    if (!spikes || spikes.length === 0) return [];
    
    // Take last 7 spikes for chart
    return spikes.slice(0, 7).map(spike => ({
      date: new Date(spike.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      engagement: spike.totalEngagement,
      posts: spike.posts,
      multiplier: parseFloat(spike.spikeMultiplier)
    }));
  }

  // Monitor for real-time updates (returns a cleanup function)
  startMonitoring(appName, callback, intervalMinutes = 60) {
    // Initial check
    this.checkForUpdates(appName, callback);
    
    // Set up periodic checks
    const intervalId = setInterval(() => {
      this.checkForUpdates(appName, callback);
    }, intervalMinutes * 60 * 1000);
    
    // Return cleanup function
    return () => clearInterval(intervalId);
  }

  // Check for updates
  async checkForUpdates(appName, callback) {
    try {
      const [searchResults, spikeData] = await Promise.all([
        this.searchPosts(appName, { limit: 10, sort: 'new' }),
        this.detectInfluenceSpikes(appName, { lookbackDays: 1, spikeThreshold: 1.5 })
      ]);
      
      callback({
        type: 'update',
        data: {
          recentPosts: searchResults.posts,
          spikes: spikeData.spikes,
          timestamp: new Date()
        }
      });
      
      // Alert if spike detected
      if (spikeData.spikes.length > 0) {
        callback({
          type: 'spike_alert',
          data: {
            spike: spikeData.spikes[0],
            recommendation: spikeData.recommendation
          }
        });
      }
    } catch (error) {
      callback({
        type: 'error',
        error: error.message
      });
    }
  }
}

// Create and export singleton instance
const redditService = new RedditService();
export default redditService;