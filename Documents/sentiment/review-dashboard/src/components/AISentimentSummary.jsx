import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, TrendingDown, Minus, Calendar, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './AISentimentSummary.css';

const AISentimentSummary = ({ reviews, dateRange, onRefresh }) => {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
    if (!reviews || reviews.length === 0) {
      setError('No reviews available for analysis');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyCgpECc-whrISaCwlwxXiZV_YppN4dTQT4';
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const summaryData = JSON.parse(cleanedResponse);

      setSummary(summaryData);
    } catch (err) {
      console.error('Error generating AI summary:', err);
      setError('Failed to generate AI summary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate summary when component mounts or reviews change
  useEffect(() => {
    if (reviews && reviews.length > 0) {
      generateSummary();
    }
  }, [reviews, dateRange]);

  // Refresh handler
  const handleRefresh = () => {
    generateSummary();
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