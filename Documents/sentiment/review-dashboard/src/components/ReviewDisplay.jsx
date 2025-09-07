import React, { useState, useEffect, useCallback } from 'react';
import { 
  analyzeReviewsWithIssues, 
  categorizeReviewEnhanced,
  getIssueDistribution 
} from '../services/geminiEnhancedCategorization';
import { 
  RefreshCw, Filter, ChevronDown, AlertCircle, 
  Bug, Zap, Wifi, Shield, CreditCard, Users,
  Palette, Heart, AlertTriangle, TrendingUp,
  Siren, Flag, ThumbsDown, CheckCircle, X,
  Clock, Target, Star
} from 'lucide-react';
import './ReviewDisplay.css';

const categoryConfig = {
  'Technical Issues': {
    icon: Bug,
    color: '#dc2626',
    subcategories: ['Crashes', 'Performance', 'Bugs', 'Battery', 'Connectivity']
  },
  'Login & Authentication': {
    icon: Shield,
    color: '#ea580c',
    subcategories: ['Login Problems', 'Password Issues', 'Account Access']
  },
  'Feature Requests': {
    icon: TrendingUp,
    color: '#2563eb',
    subcategories: ['New Features', 'Improvements', 'Enhancements']
  },
  'UI/UX Issues': {
    icon: Palette,
    color: '#7c3aed',
    subcategories: ['Design', 'Usability', 'Navigation', 'Layout']
  },
  'Payment & Billing': {
    icon: CreditCard,
    color: '#059669',
    subcategories: ['Payment Issues', 'Subscription', 'Pricing']
  },
  'Customer Service': {
    icon: Users,
    color: '#0891b2',
    subcategories: ['Support', 'Response Time', 'Help']
  },
  'Connectivity': {
    icon: Wifi,
    color: '#dc2626',
    subcategories: ['Network Issues', 'Sync Problems', 'Connection Failed']
  },
  'Positive Feedback': {
    icon: Heart,
    color: '#059669',
    subcategories: ['Praise', 'Satisfaction', 'Recommendations']
  },
  'General Feedback': {
    icon: AlertCircle,
    color: '#6b7280',
    subcategories: ['Neutral', 'Mixed', 'Other']
  }
};

