import React, { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardHeader, CardTitle 
} from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import {
  TrendingUp, MessageSquare, Award, ExternalLink, Users,
  AlertTriangle, RefreshCw, ChevronUp, ChevronDown,
  Calendar, Filter, X, Zap, Activity
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import redditService from '../services/redditService';
import './RedditInfluence.css';

const RedditInfluence = ({ appName, category = 'technology' }) => {
  // Debug logging
  console.log('[RedditInfluence] Component initialized with:', {
    appName,
    category,
    appNameLength: appName?.length
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Data states
  const [recentPosts, setRecentPosts] = useState([]);
  const [trends, setTrends] = useState(null);
  const [spikes, setSpikes] = useState(null);
  const [relevantSubreddits, setRelevantSubreddits] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [postComments, setPostComments] = useState([]);
  
  // Filters
  const [timeFilter, setTimeFilter] = useState('week');
  const [sortBy, setSortBy] = useState('relevance');
  
  // Load initial data
  useEffect(() => {
    console.log('[RedditInfluence] useEffect triggered with appName:', appName);
    if (appName) {
      loadAllData();
    } else {
      console.warn('[RedditInfluence] No appName provided, skipping data load');
    }
  }, [appName]);

  const loadAllData = async () => {
    console.log('[RedditInfluence] Starting loadAllData with appName:', appName);
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[RedditInfluence] Making Reddit API calls for:', appName);
      const [searchData, trendsData, spikesData, subredditsData] = await Promise.all([
        redditService.searchPosts(appName, { 
          timeFilter, 
          sort: sortBy,
          limit: 50 
        }),
        redditService.analyzeMentionTrends(appName),
        redditService.detectInfluenceSpikes(appName),
        redditService.findRelevantSubreddits(appName, category)
      ]);
      
      console.log('[RedditInfluence] API responses:', {
        searchPosts: searchData?.posts?.length || 0,
        trends: trendsData?.trends ? Object.keys(trendsData.trends) : [],
        spikes: spikesData?.spikes?.length || 0,
        subreddits: subredditsData?.subreddits?.length || 0
      });
      
      setRecentPosts(searchData.posts || []);
      setTrends(trendsData.trends || {});
      setSpikes(spikesData || {});
      setRelevantSubreddits(subredditsData.subreddits || []);
    } catch (err) {
      console.error('Error loading Reddit data:', err);
      setError(err.message || 'Failed to load Reddit data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPostComments = async (postId) => {
    try {
      const data = await redditService.getPostComments(postId);
      setPostComments(data.comments || []);
    } catch (err) {
      console.error('Error loading comments:', err);
    }
  };

  const renderOverviewTab = () => {
    const trendChartData = trends ? redditService.generateTrendChartData(trends) : [];
    const spikeChartData = spikes?.spikes ? redditService.generateSpikeChartData(spikes.spikes) : [];
    
    return (
      <div className="reddit-overview">
        {/* Key Metrics */}
        <div className="metrics-grid">
          <div className="metric-card">
            <Activity className="metric-icon" />
            <div className="metric-content">
              <div className="metric-value">
                {trends?.week?.totalMentions || 0}
              </div>
              <div className="metric-label">Weekly Mentions</div>
            </div>
          </div>
          
          <div className="metric-card">
            <TrendingUp className="metric-icon" />
            <div className="metric-content">
              <div className="metric-value">
                {spikes?.spikes?.length || 0}
              </div>
              <div className="metric-label">Recent Spikes</div>
            </div>
          </div>
          
          <div className="metric-card">
            <Award className="metric-icon" />
            <div className="metric-content">
              <div className="metric-value">
                {trends?.week?.averageEngagement ? 
                  redditService.formatEngagementScore(trends.week.averageEngagement) : '0'}
              </div>
              <div className="metric-label">Avg Engagement</div>
            </div>
          </div>
          
          <div className="metric-card">
            <Users className="metric-icon" />
            <div className="metric-content">
              <div className="metric-value">
                {relevantSubreddits.length}
              </div>
              <div className="metric-label">Relevant Subreddits</div>
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        {trendChartData.length > 0 && (
          <Card className="chart-card">
            <CardHeader>
              <CardTitle>Mention Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timeframe" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="mentions" 
                    stroke="#FF4500" 
                    strokeWidth={2}
                    name="Mentions"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="engagement" 
                    stroke="#FFA500" 
                    strokeWidth={2}
                    name="Avg Engagement"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Spike Alert */}
        {spikes?.recommendation && (
          <Alert className={`spike-alert ${spikes.recommendation.status}`}>
            <Zap className="alert-icon" />
            <AlertDescription>
              <div className="alert-title">{spikes.recommendation.message}</div>
              <ul className="action-list">
                {spikes.recommendation.actions.map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Top Post */}
        {trends?.week?.topPost && (
          <Card className="top-post-card">
            <CardHeader>
              <CardTitle>Top Post This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="post-item featured">
                <div className="post-header">
                  <span className="subreddit">r/{trends.week.topPost.subreddit}</span>
                  <span className="post-time">
                    {redditService.formatTimeAgo(trends.week.topPost.created)}
                  </span>
                </div>
                <h4 className="post-title">{trends.week.topPost.title}</h4>
                <div className="post-metrics">
                  <span className="metric">
                    <ChevronUp size={16} /> {trends.week.topPost.score}
                  </span>
                  <span className="metric">
                    <MessageSquare size={16} /> {trends.week.topPost.numComments}
                  </span>
                  <span className="metric engagement-score">
                    <Award size={16} /> 
                    {redditService.formatEngagementScore(trends.week.topPost.engagementScore)}
                  </span>
                </div>
                <a 
                  href={trends.week.topPost.permalink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="view-link"
                >
                  View on Reddit <ExternalLink size={14} />
                </a>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderPostsTab = () => {
    return (
      <div className="reddit-posts">
        <div className="posts-controls">
          <select 
            value={timeFilter} 
            onChange={(e) => setTimeFilter(e.target.value)}
            className="filter-select"
          >
            <option value="day">Past Day</option>
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
            <option value="year">Past Year</option>
            <option value="all">All Time</option>
          </select>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="relevance">Most Relevant</option>
            <option value="hot">Hot</option>
            <option value="new">Newest</option>
            <option value="top">Top Rated</option>
          </select>
          
          <Button onClick={loadAllData} size="sm" variant="outline">
            <RefreshCw size={16} />
            Refresh
          </Button>
        </div>

        <div className="posts-list">
          {recentPosts.map(post => {
            const engagementLevel = redditService.getEngagementLevel(post.engagementScore);
            
            return (
              <div key={post.id} className="post-item">
                <div className="post-header">
                  <span className="subreddit">r/{post.subreddit}</span>
                  <span className={`engagement-badge ${engagementLevel.level}`}>
                    {engagementLevel.level}
                  </span>
                  <span className="post-time">
                    {redditService.formatTimeAgo(post.created)}
                  </span>
                </div>
                
                <h4 className="post-title">{post.title}</h4>
                
                {post.selftext && (
                  <p className="post-preview">
                    {post.selftext.substring(0, 200)}
                    {post.selftext.length > 200 && '...'}
                  </p>
                )}
                
                <div className="post-footer">
                  <div className="post-metrics">
                    <span className="metric">
                      <ChevronUp size={16} /> {post.score}
                    </span>
                    <span className="metric">
                      <MessageSquare size={16} /> {post.numComments}
                    </span>
                    {post.awards > 0 && (
                      <span className="metric awards">
                        <Award size={16} /> {post.awards}
                      </span>
                    )}
                  </div>
                  
                  <div className="post-actions">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedPost(post);
                        loadPostComments(post.id);
                      }}
                    >
                      View Comments
                    </Button>
                    <a 
                      href={post.permalink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="external-link"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSubredditsTab = () => {
    return (
      <div className="reddit-subreddits">
        <div className="subreddits-grid">
          {relevantSubreddits.map(subreddit => (
            <Card key={subreddit.name} className="subreddit-card">
              <CardContent>
                <h4 className="subreddit-name">r/{subreddit.name}</h4>
                <p className="subreddit-description">{subreddit.description}</p>
                <div className="subreddit-stats">
                  <span className="stat">
                    <Users size={16} />
                    {(subreddit.subscribers / 1000).toFixed(1)}k subscribers
                  </span>
                  {subreddit.active > 0 && (
                    <span className="stat active">
                      <Activity size={16} />
                      {subreddit.active} active
                    </span>
                  )}
                </div>
                <a 
                  href={subreddit.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="subreddit-link"
                >
                  Visit Subreddit <ExternalLink size={14} />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderSpikesTab = () => {
    if (!spikes || !spikes.spikes) return null;
    
    const chartData = redditService.generateSpikeChartData(spikes.spikes);
    
    return (
      <div className="reddit-spikes">
        {/* Spike Metrics */}
        <div className="spike-metrics">
          <Card>
            <CardContent>
              <div className="metric-label">Average Daily Engagement</div>
              <div className="metric-value">
                {spikes.metrics?.averageDailyEngagement || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="metric-label">Spike Threshold</div>
              <div className="metric-value">{spikes.metrics?.spikeThreshold}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="metric-label">Days Analyzed</div>
              <div className="metric-value">{spikes.metrics?.daysAnalyzed || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Spike Chart */}
        {chartData.length > 0 && (
          <Card className="spike-chart-card">
            <CardHeader>
              <CardTitle>Influence Spikes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="engagement" fill="#FF4500" name="Total Engagement" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Spike Details */}
        <div className="spike-list">
          {spikes.spikes.map((spike, idx) => (
            <Card key={idx} className={`spike-item ${spike.isViral ? 'viral' : ''}`}>
              <CardContent>
                <div className="spike-header">
                  <span className="spike-date">
                    <Calendar size={16} />
                    {new Date(spike.date).toLocaleDateString()}
                  </span>
                  <span className="spike-multiplier">
                    {spike.spikeMultiplier}x normal
                  </span>
                  {spike.isViral && <span className="viral-badge">VIRAL</span>}
                </div>
                
                <div className="spike-stats">
                  <span>{spike.posts} posts</span>
                  <span>{spike.totalEngagement} total engagement</span>
                </div>
                
                {spike.topPost && (
                  <div className="spike-top-post">
                    <h5>Top Post:</h5>
                    <p>{spike.topPost.title}</p>
                    <a 
                      href={spike.topPost.permalink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      View Post <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // Comments Modal
  const renderCommentsModal = () => {
    if (!selectedPost) return null;
    
    return (
      <div className="comments-modal-overlay" onClick={() => setSelectedPost(null)}>
        <div className="comments-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{selectedPost.title}</h3>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setSelectedPost(null)}
            >
              <X size={20} />
            </Button>
          </div>
          
          <div className="modal-content">
            <div className="comments-list">
              {postComments.map(comment => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-header">
                    <span className="comment-author">{comment.author}</span>
                    <span className="comment-score">
                      <ChevronUp size={14} /> {comment.score}
                    </span>
                    <span className="comment-time">
                      {redditService.formatTimeAgo(comment.created)}
                    </span>
                  </div>
                  <div className="comment-body">{comment.body}</div>
                  {comment.replies > 0 && (
                    <div className="comment-replies">
                      {comment.replies} replies
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="reddit-influence-container">
      <div className="reddit-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          Posts ({recentPosts.length})
        </button>
        <button 
          className={`tab ${activeTab === 'subreddits' ? 'active' : ''}`}
          onClick={() => setActiveTab('subreddits')}
        >
          Subreddits
        </button>
        <button 
          className={`tab ${activeTab === 'spikes' ? 'active' : ''}`}
          onClick={() => setActiveTab('spikes')}
        >
          Spikes
        </button>
      </div>

      {isLoading && (
        <div className="loading-state">
          <RefreshCw className="spinning" />
          <p>Loading Reddit data...</p>
        </div>
      )}

      {error && (
        <Alert className="error-alert">
          <AlertTriangle className="alert-icon" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && (
        <>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'posts' && renderPostsTab()}
          {activeTab === 'subreddits' && renderSubredditsTab()}
          {activeTab === 'spikes' && renderSpikesTab()}
        </>
      )}

      {renderCommentsModal()}
    </div>
  );
};

export default RedditInfluence;