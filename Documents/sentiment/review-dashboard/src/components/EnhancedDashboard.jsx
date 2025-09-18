import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
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
  ChevronDown, ChevronUp, X, Download, RefreshCw, Calendar,
  Smartphone, Package, Layers, Globe, Monitor,
  Share2, Printer, Save, Settings, HelpCircle, Undo, Redo,
  CheckCircle, MessageSquare, Apple, Car
} from 'lucide-react';
import { analyzeReviews, generateInsights } from '../services/geminiAIAnalysis';
import { performDeepAnalysis } from '../services/geminiDeepAnalysis';
import { performExecutiveAnalysis } from '../services/geminiExecutiveAnalysis';
import { getErrorMessage } from '../utils/errorHandler';
import { parseDateRequest, isIntelligenceBriefingRequest } from '../utils/dateParser';
import { usePreprocessedReviews, useOptimizedFiltering, useQuickStats } from '../hooks/useOptimizedFiltering';
import AIInsights from './AIInsights';
import CategorizedReviews from './CategorizedReviews';
import ReviewDisplay from './ReviewDisplay';
import SentimentTrends from './SentimentTrends';
import DateRangeCalendar from './DateRangeCalendar';
import ErrorDisplay from './ErrorDisplay';
import KeywordCloud from './KeywordCloud';
import SentimentAnalysis from './SentimentAnalysis';
import AISentimentSummary from './AISentimentSummary';
import RedditInfluence from './RedditInfluence';
import IntelligenceBriefingHandler from './IntelligenceBriefingHandler';
import CompetitiveAnalysis from './CompetitiveAnalysis';
import appleAppStoreBrowserService from '../services/appleAppStoreBrowser';
import { parseAndTransformData, aggregateData } from '../utils/excelParser';
import UserHeader from './UserHeader';
import './EnhancedDashboard.css';

const TABLEAU_COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
const COLORS = TABLEAU_COLORS.slice(0, 5); // Use first 5 Tableau colors

