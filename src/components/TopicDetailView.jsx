import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Star, 
  Calendar, 
  Smartphone, 
  ArrowLeft, 
  MessageSquare,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Globe,
  Tag,
  User,
  Package,
  Hash,
  Activity,
  X,
  Search,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Folder,
  Plus,
  ExternalLink,
  Layers,
  PieChart,
  Zap,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle,
  MinusCircle,
  Download,
  Sliders,
  Eye,
  EyeOff,
  SlidersHorizontal
} from 'lucide-react';
import DateRangeCalendar from './DateRangeCalendar';
import './TopicDetailView.css';

const TopicDetailView = ({ data }) => {
  const { topicName } = useParams();
  const navigate = useNavigate();
  
  // Add error boundary
  try {
    console.log('TopicDetailView rendered');
    console.log('Received data:', data);
    console.log('Topic name from URL:', topicName);
    console.log('Reviews available:', data?.reviews?.length || 0);
    
    // Test render to check if component is mounting
    if (topicName === 'Satisfied Users' || topicName === 'Satisfied%20Users') {
      console.log('=== SATISFIED USERS PAGE LOADING ===');
      console.log('Data structure:', {
        hasData: !!data,
        hasReviews: !!data?.reviews,
        reviewCount: data?.reviews?.length,
        firstReview: data?.reviews?.[0]
      });
    }
    
    // Early return if no data
    if (!data || !data.reviews || !Array.isArray(data.reviews)) {
      console.error('No data or reviews available:', { data, hasReviews: !!data?.reviews });
      return (
        <div className="modern-detail-view">
          <div className="empty-state">
            <div className="empty-icon">
              <AlertCircle size={64} strokeWidth={1} />
            </div>
            <h3>No data available</h3>
            <p>Please upload review data first</p>
            <button className="reset-filters-btn" onClick={() => navigate('/')}>
              Go Back
            </button>
          </div>
        </div>
      );
    }
  const [expandedReviews, setExpandedReviews] = useState(new Set());
  const [expandedKeywords, setExpandedKeywords] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    stars: true,
    sentiment: true,
    version: false,
    os: true
  });
  const [filters, setFilters] = useState({
    os: [],
    sentiment: [],
    version: [],
    device: [],
    rating: [],
    dateRange: { start: null, end: null },
    searchQuery: ''
  });
  const [activeView, setActiveView] = useState('grid');

  // Define highlight keywords for each topic
  const topicKeywords = {
    'Satisfied Users': ['love', 'great', 'excellent', 'perfect', 'amazing', 'best', 'fantastic', 'wonderful', 'awesome', 'outstanding', 'flawless', 'smooth', 'easy', 'helpful', 'accurate'],
    'Bugs': ['bug', 'crash', 'error', 'broken', 'fix', 'issue', 'problem', 'not working', "doesn't work", 'glitch', 'freeze', 'stuck', 'fail'],
    'Design & UX': ['design', 'ui', 'ux', 'interface', 'layout', 'button', 'screen', 'look', 'appearance', 'visual', 'navigation', 'menu', 'display'],
    'Dissatisfied Users': ['terrible', 'worst', 'hate', 'awful', 'horrible', 'disappointing', 'frustrated', 'angry', 'useless', 'waste'],
    'Performance': ['slow', 'lag', 'performance', 'speed', 'fast', 'loading', 'freeze', 'responsive', 'delay', 'quick']
  };

  // Get unique values for filters
  const filterOptions = useMemo(() => {
    if (!data || !data.reviews) {
      return {
        os: [],
        osVersions: { iOS: [], Android: [] },
        sentiment: [],
        version: [],
        device: [],
        rating: [5, 4, 3, 2, 1]
      };
    }
    
    // Simplified OS grouping for better filtering
    const platforms = new Set();
    const osVersions = { iOS: new Set(), Android: new Set() };
    
    data.reviews.forEach(r => {
      const platform = r.platform || r.Platform || '';
      const osValue = r.os || r.OS || r['Operating System'] || '';
      
      if (platform.toLowerCase() === 'ios' || osValue.toLowerCase().includes('ios')) {
        platforms.add('iOS');
        if (osValue) osVersions.iOS.add(osValue.replace(/ios\s*/i, '').trim());
      } else if (platform.toLowerCase() === 'android' || osValue.toLowerCase().includes('android')) {
        platforms.add('Android');
        if (osValue) osVersions.Android.add(osValue.replace(/android\s*/i, '').trim());
      }
    });
    
    const options = {
      os: [...platforms].sort(),
      osVersions: {
        iOS: [...osVersions.iOS].filter(v => v).sort((a, b) => parseFloat(b) - parseFloat(a)),
        Android: [...osVersions.Android].filter(v => v).sort((a, b) => parseFloat(b) - parseFloat(a))
      },
      sentiment: [...new Set(data.reviews.map(r => r.sentiment))].filter(Boolean).sort(),
      version: [...new Set(data.reviews.map(r => r.version || r.Version || r['App Version']))].filter(Boolean).sort().reverse(),
      device: [...new Set(data.reviews.map(r => r.device || r.Device || r['Device Model'] || 'Unknown'))].filter(Boolean).sort(),
      rating: [5, 4, 3, 2, 1]
    };
    return options;
  }, [data.reviews]);

  // Filter reviews based on topic and filters
  const filteredReviews = useMemo(() => {
    if (!data || !data.reviews) {
      console.log('No data or reviews available');
      return [];
    }
    
    const decodedTopic = decodeURIComponent(topicName);
    console.log('Filtering for topic:', decodedTopic);
    console.log('Total reviews before filtering:', data.reviews.length);
    
    // Debug: Check a sample review structure
    if (data.reviews.length > 0) {
      console.log('Sample review structure:', {
        rating: data.reviews[0].rating,
        Rating: data.reviews[0].Rating,
        sentiment: data.reviews[0].sentiment,
        content: data.reviews[0].content?.substring(0, 50),
        body: data.reviews[0].body?.substring(0, 50)
      });
    }
    
    return data.reviews.filter(review => {
      // Handle both content and body fields
      const content = (review.content || review.body || '').toLowerCase();
      
      // First, check if review matches the topic criteria
      let matchesTopic = false;
      
      if (decodedTopic === 'Satisfied Users') {
        // For Satisfied Users, show positive sentiment or 4-5 star reviews
        const rating = parseInt(review.rating) || parseInt(review.Rating) || 0;
        const sentiment = review.sentiment || review.Sentiment || '';
        
        // Check multiple conditions for satisfied users
        matchesTopic = sentiment === 'Positive' || 
                      rating >= 4 || 
                      content.match(/love|great|excellent|perfect|amazing|best|fantastic|wonderful|awesome|outstanding/);
      } else if (decodedTopic === 'Dissatisfied Users') {
        // For Dissatisfied Users, show negative sentiment or 1-2 star reviews
        const rating = parseInt(review.rating) || parseInt(review.Rating) || 0;
        const sentiment = review.sentiment || review.Sentiment || '';
        
        matchesTopic = sentiment === 'Negative' || 
                      (rating > 0 && rating <= 2) ||
                      content.match(/terrible|worst|hate|awful|horrible|disappointing|frustrated|angry|useless|waste/);
      } else if (decodedTopic === 'Bugs') {
        matchesTopic = content.match(/bug|crash|error|broken|fix|issue|problem|not working|doesn't work|glitch/);
      } else if (decodedTopic === 'Design & UX') {
        matchesTopic = content.match(/design|ui|ux|interface|layout|button|screen|look|appearance|visual/);
      } else if (decodedTopic === 'Performance') {
        matchesTopic = content.match(/slow|lag|performance|speed|fast|loading|freeze|responsive/);
      } else {
        matchesTopic = true; // For other topics, include all reviews
      }
      
      // If doesn't match topic, exclude it
      if (!matchesTopic) return false;
      
      // Debug log for Satisfied Users
      if (decodedTopic === 'Satisfied Users') {
        console.log('Checking review for Satisfied Users:', {
          rating: review.rating || review.Rating,
          sentiment: review.sentiment || review.Sentiment,
          contentSnippet: content.substring(0, 100),
          matched: true
        });
      }
      
      // Apply additional filters
      const osValue = review.os || review.OS || review['Operating System'] || '';
      const platform = review.platform || review.Platform || '';
      
      // Clean OS value - remove platform name if already included
      let cleanOS = osValue.toString().trim();
      if (cleanOS.toLowerCase().includes('android')) {
        cleanOS = cleanOS.replace(/android\s*/i, '');
      }
      if (cleanOS.toLowerCase().includes('ios')) {
        cleanOS = cleanOS.replace(/ios\s*/i, '');
      }
      
      let reviewOS = 'Unknown';
      if (platform && cleanOS) {
        if (platform.toLowerCase() === 'ios') {
          reviewOS = `iOS ${cleanOS}`;
        } else if (platform.toLowerCase() === 'android') {
          reviewOS = `Android ${cleanOS}`;
        } else {
          reviewOS = `${platform} ${cleanOS}`;
        }
      } else if (cleanOS) {
        const versionNum = parseFloat(cleanOS);
        if (versionNum >= 13 && versionNum <= 18) {
          reviewOS = `iOS ${cleanOS}`;
        } else if (versionNum >= 10 && versionNum <= 20) {
          reviewOS = `Android ${cleanOS}`;
        } else {
          reviewOS = cleanOS;
        }
      }
      
      const reviewLang = review.language || review.Language || 'Unknown';
      const reviewVersion = review.version || review.Version || review['App Version'];
      const reviewDevice = review.device || review.Device || review['Device Model'] || 'Unknown';
      const reviewContent = (review.content || review.body || '').toLowerCase();
      
      // Fixed OS filter logic - check if reviewOS contains any of the filter values
      if (filters.os.length > 0) {
        const matchesOS = filters.os.some(filterOS => {
          // Handle partial matches for OS versions
          if (filterOS.includes('iOS') && reviewOS.includes('iOS')) return true;
          if (filterOS.includes('Android') && reviewOS.includes('Android')) return true;
          return reviewOS === filterOS;
        });
        if (!matchesOS) return false;
      }
      if (filters.sentiment.length > 0 && !filters.sentiment.includes(review.sentiment)) return false;
      if (filters.version.length > 0 && !filters.version.includes(reviewVersion)) return false;
      if (filters.device.length > 0 && !filters.device.includes(reviewDevice)) return false;
      if (filters.rating.length > 0) {
        const reviewRating = parseInt(review.rating) || parseInt(review.Rating) || 0;
        if (!filters.rating.includes(reviewRating)) return false;
      }
      if (filters.searchQuery && !reviewContent.includes(filters.searchQuery.toLowerCase())) return false;
      if (filters.dateRange.start && review.date) {
        const reviewDate = new Date(review.date || review.Date);
        if (reviewDate < filters.dateRange.start) return false;
      }
      if (filters.dateRange.end && review.date) {
        const reviewDate = new Date(review.date || review.Date);
        if (reviewDate > filters.dateRange.end) return false;
      }
      
      return true;
    }).sort((a, b) => {
      // Safe date sorting
      const dateA = new Date(a.date || a.Date || 0);
      const dateB = new Date(b.date || b.Date || 0);
      return dateB - dateA;
    });
  }, [data.reviews, topicName, filters]);
  
  console.log('Filtered reviews count:', filteredReviews.length);
  console.log('First few filtered reviews:', filteredReviews.slice(0, 3));

  // Function to highlight keywords in text
  const highlightText = (text, keywords) => {
    if (!keywords || keywords.length === 0) return text;
    
    // Create a regex pattern for all keywords
    const pattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
    
    // Split text by the pattern and create highlighted spans
    const parts = text.split(pattern);
    
    return parts.map((part, index) => {
      if (keywords.some(keyword => part.toLowerCase() === keyword.toLowerCase())) {
        return <mark key={index} className="highlight">{part}</mark>;
      }
      return part;
    });
  };

  const decodedTopic = decodeURIComponent(topicName);
  const keywords = topicKeywords[decodedTopic] || [];
  
  // Temporary debug return for Satisfied Users
  if (decodedTopic === 'Satisfied Users' && filteredReviews.length === 0) {
    console.log('NO REVIEWS FOUND FOR SATISFIED USERS');
    return (
      <div className="modern-detail-view" style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem' }}>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h1>Debug: Satisfied Users</h1>
          <p>Total reviews in data: {data.reviews.length}</p>
          <p>Filtered reviews: {filteredReviews.length}</p>
          <p>Topic: {decodedTopic}</p>
          <button onClick={() => navigate('/')}>Go Back</button>
          <div style={{ marginTop: '1rem' }}>
            <h3>Sample review data:</h3>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>
              {JSON.stringify(data.reviews[0], null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredReviews.length;
    const avgRating = total > 0 
      ? (filteredReviews.reduce((sum, r) => {
          const rating = parseInt(r.rating) || parseInt(r.Rating) || 0;
          return sum + rating;
        }, 0) / total).toFixed(1)
      : 0;
    
    // Count sentiments
    const sentimentCounts = {
      positive: 0,
      neutral: 0,
      negative: 0,
      mixed: 0
    };
    
    filteredReviews.forEach(review => {
      // Check if review has both positive and negative words for "mixed" sentiment
      const hasPositiveWords = review.positiveWords && review.positiveWords.length > 0;
      const hasNegativeWords = review.negativeWords && review.negativeWords.length > 0;
      
      if (hasPositiveWords && hasNegativeWords) {
        sentimentCounts.mixed++;
      } else if (review.sentiment === 'Positive') {
        sentimentCounts.positive++;
      } else if (review.sentiment === 'Neutral') {
        sentimentCounts.neutral++;
      } else if (review.sentiment === 'Negative') {
        sentimentCounts.negative++;
      } else {
        // Default to neutral if sentiment is undefined
        sentimentCounts.neutral++;
      }
    });
    
    
    return { total, avgRating, sentimentCounts };
  }, [filteredReviews]);

  const toggleReviewExpansion = (reviewId) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId);
    } else {
      newExpanded.add(reviewId);
    }
    setExpandedReviews(newExpanded);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (newFilters[filterType].includes(value)) {
        newFilters[filterType] = newFilters[filterType].filter(v => v !== value);
      } else {
        newFilters[filterType] = [...newFilters[filterType], value];
      }
      return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({
      os: [],
      sentiment: [],
      version: [],
      device: [],
      rating: [],
      dateRange: { start: null, end: null },
      searchQuery: ''
    });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleDateRangeChange = (newRange) => {
    setFilters(prev => ({
      ...prev,
      dateRange: newRange
    }));
  };

  const activeFilterCount = Object.values(filters).reduce((count, filter) => {
    if (Array.isArray(filter)) return count + filter.length;
    if (filter && typeof filter === 'object' && (filter.start || filter.end)) return count + 1;
    if (filter && typeof filter === 'string' && filter.length > 0) return count + 1;
    return count;
  }, 0);

  // Calculate rating distribution
  const ratingDistribution = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    filteredReviews.forEach(review => {
      const rating = parseInt(review.rating) || parseInt(review.Rating) || 0;
      if (rating >= 1 && rating <= 5) {
        dist[rating]++;
      }
    });
    return dist;
  }, [filteredReviews]);

  return (
    <div className="modern-detail-view" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Modern Header */}
      <div className="modern-header">
        <div className="header-top">
          <div className="header-left">
            <button className="back-button" onClick={() => navigate('/')}>
              <ArrowLeft size={20} />
            </button>
            <div className="header-info">
              <h1 className="page-title">{decodedTopic}</h1>
              <p className="page-subtitle">{stats.total} reviews analyzed</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="action-button" onClick={() => setActiveView(activeView === 'grid' ? 'list' : 'grid')}>
              {activeView === 'grid' ? <Layers size={18} /> : <BarChart3 size={18} />}
              <span>{activeView === 'grid' ? 'List View' : 'Grid View'}</span>
            </button>
            <button className="action-button primary">
              <Download size={18} />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Stats Widgets Section */}
      <div className="widgets-container">
        {/* Reviews Widget */}
        <div className="widget-card reviews-widget">
          <div className="widget-icon">
            <MessageSquare size={24} />
          </div>
          <div className="widget-content">
            <h3 className="widget-value">{stats.total.toLocaleString()}</h3>
            <p className="widget-label">Total Reviews</p>
            <div className="widget-trend positive">
              <TrendingUp size={16} />
              <span>+12% this month</span>
            </div>
          </div>
        </div>
        
        {/* Rating Widget */}
        <div className="widget-card rating-widget">
          <div className="widget-icon">
            <Star size={24} />
          </div>
          <div className="widget-content">
            <h3 className="widget-value">{stats.avgRating}</h3>
            <p className="widget-label">Average Rating</p>
            <div className="rating-stars-widget">
              {[1, 2, 3, 4, 5].map(i => (
                <Star
                  key={i}
                  size={16}
                  fill={i <= Math.round(parseFloat(stats.avgRating)) ? '#fbbf24' : 'transparent'}
                  stroke={i <= Math.round(parseFloat(stats.avgRating)) ? '#fbbf24' : '#e5e7eb'}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Sentiment Widget */}
        <div className="widget-card sentiment-widget">
          <div className="widget-icon">
            <PieChart size={24} />
          </div>
          <div className="widget-content">
            <h3 className="widget-value">
              {Math.round((stats.sentimentCounts.positive / stats.total) * 100)}%
            </h3>
            <p className="widget-label">Positive Sentiment</p>
            <div className="sentiment-bar">
              <div 
                className="sentiment-segment positive" 
                style={{width: `${(stats.sentimentCounts.positive / stats.total) * 100}%`}}
              />
              <div 
                className="sentiment-segment neutral" 
                style={{width: `${(stats.sentimentCounts.neutral / stats.total) * 100}%`}}
              />
              <div 
                className="sentiment-segment negative" 
                style={{width: `${(stats.sentimentCounts.negative / stats.total) * 100}%`}}
              />
            </div>
          </div>
        </div>
        
        {/* Topic Performance Widget */}
        <div className="widget-card performance-widget">
          <div className="widget-icon">
            <Zap size={24} />
          </div>
          <div className="widget-content">
            <h3 className="widget-value">{decodedTopic}</h3>
            <p className="widget-label">Active Topic</p>
            <div className="widget-trend">
              <Activity size={16} />
              <span>{filteredReviews.length} matching reviews</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Rating Distribution Card */}
      <div className="analysis-cards">
        <div className="analysis-card">
          <div className="card-header">
            <h3>Rating Distribution</h3>
            <button className="card-action">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="rating-distribution">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = ratingDistribution[rating];
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
              
              return (
                <div key={rating} className="rating-row">
                  <div className="rating-info">
                    <span className="rating-number">{rating}</span>
                    <Star size={14} fill={rating >= 4 ? '#fbbf24' : '#94a3b8'} />
                  </div>
                  <div className="rating-bar-container">
                    <div 
                      className="rating-bar" 
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: rating >= 4 ? '#10b981' : rating === 3 ? '#f59e0b' : '#ef4444'
                      }}
                    />
                  </div>
                  <div className="rating-stats">
                    <span className="rating-count">{count}</span>
                    <span className="rating-percentage">{Math.round(percentage)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="analysis-card">
          <div className="card-header">
            <h3>Sentiment Analysis</h3>
            <button className="card-action">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="sentiment-analysis">
            {[
              { name: 'Positive', count: stats.sentimentCounts.positive, icon: CheckCircle, color: '#10b981' },
              { name: 'Neutral', count: stats.sentimentCounts.neutral, icon: MinusCircle, color: '#6b7280' },
              { name: 'Negative', count: stats.sentimentCounts.negative, icon: XCircle, color: '#ef4444' },
              { name: 'Mixed', count: stats.sentimentCounts.mixed, icon: AlertCircle, color: '#3b82f6' }
            ].map(sentiment => {
              const percentage = sentiment.count > 0 ? (sentiment.count / stats.total) * 100 : 0;
              const Icon = sentiment.icon;
              
              return (
                <div key={sentiment.name} className="sentiment-row">
                  <div className="sentiment-info">
                    <Icon size={18} color={sentiment.color} />
                    <span className="sentiment-name">{sentiment.name}</span>
                  </div>
                  <div className="sentiment-stats">
                    <span className="sentiment-count">{sentiment.count}</span>
                    <span className="sentiment-percentage" style={{color: sentiment.color}}>
                      {Math.round(percentage)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area with Sidebar */}
      <div className={`main-content-area ${showFilters ? 'with-sidebar' : ''}`}>
        {/* Persistent Filter Sidebar */}
        <div className={`filter-sidebar ${showFilters ? 'active' : ''}`}>
          <div className="filter-sidebar-content">
            <div className="filter-sidebar-header">
              <div className="filter-title-section">
                <SlidersHorizontal size={20} />
                <h3>Filters</h3>
                {activeFilterCount > 0 && (
                  <span className="active-filter-badge">{activeFilterCount}</span>
                )}
              </div>
              <button className="sidebar-toggle" onClick={() => setShowFilters(false)}>
                <ChevronLeft size={20} />
              </button>
            </div>
            
            {/* Active Filters Pills */}
            {activeFilterCount > 0 && (
              <div className="active-filters-section">
                <div className="active-filters-pills">
                  {filters.os.map(os => (
                    <div key={os} className="filter-pill os-pill">
                      <Smartphone size={14} />
                      <span>{os}</span>
                      <button onClick={() => handleFilterChange('os', os)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {filters.sentiment.map(sentiment => (
                    <div key={sentiment} className={`filter-pill sentiment-pill ${sentiment.toLowerCase()}`}>
                      {sentiment === 'Positive' ? <CheckCircle size={14} /> : 
                       sentiment === 'Negative' ? <XCircle size={14} /> : <MinusCircle size={14} />}
                      <span>{sentiment}</span>
                      <button onClick={() => handleFilterChange('sentiment', sentiment)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {filters.rating.map(rating => (
                    <div key={rating} className="filter-pill rating-pill">
                      <Star size={14} />
                      <span>{rating} Stars</span>
                      <button onClick={() => handleFilterChange('rating', rating)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {filters.searchQuery && (
                    <div className="filter-pill search-pill">
                      <Search size={14} />
                      <span>"{filters.searchQuery}"</span>
                      <button onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}>
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <button className="clear-all-filters" onClick={clearFilters}>
                  Clear all
                </button>
              </div>
            )}
            
            {/* Search Bar with Modern Design */}
            <div className="modern-search-section">
              <div className="modern-search-wrapper">
                <Search size={20} className="search-icon" />
                <input
                  type="text"
                  className="modern-search-input"
                  placeholder="Search in reviews..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                />
                {filters.searchQuery && (
                  <button 
                    className="search-clear"
                    onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
            
            {/* Quick Filter Chips */}
            <div className="quick-filter-section">
              <h4 className="filter-section-title">Quick Filters</h4>
              <div className="quick-filter-chips">
                <button 
                  className={`filter-chip sentiment-chip positive ${filters.sentiment.includes('Positive') ? 'active' : ''}`}
                  onClick={() => handleFilterChange('sentiment', 'Positive')}
                >
                  <CheckCircle size={16} />
                  <span>Positive</span>
                </button>
                <button 
                  className={`filter-chip sentiment-chip negative ${filters.sentiment.includes('Negative') ? 'active' : ''}`}
                  onClick={() => handleFilterChange('sentiment', 'Negative')}
                >
                  <XCircle size={16} />
                  <span>Negative</span>
                </button>
                <button 
                  className={`filter-chip sentiment-chip neutral ${filters.sentiment.includes('Neutral') ? 'active' : ''}`}
                  onClick={() => handleFilterChange('sentiment', 'Neutral')}
                >
                  <MinusCircle size={16} />
                  <span>Neutral</span>
                </button>
              </div>
            </div>
            
            {/* Platform Filter Section */}
            <div className="filter-section platform-filters">
              <h4 className="filter-section-title">
                <Smartphone size={18} />
                Platform
              </h4>
              <div className="platform-toggles">
                {filterOptions.os.map(platform => (
                  <button
                    key={platform}
                    className={`platform-toggle ${filters.os.includes(platform) ? 'active' : ''} ${platform.toLowerCase()}`}
                    onClick={() => handleFilterChange('os', platform)}
                  >
                    <span className="platform-icon">
                      {platform.toLowerCase().includes('ios') ? 
                        <Globe size={16} /> : <Smartphone size={16} />
                      }
                    </span>
                    <span>{platform}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Rating Filter Section with Visual Bars */}
            <div className="filter-section rating-filters">
              <h4 className="filter-section-title">
                <Star size={18} />
                Rating
              </h4>
              <div className="rating-bars">
                {[5, 4, 3, 2, 1].map(rating => {
                  const count = ratingDistribution[rating];
                  const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  const isActive = filters.rating.includes(rating);
                  
                  return (
                    <button
                      key={rating}
                      className={`rating-bar-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleFilterChange('rating', rating)}
                    >
                      <div className="rating-label">
                        <span>{rating}</span>
                        <Star size={14} fill="#fbbf24" stroke="#fbbf24" />
                      </div>
                      <div className="rating-bar-track">
                        <div 
                          className="rating-bar-fill"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="rating-count">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Date Range Filter Section */}
            <div className="filter-section date-range-filters">
              <h4 className="filter-section-title">
                <Calendar size={18} />
                Date Range
              </h4>
              <div className="date-range-content">
                <DateRangeCalendar
                  reviews={data.reviews}
                  onDateRangeChange={handleDateRangeChange}
                  initialRange={filters.dateRange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className={`content-area ${showFilters ? 'with-sidebar' : ''}`}>

          {/* Reviews Section */}
          <div className="reviews-section">
          <div className="reviews-controls">
            <div className="reviews-header-section">
              <h2 className="reviews-title">Reviews</h2>
              <p className="reviews-subtitle">
                {filteredReviews.length} of {data.reviews.length} reviews
              </p>
            </div>
            
            <div className="reviews-actions">
              <button 
                className="toggle-filters-btn"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal size={18} />
                <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
                {activeFilterCount > 0 && (
                  <span className="filter-badge">{activeFilterCount}</span>
                )}
              </button>
              
              <div className="view-toggle">
                <button 
                  className={`view-btn ${activeView === 'grid' ? 'active' : ''}`}
                  onClick={() => setActiveView('grid')}
                >
                  <Layers size={18} />
                </button>
                <button 
                  className={`view-btn ${activeView === 'list' ? 'active' : ''}`}
                  onClick={() => setActiveView('list')}
                >
                  <BarChart3 size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Reviews Grid/List */}
          <div className={`reviews-display ${activeView}`}>
            {filteredReviews.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Search size={64} strokeWidth={1} />
                </div>
                <h3>No reviews found</h3>
                <p>Try adjusting your filters or search terms</p>
                <button className="reset-filters-btn" onClick={clearFilters}>
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredReviews.map(review => {
                const rating = parseInt(review.rating) || parseInt(review.Rating) || 0;
                const osInfo = (() => {
                  const osValue = review.os || review.OS || review['Operating System'] || '';
                  const platform = review.platform || review.Platform || '';
                  const version = review.version || review.Version || review['App Version'] || '';
                  
                  let cleanOS = osValue.toString().trim();
                  if (cleanOS.toLowerCase().includes('android')) {
                    cleanOS = cleanOS.replace(/android\s*/i, '');
                  }
                  if (cleanOS.toLowerCase().includes('ios')) {
                    cleanOS = cleanOS.replace(/ios\s*/i, '');
                  }
                  
                  if (platform && cleanOS) {
                    if (platform.toLowerCase() === 'ios') {
                      return `iOS ${cleanOS}`;
                    } else if (platform.toLowerCase() === 'android') {
                      return `Android ${cleanOS}`;
                    }
                    return `${platform} ${cleanOS}`;
                  } else if (cleanOS) {
                    const versionNum = parseFloat(cleanOS);
                    if (versionNum >= 13 && versionNum <= 18) {
                      return `iOS ${cleanOS}`;
                    } else if (versionNum >= 10 && versionNum <= 20) {
                      return `Android ${cleanOS}`;
                    }
                    return cleanOS;
                  }
                  return null;
                })();
                
                return (
                  <div key={review.id} className="review-card-redesigned">
                    {/* Top Section with Avatar, Name, Rating and Date */}
                    <div className="review-card-header">
                      <div className="reviewer-section">
                        <div className="reviewer-avatar">
                          {(review.author && typeof review.author === 'string') ? review.author.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="reviewer-info">
                          <h4 className="reviewer-name">
                            {(review.author && typeof review.author === 'string') ? review.author : 'Anonymous User'}
                          </h4>
                          <div className="review-meta-info">
                            <div className="review-rating-inline">
                              {[1, 2, 3, 4, 5].map(i => (
                                <Star
                                  key={i}
                                  size={14}
                                  fill={i <= rating ? '#f59e0b' : 'transparent'}
                                  stroke={i <= rating ? '#f59e0b' : '#e5e7eb'}
                                />
                              ))}
                            </div>
                            <span className="review-date-inline">
                              {review.date ? new Date(review.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              }) : 'Unknown date'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Sentiment Indicator */}
                      <div className={`review-sentiment-indicator ${(review.sentiment || 'neutral').toLowerCase()}`}>
                        {review.sentiment === 'Positive' && <CheckCircle size={16} />}
                        {review.sentiment === 'Negative' && <XCircle size={16} />}
                        {review.sentiment === 'Neutral' && <MinusCircle size={16} />}
                        <span>{review.sentiment || 'Neutral'}</span>
                      </div>
                    </div>
                    
                    {/* Review Title */}
                    {review.title && (
                      <h3 className="review-card-title">
                        {highlightText(review.title, keywords)}
                      </h3>
                    )}
                    
                    {/* Review Content */}
                    <div className="review-card-body">
                      <p className="review-card-text">
                        {highlightText(review.content || review.body || '', keywords)}
                      </p>
                    </div>
                    
                    {/* Review Metadata - Inline */}
                    <div className="review-card-metadata">
                      <div className="metadata-items">
                        {review.platform && (
                          <div className="metadata-item platform-item">
                            {review.platform.toLowerCase().includes('ios') || review.platform.toLowerCase().includes('apple') ? (
                              <Smartphone size={14} />
                            ) : (
                              <Smartphone size={14} />
                            )}
                            <span>{review.platform}</span>
                          </div>
                        )}
                        {osInfo && (
                          <div className="metadata-item">
                            <Layers size={14} />
                            <span>{osInfo}</span>
                          </div>
                        )}
                        {review.device && review.device !== 'Unknown' && review.device !== '' && (
                          <div className="metadata-item">
                            <Smartphone size={14} />
                            <span>{review.device}</span>
                          </div>
                        )}
                        {review.version && (
                          <div className="metadata-item">
                            <Package size={14} />
                            <span>App v{review.version}</span>
                          </div>
                        )}
                        {review.country && review.country !== 'Unknown' && (
                          <div className="metadata-item">
                            <Globe size={14} />
                            <span>{review.country}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Keywords Section */}
                      {review.keywords && review.keywords.length > 0 && (
                        <div className="review-keywords-section">
                          <span className="keywords-label">Keywords:</span>
                          <div className="review-keywords">
                            {expandedKeywords.has(review.id) ? (
                              // Show all keywords when expanded
                              <>
                                {review.keywords.map((keyword, idx) => (
                                  <span key={idx} className="review-keyword-chip">{keyword}</span>
                                ))}
                                <button 
                                  className="keywords-toggle"
                                  onClick={() => setExpandedKeywords(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(review.id);
                                    return newSet;
                                  })}
                                >
                                  <ChevronUp size={14} />
                                  <span>Show less</span>
                                </button>
                              </>
                            ) : (
                              // Show limited keywords when collapsed
                              <>
                                {review.keywords.slice(0, 5).map((keyword, idx) => (
                                  <span key={idx} className="review-keyword-chip">{keyword}</span>
                                ))}
                                {review.keywords.length > 5 && (
                                  <button 
                                    className="keywords-toggle"
                                    onClick={() => setExpandedKeywords(prev => new Set([...prev, review.id]))}
                                  >
                                    <span>+{review.keywords.length - 5} more</span>
                                    <ChevronDown size={14} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Developer Response if exists */}
                    {review.response && (
                      <div className="review-developer-response">
                        <div className="response-header">
                          <MessageSquare size={14} />
                          <span>Developer Response</span>
                        </div>
                        <p className="response-content">{review.response}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
        </div> {/* End of content-area */}
      </div> {/* End of main-content-area */}
    </div>
  );
  } catch (error) {
    console.error('Error in TopicDetailView:', error);
    return (
      <div className="modern-detail-view">
        <div className="empty-state">
          <div className="empty-icon">
            <AlertCircle size={64} strokeWidth={1} />
          </div>
          <h3>Error loading topic details</h3>
          <p>{error.message || 'An unexpected error occurred'}</p>
          <button className="reset-filters-btn" onClick={() => navigate('/')}>
            Go Back
          </button>
        </div>
      </div>
    );
  }
};

export default TopicDetailView;