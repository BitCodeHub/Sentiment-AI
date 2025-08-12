import React, { useState, useEffect } from 'react';
import { 
  analyzeReviewsWithIssues, 
  categorizeReviewEnhanced,
  getIssueDistribution 
} from '../services/enhancedCategorization';
import { 
  RefreshCw, Filter, ChevronDown, AlertCircle, 
  Bug, Zap, Wifi, Shield, CreditCard, Users,
  Palette, Heart, AlertTriangle, TrendingUp
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

const ReviewDisplay = ({ reviews }) => {
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
    if (reviews && reviews.length > 0) {
      analyzeAllReviews();
    }
  }, [reviews]);

  const analyzeAllReviews = async () => {
    setLoading(true);
    setCategorizeProgress(0);
    setIsCategorizingComplete(false);
    
    try {
      // Skip API calls if no API key is configured
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey || apiKey === 'your-openai-api-key-here') {
        console.warn('Skipping AI analysis - API key not configured');
        
        // Use basic categorization without AI for ALL reviews
        const categorized = reviews.map(review => {
          const rating = review.rating || review.Rating || 3;
          let primaryCategory = 'General Feedback';
          let sentiment = 'neutral';
          
          // Simple categorization based on rating
          if (rating >= 4) {
            primaryCategory = 'Positive Feedback';
            sentiment = 'positive';
          } else if (rating <= 2) {
            primaryCategory = 'Technical Issues';
            sentiment = 'negative';
          }
          
          return {
            ...review,
            primaryCategory,
            categories: [primaryCategory],
            issueType: sentiment === 'positive' ? 'praise' : sentiment === 'negative' ? 'technical' : 'neutral',
            severity: sentiment === 'negative' ? 'medium' : 'none',
            sentiment,
            isActionable: sentiment === 'negative',
            suggestedAction: null,
            tags: [],
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
      const analysis = await analyzeReviewsWithIssues(reviews);
      setIssueAnalysis(analysis);

      // Process reviews in batches for better performance
      const batchSize = 10;
      const totalReviews = reviews.length;
      const categorized = [];
      
      for (let i = 0; i < totalReviews; i += batchSize) {
        const batch = reviews.slice(i, Math.min(i + batchSize, totalReviews));
        const batchPromises = batch.map(async (review) => {
          try {
            const enhanced = await categorizeReviewEnhanced(review);
            return {
              ...review,
              ...enhanced
            };
          } catch (error) {
            console.error('Error categorizing review:', error);
            // Better fallback categorization based on content and rating
            const reviewText = (review.content || review['Review Text'] || review.Body || '').toLowerCase();
            const rating = review.rating || review.Rating || 3;
            
            let primaryCategory = 'General Feedback';
            let issueType = 'neutral';
            let severity = 'none';
            let sentiment = 'neutral';
            
            if (reviewText.includes('crash') || reviewText.includes('bug') || reviewText.includes('error')) {
              primaryCategory = 'Technical Issues';
              issueType = 'technical';
              severity = 'high';
              sentiment = 'negative';
            } else if (reviewText.includes('login') || reviewText.includes('password') || reviewText.includes('sign in')) {
              primaryCategory = 'Login & Authentication';
              issueType = 'functional';
              severity = 'medium';
              sentiment = 'negative';
            } else if (reviewText.includes('love') || reviewText.includes('great') || reviewText.includes('excellent') || rating >= 4) {
              primaryCategory = 'Positive Feedback';
              issueType = 'praise';
              sentiment = 'positive';
            } else if (rating <= 2) {
              primaryCategory = 'Technical Issues';
              issueType = 'technical';
              severity = 'medium';
              sentiment = 'negative';
            }
            
            return {
              ...review,
              primaryCategory,
              categories: [primaryCategory],
              issueType,
              severity,
              sentiment,
              isActionable: sentiment === 'negative',
              tags: [],
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
      // Fallback to basic categorization for ALL reviews
      const categorized = reviews.map(review => {
        const rating = review.rating || review.Rating || 3;
        let primaryCategory = 'General Feedback';
        let sentiment = 'neutral';
        let severity = 'none';
        
        if (rating >= 4) {
          primaryCategory = 'Positive Feedback';
          sentiment = 'positive';
        } else if (rating <= 2) {
          primaryCategory = 'Technical Issues';
          sentiment = 'negative';
          severity = 'medium';
        }
        
        return {
          ...review,
          primaryCategory,
          categories: [primaryCategory],
          severity,
          sentiment
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

  const filteredReviews = selectedCategories.length === 0 
    ? categorizedReviews 
    : categorizedReviews.filter(review => 
        selectedCategories.some(cat => 
          review.primaryCategory === cat || 
          review.categories?.includes(cat)
        )
      );

  const getCategoryCount = (category) => {
    return categorizedReviews.filter(r => 
      r.primaryCategory === category || r.categories?.includes(category)
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

  // Reset displayed reviews when filters change
  useEffect(() => {
    setDisplayedReviews(20);
  }, [selectedCategories]);

  return (
    <div className="review-display-container">
      {/* Header Section */}
      <div className="review-display-header">
        <h2 className="header-title">LATEST REVIEWS ({categorizedReviews.length} Total)</h2>
        <div className="header-actions">
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
          <div className="issue-summary">
            {(issueAnalysis?.urgentIssues?.length > 0 || issueDistribution?.bySeverity?.critical > 0) && (
              <div className="urgent-issues-banner">
                <AlertTriangle size={16} />
                <span>
                  {issueAnalysis?.urgentIssues?.length || issueDistribution?.bySeverity?.critical || 0} Urgent Issues Detected
                </span>
              </div>
            )}
            {loading && !isCategorizingComplete && (
              <div className="categorization-progress">
                Categorizing {categorizedReviews.length} of {reviews.length} reviews...
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

          {/* Quick Stats */}
          {issueDistribution && (
            <div className="quick-stats">
              <div className="stat-item">
                <span className="stat-label">Critical Issues</span>
                <span className="stat-value critical">
                  {issueDistribution.bySeverity.critical}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">High Priority</span>
                <span className="stat-value high">
                  {issueDistribution.bySeverity.high}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Negative Reviews</span>
                <span className="stat-value negative">
                  {categorizedReviews.filter(r => r.sentiment === 'negative').length}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Actionable</span>
                <span className="stat-value actionable">
                  {categorizedReviews.filter(r => r.isActionable).length}
                </span>
              </div>
            </div>
          )}
          
          {/* Category Count Validation */}
          {isCategorizingComplete && (
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
              Total categorized: {getTotalCategorized()} / {categorizedReviews.length} reviews
              {getTotalCategorized() !== categorizedReviews.length && (
                <span style={{ color: '#dc2626', marginLeft: '8px' }}>
                  ({categorizedReviews.length - getTotalCategorized()} uncategorized)
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reviews List */}
      <div className="reviews-list">
        {filteredReviews.slice(0, displayedReviews).map((review, index) => (
          <div key={index} className={`review-card ${review.severity}`}>
            <div className="review-header">
              <div className="review-rating">
                <span className="stars">{formatStars(review.rating || review.Rating || 0)}</span>
              </div>
              <div className="review-meta">
                <span className="review-date">{formatDate(review.date || review.Date)}</span>
                <span className="review-separator">•</span>
                <span className="review-author">{review.author || review.Author || 'Anonymous'}</span>
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
              <p>{review.content || review['Review Text'] || review.Body}</p>
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
                {review.categories
                  ?.filter(cat => cat !== review.primaryCategory) // Remove duplicate primary category
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
        ))}
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
      {!isCategorizingComplete && categorizedReviews.length > 0 && (
        <div className="categorization-status">
          <RefreshCw size={16} className="spin" />
          <span>Categorizing reviews... {categorizeProgress}% ({categorizedReviews.length}/{reviews.length})</span>
        </div>
      )}
    </div>
  );
};

export default ReviewDisplay;