const EnhancedDashboard = ({ data, isLoading, onFetchReviews, onDateRangeChange, onUpdateData }) => {
  const navigate = useNavigate();
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
    allRatings: true,
    sentiment: true,
    trends: true,
    ai: true,
    keywords: true,
    reddit: true
  });
  // Enhanced review display is always enabled
  const useEnhancedReviewDisplay = true;
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState({ start: null, end: null });
  const [isDateRangeLoading, setIsDateRangeLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const dateRangeRef = useRef(null);
  // Add state for current view selection
  const [currentView, setCurrentView] = useState('dashboard');
  // Add state for sentiment analysis modal
  const [showSentimentAnalysis, setShowSentimentAnalysis] = useState(false);
  // Add state for Apple data fetching
  const [isFetchingAppleData, setIsFetchingAppleData] = useState(false);
  // Add state for Apple review summarizations (all ratings)
  const [allRatingsData, setAllRatingsData] = useState(null);
  const [isFetchingAllRatings, setIsFetchingAllRatings] = useState(false);
  // Add state for intelligence briefing handler
  const [showBriefingHandler, setShowBriefingHandler] = useState(false);
  
  // Initialize date range from Apple app config on mount and auto-fetch
  useEffect(() => {
    if (data?.isAppleData) {
      const configStr = sessionStorage.getItem('appleAppConfig');
      if (configStr) {
        const config = JSON.parse(configStr);
        if (config.startDate || config.endDate) {
          setSelectedDateRange({
            start: config.startDate ? new Date(config.startDate) : null,
            end: config.endDate ? new Date(config.endDate) : null
          });
          
          // Auto-fetch reviews with the selected date range
          // Also fetch if data is older than 30 minutes to ensure fresh data
          if (onFetchReviews) {
            const shouldRefresh = data?.isEmpty || 
              (data?.lastUpdated && new Date() - new Date(data.lastUpdated) > 30 * 60 * 1000);
            
            if (shouldRefresh) {
              // Don't set loading state on initial auto-fetch
              setIsDateRangeLoading(false);
              handleFetchAppleReviews();
            }
          }
        }
      }
    }
    // Mark that initial load is complete
    setIsInitialLoad(false);
  }, [data?.isAppleData, data?.isEmpty]);
  
  // Debug logging
  useEffect(() => {
    console.log('Current View:', currentView);
  }, [currentView]);
  
  // Debug briefing handler state
  useEffect(() => {
    console.log('[EnhancedDashboard] showBriefingHandler state changed to:', showBriefingHandler);
  }, [showBriefingHandler]);

  // 🚀 Listen for background Apple reviews loading
  useEffect(() => {
    const handleAppleReviewsLoaded = (event) => {
      const { reviews, isMockData } = event.detail;
      console.log('🎯 Dashboard received background-loaded reviews:', reviews.length);
      
      // Update dashboard with the loaded reviews
      if (onFetchReviews && reviews.length > 0) {
        console.log('🔄 Updating dashboard data with background-loaded reviews');
        onFetchReviews(reviews);
      }
    };

    // Listen for the custom event
    window.addEventListener('appleReviewsLoaded', handleAppleReviewsLoaded);

    // Cleanup event listener
    return () => {
      window.removeEventListener('appleReviewsLoaded', handleAppleReviewsLoaded);
    };
  }, [onFetchReviews]);
  
  // Debounced date range change handler
  const debouncedDateRangeChangeRef = useRef(null);
  
  // Store a ref to trigger fetch
  const shouldFetchOnDateChangeRef = useRef(false);
  
  // Notify parent component when date range changes with debouncing
  useEffect(() => {
    if (selectedDateRange.start || selectedDateRange.end) {
      // Only set loading state if we have data already (not on initial load) and not during initial setup
      // Also check if we're already fetching to prevent duplicate loading states
      if (data && !data.isEmpty && !isInitialLoad && !isDateRangeLoading) {
        setIsDateRangeLoading(true);
      }
      
      // Clear previous timeout
      if (debouncedDateRangeChangeRef.current) {
        clearTimeout(debouncedDateRangeChangeRef.current);
      }
      
      // Set new timeout for debounced call
      debouncedDateRangeChangeRef.current = setTimeout(() => {
        // Notify parent if callback exists
        if (onDateRangeChange) {
          onDateRangeChange(selectedDateRange);
        }
        
        // Mark that we should fetch when possible
        if (data?.isAppleData && onFetchReviews && !isInitialLoad) {
          shouldFetchOnDateChangeRef.current = true;
        }
      }, 300); // 300ms debounce
    }
    
    return () => {
      if (debouncedDateRangeChangeRef.current) {
        clearTimeout(debouncedDateRangeChangeRef.current);
      }
    };
  }, [selectedDateRange, onDateRangeChange, data?.isAppleData, onFetchReviews, data, isInitialLoad]);

  // Clear date range loading state when data changes
  useEffect(() => {
    if (data && isDateRangeLoading) {
      // Add a small delay to ensure data is fully loaded
      const timer = setTimeout(() => {
        setIsDateRangeLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [data, isDateRangeLoading]);

  // Failsafe: Clear loading state after 5 seconds to prevent infinite loading
  useEffect(() => {
    if (isDateRangeLoading) {
      const failsafeTimer = setTimeout(() => {
        console.warn('[EnhancedDashboard] Clearing date range loading state due to timeout');
        setIsDateRangeLoading(false);
      }, 5000);
      return () => clearTimeout(failsafeTimer);
    }
  }, [isDateRangeLoading]);
  
  // Fetch all ratings data when Apple data is available
  useEffect(() => {
    const fetchAllRatingsData = async () => {
      console.log('[EnhancedDashboard] fetchAllRatingsData triggered with:', {
        isAppleData: data?.isAppleData,
        isFetchingAllRatings,
        hasAllRatingsData: !!allRatingsData,
        reviewsLength: data?.reviews?.length
      });
      
      if (data?.isAppleData && !isFetchingAllRatings && !allRatingsData && data?.reviews?.length > 0) {
        setIsFetchingAllRatings(true);
        
        try {
          const configStr = sessionStorage.getItem('appleAppConfig');
          const privateKey = sessionStorage.getItem('applePrivateKey');
          
          console.log('[EnhancedDashboard] Retrieved from sessionStorage:', {
            hasConfig: !!configStr,
            hasPrivateKey: !!privateKey,
            privateKeyLength: privateKey?.length
          });
          
          if (configStr) {
            const config = JSON.parse(configStr);
            console.log('[EnhancedDashboard] Parsed config:', {
              appId: config.appId,
              issuerId: config.issuerId,
              keyId: config.keyId,
              useServerCredentials: config.useServerCredentials
            });
            
            const appId = config.appId;
            const issuerId = config.issuerId;
            const keyId = config.keyId;
            const useServerCredentials = config.useServerCredentials;
            
            console.log('[EnhancedDashboard] Key ID specifically:', keyId);
            
            // Import the service
            const appleService = (await import('../services/appleAppStoreBrowser')).default;
            
            console.log('[EnhancedDashboard] Calling getReviewSummarizations with:', {
              appId,
              issuerId,
              keyId,
              hasPrivateKey: !!privateKey,
              useServerCredentials
            });
            
            // Fetch summarizations
            const summarizations = await appleService.getReviewSummarizations(
              appId,
              issuerId,
              keyId,
              privateKey,
              useServerCredentials
            );
            
            console.log('[EnhancedDashboard] Received summarizations:', summarizations);
            
            setAllRatingsData(summarizations);
          } else {
            console.log('[EnhancedDashboard] No config found in sessionStorage');
          }
        } catch (error) {
          console.error('[EnhancedDashboard] Failed to fetch all ratings data:', {
            error: error.message,
            stack: error.stack,
            response: error.response?.data
          });
          // Reset the fetching state to allow retry
          setIsFetchingAllRatings(false);
        } finally {
          setIsFetchingAllRatings(false);
        }
      }
    };
    
    fetchAllRatingsData();
  }, [data?.isAppleData, data?.reviews?.length, allRatingsData, isFetchingAllRatings]);

  // Handle Apple data fetching
  const handleFetchAppleReviews = async () => {
    if (!onFetchReviews || isFetchingAppleData) return;
    
    try {
      setIsFetchingAppleData(true);
      
      // Get Apple app config from session storage
      const configStr = sessionStorage.getItem('appleAppConfig');
      const privateKey = sessionStorage.getItem('applePrivateKey');
      
      if (!configStr) {
        setError('Apple app configuration not found. Please go back and select an app.');
        return;
      }
      
      const config = JSON.parse(configStr);
      
      // Import the Apple service
      const appleAppStoreBrowserService = (await import('../services/appleAppStoreBrowser')).default;
      
      // Fetch reviews with date range
      // Always force refresh to ensure we get the latest reviews including those posted today
      const reviews = await appleAppStoreBrowserService.importReviews(
        config.appId,
        config.issuerId,
        config.keyId,
        privateKey,
        config.useServerCredentials,
        {
          useCache: false, // Temporarily disable cache to ensure fresh data
          forceRefresh: true, // Force refresh to get latest data
          startDate: selectedDateRange.start,
          endDate: selectedDateRange.end
        }
      );
      
      // Call the onFetchReviews callback with the fetched reviews
      await onFetchReviews(reviews);
      
    } catch (err) {
      console.error('Error fetching Apple reviews:', err);
      setError('Failed to fetch Apple reviews: ' + err.message);
    } finally {
      setIsFetchingAppleData(false);
    }
  };

  // Trigger fetch when date range changes and we have marked it
  useEffect(() => {
    if (shouldFetchOnDateChangeRef.current && !isFetchingAppleData) {
      shouldFetchOnDateChangeRef.current = false;
      handleFetchAppleReviews();
    }
  }, [shouldFetchOnDateChangeRef.current]);

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
    
    data.reviews.forEach((review, index) => {
      // Only add non-empty values to filters
      if (review.appName && review.appName.trim()) options.appName.add(review.appName);
      if (review.device && review.device.trim()) options.device.add(review.device);
      if (review.version && review.version.trim()) options.version.add(review.version);
      if (review['App Version'] && review['App Version'].trim()) options.version.add(review['App Version']);
      if (review.os && review.os.trim()) options.os.add(review.os);
      if (review.platform && review.platform.trim()) options.platform.add(review.platform);
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

  // Pre-process reviews once for better performance
  const preprocessedReviews = usePreprocessedReviews(data?.reviews);
  
  // Use optimized filtering
  const filteredReviews = useOptimizedFiltering(
    preprocessedReviews,
    searchTerm,
    selectedFilter,
    selectedTimeRange,
    selectedDateRange,
    metadataFilters
  );

  // Get pre-computed stats for better performance
  // Get pre-computed stats for better performance
  const { totalCount, avgRating: filteredAvgRating, sentimentBreakdown: filteredSentimentBreakdown, ratingDistribution: filteredRatingDistribution } = useQuickStats(filteredReviews);

  // Calculate rating distribution for ALL reviews (for quick filter display)
  const allRatingDistribution = useMemo(() => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    if (!data?.reviews) return distribution;
    
    data.reviews.forEach(review => {
      const rating = review.rating || review.Rating || 0;
      if (rating >= 1 && rating <= 5) {
        distribution[rating]++;
      }
    });
    
    return distribution;
  }, [data?.reviews]);

  // Calculate sentiment breakdown for ALL reviews (for quick filter display)
  const allSentimentBreakdown = useMemo(() => {
    const breakdown = { positive: 0, neutral: 0, negative: 0 };
    
    if (!data?.reviews) return breakdown;
    
    data.reviews.forEach(review => {
      const sentiment = (review.sentiment || review.Sentiment || 'neutral').toLowerCase();
      if (sentiment === 'positive') breakdown.positive++;
      else if (sentiment === 'negative') breakdown.negative++;
      else breakdown.neutral++;
    });
    
    return breakdown;
  }, [data?.reviews]);

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

  // Function to fetch Apple reviews with date range
  const fetchAppleReviewsWithDateRange = useCallback(async (dateRange) => {
    try {
      const configStr = sessionStorage.getItem('appleAppConfig');
      if (!configStr) {
        console.error('[fetchAppleReviewsWithDateRange] No Apple config found');
        return;
      }
      
      const config = JSON.parse(configStr);
      const privateKey = sessionStorage.getItem('applePrivateKey');
      
      console.log('[fetchAppleReviewsWithDateRange] Fetching reviews with config:', {
        appId: config.appId,
        dateRange,
        useServerCredentials: config.useServerCredentials
      });
      
      const reviews = await appleAppStoreBrowserService.importReviews(
        config.appId,
        config.useServerCredentials ? '' : config.issuerId,
        config.useServerCredentials ? '' : config.keyId || '',
        config.useServerCredentials ? '' : (privateKey || config.privateKey),
        config.useServerCredentials,
        {
          startDate: dateRange.start,
          endDate: dateRange.end,
          useCache: false,
          forceRefresh: true
        }
      );
      
      if (reviews && reviews.length > 0) {
        // Transform and aggregate the reviews
        const transformedReviews = parseAndTransformData(reviews);
        const aggregatedData = aggregateData(transformedReviews);
        
        // Ensure proper structure
        if (!aggregatedData.summary || !aggregatedData.summary.distribution) {
          aggregatedData.summary.distribution = aggregatedData.ratingDistribution || {};
        }
        if (!aggregatedData.sentimentBreakdown) {
          aggregatedData.sentimentBreakdown = aggregatedData.sentimentDistribution || {};
        }
        
        aggregatedData.isAppleData = true;
        aggregatedData.isEmpty = false;
        aggregatedData.appName = config.appName || '';
        aggregatedData.dateRangeFilter = dateRange; // Mark that this data is filtered by date range
        
        // Update the data
        if (onUpdateData) {
          onUpdateData(aggregatedData);
        }
      } else {
        // No reviews found for date range
        console.log('[fetchAppleReviewsWithDateRange] No reviews found for date range');
        setError('No reviews found for the selected date range');
      }
    } catch (error) {
      console.error('[fetchAppleReviewsWithDateRange] Error:', error);
      throw error;
    }
  }, [onUpdateData]);

  // Handle date range changes with optimized batching
  const handleDateRangeChange = useCallback(async (dateRange) => {
    // Batch state updates for better performance
    if (dateRange.start && dateRange.end) {
      // Update all state at once to minimize re-renders
      setSelectedDateRange(dateRange);
      setShowDatePicker(false);
      
      // For Apple data, show loading immediately but debounce the actual API call
      if (data?.isAppleData) {
        console.log('[EnhancedDashboard] Fetching Apple reviews for date range:', dateRange);
        setIsDateRangeLoading(true);
        
        try {
          await fetchAppleReviewsWithDateRange(dateRange);
        } catch (error) {
          console.error('[EnhancedDashboard] Error fetching reviews:', error);
          setError('Failed to fetch reviews for selected date range');
        } finally {
          setIsDateRangeLoading(false);
        }
      }
    } else {
      // For incomplete date ranges, just update the state
      setSelectedDateRange(dateRange);
    }
  }, [data?.isAppleData, fetchAppleReviewsWithDateRange]);

  const handleDateRangeClick = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowDatePicker(!showDatePicker);
  }, [showDatePicker]);

  const clearDateRange = useCallback(async () => {
    setSelectedDateRange({ start: null, end: null });
    setShowDatePicker(false);
    setIsDateRangeLoading(false);
    // Clear any pending debounced calls
    if (debouncedDateRangeChangeRef.current) {
      clearTimeout(debouncedDateRangeChangeRef.current);
    }
    
    // For Apple data, fetch all reviews when clearing date range
    if (data?.isAppleData) {
      console.log('[EnhancedDashboard] Clearing date range, fetching all Apple reviews');
      setIsDateRangeLoading(true);
      
      try {
        // Fetch all reviews without date range
        await fetchAppleReviewsWithDateRange({ start: null, end: null });
      } catch (error) {
        console.error('[EnhancedDashboard] Error fetching reviews:', error);
        setError('Failed to fetch reviews');
      } finally {
        setIsDateRangeLoading(false);
      }
    }
  }, [data?.isAppleData, fetchAppleReviewsWithDateRange]);

  // Memoize event handlers to prevent child re-renders
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);
  
  const handleFilterChange = useCallback((filter) => {
    setSelectedFilter(filter);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
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

  // Handle intelligence briefing requests with date filtering
  const handleIntelligenceBriefingRequest = useCallback(async (userRequest) => {
    console.log('[IntelligenceBriefing] Processing request:', userRequest);
    
    // Check if this is an intelligence briefing request
    if (!isIntelligenceBriefingRequest(userRequest)) {
      return false; // Not an intelligence briefing request
    }
    
    // Parse the date from the request
    const dateRange = parseDateRequest(userRequest);
    
    if (dateRange) {
      console.log('[IntelligenceBriefing] Setting date range:', dateRange);
      
      // Set the date range filter
      setSelectedDateRange({ start: dateRange.start, end: dateRange.end });
      
      // If Apple data, we need to fetch new data with the date range
      if (data?.isAppleData && onFetchReviews) {
        try {
          // Trigger a re-fetch with the new date range
          // The date range will be used by the parent component
          if (onDateRangeChange) {
            onDateRangeChange({ start: dateRange.start, end: dateRange.end });
          }
          
          // Trigger executive analysis immediately
          triggerExecutiveAnalysis();
        } catch (error) {
          console.error('[IntelligenceBriefing] Error setting date range:', error);
          setError('Failed to fetch data for the requested time period');
        }
      } else {
        // For non-Apple data, just trigger executive analysis with filtered data
        setTimeout(() => {
          triggerExecutiveAnalysis();
        }, 100);
      }
      
      return true; // Request handled
    } else {
      // No specific date range, trigger executive analysis with all data
      triggerExecutiveAnalysis();
      return true; // Request handled
    }
  }, [data, triggerExecutiveAnalysis, onFetchReviews, onDateRangeChange]);

  // Expose the handler for external use (e.g., from a chat interface)
  useEffect(() => {
    window.handleIntelligenceBriefingRequest = handleIntelligenceBriefingRequest;
    
    return () => {
      delete window.handleIntelligenceBriefingRequest;
    };
  }, [handleIntelligenceBriefingRequest]);

  if (isLoading || (isDateRangeLoading && (!data || !data.reviews))) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 text-blue-600" style={{ animation: 'spin 1s linear infinite' }} />
          <p className="text-gray-600">{isDateRangeLoading ? 'Loading data for selected date range...' : 'Loading analytics...'}</p>
        </div>
      </div>
    );
  }

  const { summary, reviews = [] } = data || {};

  return (
    <div className="modern-dashboard with-sidebar">
      {/* User Header */}
      <UserHeader />
      
      {/* Tableau-Style Top Toolbar */}
      <div className="tableau-toolbar" style={{ marginTop: '60px' }}>
        <div className="toolbar-section toolbar-left">
          <button className="toolbar-btn" title="Refresh Data" onClick={() => window.location.reload()}>
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
        </div>
        
        <div className="toolbar-section toolbar-center">
        </div>
        
        <div className="toolbar-section toolbar-right">
          <button 
            className={`toolbar-btn ${showBriefingHandler ? 'active' : ''}`}
            title="Intelligence Briefing Assistant"
            onClick={() => {
              console.log('[EnhancedDashboard] Toggling briefing handler from', showBriefingHandler, 'to', !showBriefingHandler);
              setShowBriefingHandler(!showBriefingHandler);
            }}
          >
            <MessageSquare size={18} />
            <span>Briefing</span>
          </button>
          <button 
            className="toolbar-btn" 
            title="AI Sentiment Analysis"
            onClick={() => setShowSentimentAnalysis(true)}
          >
            <Brain size={18} />
            <span>Sentiment</span>
          </button>
        </div>
      </div>
      
      {/* Main Layout Wrapper */}
      <div className="dashboard-layout">
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
                <li className={`nav-item ${currentView === 'competitive' ? 'active' : ''}`}>
                  <button 
                    className="nav-button"
                    onClick={() => setCurrentView('competitive')}
                    title="Competitive Analysis"
                  >
                    <Car size={20} />
                    <span>Competitive Analysis</span>
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
          <p className="dashboard-subtitle">
            Comprehensive insights from {filteredReviews.length.toLocaleString()} reviews
          </p>
        </div>
        
        
        {/* Search Section */}
        <div className="search-section">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="search-input"
            />
            {searchTerm && (
              <button 
                className="clear-search"
                onClick={handleClearSearch}
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
          <div className="secondary-filters-section">
              <div className="secondary-filters-label">
                <span>Advanced Filters</span>
              </div>
              <div className="secondary-filters-grid">
                {metadataOptions.appName && metadataOptions.appName.length > 1 && (
                  <div className="secondary-filter-item">
                    <label className="filter-label secondary">
                      <Package size={14} />
                      App Name
                    </label>
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
                
                {metadataOptions.device && metadataOptions.device.length > 1 && (
                  <div className="secondary-filter-item">
                    <label className="filter-label secondary">
                      <Smartphone size={14} />
                      Device Type
                    </label>
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
                
                {metadataOptions.version && metadataOptions.version.length > 1 && (
                  <div className="secondary-filter-item">
                    <label className="filter-label secondary">
                      <Layers size={14} />
                      App Version
                    </label>
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
                
                {metadataOptions.platform && metadataOptions.platform.length > 1 && (
                  <div className="secondary-filter-item">
                    <label className="filter-label secondary">
                      <Globe size={14} />
                      Platforms
                    </label>
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
                
                {metadataOptions.os && metadataOptions.os.length > 1 && (
                  <div className="secondary-filter-item">
                    <label className="filter-label secondary">
                      <Monitor size={14} />
                      OS Version
                    </label>
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

      {/* Intelligence Briefing Handler */}
      {showBriefingHandler && (
        <div style={{ 
          marginTop: '20px', 
          marginBottom: '20px',
          position: 'relative',
          zIndex: 100,
          width: '100%'
        }}>
          <IntelligenceBriefingHandler 
            reviews={filteredReviews}
            dateRange={selectedDateRange}
            onRequestBriefing={handleIntelligenceBriefingRequest}
          />
        </div>
      )}

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
                  <span className="average-label">Average Rating (Written Reviews)</span>
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

        {/* All Ratings Distribution (Apple Store Overall Rating) */}
        {console.log('[EnhancedDashboard] All Ratings section conditions:', {
          isAppleData: data?.isAppleData,
          hasAllRatingsData: !!allRatingsData,
          allRatingsData: allRatingsData,
          expandedSection: expandedSections.allRatings
        })}
        {data?.isAppleData && allRatingsData && expandedSections.allRatings && (
          <div className="analytics-card col-span-6">
            <div className="analytics-header" style={{ cursor: 'pointer' }} onClick={() => toggleSection('allRatings')}>
              <h3 className="analytics-title">
                All Ratings (App Store Overall)
                <span className="info-tooltip" title="Includes all star ratings, not just written reviews">
                  <HelpCircle size={14} className="inline-block ml-2" style={{ opacity: 0.6 }} />
                </span>
                <ChevronUp className="inline-block ml-auto" style={{ width: '16px', height: '16px' }} />
              </h3>
            </div>
            <div className="all-ratings-container">
              <div className="overall-rating-summary">
                <div className="overall-rating-value">
                  <span className="overall-number">{allRatingsData.averageRating.toFixed(1)}</span>
                  <div className="overall-stars">
                    {[1,2,3,4,5].map(star => (
                      <span 
                        key={star}
                        className={`star ${star <= Math.round(allRatingsData.averageRating) ? 'filled' : 'empty'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="total-ratings-count">
                    {allRatingsData.totalRatings.toLocaleString()} total ratings
                  </span>
                </div>
              </div>
              
              <div className="all-ratings-bars">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = allRatingsData.ratingCounts[rating] || 0;
                  const percentage = allRatingsData.totalRatings > 0 ? 
                    ((count / allRatingsData.totalRatings) * 100) : 0;
                  const maxCount = Math.max(...Object.values(allRatingsData.ratingCounts));
                  const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  const colors = {
                    5: '#10b981',
                    4: '#22c55e', 
                    3: '#f59e0b',
                    2: '#f97316',
                    1: '#ef4444'
                  };
                  
                  return (
                    <div key={rating} className="all-rating-bar-row">
                      <span className="rating-label">{rating}★</span>
                      <div className="rating-bar-container">
                        <div 
                          className="rating-bar"
                          style={{ 
                            width: `${barWidth}%`,
                            backgroundColor: colors[rating],
                            opacity: 0.8
                          }}
                        />
                      </div>
                      <div className="rating-stats">
                        <span className="rating-count">{count.toLocaleString()}</span>
                        <span className="rating-percentage">({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="ratings-comparison">
                <div className="comparison-item">
                  <span className="comparison-label">Written Reviews Avg:</span>
                  <span className="comparison-value">
                    {filteredReviews.length > 0 ? 
                      ((filteredRatingDistribution[5] * 5 + 
                        filteredRatingDistribution[4] * 4 + 
                        filteredRatingDistribution[3] * 3 + 
                        filteredRatingDistribution[2] * 2 + 
                        filteredRatingDistribution[1] * 1) / filteredReviews.length).toFixed(1)
                      : '0.0'
                    }
                  </span>
                </div>
                <div className="comparison-item">
                  <span className="comparison-label">All Ratings Avg:</span>
                  <span className="comparison-value highlight">{allRatingsData.averageRating.toFixed(1)}</span>
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
        
        {/* AI-Powered Sentiment Summary - Next to Sentiment Insights */}
        {expandedSections.sentiment && filteredReviews.length > 0 && (
          <div className="analytics-card col-span-6">
            <AISentimentSummary 
              reviews={filteredReviews} 
              dateRange={selectedDateRange}
              onRefresh={() => {
                // Optional: trigger any refresh logic
                console.log('AI Summary refreshed');
              }}
            />
          </div>
        )}
      </div>

      {/* Reddit Influence Monitor */}
      {console.log('[EnhancedDashboard] Reddit section check:', {
        expandedSections_reddit: expandedSections.reddit,
        data_appName: data?.appName,
        data_isAppleData: data?.isAppleData,
        shouldShowReddit: data?.appName || data?.isAppleData
      })}
      {(data?.appName || data?.isAppleData) && (
        <div className="analytics-card col-span-12" style={{ marginTop: '24px' }}>
          <div className="analytics-header" style={{ cursor: 'pointer' }} onClick={() => toggleSection('reddit')}>
            <h3 className="analytics-title">
              Reddit Influence & Mentions
              <span className="info-tooltip" title="Monitor Reddit discussions and mentions of your app">
                <HelpCircle size={14} className="inline-block ml-2" style={{ opacity: 0.6 }} />
              </span>
              {expandedSections.reddit ? (
                <ChevronUp className="inline-block ml-auto" style={{ width: '16px', height: '16px' }} />
              ) : (
                <ChevronDown className="inline-block ml-auto" style={{ width: '16px', height: '16px' }} />
              )}
            </h3>
          </div>
          {expandedSections.reddit && (
            <div className="analytics-content">
              {console.log('[EnhancedDashboard] Inside Reddit content, appName:', data?.appName)}
              {data?.appName ? (
                <RedditInfluence 
                  appName={data.appName} 
                  category={data.category || 'technology'}
                />
              ) : (
                <div className="reddit-setup-notice">
                  <AlertCircle size={20} />
                  <p>To enable Reddit monitoring, please specify your app name.</p>
                  <small>
                    {data?.isAppleData 
                      ? "App name will be detected from your Apple App Store selection."
                      : "Ensure your Excel/CSV file includes an 'App Name' column with your app's name."}
                  </small>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
      
      {/* Competitive Analysis View */}
      {currentView === 'competitive' && (
        <div className="competitive-view">
          <CompetitiveAnalysis 
            currentOEM={data?.oem}
            currentAppName={data?.appName || 'Your App'}
            onAskAI={(question, context) => {
              // Navigate to chat with context
              navigate('/chat', { 
                state: { 
                  initialQuestion: question, 
                  competitiveContext: context 
                } 
              });
            }}
          />
        </div>
      )}
        </>
      )}
        </div>
      </div>
      </div>
      
      {/* Sentiment Analysis Modal */}
      {showSentimentAnalysis && (
        <SentimentAnalysis 
          reviews={filteredReviews}
          onClose={() => setShowSentimentAnalysis(false)}
        />
      )}
      
      
      {/* Floating Chat Button */}
      <button 
        className="floating-chat-button"
        onClick={() => navigate('/chat')}
        title="Ask AI about your reviews"
      >
        <MessageSquare size={24} />
      </button>
    </div>
  );
};


export default EnhancedDashboard;