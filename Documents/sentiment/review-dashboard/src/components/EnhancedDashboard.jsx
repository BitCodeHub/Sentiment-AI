import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  Card, CardContent, CardHeader, CardTitle 
} from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { 
  TrendingUp, TrendingDown, AlertCircle, Brain, 
  Sparkles, Target, Shield, Zap, Search, Filter,
  ChevronDown, ChevronUp, X, Download, RefreshCw, Calendar
} from 'lucide-react';
import { analyzeReviews, generateInsights } from '../services/aiAnalysis';
import { performDeepAnalysis } from '../services/deepAnalysis';
import { performExecutiveAnalysis } from '../services/executiveAnalysis';
import { getErrorMessage } from '../utils/errorHandler';
import AIInsights from './AIInsights';
import CategorizedReviews from './CategorizedReviews';
import ReviewDisplay from './ReviewDisplay';
import SentimentTrends from './SentimentTrends';
import DateRangeCalendar from './DateRangeCalendar';
import ErrorDisplay from './ErrorDisplay';
import KeywordCloud from './KeywordCloud';
import './EnhancedDashboard.css';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

const EnhancedDashboard = ({ data, isLoading }) => {
  const [aiInsights, setAiInsights] = useState(null);
  const [deepInsights, setDeepInsights] = useState(null);
  const [executiveAnalysis, setExecutiveAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDeepAnalyzing, setIsDeepAnalyzing] = useState(false);
  const [isExecutiveAnalyzing, setIsExecutiveAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [metadataFilters, setMetadataFilters] = useState({
    appName: 'all',
    device: 'all',
    version: 'all',
    os: 'all',
    platform: 'all'
  });
  // Removed modal states - Analysis now shows inline
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    distribution: true,
    sentiment: true,
    trends: true,
    ai: true,
    keywords: true
  });
  // Enhanced review display is always enabled
  const useEnhancedReviewDisplay = true;
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState({ start: null, end: null });
  const dateRangeRef = useRef(null);
  // Add state for current view selection
  const [currentView, setCurrentView] = useState('dashboard');
  
  // Debug logging
  useEffect(() => {
    console.log('Current View:', currentView);
  }, [currentView]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedFilter !== 'all') count++;
    if (searchTerm) count++;
    if (selectedDateRange.start || selectedDateRange.end) count++;
    
    Object.entries(metadataFilters).forEach(([key, value]) => {
      if (value !== 'all') count++;
    });
    
    return count;
  }, [selectedFilter, searchTerm, selectedDateRange, metadataFilters]);

  // Reset all filters
  const resetAllFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedFilter('all');
    setSelectedDateRange({ start: null, end: null });
    setMetadataFilters({
      appName: 'all',
      device: 'all',
      version: 'all',
      os: 'all',
      platform: 'all'
    });
  }, []);

  // Extract unique metadata values from all reviews
  const metadataOptions = useMemo(() => {
    if (!data?.reviews || data.reviews.length === 0) return {};
    
    const options = {
      appName: new Set(['all']),
      device: new Set(['all']),
      version: new Set(['all']),
      os: new Set(['all']),
      platform: new Set(['all'])
    };
    
    data.reviews.forEach(review => {
      // Add values including empty strings to properly track all reviews
      options.appName.add(review.appName || '(No App Name)');
      options.device.add(review.device || '(No Device)');
      options.version.add(review.version || '(No Version)');
      options.os.add(review.os || '(No OS)');
      options.platform.add(review.platform || '(Unknown Platform)');
    });
    
    // Convert sets to sorted arrays
    Object.keys(options).forEach(key => {
      const values = Array.from(options[key]);
      // Sort, keeping 'all' at the beginning
      options[key] = values.sort((a, b) => {
        if (a === 'all') return -1;
        if (b === 'all') return 1;
        return a.localeCompare(b);
      });
    });
    
    return options;
  }, [data?.reviews]);

  // Calculate date range from all reviews
  const dateRange = useMemo(() => {
    if (!data?.reviews || data.reviews.length === 0) return null;
    
    const dates = data.reviews
      .map(review => {
        const dateValue = review.date || review.Date || review['Review Date'];
        if (!dateValue) return null;
        
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? null : date;
      })
      .filter(date => date !== null);
    
    if (dates.length === 0) return null;
    
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    };
    
    return {
      start: formatDate(minDate),
      end: formatDate(maxDate),
      display: `${formatDate(minDate)} - ${formatDate(maxDate)}`
    };
  }, [data?.reviews]);

  // Filter reviews based on search and filters
  const filteredReviews = useMemo(() => {
    if (!data?.reviews) return [];
    
    return data.reviews.filter(review => {
      const matchesSearch = !searchTerm || 
        (review.content?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (review['Review Text']?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (review.Body?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      // Handle combined rating/sentiment filter
      const matchesFilter = (() => {
        if (selectedFilter === 'all') return true;
        
        // Check if it's a rating filter (1-5)
        if (['1', '2', '3', '4', '5'].includes(selectedFilter)) {
          return review.rating === parseInt(selectedFilter) ||
                 review.Rating === parseInt(selectedFilter);
        }
        
        // Check if it's a sentiment filter
        if (['positive', 'neutral', 'negative'].includes(selectedFilter)) {
          return (review.sentiment?.toLowerCase() || '') === selectedFilter ||
                 (review.Sentiment?.toLowerCase() || '') === selectedFilter;
        }
        
        return true;
      })();
      
      // Check metadata filters
      const matchesMetadata = Object.keys(metadataFilters).every(key => {
        const filterValue = metadataFilters[key];
        if (filterValue === 'all') return true;
        
        // Get the actual value from the review, applying same transformation as in metadata options
        let reviewValue = review[key];
        
        // Apply the same transformation as we do when building the options
        if (key === 'appName') reviewValue = reviewValue || '(No App Name)';
        else if (key === 'device') reviewValue = reviewValue || '(No Device)';
        else if (key === 'version') reviewValue = reviewValue || '(No Version)';
        else if (key === 'os') reviewValue = reviewValue || '(No OS)';
        else if (key === 'platform') reviewValue = reviewValue || '(Unknown Platform)';
        
        return reviewValue === filterValue;
      });
      
      // Date range filtering
      const matchesDateRange = (() => {
        if (!selectedDateRange.start && !selectedDateRange.end) return true;
        
        const reviewDate = new Date(review.date || review.Date || review['Review Date']);
        if (isNaN(reviewDate.getTime())) return true; // Include reviews with invalid dates
        
        const startDate = selectedDateRange.start ? new Date(selectedDateRange.start) : null;
        const endDate = selectedDateRange.end ? new Date(selectedDateRange.end) : null;
        
        if (startDate && endDate) {
          return reviewDate >= startDate && reviewDate <= endDate;
        } else if (startDate) {
          return reviewDate >= startDate;
        } else if (endDate) {
          return reviewDate <= endDate;
        }
        
        return true;
      })();
      
      return matchesSearch && matchesFilter && matchesMetadata && matchesDateRange;
    });
  }, [data?.reviews, searchTerm, selectedFilter, metadataFilters, selectedDateRange]);

  // Calculate sentiment breakdown for filtered reviews
  const filteredSentimentBreakdown = useMemo(() => {
    const breakdown = { positive: 0, neutral: 0, negative: 0 };
    
    filteredReviews.forEach(review => {
      const sentiment = (review.sentiment || review.Sentiment || 'neutral').toLowerCase();
      if (sentiment === 'positive') breakdown.positive++;
      else if (sentiment === 'negative') breakdown.negative++;
      else breakdown.neutral++;
    });
    
    return breakdown;
  }, [filteredReviews]);

  // Calculate average rating for filtered reviews
  const filteredAvgRating = useMemo(() => {
    if (filteredReviews.length === 0) return 0;
    
    const totalRating = filteredReviews.reduce((sum, review) => {
      const rating = review.rating || review.Rating || 0;
      return sum + rating;
    }, 0);
    
    return totalRating / filteredReviews.length;
  }, [filteredReviews]);

  // Calculate rating distribution for filtered reviews
  const filteredRatingDistribution = useMemo(() => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    filteredReviews.forEach(review => {
      const rating = review.rating || review.Rating || 0;
      if (rating >= 1 && rating <= 5) {
        distribution[rating]++;
      }
    });
    
    return distribution;
  }, [filteredReviews]);

  // Click outside handler for the popup
  useEffect(() => {
    if (!showDatePicker) return;
    
    const handleClickOutside = (event) => {
      const popup = document.querySelector('.date-range-popup');
      const button = dateRangeRef.current;
      
      // Don't close if clicking the button or inside the popup
      if ((button && button.contains(event.target)) || 
          (popup && popup.contains(event.target))) {
        return;
      }
      
      setShowDatePicker(false);
    };
    
    // Add a small delay to prevent immediate closing
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showDatePicker]);

  // Handle date range changes
  const handleDateRangeChange = useCallback((dateRange) => {
    setSelectedDateRange(dateRange);
    // Only close the popup if both start and end dates are selected or it's a preset
    if (dateRange.start && dateRange.end) {
      // Small delay to ensure click event completes before closing
      setTimeout(() => {
        setShowDatePicker(false);
      }, 100);
    }
  }, []);

  const handleDateRangeClick = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowDatePicker(!showDatePicker);
  }, [showDatePicker]);

  const clearDateRange = useCallback(() => {
    setSelectedDateRange({ start: null, end: null });
    setShowDatePicker(false);
  }, []);

  const triggerAIAnalysis = useCallback(async () => {
    if (!filteredReviews || filteredReviews.length === 0) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Get review analysis
      const analysis = await analyzeReviews(filteredReviews);
      
      // Generate strategic insights based on aggregated data
      const insights = await generateInsights(data);
      
      // Store both analysis and insights
      setAiInsights({ analysis, insights });
      // Analysis results now display inline automatically
    } catch (err) {
      console.error('AI Analysis error:', err);
      const errorInfo = getErrorMessage(err);
      setError(errorInfo);
    } finally {
      setIsAnalyzing(false);
    }
  }, [filteredReviews, data]);

  const triggerDeepAnalysis = useCallback(async () => {
    if (!filteredReviews || filteredReviews.length === 0) return;
    
    setIsDeepAnalyzing(true);
    setError(null);
    
    try {
      const insights = await performDeepAnalysis(filteredReviews);
      setDeepInsights(insights);
      // Deep analysis results now display inline automatically
    } catch (err) {
      console.error('Deep Analysis error:', err);
      const errorInfo = getErrorMessage(err);
      setError(errorInfo);
    } finally {
      setIsDeepAnalyzing(false);
    }
  }, [filteredReviews]);

  const triggerExecutiveAnalysis = useCallback(async () => {
    if (!filteredReviews || filteredReviews.length === 0) return;
    
    setIsExecutiveAnalyzing(true);
    setError(null);
    
    try {
      // Create a data object with filtered reviews
      const filteredData = {
        ...data,
        reviews: filteredReviews,
        summary: {
          ...data.summary,
          totalReviews: filteredReviews.length
        },
        sentimentBreakdown: filteredSentimentBreakdown
      };
      const result = await performExecutiveAnalysis(filteredReviews, filteredData);
      setExecutiveAnalysis(result);
      // Executive analysis results now display inline automatically
    } catch (err) {
      console.error('Executive Analysis error:', err);
      const errorInfo = getErrorMessage(err);
      setError(errorInfo);
    } finally {
      setIsExecutiveAnalyzing(false);
    }
  }, [filteredReviews, data, filteredSentimentBreakdown]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 text-blue-600" style={{ animation: 'spin 1s linear infinite' }} />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const { summary, reviews = [] } = data || {};

  return (
    <div className="modern-dashboard with-sidebar">
      {/* Left Sidebar Navigation */}
      <div className="dashboard-sidebar">
        <div className="sidebar-content">
          <nav className="sidebar-nav">
            <ul className="nav-list">
              <li className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}>
                <button 
                  className="nav-button"
                  onClick={() => setCurrentView('dashboard')}
                  title="Dashboard"
                >
                  <BarChart size={20} />
                  <span>Dashboard</span>
                </button>
              </li>
              <li className={`nav-item ${currentView === 'wordcloud' ? 'active' : ''}`}>
                <button 
                  className="nav-button"
                  onClick={() => setCurrentView('wordcloud')}
                  title="Word Cloud"
                >
                  <Sparkles size={20} />
                  <span>Word Cloud</span>
                </button>
              </li>
              <li className={`nav-item ${currentView === 'reviews' ? 'active' : ''}`}>
                <button 
                  className="nav-button"
                  onClick={() => setCurrentView('reviews')}
                  title="All Reviews"
                >
                  <Target size={20} />
                  <span>All Reviews</span>
                </button>
              </li>
              <li className={`nav-item ${currentView === 'insights' ? 'active' : ''}`}>
                <button 
                  className="nav-button"
                  onClick={() => setCurrentView('insights')}
                  title="AI Insights"
                >
                  <Brain size={20} />
                  <span>AI Insights</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="dashboard-main-area">
        <div className="dashboard-content">
      {/* Conditional rendering based on current view */}
      {!data || !data.summary ? (
        <div className="no-data-container">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No data available. Please upload a CSV file to see analytics.
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <>
      {currentView === 'dashboard' && (
        <>
      {/* Enhanced Header with Search and Filters */}
      <div className="dashboard-header-section">
        <div className="dashboard-title-area">
          <h1 className="dashboard-title">Review Analytics Dashboard</h1>
          <p className="dashboard-subtitle">Comprehensive insights from {summary.totalReviews.toLocaleString()} reviews</p>
        </div>
        
        {/* Search Section */}
        <div className="search-section">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button 
                className="clear-search"
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        
        {/* Filter Groups - Redesigned for better organization */}
        <div className="filters-container">
          {/* Primary Filters Row */}
          <div className="primary-filters-section">
            <div className="primary-filter-item">
              <label className="filter-label">
                <Filter size={14} />
                Review Type
              </label>
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="filter-select primary"
              >
                <option value="all">All Reviews</option>
                <optgroup label="Ratings">
                  <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                  <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                  <option value="3">⭐⭐⭐ 3 Stars</option>
                  <option value="2">⭐⭐ 2 Stars</option>
                  <option value="1">⭐ 1 Star</option>
                </optgroup>
                <optgroup label="Sentiments">
                  <option value="positive">😊 Positive</option>
                  <option value="neutral">😐 Neutral</option>
                  <option value="negative">😞 Negative</option>
                </optgroup>
              </select>
            </div>
            
            {dateRange && (
              <div className="primary-filter-item">
                <label className="filter-label">
                  <Calendar size={14} />
                  Date Range
                </label>
                <div className="date-range-container" ref={dateRangeRef}>
                  <button 
                    className="date-range-button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDatePicker(!showDatePicker);
                    }}
                    title="Click to filter by date range"
                  >
                    <span className="date-range-value">
                      {selectedDateRange.start && selectedDateRange.end 
                        ? `${new Date(selectedDateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(selectedDateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : dateRange.display
                      }
                    </span>
                    <ChevronDown size={14} className={`chevron-icon ${showDatePicker ? 'rotated' : ''}`} />
                  </button>
                  {(selectedDateRange.start || selectedDateRange.end) && (
                    <button 
                      className="clear-date-range"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearDateRange();
                      }}
                      title="Clear date filter"
                    >
                      <X size={12} />
                    </button>
                  )}
                  {showDatePicker && createPortal(
                    <div 
                      className="date-picker-overlay"
                      onClick={() => setShowDatePicker(false)}
                    >
                      <div 
                        className="date-range-popup"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="date-picker-header">
                          <h4>Select Date Range</h4>
                          <button 
                            className="close-date-picker"
                            onClick={() => setShowDatePicker(false)}
                            title="Close date picker"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <DateRangeCalendar
                          reviews={data.reviews}
                          onDateRangeChange={(range) => {
                            handleDateRangeChange(range);
                            if (range.start && range.end) {
                              setShowDatePicker(false);
                            }
                          }}
                          initialRange={selectedDateRange}
                          showDisplay={false}
                          inline={true}
                        />
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Secondary Filters - Compact Design */}
          {(metadataOptions.appName?.length > 2 || metadataOptions.device?.length > 2 || 
            metadataOptions.version?.length > 2 || metadataOptions.platform?.length > 2 || 
            metadataOptions.os?.length > 2) && (
            <div className="secondary-filters-section">
              <div className="secondary-filters-label">
                <span>Advanced Filters</span>
              </div>
              <div className="secondary-filters-grid">
                {metadataOptions.appName && metadataOptions.appName.length > 2 && (
                  <div className="secondary-filter-item">
                    <select
                      value={metadataFilters.appName}
                      onChange={(e) => setMetadataFilters(prev => ({ ...prev, appName: e.target.value }))}
                      className="filter-select secondary"
                      title="Filter by app name"
                    >
                      <option value="all">All Apps</option>
                      {metadataOptions.appName.slice(1).map(appName => (
                        <option key={appName} value={appName}>{appName}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {metadataOptions.device && metadataOptions.device.length > 2 && (
                  <div className="secondary-filter-item">
                    <select
                      value={metadataFilters.device}
                      onChange={(e) => setMetadataFilters(prev => ({ ...prev, device: e.target.value }))}
                      className="filter-select secondary"
                      title="Filter by device"
                    >
                      <option value="all">All Devices</option>
                      {metadataOptions.device.slice(1).map(device => (
                        <option key={device} value={device}>{device}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {metadataOptions.version && metadataOptions.version.length > 2 && (
                  <div className="secondary-filter-item">
                    <select
                      value={metadataFilters.version}
                      onChange={(e) => setMetadataFilters(prev => ({ ...prev, version: e.target.value }))}
                      className="filter-select secondary"
                      title="Filter by app version"
                    >
                      <option value="all">All Versions</option>
                      {metadataOptions.version.slice(1).map(version => (
                        <option key={version} value={version}>v{version}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {metadataOptions.platform && metadataOptions.platform.length > 2 && (
                  <div className="secondary-filter-item">
                    <select
                      value={metadataFilters.platform}
                      onChange={(e) => setMetadataFilters(prev => ({ ...prev, platform: e.target.value }))}
                      className="filter-select secondary"
                      title="Filter by platform"
                    >
                      <option value="all">All Platforms</option>
                      {metadataOptions.platform.slice(1).map(platform => (
                        <option key={platform} value={platform}>{platform}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {metadataOptions.os && metadataOptions.os.length > 2 && (
                  <div className="secondary-filter-item">
                    <select
                      value={metadataFilters.os}
                      onChange={(e) => setMetadataFilters(prev => ({ ...prev, os: e.target.value }))}
                      className="filter-select secondary"
                      title="Filter by OS version"
                    >
                      <option value="all">All OS</option>
                      {metadataOptions.os.slice(1).map(os => (
                        <option key={os} value={os}>{os}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Active Filters Summary */}
          {activeFilterCount > 0 && (
            <div className="filter-summary">
              <div className="active-filters-display">
                <span className="active-filters-text">
                  {activeFilterCount} active filter{activeFilterCount !== 1 ? 's' : ''}
                </span>
                <button 
                  className="reset-filters-btn"
                  onClick={resetAllFilters}
                  title="Reset all filters"
                >
                  <X size={12} />
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="stats-overview">
        <div className="stat-card avg-rating">
          <div className="stat-header">
            <h3 className="stat-title">Average Rating</h3>
            <div className="stat-icon">
              {filteredAvgRating >= 4 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
            </div>
          </div>
          <div className="stat-value">{filteredAvgRating.toFixed(2)}</div>
          <p className="stat-change">Out of 5.0</p>
        </div>

        <div className="stat-card total-reviews">
          <div className="stat-header">
            <h3 className="stat-title">Total Reviews</h3>
            <div className="stat-icon">
              <Filter className="h-4 w-4" />
            </div>
          </div>
          <div className="stat-value">{filteredReviews.length.toLocaleString()}</div>
          <p className="stat-change">of {summary.totalReviews.toLocaleString()} total</p>
        </div>

        <div className="stat-card sentiment-score">
          <div className="stat-header">
            <h3 className="stat-title">Positive Sentiment</h3>
            <div className="stat-icon">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="stat-value">
            {filteredReviews.length > 0 ? 
              Math.round((filteredSentimentBreakdown.positive / filteredReviews.length) * 100) : 0}%
          </div>
          <p className="stat-change positive">{filteredSentimentBreakdown.positive} positive reviews</p>
        </div>

        <div className="stat-card response-rate">
          <div className="stat-header">
            <h3 className="stat-title">Response Rate</h3>
            <div className="stat-icon">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="stat-value">{data.responseRate || '0'}%</div>
          <p className="stat-change">Developer responses</p>
        </div>
      </div>


      {/* Charts Grid */}
      <div className="dashboard-analytics-grid">
        {/* Enhanced Rating Distribution */}
        {expandedSections.distribution && (
          <div className="analytics-card col-span-6">
            <div className="analytics-header" style={{ cursor: 'pointer' }} onClick={() => toggleSection('distribution')}>
              <h3 className="analytics-title">
                Rating Distribution
                <ChevronUp className="inline-block ml-auto" style={{ width: '16px', height: '16px' }} />
              </h3>
            </div>
            <div className="enhanced-rating-chart-container">
              <div className="rating-bars">
                {[
                  { rating: '5★', count: filteredRatingDistribution[5] || 0, color: '#10b981', label: 'Excellent' },
                  { rating: '4★', count: filteredRatingDistribution[4] || 0, color: '#22c55e', label: 'Good' },
                  { rating: '3★', count: filteredRatingDistribution[3] || 0, color: '#f59e0b', label: 'Average' },
                  { rating: '2★', count: filteredRatingDistribution[2] || 0, color: '#f97316', label: 'Poor' },
                  { rating: '1★', count: filteredRatingDistribution[1] || 0, color: '#ef4444', label: 'Terrible' }
                ].map((item, index) => {
                  const totalReviews = filteredReviews.length;
                  const percentage = totalReviews > 0 ? ((item.count / totalReviews) * 100) : 0;
                  const maxCount = Math.max(...Object.values(filteredRatingDistribution));
                  const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  const ratingNumber = item.rating.charAt(0); // Extract rating number (5, 4, 3, 2, 1)
                  const isSelected = selectedFilter === ratingNumber;
                  const isClickable = item.count > 0; // Only clickable if there are reviews
                  
                  return (
                    <div 
                      key={index} 
                      className={`rating-bar-row ${isSelected ? 'selected' : ''} ${isClickable ? 'clickable' : 'disabled'}`}
                      onClick={() => {
                        if (!isClickable) return;
                        
                        if (isSelected) {
                          // If already selected, clear the filter
                          setSelectedFilter('all');
                        } else {
                          // Select this rating filter
                          setSelectedFilter(ratingNumber);
                        }
                      }}
                      title={isClickable ? 
                        (isSelected ? `Clear ${item.rating} filter` : `Filter by ${item.rating} reviews`) : 
                        `No ${item.rating} reviews available`
                      }
                    >
                      <div className="rating-label">
                        <span className="rating-stars">{item.rating}</span>
                        <span className="rating-description">{item.label}</span>
                      </div>
                      
                      <div className="rating-bar-container">
                        <div 
                          className="rating-bar"
                          style={{ 
                            width: `${barWidth}%`,
                            background: `linear-gradient(90deg, ${item.color}88, ${item.color})`,
                            boxShadow: `0 2px 8px ${item.color}40`
                          }}
                        >
                          <div 
                            className="rating-bar-fill"
                            style={{ backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                      
                      <div className="rating-stats">
                        <span className="rating-count">{item.count.toLocaleString()}</span>
                        <span className="rating-percentage">{percentage.toFixed(1)}%</span>
                      </div>
                      
                      {/* Click indicator */}
                      {isClickable && (
                        <div className="click-indicator">
                          {isSelected ? (
                            <div className="selected-badge">
                              <span>✓</span>
                            </div>
                          ) : (
                            <div className="click-hint">
                              <span>Click to filter</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Rating Summary */}
              <div className="rating-summary">
                <div className="average-rating">
                  <span className="average-label">Average Rating</span>
                  <div className="average-value">
                    <span className="average-number">
                      {filteredReviews.length > 0 ? 
                        ((filteredRatingDistribution[5] * 5 + 
                          filteredRatingDistribution[4] * 4 + 
                          filteredRatingDistribution[3] * 3 + 
                          filteredRatingDistribution[2] * 2 + 
                          filteredRatingDistribution[1] * 1) / filteredReviews.length).toFixed(1)
                        : '0.0'
                      }
                    </span>
                    <div className="average-stars">
                      {[1,2,3,4,5].map(star => (
                        <span 
                          key={star}
                          className={`star ${star <= Math.round((filteredRatingDistribution[5] * 5 + filteredRatingDistribution[4] * 4 + filteredRatingDistribution[3] * 3 + filteredRatingDistribution[2] * 2 + filteredRatingDistribution[1] * 1) / (filteredReviews.length || 1)) ? 'filled' : 'empty'}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="total-reviews">
                  <span>{filteredReviews.length.toLocaleString()}</span>
                  <span>Total Reviews</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Sentiment Analysis */}
        {expandedSections.sentiment && filteredReviews.length > 0 && (
          <div className="analytics-card col-span-6">
            <div className="analytics-header" style={{ cursor: 'pointer' }} onClick={() => toggleSection('sentiment')}>
              <h3 className="analytics-title">
                Sentiment Insights
                <ChevronUp className="inline-block ml-auto" style={{ width: '16px', height: '16px' }} />
              </h3>
            </div>
            <div className="enhanced-sentiment-container">
              {/* Sentiment Overview */}
              <div className="sentiment-overview">
                <div className="sentiment-score">
                  <div className="sentiment-gauge">
                    <div className="gauge-track">
                      <div 
                        className="gauge-fill"
                        style={{
                          width: `${filteredReviews.length > 0 ? ((filteredSentimentBreakdown.positive / filteredReviews.length) * 100) : 0}%`,
                          background: 'linear-gradient(90deg, #ef4444, #f59e0b, #10b981)',
                          filter: `hue-rotate(${(filteredSentimentBreakdown.positive / Math.max(filteredReviews.length, 1)) * 120}deg)`
                        }}
                      />
                    </div>
                    <div className="gauge-labels">
                      <span>Negative</span>
                      <span>Neutral</span>
                      <span>Positive</span>
                    </div>
                  </div>
                  <div className="overall-sentiment">
                    <span className="sentiment-label">Overall Sentiment</span>
                    <span className={`sentiment-value ${
                      (filteredSentimentBreakdown.positive / Math.max(filteredReviews.length, 1)) >= 0.6 ? 'positive' :
                      (filteredSentimentBreakdown.negative / Math.max(filteredReviews.length, 1)) >= 0.6 ? 'negative' : 'neutral'
                    }`}>
                      {(filteredSentimentBreakdown.positive / Math.max(filteredReviews.length, 1)) >= 0.6 ? '😊 Positive' :
                       (filteredSentimentBreakdown.negative / Math.max(filteredReviews.length, 1)) >= 0.6 ? '😞 Negative' : '😐 Mixed'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Sentiment Breakdown */}
              <div className="sentiment-breakdown">
                {[
                  { 
                    name: 'Positive', 
                    count: filteredSentimentBreakdown.positive || 0, 
                    color: '#10b981', 
                    icon: '😊',
                    description: 'Customers love your product'
                  },
                  { 
                    name: 'Neutral', 
                    count: filteredSentimentBreakdown.neutral || 0, 
                    color: '#f59e0b', 
                    icon: '😐',
                    description: 'Mixed or neutral feedback'
                  },
                  { 
                    name: 'Negative', 
                    count: filteredSentimentBreakdown.negative || 0, 
                    color: '#ef4444', 
                    icon: '😞',
                    description: 'Areas needing attention'
                  }
                ].map((sentiment, index) => {
                  const totalReviews = filteredReviews.length;
                  const percentage = totalReviews > 0 ? ((sentiment.count / totalReviews) * 100) : 0;
                  const sentimentKey = sentiment.name.toLowerCase(); // 'positive', 'neutral', 'negative'
                  const isSelected = selectedFilter === sentimentKey;
                  const isClickable = sentiment.count > 0; // Only clickable if there are reviews
                  
                  return (
                    <div 
                      key={index} 
                      className={`sentiment-item ${isSelected ? 'selected' : ''} ${isClickable ? 'clickable' : 'disabled'}`}
                      onClick={() => {
                        if (!isClickable) return;
                        
                        if (isSelected) {
                          // If already selected, clear the filter
                          setSelectedFilter('all');
                        } else {
                          // Select this sentiment filter
                          setSelectedFilter(sentimentKey);
                        }
                      }}
                      title={isClickable ? 
                        (isSelected ? `Clear ${sentiment.name} sentiment filter` : `Filter by ${sentiment.name} reviews`) : 
                        `No ${sentiment.name} reviews available`
                      }
                    >
                      <div className="sentiment-header">
                        <div className="sentiment-icon">{sentiment.icon}</div>
                        <div className="sentiment-info">
                          <span className="sentiment-name">{sentiment.name}</span>
                          <span className="sentiment-desc">{sentiment.description}</span>
                        </div>
                      </div>
                      
                      <div className="sentiment-metrics">
                        <div className="sentiment-count">{sentiment.count.toLocaleString()}</div>
                        <div className="sentiment-percent" style={{ color: sentiment.color }}>
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                      
                      <div className="sentiment-bar">
                        <div 
                          className="sentiment-progress"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: sentiment.color,
                            boxShadow: `0 2px 8px ${sentiment.color}40`
                          }}
                        />
                      </div>
                      
                      {/* Click indicator */}
                      {isClickable && (
                        <div className="click-indicator sentiment-click">
                          {isSelected ? (
                            <div className="selected-badge">
                              <span>✓</span>
                            </div>
                          ) : (
                            <div className="click-hint">
                              <span>Click to filter</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>


      {/* AI Analysis Results - Displayed inline below buttons */}
      {(aiInsights || deepInsights || executiveAnalysis) && (
        <div className="ai-analysis-results-container" style={{ marginTop: '24px', marginBottom: '24px' }}>
          {aiInsights && (
            <div className="ai-analysis-result-section">
              <div className="ai-result-header">
                <Sparkles style={{ width: '20px', height: '20px', color: '#8b5cf6' }} />
                <h3>AI Insights Analysis</h3>
                <button 
                  className="close-analysis-btn"
                  onClick={() => setAiInsights(null)}
                  title="Close analysis"
                >
                  <X size={16} />
                </button>
              </div>
              <AIInsights 
                analysis={aiInsights?.analysis} 
                insights={aiInsights?.insights}
                loading={isAnalyzing}
              />
            </div>
          )}
          
          {deepInsights && (
            <div className="ai-analysis-result-section">
              <div className="ai-result-header">
                <Zap style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
                <h3>Deep Analysis Results</h3>
                <button 
                  className="close-analysis-btn"
                  onClick={() => setDeepInsights(null)}
                  title="Close analysis"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="deep-analysis-content">
                {deepInsights.themes && deepInsights.themes.length > 0 && (
                  <div className="analysis-section">
                    <h4 className="analysis-subtitle">Key Themes</h4>
                    <div className="themes-grid">
                      {deepInsights.themes.map((theme, index) => (
                        <div key={index} className="theme-card">
                          <div className="theme-header">
                            <span className="theme-name">{theme.name}</span>
                            <span className="theme-count">{theme.count} mentions</span>
                          </div>
                          <p className="theme-description">{theme.description}</p>
                          {theme.examples && theme.examples.length > 0 && (
                            <div className="theme-examples">
                              <span className="examples-label">Examples:</span>
                              <ul>
                                {theme.examples.slice(0, 2).map((example, idx) => (
                                  <li key={idx}>"{example}"</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {deepInsights.summary && (
                  <div className="analysis-section">
                    <h4 className="analysis-subtitle">Summary</h4>
                    <p className="analysis-text">{deepInsights.summary}</p>
                  </div>
                )}
                
                {deepInsights.recommendations && deepInsights.recommendations.length > 0 && (
                  <div className="analysis-section">
                    <h4 className="analysis-subtitle">Recommendations</h4>
                    <div className="recommendations-list">
                      {deepInsights.recommendations.map((rec, index) => (
                        <div key={index} className="recommendation-item">
                          <div className={`recommendation-priority priority-${rec.priority?.toLowerCase() || 'medium'}`}>
                            {rec.priority || 'Medium'}
                          </div>
                          <div className="recommendation-content">
                            <h5>{rec.title}</h5>
                            <p>{rec.description}</p>
                            {rec.impact && <span className="recommendation-impact">Impact: {rec.impact}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {executiveAnalysis && (
            <div className="ai-analysis-result-section">
              <div className="ai-result-header">
                <Shield style={{ width: '20px', height: '20px', color: '#10b981' }} />
                <h3>Executive Analysis Report</h3>
                <button 
                  className="close-analysis-btn"
                  onClick={() => setExecutiveAnalysis(null)}
                  title="Close analysis"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="executive-analysis-content">
                {executiveAnalysis.overview && (
                  <div className="analysis-section executive-overview">
                    <h4 className="analysis-subtitle">Executive Overview</h4>
                    <p className="analysis-text">{executiveAnalysis.overview}</p>
                  </div>
                )}
                
                {executiveAnalysis.keyMetrics && (
                  <div className="analysis-section">
                    <h4 className="analysis-subtitle">Key Metrics</h4>
                    <div className="metrics-grid">
                      {Object.entries(executiveAnalysis.keyMetrics).map(([key, value]) => (
                        <div key={key} className="metric-card">
                          <span className="metric-label">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="metric-value">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {executiveAnalysis.strengths && executiveAnalysis.strengths.length > 0 && (
                  <div className="analysis-section">
                    <h4 className="analysis-subtitle">Strengths</h4>
                    <ul className="executive-list strengths-list">
                      {executiveAnalysis.strengths.map((strength, index) => (
                        <li key={index}>
                          <CheckCircle size={16} className="list-icon positive" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {executiveAnalysis.weaknesses && executiveAnalysis.weaknesses.length > 0 && (
                  <div className="analysis-section">
                    <h4 className="analysis-subtitle">Areas for Improvement</h4>
                    <ul className="executive-list weaknesses-list">
                      {executiveAnalysis.weaknesses.map((weakness, index) => (
                        <li key={index}>
                          <AlertCircle size={16} className="list-icon negative" />
                          {weakness}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {executiveAnalysis.recommendations && executiveAnalysis.recommendations.length > 0 && (
                  <div className="analysis-section">
                    <h4 className="analysis-subtitle">Strategic Recommendations</h4>
                    <div className="executive-recommendations">
                      {executiveAnalysis.recommendations.map((rec, index) => (
                        <div key={index} className="executive-recommendation">
                          <div className="recommendation-number">{index + 1}</div>
                          <div className="recommendation-details">
                            <h5>{rec.title || rec}</h5>
                            {rec.description && <p>{rec.description}</p>}
                            {rec.timeline && <span className="timeline">Timeline: {rec.timeline}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {filteredReviews && filteredReviews.length > 0 && (
        <>
          {/* Sentiment Trends Analysis - Display Above Reviews */}
          <SentimentTrends reviews={filteredReviews} />
          
          {/* Review Display Section */}
          <div className="review-display-section">
            {useEnhancedReviewDisplay ? (
              <ReviewDisplay reviews={filteredReviews} searchTerm={searchTerm} />
            ) : (
              <CategorizedReviews reviews={filteredReviews} searchTerm={searchTerm} />
            )}
          </div>
        </>
      )}

      {/* Removed modals - Analysis now shows inline */}
        </>
      )}
      
      {/* Word Cloud View */}
      {currentView === 'wordcloud' && data?.topKeywords && data.topKeywords.length > 0 && (
        <div className="wordcloud-view">
          <div className="view-header">
            <h1 className="view-title">Word Cloud Analysis</h1>
            <p className="view-subtitle">Interactive visualization of most frequently mentioned terms in {filteredReviews.length} reviews</p>
          </div>
          <div className="wordcloud-container-main">
            <KeywordCloud keywords={data.topKeywords} reviews={filteredReviews} />
          </div>
        </div>
      )}
      
      {/* All Reviews View */}
      {currentView === 'reviews' && filteredReviews && (
        <div className="all-reviews-view">
          <div className="view-header">
            <h1 className="view-title">All Reviews</h1>
            <p className="view-subtitle">Browse through all {filteredReviews.length} customer reviews</p>
          </div>
          <ReviewDisplay reviews={filteredReviews} searchTerm={searchTerm} />
        </div>
      )}
      
      {/* AI Insights View */}
      {currentView === 'insights' && (
        <div className="insights-view">
          <div className="view-header">
            <h1 className="view-title">AI Insights</h1>
            <p className="view-subtitle">Advanced analysis powered by artificial intelligence</p>
          </div>
          <div className="insights-actions">
            <button
              onClick={triggerAIAnalysis}
              disabled={isAnalyzing}
              className="analysis-button primary"
            >
              {isAnalyzing ? (
                <><RefreshCw className="spin" size={16} /> Analyzing...</>
              ) : (
                <><Brain size={16} /> Generate AI Insights</>
              )}
            </button>
            <button
              onClick={triggerDeepAnalysis}
              disabled={isDeepAnalyzing}
              className="analysis-button secondary"
            >
              {isDeepAnalyzing ? (
                <><RefreshCw className="spin" size={16} /> Deep Analyzing...</>
              ) : (
                <><Zap size={16} /> Deep Analysis</>
              )}
            </button>
            <button
              onClick={triggerExecutiveAnalysis}
              disabled={isExecutiveAnalyzing}
              className="analysis-button executive"
            >
              {isExecutiveAnalyzing ? (
                <><RefreshCw className="spin" size={16} /> Generating Report...</>
              ) : (
                <><Target size={16} /> Executive Summary</>
              )}
            </button>
          </div>
          {(aiInsights || deepInsights || executiveAnalysis) && (
            <div className="insights-results">
              {aiInsights && <AIInsights insights={aiInsights} />}
              {deepInsights && (
                <div className="deep-analysis-results">
                  <h3>Deep Analysis Results</h3>
                  <pre>{JSON.stringify(deepInsights, null, 2)}</pre>
                </div>
              )}
              {executiveAnalysis && (
                <div className="executive-analysis-results">
                  <div dangerouslySetInnerHTML={{ __html: executiveAnalysis }} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
        </>
      )}
        </div>
      </div>
    </div>
  );
};


export default EnhancedDashboard;