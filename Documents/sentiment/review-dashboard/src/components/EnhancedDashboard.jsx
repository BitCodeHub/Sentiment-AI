import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ChevronDown, ChevronUp, X, Download, RefreshCw
} from 'lucide-react';
import { analyzeReviews } from '../services/aiAnalysis';
import { performDeepAnalysis } from '../services/deepAnalysis';
import { performExecutiveAnalysis } from '../services/executiveAnalysis';
import AIInsights from './AIInsights';
import CategorizedReviews from './CategorizedReviews';
import ReviewDisplay from './ReviewDisplay';
import SentimentTrends from './SentimentTrends';
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
  const [selectedRating, setSelectedRating] = useState('all');
  const [selectedSentiment, setSelectedSentiment] = useState('all');
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showDeepInsights, setShowDeepInsights] = useState(false);
  const [showExecutiveAnalysis, setShowExecutiveAnalysis] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    distribution: true,
    sentiment: true,
    trends: true,
    ai: true
  });
  const [useEnhancedReviewDisplay, setUseEnhancedReviewDisplay] = useState(true);

  // Filter reviews based on search and filters
  const filteredReviews = useMemo(() => {
    if (!data?.reviews) return [];
    
    return data.reviews.filter(review => {
      const matchesSearch = !searchTerm || 
        (review.content?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (review['Review Text']?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (review.Body?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      const matchesRating = selectedRating === 'all' || 
        review.rating === parseInt(selectedRating) ||
        review.Rating === parseInt(selectedRating);
      
      const matchesSentiment = selectedSentiment === 'all' || 
        (review.sentiment?.toLowerCase() || '') === selectedSentiment ||
        (review.Sentiment?.toLowerCase() || '') === selectedSentiment;
      
      return matchesSearch && matchesRating && matchesSentiment;
    });
  }, [data?.reviews, searchTerm, selectedRating, selectedSentiment]);

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

  const triggerAIAnalysis = useCallback(async () => {
    if (!filteredReviews || filteredReviews.length === 0) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const insights = await analyzeReviews(filteredReviews);
      setAiInsights(insights);
      setShowAIInsights(true);
    } catch (err) {
      console.error('AI Analysis error:', err);
      setError(`Failed to generate AI insights: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [filteredReviews]);

  const triggerDeepAnalysis = useCallback(async () => {
    if (!filteredReviews || filteredReviews.length === 0) return;
    
    setIsDeepAnalyzing(true);
    setError(null);
    
    try {
      const insights = await performDeepAnalysis(filteredReviews);
      setDeepInsights(insights);
      setShowDeepInsights(true);
    } catch (err) {
      console.error('Deep Analysis error:', err);
      setError(`Failed to perform deep analysis: ${err.message}`);
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
      setShowExecutiveAnalysis(true);
    } catch (err) {
      console.error('Executive Analysis error:', err);
      setError(`Failed to generate executive analysis: ${err.message}`);
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
      <div className="dashboard-content">
      {/* Search and Filters */}
      <div className="analytics-card">
        <div className="filter-group">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
          <select
            value={selectedSentiment}
            onChange={(e) => setSelectedSentiment(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
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

      {/* AI Analysis Buttons */}
      <div className="analytics-card" style={{ marginBottom: '24px' }}>
        <div className="analytics-header">
          <h3 className="analytics-title">
            <Brain className="inline-block mr-2" style={{ width: '20px', height: '20px', color: '#8b5cf6' }} />
            AI-Powered Analysis
          </h3>
        </div>
        <div className="analytics-actions">
          <button
              onClick={triggerAIAnalysis}
              disabled={isAnalyzing || !filteredReviews || filteredReviews.length === 0}
              className="analytics-action-btn primary"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles style={{ width: '16px', height: '16px' }} />
                  <span>Generate AI Insights</span>
                </>
              )}
            </button>

            <button
              onClick={triggerDeepAnalysis}
              disabled={isDeepAnalyzing || !filteredReviews || filteredReviews.length === 0}
              className="analytics-action-btn"
            >
              {isDeepAnalyzing ? (
                <>
                  <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                  <span>Deep Analysis...</span>
                </>
              ) : (
                <>
                  <Zap style={{ width: '16px', height: '16px' }} />
                  <span>Deep Analysis</span>
                </>
              )}
            </button>

            <button
              onClick={triggerExecutiveAnalysis}
              disabled={isExecutiveAnalyzing || !filteredReviews || filteredReviews.length === 0}
              className="analytics-action-btn"
            >
              {isExecutiveAnalyzing ? (
                <>
                  <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                  <span>Generating Report...</span>
                </>
              ) : (
                <>
                  <Shield style={{ width: '16px', height: '16px' }} />
                  <span>Executive Analysis</span>
                </>
              )}
            </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginTop: '16px' }}>
            <AlertCircle style={{ width: '16px', height: '16px' }} />
            <span>{error}</span>
          </div>
        )}
        
        {/* Review Display Toggle */}
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '14px', color: '#6b7280' }}>
            <input
              type="checkbox"
              checked={useEnhancedReviewDisplay}
              onChange={(e) => setUseEnhancedReviewDisplay(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Use Enhanced Review Display
          </label>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="dashboard-analytics-grid">
        {/* Rating Distribution */}
        {expandedSections.distribution && (
          <div className="analytics-card col-span-6">
          <div className="analytics-header" style={{ cursor: 'pointer' }} onClick={() => toggleSection('distribution')}>
            <h3 className="analytics-title">
              Rating Distribution
              <ChevronUp className="inline-block ml-auto" style={{ width: '16px', height: '16px' }} />
            </h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { rating: '5★', count: filteredRatingDistribution[5] || 0 },
                { rating: '4★', count: filteredRatingDistribution[4] || 0 },
                { rating: '3★', count: filteredRatingDistribution[3] || 0 },
                { rating: '2★', count: filteredRatingDistribution[2] || 0 },
                { rating: '1★', count: filteredRatingDistribution[1] || 0 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rating" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sentiment Analysis */}
      {expandedSections.sentiment && filteredReviews.length > 0 && (
        <div className="analytics-card col-span-6">
          <div className="analytics-header" style={{ cursor: 'pointer' }} onClick={() => toggleSection('sentiment')}>
            <h3 className="analytics-title">
              Sentiment Analysis
              <ChevronUp className="inline-block ml-auto" style={{ width: '16px', height: '16px' }} />
            </h3>
          </div>
          <div className="sentiment-chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Positive', value: filteredSentimentBreakdown.positive || 0 },
                    { name: 'Neutral', value: filteredSentimentBreakdown.neutral || 0 },
                    { name: 'Negative', value: filteredSentimentBreakdown.negative || 0 },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      </div>

      {/* AI Components */}
      {showAIInsights && aiInsights && (
        <div style={{ marginBottom: '24px' }}>
          <AIInsights insights={aiInsights} onClose={() => setShowAIInsights(false)} />
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

      {/* Modals */}
      {showDeepInsights && deepInsights && (
        <DeepInsightsModal 
          insights={deepInsights} 
          onClose={() => setShowDeepInsights(false)} 
        />
      )}

      {showExecutiveAnalysis && executiveAnalysis && (
        <ExecutiveAnalysisModal 
          analysis={executiveAnalysis} 
          onClose={() => setShowExecutiveAnalysis(false)} 
        />
      )}
      </div>
    </div>
  );
};

// Deep Insights Modal Component
const DeepInsightsModal = ({ insights, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Deep Analysis Results</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Competitive Analysis */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Competitive Analysis</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">
                {JSON.stringify(insights.competitiveAnalysis, null, 2)}
              </pre>
            </div>
          </section>

          {/* Feature Opportunities */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Feature Opportunities</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">
                {JSON.stringify(insights.featureOpportunities, null, 2)}
              </pre>
            </div>
          </section>

          {/* User Personas */}
          <section>
            <h3 className="text-lg font-semibold mb-3">User Personas</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">
                {JSON.stringify(insights.userPersonas, null, 2)}
              </pre>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

// Executive Analysis Modal Component
const ExecutiveAnalysisModal = ({ analysis, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Executive Analysis Report</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Executive Summary */}
          {analysis.executiveSummary && (
            <section>
              <h3 className="text-xl font-bold mb-4">Executive Summary</h3>
              <div className="bg-blue-50 p-6 rounded-lg space-y-4">
                <p className="text-gray-800">{analysis.executiveSummary.overview}</p>
                
                <div>
                  <h4 className="font-semibold mb-2">Key Findings:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.executiveSummary.keyFindings?.map((finding, idx) => (
                      <li key={idx} className="text-gray-700">{finding}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Urgent Actions Required:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.executiveSummary.urgentActions?.map((action, idx) => (
                      <li key={idx} className="text-red-700">{action}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* Revenue Analysis */}
          {analysis.revenueAnalysis && (
            <section>
              <h3 className="text-xl font-bold mb-4">Revenue Impact Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">Current Impact</h4>
                  <p className="text-2xl font-bold text-red-600">
                    ${analysis.revenueAnalysis.current?.annualRevenueLoss?.toLocaleString() || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Annual revenue at risk</p>
                  <p className="text-sm mt-2">{analysis.revenueAnalysis.current?.reasoning}</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Opportunity</h4>
                  <p className="text-2xl font-bold text-green-600">
                    ${analysis.revenueAnalysis.projections?.withImprovements?.oneYear?.toLocaleString() || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Potential recovery in 1 year</p>
                </div>
              </div>
            </section>
          )}

          {/* Competitive Analysis */}
          {analysis.competitiveAnalysis && (
            <section>
              <h3 className="text-xl font-bold mb-4">Competitive Position</h3>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">{analysis.competitiveAnalysis.marketPosition}</p>
                
                {analysis.competitiveAnalysis.competitiveGaps && (
                  <div>
                    <h4 className="font-semibold mb-2">Key Competitive Gaps:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {analysis.competitiveAnalysis.competitiveGaps.map((gap, idx) => (
                        <li key={idx} className="text-gray-700">{gap}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Recommendations */}
          {analysis.recommendations && (
            <section>
              <h3 className="text-xl font-bold mb-4">Strategic Recommendations</h3>
              <div className="space-y-4">
                {Object.entries(analysis.recommendations).map(([timeframe, items]) => (
                  <div key={timeframe} className="border rounded-lg p-4">
                    <h4 className="font-semibold capitalize mb-3">{timeframe} Actions</h4>
                    <div className="space-y-3">
                      {items.map((item, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium">{item.action}</span>
                            <span className="text-sm text-gray-500">{item.timeline}</span>
                          </div>
                          <p className="text-sm text-gray-600">{item.impact}</p>
                          <p className="text-xs text-gray-500 mt-1">Owner: {item.owner}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Analysis Metadata */}
          {analysis.analysisMetadata && (
            <section className="border-t pt-4">
              <p className="text-sm text-gray-500">
                Analysis Type: {analysis.analysisMetadata.analysisType} | 
                Confidence: {analysis.analysisMetadata.confidenceLevel} | 
                Reviews Analyzed: {analysis.analysisMetadata.totalReviewsAnalyzed}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;