import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, TrendingDown, Minus, Calendar, Loader2, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { aiSummaryCache } from '../services/aiSummaryCacheService';
import './AISentimentSummary.css';

const AISentimentSummary = ({ reviews, dateRange, onRefresh }) => {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [quotaWarning, setQuotaWarning] = useState(false);

  // Format date for display
  const formatDateRange = () => {
    if (!dateRange?.start || !dateRange?.end) return 'All Time';
    
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    const formatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}`;
  };

  // Generate AI summary based on date range
  const generateSummary = async () => {
    console.log('[AISentimentSummary] Starting generateSummary with:', {
      reviewCount: reviews?.length || 0,
      dateRange,
      firstReview: reviews?.[0]
    });

    if (!reviews || reviews.length === 0) {
      console.warn('[AISentimentSummary] No reviews available');
      setError('No reviews available for analysis');
      return;
    }

    // Check cache first
    const cachedSummary = aiSummaryCache.get(reviews, dateRange);
    if (cachedSummary && !fromCache) {
      console.log('[AISentimentSummary] Using cached summary');
      setSummary(cachedSummary);
      setFromCache(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setFromCache(false);

    try {
      console.log('[AISentimentSummary] Generating AI summary...');
      
      // Get API key
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key not configured');
      }
      
      // Initialize Gemini with same config as chat service
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Use same models as the working chat service
      const modelsToTry = [
        'gemini-2.5-flash',          // Primary model used by chat
        'gemini-2.0-flash-exp',      // Experimental model
        'gemini-1.5-flash'           // Fallback
      ];
      
      let model = null;
      let modelName = '';
      
      for (const tryModel of modelsToTry) {
        try {
          console.log(`[AISentimentSummary] Trying model: ${tryModel}`);
          model = genAI.getGenerativeModel({ 
            model: tryModel,
            generationConfig: {
              temperature: 0.7,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 8192,
            }
          });
          modelName = tryModel;
          console.log(`[AISentimentSummary] Successfully using model: ${tryModel}`);
          break;
        } catch (modelError) {
          console.warn(`[AISentimentSummary] Model ${tryModel} failed:`, modelError.message);
        }
      }
      
      if (!model) {
        throw new Error('Unable to initialize any Gemini model');
      }

      // Calculate sentiment metrics
      const totalReviews = reviews.length;
      const positiveReviews = reviews.filter(r => 
        r.sentiment?.toLowerCase() === 'positive' || r.rating >= 4
      ).length;
      const negativeReviews = reviews.filter(r => 
        r.sentiment?.toLowerCase() === 'negative' || r.rating <= 2
      ).length;
      const neutralReviews = totalReviews - positiveReviews - negativeReviews;

      // Sample reviews for context
      const samplePositive = reviews
        .filter(r => r.sentiment?.toLowerCase() === 'positive' || r.rating >= 4)
        .slice(0, 5)
        .map(r => r.content || r['Review Text'] || r.Body || '')
        .filter(c => c.length > 0);

      const sampleNegative = reviews
        .filter(r => r.sentiment?.toLowerCase() === 'negative' || r.rating <= 2)
        .slice(0, 5)
        .map(r => r.content || r['Review Text'] || r.Body || '')
        .filter(c => c.length > 0);

      const prompt = `
        Analyze the sentiment patterns for the date range and provide a concise, insightful summary.
        
        Date Range: ${formatDateRange()}
        Total Reviews: ${totalReviews}
        Positive: ${positiveReviews} (${((positiveReviews/totalReviews)*100).toFixed(1)}%)
        Negative: ${negativeReviews} (${((negativeReviews/totalReviews)*100).toFixed(1)}%)
        Neutral: ${neutralReviews} (${((neutralReviews/totalReviews)*100).toFixed(1)}%)
        
        Sample Positive Reviews:
        ${samplePositive.map((r, i) => `${i + 1}. "${r.substring(0, 100)}..."`).join('\n')}
        
        Sample Negative Reviews:
        ${sampleNegative.map((r, i) => `${i + 1}. "${r.substring(0, 100)}..."`).join('\n')}
        
        Provide a JSON response with:
        {
          "periodHighlight": "One key insight about sentiment during this period (1-2 sentences)",
          "trend": "improving|stable|declining",
          "trendReason": "Brief explanation of the trend (1 sentence)",
          "topPositiveTheme": "Main thing customers love",
          "topNegativeTheme": "Main customer complaint",
          "actionableInsight": "One specific recommendation based on the data (1 sentence)",
          "sentimentScore": <number between 0-100 representing overall positivity>
        }
        
        IMPORTANT: Return only valid JSON without any markdown formatting.
      `;

      console.log(`[AISentimentSummary] Sending prompt to Gemini (${modelName})...`);
      console.log('[AISentimentSummary] Prompt length:', prompt.length, 'characters');
      
      let responseText;
      try {
        // Generate content with the model
        const result = await model.generateContent(prompt);
        console.log('[AISentimentSummary] API call succeeded');
        responseText = result.response.text();
      } catch (apiError) {
        console.error('[AISentimentSummary] API call failed:', {
          error: apiError,
          message: apiError.message,
          stack: apiError.stack
        });
        
        // Check if it's a specific error type
        if (apiError.message?.includes('API_KEY_INVALID')) {
          throw new Error('Invalid API key. Please check your Gemini API key configuration.');
        } else if (apiError.message?.includes('PERMISSION_DENIED')) {
          throw new Error('Permission denied. Please ensure the Gemini API is enabled for your project.');
        } else if (apiError.message?.includes('RATE_LIMIT_EXCEEDED') || apiError.message?.includes('Resource has been exhausted')) {
          throw new Error('API quota exceeded. The system will use cached data when available.');
        } else if (apiError.message?.includes('503') || apiError.message?.includes('Service Unavailable')) {
          throw new Error('Gemini API service is temporarily unavailable. Please try again later.');
        } else if (apiError.message?.includes('All Gemini models failed')) {
          throw new Error('Unable to access Gemini AI. Please check your API key and try again.');
        }
        
        throw new Error(`Failed to generate summary: ${apiError.message || 'Unknown error'}`);
      }
      
      console.log('[AISentimentSummary] Received response from Gemini');
      console.log('[AISentimentSummary] Raw response:', responseText.substring(0, 200) + '...');
      
      // Clean the response
      const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      console.log('[AISentimentSummary] Cleaned response:', cleanedResponse.substring(0, 200) + '...');
      
      // Parse JSON
      const summaryData = JSON.parse(cleanedResponse);
      console.log('[AISentimentSummary] Parsed summary data:', summaryData);

      setSummary(summaryData);
      // Cache the successful result
      aiSummaryCache.set(reviews, dateRange, summaryData);
      setQuotaWarning(false);
    } catch (err) {
      console.error('[AISentimentSummary] Error generating AI summary:', {
        error: err,
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      
      // Provide more specific error messages
      let errorMessage = 'Failed to generate AI summary. ';
      if (err.message?.includes('API key') || err.message?.includes('API_KEY')) {
        errorMessage += 'API key issue detected. Please check your configuration.';
      } else if (err.message?.includes('JSON')) {
        errorMessage += 'Invalid response format from AI.';
      } else if (err.message?.includes('quota') || err.message?.includes('limit') || err.message?.includes('429')) {
        errorMessage += 'API quota exceeded. The free tier limit has been reached. Please try again tomorrow or upgrade your API plan.';
        setQuotaWarning(true);
        
        // Try to use any cached data even if expired
        const expiredCache = aiSummaryCache.get(reviews, dateRange);
        if (expiredCache) {
          console.log('[AISentimentSummary] Using expired cache due to quota limit');
          setSummary(expiredCache);
          setFromCache(true);
          errorMessage = 'Using cached data due to quota limit. Refresh tomorrow for updated insights.';
        }
      } else if (err.message?.includes('All Gemini models failed')) {
        errorMessage += 'All AI models are currently unavailable. This is likely due to quota limits. Try again later.';
        
        // Try cache as fallback
        const expiredCache = aiSummaryCache.get(reviews, dateRange);
        if (expiredCache) {
          console.log('[AISentimentSummary] Using cache after all models failed');
          setSummary(expiredCache);
          setFromCache(true);
          errorMessage = 'Using cached insights. Refresh later for updated analysis.';
        }
      } else {
        errorMessage += err.message || 'Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate summary when component mounts or reviews change
  useEffect(() => {
    console.log('[AISentimentSummary] useEffect triggered:', {
      hasReviews: !!reviews,
      reviewCount: reviews?.length || 0,
      dateRange
    });
    
    if (reviews && reviews.length > 0) {
      generateSummary();
    }
  }, [reviews, dateRange]);

  // Refresh handler
  const handleRefresh = async () => {
    console.log('[AISentimentSummary] Manual refresh triggered');
    // Clear cache for this specific data
    setFromCache(false);
    // Force regeneration by temporarily clearing summary
    setSummary(null);
    setError(null);
    await generateSummary();
    if (onRefresh) onRefresh();
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="trend-icon improving" size={20} />;
      case 'declining':
        return <TrendingDown className="trend-icon declining" size={20} />;
      default:
        return <Minus className="trend-icon stable" size={20} />;
    }
  };

  const getSentimentColor = (score) => {
    if (score >= 70) return '#10b981';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <Card className="ai-sentiment-summary-card">
      <CardHeader className="summary-header">
        <div className="header-content">
          <div className="title-section">
            <Brain className="header-icon" size={20} />
            <CardTitle>AI Sentiment Summary</CardTitle>
          </div>
          <div className="header-actions">
            <span className="date-range">
              <Calendar size={14} />
              {formatDateRange()}
            </span>
            <button 
              className="refresh-btn"
              onClick={handleRefresh}
              disabled={isLoading}
              title="Refresh summary"
            >
              <RefreshCw size={14} className={isLoading ? 'spinning' : ''} />
            </button>
          </div>
        </div>
        {(fromCache || quotaWarning) && (
          <div className="cache-indicator">
            <Info size={14} />
            {fromCache && !quotaWarning && <span>Using cached summary (30 min TTL)</span>}
            {quotaWarning && <span>API quota limit reached - using cached data</span>}
          </div>
        )}
      </CardHeader>
      <CardContent className="summary-content">
        {isLoading ? (
          <div className="loading-state">
            <Loader2 className="spinner" size={24} />
            <span>Analyzing sentiment patterns...</span>
          </div>
        ) : error ? (
          <div className="error-state">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        ) : summary ? (
          <div className="summary-grid">
            {/* Main Insight */}
            <div className="insight-section">
              <div className="period-highlight">
                {summary.periodHighlight}
              </div>
              
              {/* Sentiment Score */}
              <div className="sentiment-score-section">
                <div className="score-visual">
                  <div className="score-circle" style={{ 
                    background: `conic-gradient(${getSentimentColor(summary.sentimentScore)} ${summary.sentimentScore * 3.6}deg, #e5e7eb 0deg)`
                  }}>
                    <div className="score-inner">
                      <span className="score-number">{summary.sentimentScore}</span>
                      <span className="score-label">Score</span>
                    </div>
                  </div>
                </div>
                <div className="trend-info">
                  <div className="trend-indicator">
                    {getTrendIcon(summary.trend)}
                    <span className="trend-text">{summary.trend}</span>
                  </div>
                  <p className="trend-reason">{summary.trendReason}</p>
                </div>
              </div>
            </div>

            {/* Key Themes */}
            <div className="themes-section">
              <div className="theme positive-theme">
                <div className="theme-icon">😊</div>
                <div className="theme-content">
                  <span className="theme-label">Top Positive</span>
                  <span className="theme-text">{summary.topPositiveTheme}</span>
                </div>
              </div>
              <div className="theme negative-theme">
                <div className="theme-icon">😞</div>
                <div className="theme-content">
                  <span className="theme-label">Top Concern</span>
                  <span className="theme-text">{summary.topNegativeTheme}</span>
                </div>
              </div>
            </div>

            {/* Actionable Insight */}
            <div className="action-section">
              <div className="action-icon">💡</div>
              <div className="action-content">
                <span className="action-label">Recommendation</span>
                <p className="action-text">{summary.actionableInsight}</p>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default AISentimentSummary;