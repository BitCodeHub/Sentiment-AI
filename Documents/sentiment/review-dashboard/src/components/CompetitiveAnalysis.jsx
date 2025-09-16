import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Cell, Area, AreaChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, Star, MessageSquare, 
  Activity, Award, Globe, Calendar, Filter, X, Check,
  ChevronDown, Search, Zap, Shield, Target, Brain,
  Car, Battery, Gauge, DollarSign, ArrowRight, BarChart3,
  Sparkles, AlertCircle, ChevronRight, Plus, Minus,
  Layers, CheckCircle2, XCircle, Building2, Bot
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { automotiveOEMs, getOEMById, getCompetitors, oemCategories } from '../data/automotiveOEMs';
import { 
  analyzeCompetitors, 
  getCompetitorReviewData,
  getCompetitorRedditSentiment,
  compareCompetitors,
  getComprehensiveCompetitiveData,
  fetchRealTimeMetrics
} from '../services/competitiveAnalysisService';
import RivueChatbot from './RivueChatbot';
import './CompetitiveAnalysis.css';

const COLORS = {
  primary: ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6'],
  gradients: [
    { start: '#6366F1', end: '#8B5CF6' },
    { start: '#EC4899', end: '#F59E0B' },
    { start: '#10B981', end: '#3B82F6' },
    { start: '#F59E0B', end: '#EF4444' },
    { start: '#3B82F6', end: '#6366F1' }
  ],
  semantic: {
    positive: '#10B981',
    negative: '#EF4444',
    neutral: '#6B7280',
    warning: '#F59E0B',
    info: '#3B82F6'
  }
};

