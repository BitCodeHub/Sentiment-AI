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
  ChevronDown, ChevronUp, X, Download, RefreshCw, Calendar, CheckCircle, Star
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
import Sidebar from './Sidebar';
import WordsAnalysis from './WordsAnalysis';
import './EnhancedDashboard.css';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

const EnhancedDashboard = ({ data, isLoading }) => {
  // Sidebar and view state
  const [activeView, setActiveView] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Word click state
  const [selectedWord, setSelectedWord] = useState(null);
  const [showWordReviews, setShowWordReviews] = useState(false);
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
  const [platformFilter, setPlatformFilter] = useState('all'); // New platform filter state
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
    ai: true
  });
  // Enhanced review display is always enabled
  const useEnhancedReviewDisplay = true;
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState({ start: null, end: null });
  const dateRangeRef = useRef(null);

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

  // State for emotion visualizer
  const [hoveredReview, setHoveredReview] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [emotionDateRange, setEmotionDateRange] = useState({ start: null, end: null });
  const [showEmotionDatePicker, setShowEmotionDatePicker] = useState(false);
  const emotionDateRef = useRef(null);
  const emotionVisualizerRef = useRef(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Smart sampling for emotion visualizer (max 50 points for optimal performance)
  const sampleReviews = useCallback((reviews, maxPoints = 50) => {
    if (reviews.length <= maxPoints) return reviews;
    
    // Stratified sampling to ensure we get representation from all ratings
    const byRating = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    reviews.forEach(review => {
      const rating = review.rating || review.Rating || 3;
      if (byRating[rating]) byRating[rating].push(review);
    });
    
    const sampledReviews = [];
    const pointsPerRating = Math.floor(maxPoints / 5);
    
    Object.keys(byRating).forEach(rating => {
      const ratingReviews = byRating[rating];
      if (ratingReviews.length <= pointsPerRating) {
        sampledReviews.push(...ratingReviews);
      } else {
        // Random sampling within each rating group
        const shuffled = [...ratingReviews].sort(() => Math.random() - 0.5);
        sampledReviews.push(...shuffled.slice(0, pointsPerRating));
      }
    });
    
    return sampledReviews;
  }, []);

  // Filter reviews by emotion visualizer date range
  const emotionFilteredReviews = useMemo(() => {
    let reviews = filteredReviews;
    
    // Apply emotion-specific date filtering
    if (emotionDateRange.start || emotionDateRange.end) {
      reviews = reviews.filter(review => {
        const reviewDate = new Date(review.date || review.Date || review['Review Date']);
        if (isNaN(reviewDate.getTime())) return true;
        
        if (emotionDateRange.start && emotionDateRange.end) {
          return reviewDate >= new Date(emotionDateRange.start) && reviewDate <= new Date(emotionDateRange.end);
        } else if (emotionDateRange.start) {
          return reviewDate >= new Date(emotionDateRange.start);
        } else if (emotionDateRange.end) {
          return reviewDate <= new Date(emotionDateRange.end);
        }
        return true;
      });
    }
    
    return sampleReviews(reviews);
  }, [filteredReviews, emotionDateRange, sampleReviews]);

  // Calculate emotion positions for sampled reviews
  const emotionData = useMemo(() => {
    if (!emotionFilteredReviews || emotionFilteredReviews.length === 0) return [];
    
    const emotions = {
      'joy': { x: 80, y: 20, color: '#10b981', label: 'Joy' },
      'satisfaction': { x: 75, y: 35, color: '#22c55e', label: 'Satisfaction' },
      'neutral': { x: 50, y: 50, color: '#6b7280', label: 'Neutral' },
      'frustration': { x: 25, y: 65, color: '#f59e0b', label: 'Frustration' },
      'anger': { x: 15, y: 85, color: '#ef4444', label: 'Anger' },
      'disappointment': { x: 30, y: 75, color: '#f97316', label: 'Disappointment' }
    };
    
    return emotionFilteredReviews.map((review, index) => {
      const rating = review.rating || review.Rating || 0;
      const content = review.content || review.Content || review.Review || '';
      
      // Determine emotion based on rating and content keywords
      let emotion = 'neutral';
      if (rating >= 5) emotion = 'joy';
      else if (rating >= 4) emotion = 'satisfaction';
      else if (rating === 3) emotion = 'neutral';
      else if (rating === 2) emotion = 'frustration';
      else if (rating === 1) {
        if (content.toLowerCase().includes('angry') || content.toLowerCase().includes('terrible') || 
            content.toLowerCase().includes('awful') || content.toLowerCase().includes('worst')) {
          emotion = 'anger';
        } else {
          emotion = 'disappointment';
        }
      }
      
      // Add consistent randomness based on review content hash for better scatter
      const contentHash = content.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
      const jitter = 25; // Increased jitter for better scatter distribution
      const basePosition = emotions[emotion];
      
      // Use golden ratio for better distribution
      const goldenRatio = 1.618033988749895;
      const theta = index * goldenRatio * 2 * Math.PI;
      const radius = (index / emotionFilteredReviews.length) * jitter;
      
      const randomX = basePosition.x + Math.cos(theta) * radius;
      const randomY = basePosition.y + Math.sin(theta) * radius;
      
      // Add some content-based variation for uniqueness
      const contentVariationX = ((contentHash % 100) / 100 - 0.5) * 8;
      const contentVariationY = ((contentHash % 97) / 97 - 0.5) * 8;
      
      const x = Math.max(5, Math.min(95, randomX + contentVariationX));
      const y = Math.max(5, Math.min(95, randomY + contentVariationY));
      
      return {
        ...review,
        id: `emotion-${index}`,
        emotion,
        x,
        y,
        color: emotions[emotion].color,
        emotionLabel: emotions[emotion].label,
        rating: rating,
        content: content.slice(0, 200) + (content.length > 200 ? '...' : ''),
        date: review.date || review.Date || review['Review Date'] || new Date().toISOString()
      };
    });
  }, [emotionFilteredReviews]);

  // Handle mouse movement for tooltip positioning
  const handleMouseMove = useCallback((e) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
    
    // Calculate tooltip position relative to container
    if (emotionVisualizerRef.current && hoveredReview) {
      const container = emotionVisualizerRef.current.getBoundingClientRect();
      const tooltipWidth = 350;
      const tooltipHeight = 200;
      const margin = 15;
      
      let x = e.clientX - container.left + margin;
      let y = e.clientY - container.top - margin;
      
      // Adjust if tooltip would go outside right edge
      if (x + tooltipWidth > container.width - margin) {
        x = e.clientX - container.left - tooltipWidth - margin;
      }
      
      // Adjust if tooltip would go outside bottom edge
      if (y + tooltipHeight > container.height - margin) {
        y = e.clientY - container.top - tooltipHeight - margin;
      }
      
      // Ensure tooltip doesn't go outside left edge
      if (x < margin) {
        x = margin;
      }
      
      // Ensure tooltip doesn't go outside top edge
      if (y < margin) {
        y = margin;
      }
      
      setTooltipPosition({ x, y });
    }
  }, [hoveredReview]);
  
  // Handle emotion date range changes
  const handleEmotionDateRangeChange = useCallback((dateRange) => {
    setEmotionDateRange(dateRange);
    if (dateRange.start && dateRange.end) {
      setShowEmotionDatePicker(false);
    }
  }, []);

  // Clear emotion date range
  const clearEmotionDateRange = useCallback(() => {
    setEmotionDateRange({ start: null, end: null });
    setShowEmotionDatePicker(false);
  }, []);

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

  // Calculate average ratings for specific apps
  const appAverageRatings = useMemo(() => {
    const appRatings = {
      myHyundai: { total: 0, count: 0, average: 0 },
      genesis: { total: 0, count: 0, average: 0 }
    };
    
    // Debug: Log unique app names to see what's in the data
    const uniqueApps = new Set();
    const uniqueStores = new Set();
    filteredReviews.forEach(review => {
      const appName = review.appName || review.App || '';
      const store = review['App Store'] || review.Store || '';
      if (appName) uniqueApps.add(appName);
      if (store) uniqueStores.add(store);
    });
    console.log('Unique app names in data:', Array.from(uniqueApps));
    console.log('Unique stores in data:', Array.from(uniqueStores));
    
    filteredReviews.forEach(review => {
      const appName = review.appName || review.App || '';
      const rating = review.rating || review.Rating || 0;
      const store = review['App Store'] || review.Store || '';
      
      // Apply platform filter
      if (platformFilter !== 'all') {
        if (platformFilter === 'ios' && store !== 'iOS') return;
        if (platformFilter === 'android' && store !== 'Google Play') return;
      }
      
      // Check for MyHyundai with Bluelink (both variations)
      if (appName === 'MyHyundai with Blue Link' || appName === 'MyHyundai with Bluelink') {
        appRatings.myHyundai.total += rating;
        appRatings.myHyundai.count++;
      }
      
      // Check for Genesis Intelligent App - also check for variations
      if (appName === 'Genesis Intelligent App' || 
          appName === 'Genesis Intelligent Assistant' ||
          appName.toLowerCase().includes('genesis')) {
        appRatings.genesis.total += rating;
        appRatings.genesis.count++;
      }
    });
    
    // Calculate averages
    if (appRatings.myHyundai.count > 0) {
      appRatings.myHyundai.average = appRatings.myHyundai.total / appRatings.myHyundai.count;
    }
    
    if (appRatings.genesis.count > 0) {
      appRatings.genesis.average = appRatings.genesis.total / appRatings.genesis.count;
    }
    
    console.log(`App ratings calculated (${platformFilter}):`, {
      myHyundai: appRatings.myHyundai,
      genesis: appRatings.genesis
    });
    
    return appRatings;
  }, [filteredReviews, platformFilter]);

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

  // Click outside handler for emotion date picker
  useEffect(() => {
    if (!showEmotionDatePicker) return;
    
    const handleClickOutside = (event) => {
      const popup = document.querySelector('.emotion-date-picker-popup');
      const button = emotionDateRef.current;
      
      if ((button && button.contains(event.target)) || 
          (popup && popup.contains(event.target))) {
        return;
      }
      
      setShowEmotionDatePicker(false);
    };
    
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showEmotionDatePicker]);

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

  if (!data || !data.summary) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No data available. Please upload a CSV file to see analytics.
        </AlertDescription>
      </Alert>
    );
  }

  const { summary, reviews = [] } = data;

  return (
    <div className="modern-dashboard">
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className={`dashboard-content dashboard-with-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Conditional rendering based on active view */}
        {activeView === 'overview' && (
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

      {/* Emotion Visualizer */}
      <div className="emotion-visualizer-container" ref={emotionVisualizerRef}>
        <div className="emotion-visualizer-header">
          <div className="visualizer-title">
            <Brain className="h-5 w-5" style={{ color: '#3b82f6' }} />
            <h2>Emotion Visualizer</h2>
            <span className="visualizer-subtitle">{emotionData.length} emotions mapped</span>
          </div>
          <div className="emotion-controls">
            <div className="emotion-date-filter">
              <button 
                ref={emotionDateRef}
                className="emotion-date-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEmotionDatePicker(!showEmotionDatePicker);
                }}
                title="Filter emotions by date range"
              >
                <Calendar size={14} />
                <span className="date-range-value">
                  {emotionDateRange.start && emotionDateRange.end 
                    ? `${new Date(emotionDateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(emotionDateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : 'Filter by Date'
                  }
                </span>
                <ChevronDown size={14} className={`chevron-icon ${showEmotionDatePicker ? 'rotated' : ''}`} />
              </button>
              {(emotionDateRange.start || emotionDateRange.end) && (
                <button 
                  className="clear-emotion-date"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearEmotionDateRange();
                  }}
                  title="Clear date filter"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="emotion-legend">
              <div className="legend-item joy"><div className="legend-dot" style={{ backgroundColor: '#10b981' }}></div><span>Joy</span></div>
              <div className="legend-item satisfaction"><div className="legend-dot" style={{ backgroundColor: '#22c55e' }}></div><span>Satisfaction</span></div>
              <div className="legend-item neutral"><div className="legend-dot" style={{ backgroundColor: '#6b7280' }}></div><span>Neutral</span></div>
              <div className="legend-item frustration"><div className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></div><span>Frustration</span></div>
              <div className="legend-item disappointment"><div className="legend-dot" style={{ backgroundColor: '#f97316' }}></div><span>Disappointment</span></div>
              <div className="legend-item anger"><div className="legend-dot" style={{ backgroundColor: '#ef4444' }}></div><span>Anger</span></div>
            </div>
          </div>
        </div>
        
        <div className="emotion-visualizer-chart" onMouseMove={handleMouseMove}>
          {/* Emotion zones background */}
          <div className="emotion-zones">
            <div className="emotion-zone joy-zone" style={{ background: 'radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.1) 20%, transparent 45%)' }}></div>
            <div className="emotion-zone satisfaction-zone" style={{ background: 'radial-gradient(circle at 75% 35%, rgba(34, 197, 94, 0.08) 25%, transparent 50%)' }}></div>
            <div className="emotion-zone neutral-zone" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(107, 114, 128, 0.06) 30%, transparent 55%)' }}></div>
            <div className="emotion-zone frustration-zone" style={{ background: 'radial-gradient(circle at 25% 65%, rgba(245, 158, 11, 0.08) 25%, transparent 50%)' }}></div>
            <div className="emotion-zone anger-zone" style={{ background: 'radial-gradient(circle at 15% 85%, rgba(239, 68, 68, 0.1) 20%, transparent 45%)' }}></div>
            <div className="emotion-zone disappointment-zone" style={{ background: 'radial-gradient(circle at 30% 75%, rgba(249, 115, 22, 0.08) 22%, transparent 47%)' }}></div>
          </div>
          
          {/* Axis labels */}
          <div className="axis-labels">
            <div className="axis-label positive-axis">Positive Experience →</div>
            <div className="axis-label negative-axis">← Negative Experience</div>
            <div className="axis-label high-energy">↑ High Energy</div>
            <div className="axis-label low-energy">Low Energy ↓</div>
          </div>
          
          {/* Review dots */}
          {emotionData.map((review, index) => (
            <div
              key={review.id}
              className={`emotion-dot ${review.emotion} ${hoveredReview?.id === review.id ? 'hovered' : ''}`}
              style={{
                left: `${review.x}%`,
                top: `${review.y}%`,
                backgroundColor: review.color,
                boxShadow: `0 0 20px ${review.color}40`,
                animationDelay: `${index * 0.05}s`
              }}
              onMouseEnter={(e) => {
                e.stopPropagation();
                setHoveredReview(review);
                
                // Calculate initial tooltip position
                if (emotionVisualizerRef.current) {
                  const container = emotionVisualizerRef.current.getBoundingClientRect();
                  const tooltipWidth = 350;
                  const tooltipHeight = 200;
                  const margin = 15;
                  
                  let x = e.clientX - container.left + margin;
                  let y = e.clientY - container.top - margin;
                  
                  // Adjust if tooltip would go outside right edge
                  if (x + tooltipWidth > container.width - margin) {
                    x = e.clientX - container.left - tooltipWidth - margin;
                  }
                  
                  // Adjust if tooltip would go outside bottom edge
                  if (y + tooltipHeight > container.height - margin) {
                    y = e.clientY - container.top - tooltipHeight - margin;
                  }
                  
                  // Ensure tooltip doesn't go outside left edge
                  if (x < margin) {
                    x = margin;
                  }
                  
                  // Ensure tooltip doesn't go outside top edge
                  if (y < margin) {
                    y = margin;
                  }
                  
                  setTooltipPosition({ x, y });
                }
              }}
              onMouseLeave={(e) => {
                e.stopPropagation();
                setHoveredReview(null);
              }}
              title={`${review.rating}★ - ${review.emotionLabel}`}
            />
          ))}
          
          {/* Emotion zone labels */}
          <div className="zone-labels">
            <div className="zone-label joy-label" style={{ left: '80%', top: '15%' }}>Joy</div>
            <div className="zone-label satisfaction-label" style={{ left: '75%', top: '30%' }}>Satisfaction</div>
            <div className="zone-label neutral-label" style={{ left: '50%', top: '45%' }}>Neutral</div>
            <div className="zone-label frustration-label" style={{ left: '25%', top: '60%' }}>Frustration</div>
            <div className="zone-label disappointment-label" style={{ left: '30%', top: '70%' }}>Disappointment</div>
            <div className="zone-label anger-label" style={{ left: '15%', top: '80%' }}>Anger</div>
          </div>
        </div>
        
        {/* Emotion Date Picker */}
        {showEmotionDatePicker && createPortal(
          <div 
            className="emotion-date-picker-overlay"
            onClick={() => setShowEmotionDatePicker(false)}
          >
            <div 
              className="emotion-date-picker-popup"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="date-picker-header">
                <h4>Filter Emotions by Date</h4>
                <button 
                  className="close-date-picker"
                  onClick={() => setShowEmotionDatePicker(false)}
                  title="Close date picker"
                >
                  <X size={16} />
                </button>
              </div>
              <DateRangeCalendar
                reviews={filteredReviews}
                onDateRangeChange={handleEmotionDateRangeChange}
                initialRange={emotionDateRange}
                showDisplay={false}
                inline={true}
              />
            </div>
          </div>,
          document.body
        )}
        
        {/* Review tooltip */}
        {hoveredReview && (
          <div 
            className="review-tooltip"
            style={{
              position: 'absolute',
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              zIndex: 10001,
              pointerEvents: 'none'
            }}
          >
            <div className="tooltip-header">
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map(star => (
                  <span 
                    key={star} 
                    className={`star ${star <= hoveredReview.rating ? 'filled' : ''}`}
                    style={{ color: star <= hoveredReview.rating ? '#fbbf24' : '#d1d5db' }}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="emotion-badge" style={{ backgroundColor: hoveredReview.color }}>
                {hoveredReview.emotionLabel}
              </span>
            </div>
            <div className="tooltip-content">
              <p>"{hoveredReview.content}"</p>
            </div>
            <div className="tooltip-footer">
              <span className="review-date">
                {new Date(hoveredReview.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </span>
            </div>
          </div>
        )}
      </div>


      {/* Summary Stats Bar */}
      <div className="summary-stats-bar">
        <div className="summary-stat">
          <span className="stat-label">Avg Rating</span>
          <span className="stat-value">{filteredAvgRating.toFixed(2)}</span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Total Reviews</span>
          <span className="stat-value">{filteredReviews.length.toLocaleString()}</span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Positive</span>
          <span className="stat-value">
            {filteredReviews.length > 0 ? 
              Math.round((filteredSentimentBreakdown.positive / filteredReviews.length) * 100) : 0}%
          </span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Response Rate</span>
          <span className="stat-value">{data.responseRate || '0'}%</span>
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
              
              {/* App-specific Average Ratings */}
              <div className="app-ratings-section">
                {/* Platform Filter */}
                <div className="platform-filter">
                  <button 
                    className={`platform-btn ${platformFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setPlatformFilter('all')}
                  >
                    All Platforms
                  </button>
                  <button 
                    className={`platform-btn ${platformFilter === 'ios' ? 'active' : ''}`}
                    onClick={() => setPlatformFilter('ios')}
                  >
                    iOS
                  </button>
                  <button 
                    className={`platform-btn ${platformFilter === 'android' ? 'active' : ''}`}
                    onClick={() => setPlatformFilter('android')}
                  >
                    Android
                  </button>
                </div>
                
                <div className="app-ratings">
                  {appAverageRatings.myHyundai.count > 0 && (
                    <div className="app-rating-item">
                      <div className="app-name">MyHyundai with Bluelink</div>
                      <div className="app-rating-value">
                        <span className="app-rating-number">
                          {appAverageRatings.myHyundai.average.toFixed(1)}
                        </span>
                        <span className="app-rating-stars">
                          {[1,2,3,4,5].map(star => (
                            <span 
                              key={star}
                              className={`star ${star <= Math.round(appAverageRatings.myHyundai.average) ? 'filled' : 'empty'}`}
                            >
                              ★
                            </span>
                          ))}
                        </span>
                      </div>
                      <div className="app-review-count">
                        {appAverageRatings.myHyundai.count} reviews
                        {platformFilter !== 'all' && (
                          <span className="platform-label">
                            {' '}• {platformFilter === 'ios' ? 'iOS' : 'Android'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {appAverageRatings.genesis.count > 0 && (
                    <div className="app-rating-item">
                      <div className="app-name">Genesis Intelligent Assistant</div>
                      <div className="app-rating-value">
                        <span className="app-rating-number">
                          {appAverageRatings.genesis.average.toFixed(1)}
                        </span>
                        <span className="app-rating-stars">
                          {[1,2,3,4,5].map(star => (
                            <span 
                              key={star}
                              className={`star ${star <= Math.round(appAverageRatings.genesis.average) ? 'filled' : 'empty'}`}
                            >
                              ★
                            </span>
                          ))}
                        </span>
                      </div>
                      <div className="app-review-count">
                        {appAverageRatings.genesis.count} reviews
                        {platformFilter !== 'all' && (
                          <span className="platform-label">
                            {' '}• {platformFilter === 'ios' ? 'iOS' : 'Android'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {appAverageRatings.myHyundai.count === 0 && appAverageRatings.genesis.count === 0 && (
                    <div className="no-app-data">
                      No {platformFilter !== 'all' ? `${platformFilter === 'ios' ? 'iOS' : 'Android'} ` : ''}reviews found for Hyundai or Genesis apps
                    </div>
                  )}
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
        </>
        )}

        {/* Emotion View */}
        {activeView === 'emotion' && (
          <>
            {/* Enhanced Header with Search and Filters */}
            <div className="dashboard-header-section">
            <div className="dashboard-title-area">
              <h1 className="dashboard-title">Emotion Analysis</h1>
              <p className="dashboard-subtitle">Visualize customer emotions from {summary.totalReviews.toLocaleString()} reviews</p>
            </div>
            
            {/* Search Section */}
            <div className="search-section">
              <Search className="search-icon" size={20} />
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
          </div>

          {/* Emotion Visualizer */}
          <div className="emotion-visualizer-container" ref={emotionVisualizerRef}>
            <div className="emotion-visualizer-header">
              <div className="visualizer-title">
                <Brain className="h-5 w-5" style={{ color: '#3b82f6' }} />
                <h2>Emotion Visualizer</h2>
                <span className="visualizer-subtitle">{emotionData.length} emotions mapped</span>
              </div>
              <div className="emotion-controls">
                <div className="emotion-date-filter">
                  <button 
                    ref={emotionDateRef}
                    className="emotion-date-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEmotionDatePicker(!showEmotionDatePicker);
                    }}
                    title="Filter emotions by date range"
                  >
                    <Calendar size={14} />
                    <span className="date-range-value">
                      {emotionDateRange.start && emotionDateRange.end 
                        ? `${new Date(emotionDateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(emotionDateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : 'Filter by Date'
                      }
                    </span>
                    <ChevronDown size={14} className={`chevron-icon ${showEmotionDatePicker ? 'rotated' : ''}`} />
                  </button>
                  {(emotionDateRange.start || emotionDateRange.end) && (
                    <button 
                      className="clear-emotion-date"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearEmotionDateRange();
                      }}
                      title="Clear date filter"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="emotion-legend">
                  <div className="legend-item joy"><div className="legend-dot" style={{ backgroundColor: '#10b981' }}></div><span>Joy</span></div>
                  <div className="legend-item satisfaction"><div className="legend-dot" style={{ backgroundColor: '#22c55e' }}></div><span>Satisfaction</span></div>
                  <div className="legend-item neutral"><div className="legend-dot" style={{ backgroundColor: '#6b7280' }}></div><span>Neutral</span></div>
                  <div className="legend-item frustration"><div className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></div><span>Frustration</span></div>
                  <div className="legend-item disappointment"><div className="legend-dot" style={{ backgroundColor: '#f97316' }}></div><span>Disappointment</span></div>
                  <div className="legend-item anger"><div className="legend-dot" style={{ backgroundColor: '#ef4444' }}></div><span>Anger</span></div>
                </div>
              </div>
            </div>
            
            <div className="emotion-visualizer-chart" onMouseMove={handleMouseMove}>
              {/* Emotion zones background */}
              <div className="emotion-zones">
                <div className="emotion-zone joy-zone" style={{ background: 'radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.1) 20%, transparent 45%)' }}></div>
                <div className="emotion-zone satisfaction-zone" style={{ background: 'radial-gradient(circle at 75% 35%, rgba(34, 197, 94, 0.08) 25%, transparent 50%)' }}></div>
                <div className="emotion-zone neutral-zone" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(107, 114, 128, 0.06) 30%, transparent 55%)' }}></div>
                <div className="emotion-zone frustration-zone" style={{ background: 'radial-gradient(circle at 25% 65%, rgba(245, 158, 11, 0.08) 25%, transparent 50%)' }}></div>
                <div className="emotion-zone anger-zone" style={{ background: 'radial-gradient(circle at 15% 85%, rgba(239, 68, 68, 0.1) 20%, transparent 45%)' }}></div>
                <div className="emotion-zone disappointment-zone" style={{ background: 'radial-gradient(circle at 30% 75%, rgba(249, 115, 22, 0.08) 22%, transparent 47%)' }}></div>
              </div>
              
              {/* Axis labels */}
              <div className="axis-labels">
                <div className="axis-label positive-axis">Positive Experience →</div>
                <div className="axis-label negative-axis">← Negative Experience</div>
                <div className="axis-label high-energy">↑ High Energy</div>
                <div className="axis-label low-energy">Low Energy ↓</div>
              </div>
              
              {/* Review dots */}
              {emotionData.map((review, index) => (
                <div
                  key={review.id}
                  className={`emotion-dot ${review.emotion} ${hoveredReview?.id === review.id ? 'hovered' : ''}`}
                  style={{
                    left: `${review.x}%`,
                    top: `${review.y}%`,
                    backgroundColor: review.color,
                    boxShadow: `0 0 20px ${review.color}40`,
                    animationDelay: `${index * 0.05}s`
                  }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    setHoveredReview(review);
                    
                    // Calculate initial tooltip position
                    if (emotionVisualizerRef.current) {
                      const container = emotionVisualizerRef.current.getBoundingClientRect();
                      const tooltipWidth = 350;
                      const tooltipHeight = 200;
                      const margin = 15;
                      
                      let x = e.clientX - container.left + margin;
                      let y = e.clientY - container.top - margin;
                      
                      // Adjust if tooltip would go outside right edge
                      if (x + tooltipWidth > container.width - margin) {
                        x = e.clientX - container.left - tooltipWidth - margin;
                      }
                      
                      // Adjust if tooltip would go outside bottom edge
                      if (y + tooltipHeight > container.height - margin) {
                        y = e.clientY - container.top - tooltipHeight - margin;
                      }
                      
                      // Ensure tooltip doesn't go outside left edge
                      if (x < margin) {
                        x = margin;
                      }
                      
                      // Ensure tooltip doesn't go outside top edge
                      if (y < margin) {
                        y = margin;
                      }
                      
                      setTooltipPosition({ x, y });
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation();
                    setHoveredReview(null);
                  }}
                  title={`${review.rating}★ - ${review.emotionLabel}`}
                />
              ))}
              
              {/* Emotion zone labels */}
              <div className="zone-labels">
                <div className="zone-label joy-label" style={{ left: '80%', top: '15%' }}>Joy</div>
                <div className="zone-label satisfaction-label" style={{ left: '75%', top: '30%' }}>Satisfaction</div>
                <div className="zone-label neutral-label" style={{ left: '50%', top: '45%' }}>Neutral</div>
                <div className="zone-label frustration-label" style={{ left: '25%', top: '60%' }}>Frustration</div>
                <div className="zone-label disappointment-label" style={{ left: '30%', top: '70%' }}>Disappointment</div>
                <div className="zone-label anger-label" style={{ left: '15%', top: '80%' }}>Anger</div>
              </div>
            </div>
            
            {/* Emotion Date Picker */}
            {showEmotionDatePicker && createPortal(
              <div 
                className="emotion-date-picker-overlay"
                onClick={() => setShowEmotionDatePicker(false)}
              >
                <div 
                  className="emotion-date-picker-popup"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="date-picker-header">
                    <h4>Filter Emotions by Date</h4>
                    <button 
                      className="close-date-picker"
                      onClick={() => setShowEmotionDatePicker(false)}
                      title="Close date picker"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <DateRangeCalendar
                    reviews={filteredReviews}
                    onDateRangeChange={handleEmotionDateRangeChange}
                    initialRange={emotionDateRange}
                    showDisplay={false}
                    inline={true}
                  />
                </div>
              </div>,
              document.body
            )}
            
            {/* Review tooltip */}
            {hoveredReview && (
              <div 
                className="review-tooltip"
                style={{
                  position: 'absolute',
                  left: `${tooltipPosition.x}px`,
                  top: `${tooltipPosition.y}px`,
                  zIndex: 10001,
                  pointerEvents: 'none'
                }}
              >
                <div className="tooltip-header">
                  <div className="rating-stars">
                    {[1, 2, 3, 4, 5].map(star => (
                      <span 
                        key={star} 
                        className={`star ${star <= hoveredReview.rating ? 'filled' : ''}`}
                        style={{ color: star <= hoveredReview.rating ? '#fbbf24' : '#d1d5db' }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="emotion-badge" style={{ backgroundColor: hoveredReview.color }}>
                    {hoveredReview.emotionLabel}
                  </span>
                </div>
                <div className="tooltip-content">
                  <p>"{hoveredReview.content}"</p>
                </div>
                <div className="tooltip-footer">
                  <span className="review-date">
                    {new Date(hoveredReview.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>
          </>
        )}

        {/* Words View */}
        {activeView === 'words' && (
          <>
            <div className="dashboard-header-section">
            <div className="dashboard-title-area">
              <h1 className="dashboard-title">Words Analysis</h1>
              <p className="dashboard-subtitle">Discover key themes from {summary.totalReviews.toLocaleString()} reviews</p>
            </div>
          </div>
          <WordsAnalysis 
            reviews={filteredReviews} 
            onWordClick={(word) => {
              setSelectedWord(word);
              setShowWordReviews(true);
            }}
          />
          </>
        )}

        {/* Trends View */}
        {activeView === 'trends' && (
          <>
          <div className="dashboard-header-section">
            <div className="dashboard-title-area">
              <h1 className="dashboard-title">Sentiment Trends</h1>
              <p className="dashboard-subtitle">Track sentiment changes over time</p>
            </div>
          </div>
          <SentimentTrends 
            reviews={filteredReviews} 
            dateRange={selectedDateRange}
            onDateRangeChange={handleDateRangeChange}
          />
          </>
        )}

        {/* Reviews View */}
        {activeView === 'reviews' && (
          <>
          <div className="dashboard-header-section">
            <div className="dashboard-title-area">
              <h1 className="dashboard-title">All Reviews</h1>
              <p className="dashboard-subtitle">Browse and search through {filteredReviews.length.toLocaleString()} reviews</p>
            </div>
            
            {/* Search Section */}
            <div className="search-section">
              <Search className="search-icon" size={20} />
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
          </div>
          <ReviewDisplay reviews={filteredReviews} searchTerm={searchTerm} />
          </>
        )}

        {/* AI Insights View */}
        {activeView === 'insights' && (
          <>
            <div className="dashboard-header-section">
            <div className="dashboard-title-area">
              <h1 className="dashboard-title">AI Insights</h1>
              <p className="dashboard-subtitle">Powered by advanced AI analysis</p>
            </div>
            <div className="header-actions">
              <button 
                className="analytics-action-btn primary"
                onClick={triggerAIAnalysis}
                disabled={isAnalyzing || filteredReviews.length === 0}
              >
                {isAnalyzing ? (
                  <><RefreshCw className="w-4 h-4 mr-2" style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate AI Insights</>
                )}
              </button>
            </div>
          </div>
          
          {aiInsights && (
            <AIInsights 
              insights={aiInsights} 
              isAnalyzing={isAnalyzing}
            />
          )}
          
          {!aiInsights && !isAnalyzing && (
            <Card className="text-center p-8">
              <CardContent>
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Click "Generate AI Insights" to analyze your reviews</p>
              </CardContent>
            </Card>
          )}
          </>
        )}

        {/* Analytics View */}
        {activeView === 'analytics' && (
          <>
            <div className="dashboard-header-section">
            <div className="dashboard-title-area">
              <h1 className="dashboard-title">Deep Analytics</h1>
              <p className="dashboard-subtitle">Comprehensive analysis and insights</p>
            </div>
            <div className="header-actions">
              <button 
                className="analytics-action-btn"
                onClick={triggerDeepAnalysis}
                disabled={isDeepAnalyzing || filteredReviews.length === 0}
              >
                {isDeepAnalyzing ? (
                  <><RefreshCw className="w-4 h-4 mr-2" style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...</>
                ) : (
                  <><Brain className="w-4 h-4 mr-2" /> Perform Deep Analysis</>
                )}
              </button>
              <button 
                className="analytics-action-btn"
                onClick={triggerExecutiveAnalysis}
                disabled={isExecutiveAnalyzing || filteredReviews.length === 0}
              >
                {isExecutiveAnalyzing ? (
                  <><RefreshCw className="w-4 h-4 mr-2" style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...</>
                ) : (
                  <><Target className="w-4 h-4 mr-2" /> Executive Analysis</>
                )}
              </button>
            </div>
          </div>
          
          <div className="analytics-results-container">
            {deepInsights && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Deep Analysis Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Deep analysis results would be displayed here */}
                  <pre className="text-sm">{JSON.stringify(deepInsights, null, 2)}</pre>
                </CardContent>
              </Card>
            )}
            
            {executiveAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Executive Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Executive analysis results would be displayed here */}
                  <pre className="text-sm">{JSON.stringify(executiveAnalysis, null, 2)}</pre>
                </CardContent>
              </Card>
            )}
          </div>
          </>
        )}

        {/* Reports View */}
        {activeView === 'reports' && (
          <>
            <div className="dashboard-header-section">
            <div className="dashboard-title-area">
              <h1 className="dashboard-title">Reports</h1>
              <p className="dashboard-subtitle">Export and generate reports</p>
            </div>
          </div>
          <Card>
            <CardContent className="text-center p-8">
              <Download className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">Export Reports</h3>
              <p className="text-gray-600 mb-4">Generate comprehensive reports in various formats</p>
              <div className="flex gap-4 justify-center">
                <button className="analytics-action-btn">
                  <Download className="w-4 h-4 mr-2" />
                  Export to PDF
                </button>
                <button className="analytics-action-btn">
                  <Download className="w-4 h-4 mr-2" />
                  Export to Excel
                </button>
              </div>
            </CardContent>
          </Card>
          </>
        )}

        {/* Removed modals - Analysis now shows inline */}
        
        {/* Word Reviews Modal */}
        {showWordReviews && selectedWord && createPortal(
          <div 
            className="word-reviews-overlay"
            onClick={() => {
              setShowWordReviews(false);
              setSelectedWord(null);
            }}
          >
            <div 
              className="word-reviews-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="word-reviews-header">
                <h3>Reviews containing "{selectedWord}"</h3>
                <button 
                  className="close-word-reviews"
                  onClick={() => {
                    setShowWordReviews(false);
                    setSelectedWord(null);
                  }}
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="word-reviews-content">
                {(() => {
                  const wordReviews = filteredReviews.filter(review => {
                    const content = (review.content || review.Content || review.Review || review['Review Text'] || '').toLowerCase();
                    return content.includes(selectedWord.toLowerCase());
                  });
                  
                  return (
                    <>
                      <div className="word-reviews-stats">
                        <span className="word-count">Found in {wordReviews.length} reviews</span>
                        <div className="word-sentiment-breakdown">
                          <span className="positive-count" style={{ color: '#10b981' }}>
                            {wordReviews.filter(r => (r.rating || r.Rating || 3) >= 4).length} positive
                          </span>
                          <span className="neutral-count" style={{ color: '#6b7280' }}>
                            {wordReviews.filter(r => (r.rating || r.Rating || 3) === 3).length} neutral
                          </span>
                          <span className="negative-count" style={{ color: '#ef4444' }}>
                            {wordReviews.filter(r => (r.rating || r.Rating || 3) <= 2).length} negative
                          </span>
                        </div>
                      </div>
                      
                      <div className="word-reviews-list">
                        {wordReviews.length === 0 ? (
                          <div className="no-word-reviews">
                            <p>No reviews found containing "{selectedWord}"</p>
                          </div>
                        ) : (
                          wordReviews.slice(0, 50).map((review, index) => {
                            const rating = review.rating || review.Rating || 3;
                            const content = review.content || review.Content || review.Review || review['Review Text'] || '';
                            const date = new Date(review.date || review.Date || review['Review Date'] || new Date());
                            const author = review.author || review.Author || review.Reviewer || 'Anonymous';
                            
                            // Highlight the word in the review
                            const highlightedContent = content.replace(
                              new RegExp(`(${selectedWord})`, 'gi'),
                              '<mark class="word-highlight">$1</mark>'
                            );
                            
                            return (
                              <div key={index} className="word-review-card">
                                <div className="word-review-header">
                                  <div className="rating-stars">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        size={14}
                                        className={`star ${i < rating ? 'filled' : ''}`}
                                        style={{
                                          fill: i < rating ? '#fbbf24' : 'none',
                                          stroke: i < rating ? '#fbbf24' : '#d1d5db'
                                        }}
                                      />
                                    ))}
                                  </div>
                                  <span className="review-author">{author}</span>
                                  <span className="review-date">{date.toLocaleDateString()}</span>
                                </div>
                                <div 
                                  className="word-review-content"
                                  dangerouslySetInnerHTML={{ __html: highlightedContent }}
                                />
                              </div>
                            );
                          })
                        )}
                        {wordReviews.length > 50 && (
                          <div className="more-reviews-note">
                            Showing first 50 of {wordReviews.length} reviews
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};


export default EnhancedDashboard;