const ReviewDisplay = ({ reviews, searchTerm = '' }) => {
  const [categorizedReviews, setCategorizedReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [issueAnalysis, setIssueAnalysis] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [issueDistribution, setIssueDistribution] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const [displayedReviews, setDisplayedReviews] = useState(20);
  const [categorizeProgress, setCategorizeProgress] = useState(0);
  const [isCategorizingComplete, setIsCategorizingComplete] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState(null); // 'critical', 'high', 'negative', 'actionable', or null
  
  // Advanced filter states
  const [categoryFilter, setCategoryFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('');

  // Helper function to detect OS from device info
  const getOperatingSystem = (review) => {
    // Check if OS is directly provided
    if (review.os || review.OS || review['Operating System']) {
      return review.os || review.OS || review['Operating System'];
    }
    
    // Otherwise detect from device/version/content
    const device = (review.device || review.Device || review['Device Name'] || '').toLowerCase();
    const version = (review.version || review.Version || review['App Version'] || '').toLowerCase();
    const content = (review.content || review['Review Text'] || review.Body || '').toLowerCase();
    const metadata = (review.metadata || review.Metadata || '').toLowerCase();
    
    // Check device names and content for OS indicators
    if (device.includes('iphone') || device.includes('ipad') || device.includes('ios') || 
        version.includes('ios') || content.includes('iphone') || content.includes('ipad') ||
        metadata.includes('ios')) {
      return 'iOS';
    } else if (device.includes('galaxy') || device.includes('pixel') || device.includes('android') || 
               device.includes('samsung') || device.includes('motorola') || device.includes('oneplus') ||
               device.includes('lg') || device.includes('huawei') || device.includes('xiaomi') ||
               version.includes('android') || content.includes('android') || metadata.includes('android')) {
      return 'Android';
    }
    return 'Unknown';
  };

  useEffect(() => {
    // Reset all state when reviews change (e.g., due to date filtering)
    setCategorizedReviews([]);
    setIssueAnalysis(null);
    setIssueDistribution(null);
    setCategorizeProgress(0);
    setIsCategorizingComplete(false);
    setDisplayedReviews(20);
    
    if (reviews && reviews.length > 0) {
      analyzeAllReviews();
    }
  }, [reviews]);

  const analyzeAllReviews = async () => {
    setLoading(true);
    setCategorizeProgress(0);
    setIsCategorizingComplete(false);
    
    // Clear any previous categorized reviews completely
    setCategorizedReviews([]);
    
    try {
      // Check if API is configured - but don't skip if we have a hardcoded key
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const hasHardcodedKey = true; // We have a fallback key in the service
      
      if (!apiKey && !hasHardcodedKey) {
        console.warn('No Gemini API key configured - using content-based categorization');
        
        // Use intelligent fallback categorization based on content analysis
        const categorized = reviews.map(review => {
          const rating = review.rating || review.Rating || 3;
          const reviewText = (review.content || review['Review Text'] || review.Body || '').toLowerCase();
          
          let primaryCategory = 'General Feedback';
          let sentiment = 'neutral';
          let severity = 'none';
          let issueType = 'general';
          let tags = [];
          
          // Analyze content for categorization
          if (reviewText.includes('crash') || reviewText.includes('bug') || reviewText.includes('error') || 
              reviewText.includes('broken') || reviewText.includes('fix') || reviewText.includes('problem')) {
            primaryCategory = 'Technical Issues';
            sentiment = 'negative';
            severity = reviewText.includes('crash') ? 'high' : 'medium';
            issueType = 'bug';
            tags = ['technical', 'issue'];
          } else if (reviewText.includes('login') || reviewText.includes('password') || reviewText.includes('sign in') ||
                     reviewText.includes('authentication') || reviewText.includes('account')) {
            primaryCategory = 'Login & Authentication';
            sentiment = 'negative';
            severity = 'high';
            issueType = 'functional';
            tags = ['login', 'auth'];
          } else if (reviewText.includes('connect') || reviewText.includes('vehicle') || reviewText.includes('sync') ||
                     reviewText.includes('network') || reviewText.includes('connection')) {
            primaryCategory = 'Connectivity';
            sentiment = 'negative';
            severity = 'medium';
            issueType = 'technical';
            tags = ['connectivity', 'sync'];
          } else if (reviewText.includes('pay') || reviewText.includes('charge') || reviewText.includes('subscription') ||
                     reviewText.includes('billing') || reviewText.includes('price')) {
            primaryCategory = 'Payment & Billing';
            sentiment = 'negative';
            severity = 'medium';
            issueType = 'complaint';
            tags = ['payment', 'billing'];
          } else if (reviewText.includes('support') || reviewText.includes('help') || reviewText.includes('customer service') ||
                     reviewText.includes('response') || reviewText.includes('contact')) {
            primaryCategory = 'Customer Service';
            sentiment = 'negative';
            severity = 'medium';
            issueType = 'complaint';
            tags = ['support', 'service'];
          } else if (reviewText.includes('ui') || reviewText.includes('design') || reviewText.includes('interface') ||
                     reviewText.includes('layout') || reviewText.includes('button') || reviewText.includes('screen')) {
            primaryCategory = 'UI/UX Issues';
            sentiment = 'negative';
            severity = 'low';
            issueType = 'complaint';
            tags = ['ui', 'design'];
          } else if (reviewText.includes('feature') || reviewText.includes('add') || reviewText.includes('would be nice') ||
                     reviewText.includes('should') || reviewText.includes('could') || reviewText.includes('wish')) {
            primaryCategory = 'Feature Requests';
            sentiment = 'neutral';
            issueType = 'request';
            tags = ['feature', 'request'];
          } else if ((reviewText.includes('love') || reviewText.includes('great') || reviewText.includes('excellent') ||
                      reviewText.includes('perfect') || reviewText.includes('amazing')) && rating >= 4) {
            primaryCategory = 'Positive Feedback';
            sentiment = 'positive';
            issueType = 'praise';
            tags = ['positive', 'satisfied'];
          } else if (rating <= 2) {
            primaryCategory = 'Technical Issues';
            sentiment = 'negative';
            severity = 'medium';
            issueType = 'complaint';
          } else if (rating >= 4) {
            primaryCategory = 'Positive Feedback';
            sentiment = 'positive';
            issueType = 'praise';
          }
          
          return {
            ...review,
            primaryCategory,
            categories: [primaryCategory],
            issueType,
            severity,
            sentiment,
            isActionable: sentiment === 'negative' && severity !== 'none',
            suggestedAction: null,
            tags,
            keyPhrases: [],
            emotion: sentiment === 'positive' ? 'satisfied' : sentiment === 'negative' ? 'frustrated' : 'neutral'
          };
        });
        
        setCategorizedReviews(categorized);
        setIssueDistribution(getIssueDistribution(categorized));
        setIsCategorizingComplete(true);
        return;
      }

      // First, get overall issue analysis with all reviews
      console.log('Starting AI categorization with', reviews.length, 'reviews');
      const analysis = await analyzeReviewsWithIssues(reviews);
      setIssueAnalysis(analysis);
      console.log('Issue analysis complete:', analysis);

      // Process reviews in batches for better performance
      const batchSize = 10;
      const totalReviews = reviews.length;
      const categorized = [];
      
      for (let i = 0; i < totalReviews; i += batchSize) {
        const batch = reviews.slice(i, Math.min(i + batchSize, totalReviews));
        const batchPromises = batch.map(async (review) => {
          try {
            // Log review content to debug
            const reviewContent = review.content || review['Review Text'] || review.Body || '';
            console.log('Processing review:', {
              content: reviewContent.substring(0, 100) + '...',
              rating: review.rating || review.Rating,
              hasContent: !!reviewContent
            });
            
            const enhanced = await categorizeReviewEnhanced(review);
            console.log('Enhanced categorization result:', enhanced);
            
            // Check if we have the expected structure
            const primaryCategory = enhanced.categories?.primary || enhanced.primaryCategory || 'General Feedback';
            console.log('Primary category extracted:', primaryCategory);
            
            return {
              ...review,
              primaryCategory: primaryCategory,
              categories: enhanced.categories?.secondary || enhanced.categories || [primaryCategory],
              issueType: enhanced.issue?.type || enhanced.issueType || 'general',
              severity: enhanced.severity?.level || enhanced.severity || 'none',
              sentiment: enhanced.sentiment?.overall || enhanced.sentiment || 'neutral',
              isActionable: enhanced.actionable || false,
              suggestedAction: enhanced.issue?.suggestion || enhanced.suggestedAction,
              tags: enhanced.categories?.tags || enhanced.tags || [],
              emotion: enhanced.sentiment?.emotion || enhanced.emotion || 'neutral'
            };
          } catch (error) {
            console.error('Error categorizing review:', error);
            // Better fallback categorization based on content and rating
            const reviewText = (review.content || review['Review Text'] || review.Body || '').toLowerCase();
            const rating = review.rating || review.Rating || 3;
            
            let primaryCategory = 'General Feedback';
            let issueType = 'general';
            let severity = 'none';
            let sentiment = 'neutral';
            let tags = [];
            
            // Enhanced content analysis for categorization
            if (reviewText.includes('crash') || reviewText.includes('bug') || reviewText.includes('error') || 
                reviewText.includes('broken') || reviewText.includes('fix') || reviewText.includes('problem') ||
                reviewText.includes('issue') || reviewText.includes('not work') || reviewText.includes('problematic')) {
              primaryCategory = 'Technical Issues';
              sentiment = 'negative';
              severity = reviewText.includes('crash') ? 'high' : 'medium';
              issueType = 'bug';
              tags = ['technical', 'issue'];
            } else if (reviewText.includes('login') || reviewText.includes('password') || reviewText.includes('sign in') ||
                       reviewText.includes('authentication') || reviewText.includes('account') || reviewText.includes('access')) {
              primaryCategory = 'Login & Authentication';
              sentiment = 'negative';
              severity = 'high';
              issueType = 'functional';
              tags = ['login', 'auth'];
            } else if (reviewText.includes('connect') || reviewText.includes('vehicle') || reviewText.includes('sync') ||
                       reviewText.includes('network') || reviewText.includes('connection') || reviewText.includes('bluetooth')) {
              primaryCategory = 'Connectivity';
              sentiment = 'negative';
              severity = 'medium';
              issueType = 'technical';
              tags = ['connectivity', 'sync'];
            } else if (reviewText.includes('pay') || reviewText.includes('charge') || reviewText.includes('subscription') ||
                       reviewText.includes('billing') || reviewText.includes('price') || reviewText.includes('money')) {
              primaryCategory = 'Payment & Billing';
              sentiment = 'negative';
              severity = 'medium';
              issueType = 'complaint';
              tags = ['payment', 'billing'];
            } else if (reviewText.includes('support') || reviewText.includes('help') || reviewText.includes('customer service') ||
                       reviewText.includes('response') || reviewText.includes('contact') || reviewText.includes('ticket')) {
              primaryCategory = 'Customer Service';
              sentiment = 'negative';
              severity = 'medium';
              issueType = 'complaint';
              tags = ['support', 'service'];
            } else if (reviewText.includes('ui') || reviewText.includes('design') || reviewText.includes('interface') ||
                       reviewText.includes('layout') || reviewText.includes('button') || reviewText.includes('screen')) {
              primaryCategory = 'UI/UX Issues';
              sentiment = 'negative';
              severity = 'low';
              issueType = 'complaint';
              tags = ['ui', 'design'];
            } else if (reviewText.includes('feature') || reviewText.includes('add') || reviewText.includes('would be nice') ||
                       reviewText.includes('should') || reviewText.includes('could') || reviewText.includes('wish')) {
              primaryCategory = 'Feature Requests';
              sentiment = 'neutral';
              issueType = 'request';
              tags = ['feature', 'request'];
            } else if ((reviewText.includes('love') || reviewText.includes('great') || reviewText.includes('excellent') ||
                        reviewText.includes('perfect') || reviewText.includes('amazing') || reviewText.includes('awesome')) && rating >= 4) {
              primaryCategory = 'Positive Feedback';
              sentiment = 'positive';
              issueType = 'praise';
              tags = ['positive', 'satisfied'];
            } else if (rating <= 2) {
              primaryCategory = 'Technical Issues';
              sentiment = 'negative';
              severity = 'medium';
              issueType = 'complaint';
            } else if (rating >= 4) {
              primaryCategory = 'Positive Feedback';
              sentiment = 'positive';
              issueType = 'praise';
            }
            
            return {
              ...review,
              primaryCategory,
              categories: [primaryCategory],
              issueType,
              severity,
              sentiment,
              isActionable: sentiment === 'negative' && severity !== 'none',
              tags,
              emotion: sentiment === 'positive' ? 'satisfied' : sentiment === 'negative' ? 'frustrated' : 'neutral'
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        categorized.push(...batchResults);
        
        // Update progress
        const progress = Math.round((categorized.length / totalReviews) * 100);
        setCategorizeProgress(progress);
        
        // Update state periodically to show progress
        setCategorizedReviews([...categorized]);
        setIssueDistribution(getIssueDistribution(categorized));
        
        // Small delay to prevent rate limiting
        if (i + batchSize < totalReviews) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setIsCategorizingComplete(true);
    } catch (error) {
      console.error('Analysis error:', error);
      // Fallback to intelligent categorization for ALL reviews
      const categorized = reviews.map(review => {
        const rating = review.rating || review.Rating || 3;
        const reviewText = (review.content || review['Review Text'] || review.Body || '').toLowerCase();
        
        let primaryCategory = 'General Feedback';
        let sentiment = 'neutral';
        let severity = 'none';
        let issueType = 'general';
        let tags = [];
        
        // Enhanced content analysis for categorization
        if (reviewText.includes('crash') || reviewText.includes('bug') || reviewText.includes('error') || 
            reviewText.includes('broken') || reviewText.includes('fix') || reviewText.includes('problem') ||
            reviewText.includes('issue') || reviewText.includes('not work') || reviewText.includes('problematic')) {
          primaryCategory = 'Technical Issues';
          sentiment = 'negative';
          severity = reviewText.includes('crash') ? 'high' : 'medium';
          issueType = 'bug';
          tags = ['technical', 'issue'];
        } else if (reviewText.includes('login') || reviewText.includes('password') || reviewText.includes('sign in') ||
                   reviewText.includes('authentication') || reviewText.includes('account') || reviewText.includes('access')) {
          primaryCategory = 'Login & Authentication';
          sentiment = 'negative';
          severity = 'high';
          issueType = 'functional';
          tags = ['login', 'auth'];
        } else if (reviewText.includes('connect') || reviewText.includes('vehicle') || reviewText.includes('sync') ||
                   reviewText.includes('network') || reviewText.includes('connection') || reviewText.includes('bluetooth')) {
          primaryCategory = 'Connectivity';
          sentiment = 'negative';
          severity = 'medium';
          issueType = 'technical';
          tags = ['connectivity', 'sync'];
        } else if (reviewText.includes('pay') || reviewText.includes('charge') || reviewText.includes('subscription') ||
                   reviewText.includes('billing') || reviewText.includes('price') || reviewText.includes('money')) {
          primaryCategory = 'Payment & Billing';
          sentiment = 'negative';
          severity = 'medium';
          issueType = 'complaint';
          tags = ['payment', 'billing'];
        } else if (reviewText.includes('support') || reviewText.includes('help') || reviewText.includes('customer service') ||
                   reviewText.includes('response') || reviewText.includes('contact') || reviewText.includes('ticket')) {
          primaryCategory = 'Customer Service';
          sentiment = 'negative';
          severity = 'medium';
          issueType = 'complaint';
          tags = ['support', 'service'];
        } else if (reviewText.includes('ui') || reviewText.includes('design') || reviewText.includes('interface') ||
                   reviewText.includes('layout') || reviewText.includes('button') || reviewText.includes('screen')) {
          primaryCategory = 'UI/UX Issues';
          sentiment = 'negative';
          severity = 'low';
          issueType = 'complaint';
          tags = ['ui', 'design'];
        } else if (reviewText.includes('feature') || reviewText.includes('add') || reviewText.includes('would be nice') ||
                   reviewText.includes('should') || reviewText.includes('could') || reviewText.includes('wish')) {
          primaryCategory = 'Feature Requests';
          sentiment = 'neutral';
          issueType = 'request';
          tags = ['feature', 'request'];
        } else if ((reviewText.includes('love') || reviewText.includes('great') || reviewText.includes('excellent') ||
                    reviewText.includes('perfect') || reviewText.includes('amazing') || reviewText.includes('awesome')) && rating >= 4) {
          primaryCategory = 'Positive Feedback';
          sentiment = 'positive';
          issueType = 'praise';
          tags = ['positive', 'satisfied'];
        } else if (rating <= 2) {
          primaryCategory = 'Technical Issues';
          sentiment = 'negative';
          severity = 'medium';
          issueType = 'complaint';
        } else if (rating >= 4) {
          primaryCategory = 'Positive Feedback';
          sentiment = 'positive';
          issueType = 'praise';
        }
        
        return {
          ...review,
          primaryCategory,
          categories: [primaryCategory],
          severity,
          sentiment,
          issueType,
          isActionable: sentiment === 'negative' && severity !== 'none',
          tags,
          emotion: sentiment === 'positive' ? 'satisfied' : sentiment === 'negative' ? 'frustrated' : 'neutral'
        };
      });
      setCategorizedReviews(categorized);
      setIssueDistribution(getIssueDistribution(categorized));
      setIsCategorizingComplete(true);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return d.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatStars = (rating) => {
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    return stars;
  };

  const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') {
      return text;
    }

    const parts = text.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    
    return parts.map((part, index) => 
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <span key={index} className="search-highlight">{part}</span>
      ) : (
        part
      )
    );
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleCategoryExpansion = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  
  // Helper function to check if review is within date range
  const isWithinDateRange = (reviewDate, range) => {
    if (!range || range === '' || range === 'all') return true;
    
    const date = new Date(reviewDate);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (range) {
      case 'today':
        return date >= startOfDay;
      case 'week':
        const weekAgo = new Date(startOfDay);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return date >= weekAgo;
      case 'month':
        const monthAgo = new Date(startOfDay);
        monthAgo.setDate(monthAgo.getDate() - 30);
        return date >= monthAgo;
      default:
        return true;
    }
  };

  // Ensure we only show reviews that are in the current filtered set
  const reviewsToShow = categorizedReviews.slice(0, reviews.length);
  
  // Apply all filters: category, quick, and advanced filters
  const filteredReviews = reviewsToShow.filter(review => {
    // First check category filters
    const passesCategory = selectedCategories.length === 0 || 
      selectedCategories.some(cat => 
        review.primaryCategory === cat || 
        (Array.isArray(review.categories) && review.categories.includes(cat))
      );
    
    // Then check quick filters
    const passesQuickFilter = !activeQuickFilter || (() => {
      const rating = review.rating || review.Rating || 0;
      switch (activeQuickFilter) {
        case 'critical':
          return rating <= 2;
        case 'high':
          return rating >= 4;
        case 'negative':
          return review.sentiment === 'negative';
        case 'actionable':
          return review.isActionable === true;
        default:
          return true;
      }
    })();
    
    // Check advanced filters
    // Category filter
    const passesCategoryFilter = !categoryFilter || 
      review.primaryCategory === categoryFilter || 
      (Array.isArray(review.categories) && review.categories.includes(categoryFilter));
    
    // Severity filter
    const passesSeverityFilter = !severityFilter || review.severity === severityFilter;
    
    // Sentiment filter
    const passesSentimentFilter = !sentimentFilter || review.sentiment === sentimentFilter;
    
    // Platform filter
    const passesPlatformFilter = !platformFilter || (() => {
      const os = getOperatingSystem(review).toLowerCase();
      if (platformFilter === 'ios') return os === 'ios';
      if (platformFilter === 'android') return os === 'android';
      if (platformFilter === 'unknown') return os === 'unknown';
      return true;
    })();
    
    // Date range filter
    const passesDateFilter = isWithinDateRange(
      review.date || review.Date || review['Review Date'], 
      dateRangeFilter
    );
    
    return passesCategory && passesQuickFilter && passesCategoryFilter && 
           passesSeverityFilter && passesSentimentFilter && passesPlatformFilter && 
           passesDateFilter;
  });

  const getCategoryCount = (category) => {
    // Only count from the categorized reviews that are actually in the current filtered set
    return categorizedReviews
      .slice(0, reviews.length) // Ensure we don't count more than the filtered reviews
      .filter(r => 
        r.primaryCategory === category || (Array.isArray(r.categories) && r.categories.includes(category))
      ).length;
  };

  // Calculate total reviews across all categories
  const getTotalCategorized = () => {
    const allCounts = Object.keys(categoryConfig).reduce((total, category) => {
      return total + getCategoryCount(category);
    }, 0);
    return allCounts;
  };

  // Handle infinite scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100) {
        if (displayedReviews < filteredReviews.length) {
          setDisplayedReviews(prev => Math.min(prev + 20, filteredReviews.length));
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [displayedReviews, filteredReviews.length]);

  // Reset displayed reviews when filters change or reviews prop changes
  useEffect(() => {
    setDisplayedReviews(20);
  }, [selectedCategories, reviews, activeQuickFilter, categoryFilter, severityFilter, sentimentFilter, platformFilter, dateRangeFilter]);

  // Handle quick filter clicks
  const handleQuickFilterClick = useCallback((filterType) => {
    if (activeQuickFilter === filterType) {
      setActiveQuickFilter(null);
    } else {
      setActiveQuickFilter(filterType);
      setSelectedCategories([]); // Clear category filters to avoid confusion
    }
  }, [activeQuickFilter]);
  
  // Reset all filters
  const resetAllFilters = () => {
    setSelectedCategories([]);
    setActiveQuickFilter(null);
    setCategoryFilter('');
    setSeverityFilter('');
    setSentimentFilter('');
    setPlatformFilter('');
    setDateRangeFilter('');
  };

  return (
    <div className="review-display-container">
      {/* Header Section */}
      <div className="review-display-header">
        <h2 className="header-title">
          LATEST REVIEWS ({reviews.length} Total)
          {activeQuickFilter && (
            <span className="active-quick-filter-badge">
              {activeQuickFilter === 'critical' && ' - Critical Issues (1-2★)'}
              {activeQuickFilter === 'high' && ' - High Priority (4-5★)'}
              {activeQuickFilter === 'negative' && ' - Negative Reviews'}
              {activeQuickFilter === 'actionable' && ' - Actionable Items'}
            </span>
          )}
          {/* Show active advanced filters count */}
          {(categoryFilter || severityFilter || sentimentFilter || platformFilter || dateRangeFilter) && (
            <span style={{ marginLeft: '12px', fontSize: '12px', color: '#60a5fa' }}>
              ({[categoryFilter, severityFilter, sentimentFilter, platformFilter, dateRangeFilter].filter(Boolean).length} filters active)
            </span>
          )}
        </h2>
        <div className="header-actions">
          {/* Reset All Filters button */}
          {(selectedCategories.length > 0 || activeQuickFilter || categoryFilter || severityFilter || sentimentFilter || platformFilter || dateRangeFilter) && (
            <button className="reset-all-filters-btn" onClick={resetAllFilters}>
              <X size={14} />
              Reset All Filters
            </button>
          )}
          {activeQuickFilter && (
            <button 
              className="clear-quick-filter-btn"
              onClick={() => setActiveQuickFilter(null)}
              title="Clear quick filter"
            >
              <X size={16} />
              <span>Clear Filter</span>
            </button>
          )}
          <button 
            className="filter-toggle-btn"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            <span>Filters</span>
            <ChevronDown 
              size={16} 
              style={{ 
                transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }}
            />
          </button>
          {loading && (
            <div className="loading-indicator">
              <RefreshCw size={16} className="spin" />
              <span>
                {categorizeProgress > 0 
                  ? `Categorizing... ${categorizeProgress}%` 
                  : 'Analyzing...'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Category Filters */}
      {showFilters && (
        <div className="category-filters-section">
          {/* Advanced Filters Section */}
          <div className="advanced-filters-header">
            <h3>ADVANCED FILTERS</h3>
          </div>
          <div className="advanced-filters-grid">
            <div className="filter-dropdown">
              <select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {Object.keys(categoryConfig).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="filter-dropdown">
              <select 
                value={severityFilter} 
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="filter-dropdown">
              <select 
                value={sentimentFilter} 
                onChange={(e) => setSentimentFilter(e.target.value)}
              >
                <option value="">All Sentiments</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
            <div className="filter-dropdown">
              <select 
                value={platformFilter} 
                onChange={(e) => setPlatformFilter(e.target.value)}
              >
                <option value="">All Platforms</option>
                <option value="ios">iOS</option>
                <option value="android">Android</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div className="filter-dropdown">
              <select 
                value={dateRangeFilter} 
                onChange={(e) => setDateRangeFilter(e.target.value)}
              >
                <option value="">Date Range</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>

          <div className="issue-summary">
            {categorizedReviews.slice(0, reviews.length).filter(r => 
              r.severity === 'critical' || 
              (r.enhanced?.severity?.level === 'critical')
            ).length > 0 && (
              <div className="urgent-issues-banner">
                <AlertTriangle size={16} />
                <span>
                  {categorizedReviews.slice(0, reviews.length).filter(r => 
                    r.severity === 'critical' || 
                    (r.enhanced?.severity?.level === 'critical')
                  ).length} Urgent Issues Detected
                </span>
              </div>
            )}
            {loading && !isCategorizingComplete && reviews.length > 0 && (
              <div className="categorization-progress">
                Categorizing {Math.min(categorizedReviews.length, reviews.length)} of {reviews.length} reviews...
              </div>
            )}
          </div>

          <div className="category-grid">
            {Object.entries(categoryConfig).map(([category, config]) => {
              const count = getCategoryCount(category);
              const Icon = config.icon;
              const isSelected = selectedCategories.includes(category);
              const isExpanded = expandedCategories[category];

              return (
                <div key={category} className="category-item">
                  <div 
                    className={`category-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleCategory(category)}
                  >
                    <div className="category-header">
                      <div className="category-icon" style={{ color: config.color }}>
                        <Icon size={20} />
                      </div>
                      <div className="category-info">
                        <span className="category-name">{category}</span>
                        <span className="category-count">{count} issues</span>
                      </div>
                      {config.subcategories && (
                        <button
                          className="expand-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCategoryExpansion(category);
                          }}
                        >
                          <ChevronDown 
                            size={16} 
                            style={{ 
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                            }}
                          />
                        </button>
                      )}
                    </div>
                    
                    {isExpanded && config.subcategories && (
                      <div className="subcategories">
                        {config.subcategories.map(sub => (
                          <button
                            key={sub}
                            className={`subcategory-btn ${
                              selectedCategories.includes(sub) ? 'selected' : ''
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategory(sub);
                            }}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Stats - Simplified Dark Cards */}
          {issueDistribution && (
            <div className="quick-stats-dark">
              <div className={`simple-dark-card ${activeQuickFilter === 'high' ? 'active' : ''}`}
                   onClick={() => handleQuickFilterClick('high')}
                   title="Click to filter 4-5 star reviews">
                <div className="card-icon high-priority">
                  <Star size={20} />
                </div>
                <div className="card-content">
                  <span className="card-label">HIGH PRIORITY</span>
                  <span className="card-description">4-5 star reviews</span>
                </div>
                <div className="card-number high-priority-number">
                  {categorizedReviews.slice(0, reviews.length).filter(r => {
                    const rating = r.rating || r.Rating || 0;
                    return rating >= 4;
                  }).length}
                </div>
              </div>
              
              <div className={`simple-dark-card ${activeQuickFilter === 'critical' ? 'active' : ''}`}
                   onClick={() => handleQuickFilterClick('critical')}
                   title="Click to filter 1-2 star reviews">
                <div className="card-icon critical">
                  <AlertTriangle size={20} />
                </div>
                <div className="card-content">
                  <span className="card-label">CRITICAL ISSUES</span>
                  <span className="card-description">1-2 star reviews</span>
                </div>
                <div className="card-number critical-number">
                  {categorizedReviews.slice(0, reviews.length).filter(r => {
                    const rating = r.rating || r.Rating || 0;
                    return rating <= 2;
                  }).length}
                </div>
              </div>
              
              <div className={`simple-dark-card ${activeQuickFilter === 'negative' ? 'active' : ''}`}
                   onClick={() => handleQuickFilterClick('negative')}
                   title="Click to filter negative reviews">
                <div className="card-icon negative">
                  <ThumbsDown size={20} />
                </div>
                <div className="card-content">
                  <span className="card-label">NEGATIVE</span>
                  <span className="card-description">
                    {(() => {
                      const negativeCount = categorizedReviews.slice(0, reviews.length).filter(r => 
                        r.sentiment === 'negative' || 
                        (r.enhanced?.sentiment?.overall === 'negative')
                      ).length;
                      const totalCount = reviews.length;
                      const percentage = totalCount > 0 ? Math.round((negativeCount / totalCount) * 100) : 0;
                      return `${percentage}% of total`;
                    })()} 
                  </span>
                </div>
                <div className="card-number negative-number">
                  {categorizedReviews.slice(0, reviews.length).filter(r => 
                    r.sentiment === 'negative' || 
                    (r.enhanced?.sentiment?.overall === 'negative')
                  ).length}
                </div>
              </div>
              
              <div className={`simple-dark-card ${activeQuickFilter === 'actionable' ? 'active' : ''}`}
                   onClick={() => handleQuickFilterClick('actionable')}
                   title="Click to filter actionable reviews">
                <div className="card-icon actionable">
                  <Target size={20} />
                </div>
                <div className="card-content">
                  <span className="card-label">ACTIONABLE</span>
                  <span className="card-description">Need attention</span>
                </div>
                <div className="card-number actionable-number">
                  {categorizedReviews.slice(0, reviews.length).filter(r => 
                    r.isActionable || 
                    (r.enhanced?.actionable === true)
                  ).length}
                </div>
              </div>
            </div>
          )}
          
          {/* Category Count Validation */}
          {isCategorizingComplete && (
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#94a3b8' }}>
              Total categorized: {Math.min(getTotalCategorized(), reviews.length)} / {reviews.length} reviews
              {getTotalCategorized() < reviews.length && (
                <span style={{ color: '#f87171', marginLeft: '8px' }}>
                  ({reviews.length - getTotalCategorized()} uncategorized)
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reviews List */}
      <div className="reviews-list">
        {filteredReviews.slice(0, Math.min(displayedReviews, filteredReviews.length)).map((review, index) => {
          // Double-check that this review is actually from the current filtered set
          const reviewDate = review.date || review.Date || review['Review Date'];
          const reviewContent = review.content || review['Review Text'] || review.Body || '';
          
          // Find if this review exists in the original filtered reviews
          const isInFilteredSet = reviews.some(r => {
            const rDate = r.date || r.Date || r['Review Date'];
            const rContent = r.content || r['Review Text'] || r.Body || '';
            return rDate === reviewDate && rContent === reviewContent;
          });
          
          // Only render if the review is actually in the filtered set
          if (!isInFilteredSet) return null;
          
          return (
          <div key={index} className={`review-card ${review.severity}`}>
            <div className="review-header">
              <div className="review-rating">
                <span className="stars">{formatStars(review.rating || review.Rating || 0)}</span>
              </div>
              <div className="review-meta">
                <span className="review-date">{formatDate(review.date || review.Date)}</span>
                <span className="review-separator">•</span>
                <span className="review-author">{highlightSearchTerm(review.author || review.Author || 'Anonymous', searchTerm)}</span>
                {(review.version || review.Version || review['App Version']) && (
                  <>
                    <span className="review-separator">•</span>
                    <span className="review-version">
                      v{review.version || review.Version || review['App Version']}
                    </span>
                  </>
                )}
                {review.device && (
                  <>
                    <span className="review-separator">•</span>
                    <span className="review-device">{review.device}</span>
                  </>
                )}
                {/* Operating System */}
                <span className="review-separator">•</span>
                <span className="review-os">{getOperatingSystem(review)}</span>
                {/* Country/Region if available */}
                {(review.country || review.Country || review.Region) && (
                  <>
                    <span className="review-separator">•</span>
                    <span className="review-region">{review.country || review.Country || review.Region}</span>
                  </>
                )}
              </div>
            </div>

            <div className="review-content">
              <p>{highlightSearchTerm(review.content || review['Review Text'] || review.Body || '', searchTerm)}</p>
              {/* Additional metadata */}
              {(review.helpful || review['Helpful Count']) > 0 && (
                <div className="review-helpful">
                  <span className="helpful-icon">👍</span>
                  <span className="helpful-count">
                    {review.helpful || review['Helpful Count']} found this helpful
                  </span>
                </div>
              )}
            </div>

            <div className="review-footer">
              <div className="review-categories">
                <span className={`primary-category ${review.issueType}`}>
                  {review.primaryCategory}
                </span>
                {Array.isArray(review.categories) && review.categories
                  .filter(cat => cat !== review.primaryCategory) // Remove duplicate primary category
                  .slice(0, 2)
                  .map((cat, idx) => (
                    <span key={idx} className="secondary-category">{cat}</span>
                  ))}
                {review.severity !== 'none' && (
                  <span className={`severity-badge ${review.severity}`}>
                    {review.severity}
                  </span>
                )}
              </div>
              
              {review.isActionable && review.suggestedAction && (
                <div className="suggested-action">
                  <AlertCircle size={14} />
                  <span>{review.suggestedAction}</span>
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {loading && categorizedReviews.length === 0 && (
        <div className="loading-state">
          <RefreshCw size={32} className="spin" />
          <p>Analyzing reviews and categorizing issues...</p>
          {categorizeProgress > 0 && (
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${categorizeProgress}%` }} />
              <span className="progress-text">{categorizeProgress}% complete</span>
            </div>
          )}
        </div>
      )}

      {!loading && filteredReviews.length === 0 && (
        <div className="empty-state">
          <p>No reviews found matching the selected filters.</p>
        </div>
      )}

      {/* Show loading indicator for more reviews */}
      {displayedReviews < filteredReviews.length && (
        <div className="load-more-indicator">
          <p>Showing {displayedReviews} of {filteredReviews.length} reviews</p>
          <p className="scroll-hint">Scroll down to load more...</p>
        </div>
      )}

      {/* Show categorization status */}
      {!isCategorizingComplete && categorizedReviews.length > 0 && reviews.length > 0 && (
        <div className="categorization-status">
          <RefreshCw size={16} className="spin" />
          <span>Categorizing reviews... {categorizeProgress}% ({Math.min(categorizedReviews.length, reviews.length)}/{reviews.length})</span>
        </div>
      )}
    </div>
  );
};

export default ReviewDisplay;