const CompetitiveAnalysis = ({ currentOEM, currentAppName, onAskAI }) => {
  const [selectedCompetitors, setSelectedCompetitors] = useState([]);
  const [competitorData, setCompetitorData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompetitorSelect, setShowCompetitorSelect] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('overall');
  const [hoveredCompetitor, setHoveredCompetitor] = useState(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [showRivueChatbot, setShowRivueChatbot] = useState(false);
  const [deepAnalysisData, setDeepAnalysisData] = useState({});
  const [metricsData, setMetricsData] = useState({});
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const modalRef = useRef(null);

  // Auto-detect current OEM based on app name
  useEffect(() => {
    if (currentAppName && !currentOEM) {
      const detectedOEM = automotiveOEMs.find(oem => 
        oem.appNames.some(appName => 
          appName.toLowerCase().includes(currentAppName.toLowerCase()) ||
          currentAppName.toLowerCase().includes(appName.toLowerCase())
        )
      );
      
      if (detectedOEM) {
        console.log('Auto-detected OEM:', detectedOEM.name);
      }
    }
  }, [currentAppName, currentOEM]);

  // Filter OEMs based on category and search
  const filteredOEMs = automotiveOEMs.filter(oem => {
    const matchesCategory = selectedCategory === 'All' || 
      oem.categories.some(cat => cat.includes(selectedCategory));
    
    const matchesSearch = !searchTerm || 
      oem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      oem.brands.some(brand => brand.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  // Toggle competitor selection with animation
  const toggleCompetitor = (oemId) => {
    setSelectedCompetitors(prev => {
      if (prev.includes(oemId)) {
        return prev.filter(id => id !== oemId);
      } else if (prev.length < 5) {
        return [...prev, oemId];
      } else {
        // Show toast or notification that max is reached
        return prev;
      }
    });
  };

  // Handle click outside modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowCompetitorSelect(false);
      }
    };

    if (showCompetitorSelect) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCompetitorSelect]);

  // Trigger animations when data loads
  useEffect(() => {
    if (Object.keys(competitorData).length > 0) {
      setTimeout(() => setAnimationComplete(true), 100);
    }
  }, [competitorData]);

  // Fetch real-time metrics for charts when metric changes
  useEffect(() => {
    if (selectedCompetitors.length > 0 && Object.keys(competitorData).length > 0) {
      fetchMetricsForTab(selectedMetric);
    }
  }, [selectedMetric, competitorData]);

  // Fetch metrics for specific tab
  const fetchMetricsForTab = async (metricType) => {
    setIsLoadingMetrics(true);
    try {
      const selectedOEMs = selectedCompetitors.map(id => {
        const oem = getOEMById(id);
        return { name: oem.name, id };
      });
      
      const result = await fetchRealTimeMetrics(selectedOEMs, metricType);
      
      if (result.success && result.data) {
        setMetricsData(prev => ({
          ...prev,
          [metricType]: result.data
        }));
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  // Fetch competitor data
  const fetchCompetitorData = async () => {
    if (selectedCompetitors.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const competitorDataMap = {};
      
      // Fetch data for each selected competitor
      const promises = selectedCompetitors.map(async (competitorId) => {
        const oem = getOEMById(competitorId);
        if (!oem) return null;
        
        try {
          // Fetch review data if app store ID is available
          let reviewData = null;
          let redditData = null;
          
          if (oem.appStoreId) {
            reviewData = await getCompetitorReviewData(competitorId);
          }
          
          // Fetch Reddit sentiment
          redditData = await getCompetitorRedditSentiment(oem.name);
          
          competitorDataMap[competitorId] = {
            name: oem.name,
            metrics: {
              appRating: reviewData?.appRating || 0,
              reviewCount: reviewData?.totalReviews || 0,
              sentimentScore: redditData?.sentimentScore || 0,
              redditMentions: redditData?.totalMentions || 0,
              marketShare: Math.random() * 30, // Still mock for market share
              innovationScore: 0.6 + Math.random() * 0.4, // Still mock
              customerSatisfaction: reviewData?.sentimentBreakdown ? 
                (reviewData.sentimentBreakdown.positive / 100) : 0.7,
              brandStrength: 0.7 + Math.random() * 0.3 // Still mock
            },
            trends: generateTrendData(), // Still using mock trends for now
            strengths: oem.strengths,
            appNames: oem.appNames,
            reviewData,
            redditData
          };
        } catch (error) {
          console.error(`Error fetching data for ${oem.name}:`, error);
          // Use fallback data if API fails
          competitorDataMap[competitorId] = {
            name: oem.name,
            metrics: {
              appRating: 3.5 + Math.random() * 1.5,
              reviewCount: Math.floor(1000 + Math.random() * 50000),
              sentimentScore: 0.5 + Math.random() * 0.5,
              redditMentions: Math.floor(50 + Math.random() * 500),
              marketShare: Math.random() * 30,
              innovationScore: 0.6 + Math.random() * 0.4,
              customerSatisfaction: 0.65 + Math.random() * 0.35,
              brandStrength: 0.7 + Math.random() * 0.3
            },
            trends: generateTrendData(),
            strengths: oem.strengths,
            appNames: oem.appNames,
            error: error.message
          };
        }
      });
      
      await Promise.all(promises);
      
      setCompetitorData(competitorDataMap);
      
      // Perform AI analysis if Gemini is configured
      try {
        const analysis = await analyzeCompetitors(currentAppName || 'Your App', competitorDataMap);
        setAnalysisResults(analysis);
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
      }
      
      // Fetch deep OEM analysis using Gemini 2.0 Flash
      try {
        const selectedOEMs = selectedCompetitors.map(id => {
          const oem = getOEMById(id);
          return {
            id,
            name: oem.name,
            country: oem.country,
            brands: oem.brands,
            categories: oem.categories,
            specialties: oem.specialties
          };
        });
        
        const deepAnalysis = await getComprehensiveCompetitiveData(
          selectedOEMs,
          currentAppName || 'Your App',
          'overall'
        );
        
        if (deepAnalysis.success && deepAnalysis.data) {
          setDeepAnalysisData(deepAnalysis.data);
        }
      } catch (deepError) {
        console.error('Deep analysis error:', deepError);
        // Continue without AI analysis
      }
      
    } catch (err) {
      console.error('Error fetching competitor data:', err);
      setError('Failed to fetch competitor data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate mock trend data
  const generateTrendData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      rating: 3.5 + Math.random() * 1.5,
      sentiment: 0.5 + Math.random() * 0.5,
      mentions: Math.floor(50 + Math.random() * 200)
    }));
  };

  // Prepare data for radar chart with normalization
  const prepareRadarData = () => {
    if (Object.keys(competitorData).length === 0) return [];
    
    const metrics = [
      { metric: 'App Rating', key: 'appRating', max: 5, icon: Star },
      { metric: 'Sentiment', key: 'sentimentScore', max: 1, icon: MessageSquare },
      { metric: 'Innovation', key: 'innovationScore', max: 1, icon: Sparkles },
      { metric: 'Satisfaction', key: 'customerSatisfaction', max: 1, icon: Users },
      { metric: 'Brand Strength', key: 'brandStrength', max: 1, icon: Shield },
      { metric: 'Market Share', key: 'marketShare', max: 100, icon: Globe }
    ];
    
    return metrics.map(({ metric, key, max, icon }) => {
      const dataPoint = { metric, icon };
      
      Object.entries(competitorData).forEach(([competitorId, data]) => {
        const value = data.metrics[key];
        dataPoint[data.name] = Math.round((value / max) * 100);
      });
      
      return dataPoint;
    });
  };

  // Prepare enhanced comparison data with real metrics
  const prepareComparisonData = () => {
    if (Object.keys(competitorData).length === 0) return [];
    
    // Use real-time metrics if available
    const currentMetrics = metricsData[selectedMetric];
    
    return Object.entries(competitorData).map(([competitorId, data]) => {
      const baseData = {
        name: data.name,
        'App Rating': data.metrics.appRating,
        'Review Count': data.metrics.reviewCount / 1000, // in thousands
        'Reddit Mentions': data.metrics.redditMentions,
        'Market Share': data.metrics.marketShare
      };
      
      // Override with real-time metrics if available
      if (currentMetrics?.current) {
        if (selectedMetric === 'ratings' && currentMetrics.current[data.name]) {
          baseData['App Rating'] = currentMetrics.current[data.name];
        } else if (selectedMetric === 'sentiment' && currentMetrics.current[data.name]) {
          baseData['Sentiment Score'] = currentMetrics.current[data.name];
        } else if (selectedMetric === 'market' && currentMetrics.current[data.name]) {
          baseData['Market Share'] = currentMetrics.current[data.name];
        }
      }
      
      return baseData;
    });
  };

  // Prepare time series data for area charts
  const prepareTimeSeriesData = () => {
    const currentMetrics = metricsData[selectedMetric];
    if (!currentMetrics?.historical) return [];
    
    // Convert historical data to chart format
    const timeSeriesMap = new Map();
    
    Object.entries(currentMetrics.historical).forEach(([competitor, history]) => {
      history.forEach(point => {
        if (!timeSeriesMap.has(point.month)) {
          timeSeriesMap.set(point.month, { month: point.month });
        }
        timeSeriesMap.get(point.month)[competitor] = point.value;
      });
    });
    
    return Array.from(timeSeriesMap.values());
  };

  // Ask AI about competitors
  const handleAskAI = (question) => {
    if (onAskAI) {
      const context = {
        competitors: selectedCompetitors.map(id => getOEMById(id)?.name).join(', '),
        data: competitorData
      };
      onAskAI(question, context);
    }
  };

  return (
    <div className="competitive-analysis-container">
      {/* Modern Header with Gradient */}
      <div className="competitive-header-modern">
        <div className="header-background-pattern" />
        <div className="header-content-wrapper">
          <div className="header-badge">
            <BarChart3 size={16} />
            <span>Competitive Intelligence</span>
          </div>
          <h1 className="header-title-modern">
            Competitive Analysis Dashboard
          </h1>
          <p className="header-description">
            Gain strategic insights by comparing your app's performance against leading automotive industry competitors
          </p>
          
          <div className="header-actions">
            <Button
              onClick={() => setShowCompetitorSelect(!showCompetitorSelect)}
              className="select-competitors-btn-modern"
              variant={showCompetitorSelect ? 'primary' : 'outline'}
            >
              <Building2 size={18} />
              <span>Select Competitors</span>
              <div className="competitor-count-badge">
                {selectedCompetitors.length}/5
              </div>
              <ChevronDown size={16} className={`transition-transform ${showCompetitorSelect ? 'rotate-180' : ''}`} />
            </Button>
            
            {selectedCompetitors.length > 0 && (
              <Button
                onClick={fetchCompetitorData}
                className="analyze-now-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="loading-spinner-small" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Run Analysis</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modern Competitor Selection Modal */}
      {showCompetitorSelect && (
        <div className="modal-overlay-modern">
          <div className="modal-container-modern" ref={modalRef}>
            <div className="modal-header-modern">
              <div className="modal-title-section">
                <div className="modal-icon-wrapper">
                  <Building2 size={24} />
                </div>
                <div>
                  <h2>Select Competitors</h2>
                  <p className="modal-subtitle">Choose up to 5 automotive companies to compare</p>
                </div>
              </div>
              <button 
                className="modal-close-btn"
                onClick={() => setShowCompetitorSelect(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
          
            {/* Modern Search and Filters */}
            <div className="modal-filters-modern">
              <div className="search-container-modern">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by company name or brand..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input-modern"
                  autoFocus
                />
                {searchTerm && (
                  <button
                    className="clear-search-btn"
                    onClick={() => setSearchTerm('')}
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              <div className="category-pills-modern">
                <span className="filter-label">
                  <Filter size={14} />
                  Filter by type:
                </span>
                {oemCategories.map(category => (
                  <button
                    key={category}
                    className={`category-pill ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                    role="radio"
                    aria-checked={selectedCategory === category}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          
            {/* Modern OEM Grid */}
            <div className="modal-content-modern">
              {filteredOEMs.length === 0 ? (
                <div className="empty-state-modern">
                  <Search size={48} className="empty-icon" />
                  <h4>No companies found</h4>
                  <p>Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="oem-grid-modern">
                  {filteredOEMs.map(oem => {
                    const isSelected = selectedCompetitors.includes(oem.id);
                    const isDisabled = !isSelected && selectedCompetitors.length >= 5;
                    
                    return (
                      <div 
                        key={oem.id}
                        className={`oem-card-modern ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                        onClick={() => !isDisabled && toggleCompetitor(oem.id)}
                        onMouseEnter={() => setHoveredCompetitor(oem.id)}
                        onMouseLeave={() => setHoveredCompetitor(null)}
                        role="checkbox"
                        aria-checked={isSelected}
                        aria-disabled={isDisabled}
                        tabIndex={isDisabled ? -1 : 0}
                      >
                        <div className="oem-card-content">
                          <div className="oem-card-header">
                            <div className="oem-name-section">
                              <h4>{oem.name}</h4>
                              <span className="oem-country-badge">
                                <Globe size={12} />
                                {oem.country}
                              </span>
                            </div>
                            <div className={`selection-indicator ${isSelected ? 'selected' : ''}`}>
                              {isSelected ? <CheckCircle2 size={20} /> : <Plus size={20} />}
                            </div>
                          </div>
                          
                          <div className="oem-info-modern">
                            <div className="oem-stat">
                              <span className="stat-label">Market Cap</span>
                              <span className="stat-value">{oem.marketCap}</span>
                            </div>
                            <div className="oem-stat">
                              <span className="stat-label">Apps</span>
                              <span className="stat-value">{oem.appNames.length}</span>
                            </div>
                          </div>
                          
                          <div className="oem-brands-modern">
                            <span className="brands-label">Brands:</span>
                            <span className="brands-list">{oem.brands.slice(0, 3).join(', ')}{oem.brands.length > 3 && '...'}</span>
                          </div>
                          
                          <div className="oem-tags-modern">
                            {oem.categories.slice(0, 2).map(cat => (
                              <span key={cat} className="category-tag-modern">{cat}</span>
                            ))}
                            {oem.categories.length > 2 && (
                              <span className="more-tags">+{oem.categories.length - 2}</span>
                            )}
                          </div>
                        </div>
                        
                        {isDisabled && (
                          <div className="disabled-overlay">
                            <span>Maximum 5 competitors</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          
            {/* Modal Footer */}
            <div className="modal-footer-modern">
              <div className="selection-info">
                <span className="selection-count">
                  {selectedCompetitors.length} of 5 selected
                </span>
                {selectedCompetitors.length > 0 && (
                  <button
                    className="clear-all-btn"
                    onClick={() => setSelectedCompetitors([])}
                  >
                    Clear all
                  </button>
                )}
              </div>
              
              <div className="modal-actions">
                <Button
                  variant="outline"
                  onClick={() => setShowCompetitorSelect(false)}
                  className="modal-cancel-btn"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    fetchCompetitorData();
                    setShowCompetitorSelect(false);
                  }}
                  disabled={selectedCompetitors.length === 0 || isLoading}
                  className="modal-confirm-btn"
                >
                  <Sparkles size={16} />
                  Analyze {selectedCompetitors.length} Competitor{selectedCompetitors.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Loading State */}
      {isLoading && (
        <div className="loading-state-modern">
          <div className="loading-card">
            <div className="loading-spinner-large">
              <div className="spinner-ring" />
              <div className="spinner-ring spinner-ring-2" />
              <div className="spinner-ring spinner-ring-3" />
            </div>
            <h3>Analyzing Competitor Data</h3>
            <p>Gathering insights from multiple data sources...</p>
            <div className="loading-progress">
              <div className="progress-bar" />
            </div>
          </div>
        </div>
      )}

      {error && (
        <Alert className="error-alert-modern">
          <AlertCircle size={20} />
          <div>
            <h4>Analysis Error</h4>
            <AlertDescription>{error}</AlertDescription>
          </div>
        </Alert>
      )}

      {Object.keys(competitorData).length > 0 && !isLoading && (
        <div className={`analysis-results-modern ${animationComplete ? 'animated' : ''}`}>
          {/* Quick Stats Overview */}
          <div className="quick-stats-grid">
            <div className="stat-card-modern">
              <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                <Building2 size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Competitors Analyzed</span>
                <h3 className="stat-value">{selectedCompetitors.length}</h3>
              </div>
            </div>
            
            <div className="stat-card-modern">
              <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #10B981, #3B82F6)' }}>
                <Star size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Average Rating</span>
                <h3 className="stat-value">
                  {(Object.values(competitorData).reduce((acc, d) => acc + d.metrics.appRating, 0) / Object.keys(competitorData).length).toFixed(1)}
                </h3>
              </div>
            </div>
            
            <div className="stat-card-modern">
              <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #EC4899, #F59E0B)' }}>
                <MessageSquare size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Total Reviews</span>
                <h3 className="stat-value">
                  {Object.values(competitorData).reduce((acc, d) => acc + d.metrics.reviewCount, 0).toLocaleString()}
                </h3>
              </div>
            </div>
            
            <div className="stat-card-modern">
              <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}>
                <TrendingUp size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Avg Sentiment</span>
                <h3 className="stat-value">
                  {(Object.values(competitorData).reduce((acc, d) => acc + d.metrics.sentimentScore, 0) / Object.keys(competitorData).length * 100).toFixed(0)}%
                </h3>
              </div>
            </div>
          </div>

          {/* Performance Comparison Section */}
          <div className="section-modern">
            <div className="section-header-modern">
              <h2>Performance Comparison</h2>
              <p>Visual analysis of key competitive metrics</p>
            </div>
            
            {/* Metric Tabs */}
            <div className="metric-tabs-modern">
              <button 
                className={`metric-tab ${selectedMetric === 'overall' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('overall')}
              >
                <Layers size={16} />
                <span>Overall Performance</span>
              </button>
              <button 
                className={`metric-tab ${selectedMetric === 'ratings' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('ratings')}
              >
                <Star size={16} />
                <span>Ratings & Reviews</span>
              </button>
              <button 
                className={`metric-tab ${selectedMetric === 'sentiment' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('sentiment')}
              >
                <MessageSquare size={16} />
                <span>Sentiment Analysis</span>
              </button>
              <button 
                className={`metric-tab ${selectedMetric === 'market' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('market')}
              >
                <Globe size={16} />
                <span>Market Position</span>
              </button>
            </div>
            
            {/* Modern Chart Container */}
            <div className="chart-container-modern">
              {selectedMetric === 'overall' && (
                <div className="radar-chart-modern">
                  <ResponsiveContainer width="100%" height={450}>
                    <RadarChart data={prepareRadarData()}>
                      <defs>
                        {COLORS.gradients.map((gradient, index) => (
                          <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={gradient.start} stopOpacity={0.8} />
                            <stop offset="100%" stopColor={gradient.end} stopOpacity={0.3} />
                          </linearGradient>
                        ))}
                      </defs>
                      <PolarGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                      <PolarAngleAxis 
                        dataKey="metric" 
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                      />
                      <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, 100]} 
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                      />
                      {Object.entries(competitorData).map(([id, data], index) => (
                        <Radar
                          key={id}
                          name={data.name}
                          dataKey={data.name}
                          stroke={COLORS.primary[index % COLORS.primary.length]}
                          fill={`url(#gradient-${index % COLORS.gradients.length})`}
                          strokeWidth={2}
                        />
                      ))}
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{
                          paddingTop: '20px'
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              {selectedMetric !== 'overall' && (
                <div className="metric-specific-chart">
                  {isLoadingMetrics ? (
                    <div className="chart-loading">
                      <div className="loading-spinner">
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                      </div>
                      <p>Analyzing {selectedMetric} data with AI...</p>
                    </div>
                  ) : (
                  <ResponsiveContainer width="100%" height={450}>
                    <AreaChart data={prepareTimeSeriesData().length > 0 ? prepareTimeSeriesData() : prepareComparisonData()}>
                      <defs>
                        {COLORS.gradients.map((gradient, index) => (
                          <linearGradient key={`area-${index}`} id={`areaGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={gradient.start} stopOpacity={0.8} />
                            <stop offset="100%" stopColor={gradient.end} stopOpacity={0.1} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis 
                        dataKey={prepareTimeSeriesData().length > 0 ? "month" : "name"} 
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis 
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      {prepareTimeSeriesData().length > 0 ? (
                        Object.entries(competitorData).map(([id, data], index) => (
                          <Area
                            key={id}
                            type="monotone"
                            dataKey={data.name}
                            stroke={COLORS.primary[index]}
                            fill={`url(#areaGradient-${index})`}
                            strokeWidth={2}
                          />
                        ))
                      ) : (
                        <Area
                          type="monotone"
                          dataKey={selectedMetric === 'ratings' ? 'App Rating' : selectedMetric === 'sentiment' ? 'Sentiment Score' : 'Market Share'}
                          stroke={COLORS.primary[0]}
                          fill={`url(#areaGradient-0)`}
                          strokeWidth={2}
                        />
                      )}
                      {prepareTimeSeriesData().length > 0 && (
                        <Legend 
                          iconType="circle"
                          wrapperStyle={{ paddingTop: '20px' }}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                  )}
                </div>
              )}
            </div>
            
            {/* Deep Analysis Insights */}
            {deepAnalysisData[selectedMetric] && (
              <div className="deep-insights-section">
                <h3>AI-Powered Insights</h3>
                <div className="insights-grid">
                  {deepAnalysisData[selectedMetric].insights?.map((insight, idx) => (
                    <div key={idx} className="insight-card">
                      <Sparkles size={16} />
                      <p>{insight}</p>
                    </div>
                  ))}</div>
              </div>
            )}
          </div>

          {/* Modern Comparison Charts Grid */}
          <div className="charts-grid-modern">
            <Card className="chart-card-modern">
              <CardHeader className="chart-header-modern">
                <div className="chart-title-wrapper">
                  <BarChart3 size={20} className="chart-icon" />
                  <CardTitle>Key Metrics Comparison</CardTitle>
                </div>
                <span className="chart-subtitle">Direct performance comparison</span>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={prepareComparisonData()}>
                    <defs>
                      {COLORS.gradients.map((gradient, index) => (
                        <linearGradient key={`bar-${index}`} id={`barGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={gradient.start} stopOpacity={1} />
                          <stop offset="100%" stopColor={gradient.end} stopOpacity={0.8} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }}
                      cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                    />
                    <Legend 
                      iconType="circle"
                      wrapperStyle={{ paddingTop: '20px' }}
                    />
                    <Bar dataKey="App Rating" fill="url(#barGradient-0)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="Market Share" fill="url(#barGradient-1)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Trend Analysis */}
            <Card className="chart-card-modern">
              <CardHeader className="chart-header-modern">
                <div className="chart-title-wrapper">
                  <TrendingUp size={20} className="chart-icon" />
                  <CardTitle>6-Month Performance Trends</CardTitle>
                </div>
                <span className="chart-subtitle">Historical rating evolution</span>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart>
                    <defs>
                      {COLORS.gradients.map((gradient, index) => (
                        <linearGradient key={`line-${index}`} id={`lineGradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={gradient.start} stopOpacity={1} />
                          <stop offset="100%" stopColor={gradient.end} stopOpacity={1} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      domain={[3, 5]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend 
                      iconType="line"
                      wrapperStyle={{ paddingTop: '20px' }}
                    />
                    {Object.entries(competitorData).map(([id, data], index) => (
                      <Line
                        key={id}
                        type="monotone"
                        data={data.trends}
                        dataKey="rating"
                        name={data.name}
                        stroke={`url(#lineGradient-${index % COLORS.gradients.length})`}
                        strokeWidth={3}
                        dot={{ fill: COLORS.primary[index % COLORS.primary.length], r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Modern AI Insights Section */}
          {analysisResults && (
            <div className="ai-insights-modern">
              <div className="ai-section-header">
                <div className="ai-header-content">
                  <div className="ai-icon-wrapper">
                    <Brain size={24} />
                  </div>
                  <div>
                    <h2>AI Competitive Intelligence</h2>
                    <p>Data-driven insights powered by advanced analytics</p>
                  </div>
                </div>
              </div>
              
              <div className="insights-grid-modern">
                <div className="insight-card-modern market-position">
                  <div className="insight-icon">
                    <Target size={20} />
                  </div>
                  <h4>Market Position</h4>
                  <p>{analysisResults.marketPosition}</p>
                  <div className="insight-score">
                    <span className="score-label">Position Score</span>
                    <div className="score-bar">
                      <div className="score-fill" style={{ width: '75%' }} />
                    </div>
                  </div>
                </div>
                
                <div className="insight-card-modern advantages">
                  <div className="insight-icon">
                    <Sparkles size={20} />
                  </div>
                  <h4>Competitive Advantages</h4>
                  <ul className="advantage-list">
                    {analysisResults.advantages?.map((advantage, index) => (
                      <li key={index}>
                        <CheckCircle2 size={16} />
                        <span>{advantage}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="insight-card-modern improvements">
                  <div className="insight-icon">
                    <Target size={20} />
                  </div>
                  <h4>Areas for Improvement</h4>
                  <ul className="improvement-list">
                    {analysisResults.improvements?.map((improvement, index) => (
                      <li key={index}>
                        <AlertCircle size={16} />
                        <span>{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="insight-card-modern recommendations">
                  <div className="insight-icon">
                    <Zap size={20} />
                  </div>
                  <h4>Strategic Recommendations</h4>
                  <p>{analysisResults.recommendations}</p>
                  <button className="explore-more-btn">
                    Explore Strategies
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
              
              {/* Modern Ask AI Section */}
              <div className="ask-ai-modern">
                <div className="ask-ai-header">
                  <h3>Deep Dive Analysis</h3>
                  <p>Get specific insights about your competitive landscape</p>
                </div>
                <div className="ai-suggestions-grid">
                  <button 
                    onClick={() => handleAskAI("How does our app compare to Tesla's in terms of user experience?")}
                    className="ai-suggestion-card"
                  >
                    <div className="suggestion-icon">
                      <Layers size={20} />
                    </div>
                    <span className="suggestion-title">UX Comparison</span>
                    <span className="suggestion-desc">Compare with Tesla's app</span>
                  </button>
                  <button 
                    onClick={() => handleAskAI("What features are competitors offering that we don't have?")}
                    className="ai-suggestion-card"
                  >
                    <div className="suggestion-icon">
                      <Plus size={20} />
                    </div>
                    <span className="suggestion-title">Feature Gap</span>
                    <span className="suggestion-desc">Missing features analysis</span>
                  </button>
                  <button 
                    onClick={() => handleAskAI("Which competitor has the best customer satisfaction and why?")}
                    className="ai-suggestion-card"
                  >
                    <div className="suggestion-icon">
                      <Star size={20} />
                    </div>
                    <span className="suggestion-title">Satisfaction Leader</span>
                    <span className="suggestion-desc">Top performer insights</span>
                  </button>
                  <button 
                    onClick={() => handleAskAI("What are the emerging trends in automotive apps?")}
                    className="ai-suggestion-card"
                  >
                    <div className="suggestion-icon">
                      <TrendingUp size={20} />
                    </div>
                    <span className="suggestion-title">Industry Trends</span>
                    <span className="suggestion-desc">Emerging patterns</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modern Competitor Profiles */}
          <div className="competitor-profiles-modern">
            <div className="profiles-header">
              <h2>Detailed Competitor Profiles</h2>
              <p>In-depth analysis of each competitor's performance</p>
            </div>
            <div className="profiles-grid-modern">
              {Object.entries(competitorData).map(([id, data], index) => {
                const oem = getOEMById(id);
                const gradient = COLORS.gradients[index % COLORS.gradients.length];
                
                return (
                  <div key={id} className="profile-card-modern">
                    <div className="profile-gradient-header" style={{ background: `linear-gradient(135deg, ${gradient.start}, ${gradient.end})` }}>
                      <div className="profile-header-content">
                        <h3>{data.name}</h3>
                        <span className="market-cap-badge">${oem?.marketCap}</span>
                      </div>
                    </div>
                    
                    <div className="profile-metrics-grid">
                      <div className="profile-metric">
                        <div className="metric-icon-wrapper">
                          <Star size={16} />
                        </div>
                        <div className="metric-data">
                          <span className="metric-value">{data.metrics.appRating.toFixed(1)}</span>
                          <span className="metric-label">App Rating</span>
                        </div>
                      </div>
                      <div className="profile-metric">
                        <div className="metric-icon-wrapper">
                          <MessageSquare size={16} />
                        </div>
                        <div className="metric-data">
                          <span className="metric-value">{data.metrics.reviewCount.toLocaleString()}</span>
                          <span className="metric-label">Reviews</span>
                        </div>
                      </div>
                      <div className="profile-metric">
                        <div className="metric-icon-wrapper">
                          <TrendingUp size={16} />
                        </div>
                        <div className="metric-data">
                          <span className="metric-value">{(data.metrics.sentimentScore * 100).toFixed(0)}%</span>
                          <span className="metric-label">Positive</span>
                        </div>
                      </div>
                      <div className="profile-metric">
                        <div className="metric-icon-wrapper">
                          <Globe size={16} />
                        </div>
                        <div className="metric-data">
                          <span className="metric-value">{data.metrics.marketShare.toFixed(0)}%</span>
                          <span className="metric-label">Market Share</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="profile-strengths">
                      <h4>
                        <Shield size={16} />
                        Key Strengths
                      </h4>
                      <ul className="strengths-list">
                        {data.strengths.slice(0, 3).map((strength, index) => (
                          <li key={index}>
                            <CheckCircle2 size={14} />
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="profile-apps">
                      <h4>
                        <Layers size={16} />
                        Applications
                      </h4>
                      <div className="apps-grid">
                        {data.appNames.map((app, index) => (
                          <div key={index} className="app-pill">{app}</div>
                        ))}
                      </div>
                    </div>
                    
                    <button className="profile-action-btn">
                      View Full Analysis
                      <ChevronRight size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Rivue AI Chatbot Button */}
      {selectedCompetitors.length > 0 && (
        <button 
          className="rivue-chatbot-trigger"
          onClick={() => setShowRivueChatbot(true)}
        >
          <Bot size={20} />
          <span>Ask Rivue AI</span>
          <span className="chatbot-badge">New</span>
        </button>
      )}
      
      {/* Rivue Chatbot Component */}
      <RivueChatbot 
        competitors={selectedCompetitors.map(id => {
          const oem = getOEMById(id);
          return {
            id,
            name: oem.name,
            brands: oem.brands
          };
        })}
        userApp={currentAppName || 'Your App'}
        analysisType={selectedMetric}
        isOpen={showRivueChatbot}
        onClose={() => setShowRivueChatbot(false)}
      />
    </div>
  );
};

export default CompetitiveAnalysis;