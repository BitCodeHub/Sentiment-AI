import React, { useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  Card, CardContent, CardHeader, CardTitle 
} from './ui/card';
import { 
  TrendingUp, TrendingDown, AlertCircle, Brain, 
  Sparkles, Target, Shield, Zap, Search, Filter,
  ChevronDown, ChevronUp, X, Download, RefreshCw, 
  Calendar, CheckCircle, Star, GitCompare, Trophy,
  Users, MessageSquare, BarChart3, Activity
} from 'lucide-react';
import Sidebar from './Sidebar';
import SentimentWordCloud from './SentimentWordCloud';
import './BenchmarkDashboard.css';

const COLORS = {
  user: '#3b82f6',
  competitor: '#f97316',
  positive: '#10b981',
  neutral: '#f59e0b', 
  negative: '#ef4444'
};

const BenchmarkDashboard = ({ benchmarkData }) => {
  const [activeView, setActiveView] = useState('benchmark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState(false);

  const { user, competitor } = benchmarkData;

  // Calculate comparative metrics
  const comparativeMetrics = useMemo(() => {
    const userAvgRating = user.summary.avgRating;
    const competitorAvgRating = competitor.summary.avgRating;
    const ratingDiff = userAvgRating - competitorAvgRating;
    const ratingDiffPercent = ((ratingDiff / competitorAvgRating) * 100).toFixed(1);

    const userPositivePercent = (user.sentimentBreakdown.positive / user.summary.totalReviews) * 100;
    const competitorPositivePercent = (competitor.sentimentBreakdown.positive / competitor.summary.totalReviews) * 100;
    const sentimentDiff = userPositivePercent - competitorPositivePercent;

    const userResponseRate = user.responseRate || 0;
    const competitorResponseRate = competitor.responseRate || 0;

    return {
      rating: {
        user: userAvgRating,
        competitor: competitorAvgRating,
        diff: ratingDiff,
        diffPercent: ratingDiffPercent,
        winner: userAvgRating > competitorAvgRating ? 'user' : 'competitor'
      },
      sentiment: {
        user: userPositivePercent,
        competitor: competitorPositivePercent,
        diff: sentimentDiff,
        winner: userPositivePercent > competitorPositivePercent ? 'user' : 'competitor'
      },
      volume: {
        user: user.summary.totalReviews,
        competitor: competitor.summary.totalReviews,
        diff: user.summary.totalReviews - competitor.summary.totalReviews,
        winner: user.summary.totalReviews > competitor.summary.totalReviews ? 'user' : 'competitor'
      },
      responseRate: {
        user: userResponseRate,
        competitor: competitorResponseRate,
        diff: userResponseRate - competitorResponseRate,
        winner: userResponseRate > competitorResponseRate ? 'user' : 'competitor'
      }
    };
  }, [user, competitor]);

  // Prepare rating distribution comparison data
  const ratingComparisonData = useMemo(() => {
    return [5, 4, 3, 2, 1].map(rating => ({
      rating: `${rating}★`,
      [user.appName]: user.ratingDistribution[rating] || 0,
      [competitor.appName]: competitor.ratingDistribution[rating] || 0,
      userPercent: ((user.ratingDistribution[rating] || 0) / user.summary.totalReviews * 100).toFixed(1),
      competitorPercent: ((competitor.ratingDistribution[rating] || 0) / competitor.summary.totalReviews * 100).toFixed(1)
    }));
  }, [user, competitor]);

  // Prepare sentiment comparison data
  const sentimentComparisonData = useMemo(() => {
    return ['Positive', 'Neutral', 'Negative'].map(sentiment => ({
      sentiment,
      [user.appName]: user.sentimentDistribution[sentiment] || 0,
      [competitor.appName]: competitor.sentimentDistribution[sentiment] || 0
    }));
  }, [user, competitor]);

  // Prepare time series comparison
  const timeSeriesComparison = useMemo(() => {
    const userTimeData = user.timeSeriesData || [];
    const competitorTimeData = competitor.timeSeriesData || [];
    
    // Merge time series data
    const dateMap = new Map();
    
    userTimeData.forEach(day => {
      dateMap.set(day.date, {
        date: day.date,
        userRating: day.avgRating,
        userCount: day.count
      });
    });
    
    competitorTimeData.forEach(day => {
      const existing = dateMap.get(day.date) || { date: day.date };
      existing.competitorRating = day.avgRating;
      existing.competitorCount = day.count;
      dateMap.set(day.date, existing);
    });
    
    return Array.from(dateMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30); // Last 30 days
  }, [user, competitor]);

  // Prepare radar chart data for multi-dimensional comparison
  const radarData = useMemo(() => {
    const metrics = [
      { 
        metric: 'Rating', 
        user: (user.summary.avgRating / 5) * 100,
        competitor: (competitor.summary.avgRating / 5) * 100
      },
      { 
        metric: 'Positive Sentiment', 
        user: (user.sentimentBreakdown.positive / user.summary.totalReviews) * 100,
        competitor: (competitor.sentimentBreakdown.positive / competitor.summary.totalReviews) * 100
      },
      { 
        metric: 'Response Rate', 
        user: user.responseRate || 0,
        competitor: competitor.responseRate || 0
      },
      { 
        metric: '5-Star Reviews', 
        user: ((user.ratingDistribution[5] || 0) / user.summary.totalReviews) * 100,
        competitor: ((competitor.ratingDistribution[5] || 0) / competitor.summary.totalReviews) * 100
      },
      { 
        metric: 'Review Volume', 
        user: Math.min((user.summary.totalReviews / 1000) * 100, 100),
        competitor: Math.min((competitor.summary.totalReviews / 1000) * 100, 100)
      }
    ];
    return metrics;
  }, [user, competitor]);

  // Word frequency comparison
  const wordComparison = useMemo(() => {
    const userWords = new Map();
    const competitorWords = new Map();
    
    user.topKeywords.forEach(({ word, count }) => {
      userWords.set(word, count);
    });
    
    competitor.topKeywords.forEach(({ word, count }) => {
      competitorWords.set(word, count);
    });
    
    // Find common and unique words
    const allWords = new Set([...userWords.keys(), ...competitorWords.keys()]);
    const wordData = [];
    
    allWords.forEach(word => {
      const userCount = userWords.get(word) || 0;
      const competitorCount = competitorWords.get(word) || 0;
      
      wordData.push({
        word,
        userCount,
        competitorCount,
        diff: userCount - competitorCount,
        total: userCount + competitorCount
      });
    });
    
    return wordData.sort((a, b) => b.total - a.total).slice(0, 20);
  }, [user, competitor]);

  // Competitive advantages
  const competitiveAdvantages = useMemo(() => {
    const advantages = {
      user: [],
      competitor: []
    };
    
    // Rating advantage
    if (comparativeMetrics.rating.diff > 0.2) {
      advantages.user.push({
        title: 'Higher Overall Rating',
        description: `${comparativeMetrics.rating.diff.toFixed(2)} stars higher than competitor`,
        icon: Star,
        impact: 'high'
      });
    } else if (comparativeMetrics.rating.diff < -0.2) {
      advantages.competitor.push({
        title: 'Higher Overall Rating',
        description: `${Math.abs(comparativeMetrics.rating.diff).toFixed(2)} stars higher than your app`,
        icon: Star,
        impact: 'high'
      });
    }
    
    // Sentiment advantage
    if (comparativeMetrics.sentiment.diff > 5) {
      advantages.user.push({
        title: 'Better User Sentiment',
        description: `${comparativeMetrics.sentiment.diff.toFixed(1)}% more positive reviews`,
        icon: TrendingUp,
        impact: 'high'
      });
    } else if (comparativeMetrics.sentiment.diff < -5) {
      advantages.competitor.push({
        title: 'Better User Sentiment',
        description: `${Math.abs(comparativeMetrics.sentiment.diff).toFixed(1)}% more positive reviews`,
        icon: TrendingUp,
        impact: 'high'
      });
    }
    
    // Response rate advantage
    if (comparativeMetrics.responseRate.diff > 10) {
      advantages.user.push({
        title: 'Better Customer Support',
        description: `${comparativeMetrics.responseRate.diff.toFixed(0)}% higher response rate`,
        icon: MessageSquare,
        impact: 'medium'
      });
    } else if (comparativeMetrics.responseRate.diff < -10) {
      advantages.competitor.push({
        title: 'Better Customer Support',
        description: `${Math.abs(comparativeMetrics.responseRate.diff).toFixed(0)}% higher response rate`,
        icon: MessageSquare,
        impact: 'medium'
      });
    }
    
    // Volume advantage
    if (comparativeMetrics.volume.diff > 100) {
      advantages.user.push({
        title: 'Larger User Base',
        description: `${comparativeMetrics.volume.diff.toLocaleString()} more reviews`,
        icon: Users,
        impact: 'medium'
      });
    } else if (comparativeMetrics.volume.diff < -100) {
      advantages.competitor.push({
        title: 'Larger User Base',
        description: `${Math.abs(comparativeMetrics.volume.diff).toLocaleString()} more reviews`,
        icon: Users,
        impact: 'medium'
      });
    }
    
    return advantages;
  }, [comparativeMetrics]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="tooltip-item" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="benchmark-dashboard">
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        showBenchmark={true}
      />
      
      <div className={`dashboard-content benchmark-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Header Section */}
        <div className="benchmark-header-section">
          <div className="benchmark-title-area">
            <h1 className="benchmark-title">Competitive Benchmark Analysis</h1>
            <p className="benchmark-subtitle">
              Comparing <span className="app-name user">{user.appName}</span> vs{' '}
              <span className="app-name competitor">{competitor.appName}</span>
            </p>
          </div>
          
          {/* Winner Badge */}
          <div className="overall-winner">
            {comparativeMetrics.rating.winner === 'user' ? (
              <div className="winner-badge user">
                <Trophy size={24} />
                <span>Your App Leads</span>
              </div>
            ) : (
              <div className="winner-badge competitor">
                <Trophy size={24} />
                <span>Competitor Leads</span>
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics Comparison */}
        <div className="key-metrics-grid">
          <Card className="metric-comparison-card">
            <CardHeader>
              <CardTitle>Overall Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="metric-comparison">
                <div className="metric-side user">
                  <span className="metric-label">{user.appName}</span>
                  <span className="metric-value">{user.summary.avgRating.toFixed(2)}</span>
                  <div className="star-display">
                    {[1,2,3,4,5].map(star => (
                      <Star 
                        key={star} 
                        size={16} 
                        fill={star <= Math.round(user.summary.avgRating) ? '#fbbf24' : '#e5e7eb'}
                        color={star <= Math.round(user.summary.avgRating) ? '#fbbf24' : '#e5e7eb'}
                      />
                    ))}
                  </div>
                </div>
                <div className="vs-indicator">VS</div>
                <div className="metric-side competitor">
                  <span className="metric-label">{competitor.appName}</span>
                  <span className="metric-value">{competitor.summary.avgRating.toFixed(2)}</span>
                  <div className="star-display">
                    {[1,2,3,4,5].map(star => (
                      <Star 
                        key={star} 
                        size={16} 
                        fill={star <= Math.round(competitor.summary.avgRating) ? '#fbbf24' : '#e5e7eb'}
                        color={star <= Math.round(competitor.summary.avgRating) ? '#fbbf24' : '#e5e7eb'}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className={`metric-diff ${comparativeMetrics.rating.diff > 0 ? 'positive' : 'negative'}`}>
                {comparativeMetrics.rating.diff > 0 ? '+' : ''}{comparativeMetrics.rating.diff.toFixed(2)} stars ({comparativeMetrics.rating.diffPercent}%)
              </div>
            </CardContent>
          </Card>

          <Card className="metric-comparison-card">
            <CardHeader>
              <CardTitle>Positive Sentiment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="metric-comparison">
                <div className="metric-side user">
                  <span className="metric-label">{user.appName}</span>
                  <span className="metric-value">{comparativeMetrics.sentiment.user.toFixed(1)}%</span>
                  <div className="mini-bar">
                    <div className="bar-fill positive" style={{ width: `${comparativeMetrics.sentiment.user}%` }} />
                  </div>
                </div>
                <div className="vs-indicator">VS</div>
                <div className="metric-side competitor">
                  <span className="metric-label">{competitor.appName}</span>
                  <span className="metric-value">{comparativeMetrics.sentiment.competitor.toFixed(1)}%</span>
                  <div className="mini-bar">
                    <div className="bar-fill positive" style={{ width: `${comparativeMetrics.sentiment.competitor}%` }} />
                  </div>
                </div>
              </div>
              <div className={`metric-diff ${comparativeMetrics.sentiment.diff > 0 ? 'positive' : 'negative'}`}>
                {comparativeMetrics.sentiment.diff > 0 ? '+' : ''}{comparativeMetrics.sentiment.diff.toFixed(1)}% difference
              </div>
            </CardContent>
          </Card>

          <Card className="metric-comparison-card">
            <CardHeader>
              <CardTitle>Review Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="metric-comparison">
                <div className="metric-side user">
                  <span className="metric-label">{user.appName}</span>
                  <span className="metric-value">{user.summary.totalReviews.toLocaleString()}</span>
                </div>
                <div className="vs-indicator">VS</div>
                <div className="metric-side competitor">
                  <span className="metric-label">{competitor.appName}</span>
                  <span className="metric-value">{competitor.summary.totalReviews.toLocaleString()}</span>
                </div>
              </div>
              <div className={`metric-diff ${comparativeMetrics.volume.diff > 0 ? 'positive' : 'negative'}`}>
                {comparativeMetrics.volume.diff > 0 ? '+' : ''}{comparativeMetrics.volume.diff.toLocaleString()} reviews
              </div>
            </CardContent>
          </Card>

          <Card className="metric-comparison-card">
            <CardHeader>
              <CardTitle>Response Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="metric-comparison">
                <div className="metric-side user">
                  <span className="metric-label">{user.appName}</span>
                  <span className="metric-value">{comparativeMetrics.responseRate.user}%</span>
                </div>
                <div className="vs-indicator">VS</div>
                <div className="metric-side competitor">
                  <span className="metric-label">{competitor.appName}</span>
                  <span className="metric-value">{comparativeMetrics.responseRate.competitor}%</span>
                </div>
              </div>
              <div className={`metric-diff ${comparativeMetrics.responseRate.diff > 0 ? 'positive' : 'negative'}`}>
                {comparativeMetrics.responseRate.diff > 0 ? '+' : ''}{comparativeMetrics.responseRate.diff.toFixed(0)}% difference
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Competitive Advantages Section */}
        <div className="competitive-advantages-section">
          <h2 className="section-title">Competitive Analysis</h2>
          <div className="advantages-grid">
            <Card className="advantages-card user-advantages">
              <CardHeader>
                <CardTitle className="advantages-title">
                  <Trophy size={20} />
                  Your Advantages
                </CardTitle>
              </CardHeader>
              <CardContent>
                {competitiveAdvantages.user.length > 0 ? (
                  <div className="advantages-list">
                    {competitiveAdvantages.user.map((advantage, index) => (
                      <div key={index} className={`advantage-item impact-${advantage.impact}`}>
                        <advantage.icon size={20} />
                        <div className="advantage-content">
                          <h4>{advantage.title}</h4>
                          <p>{advantage.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-advantages">No significant advantages detected</p>
                )}
              </CardContent>
            </Card>

            <Card className="advantages-card competitor-advantages">
              <CardHeader>
                <CardTitle className="advantages-title">
                  <AlertCircle size={20} />
                  Competitor Advantages
                </CardTitle>
              </CardHeader>
              <CardContent>
                {competitiveAdvantages.competitor.length > 0 ? (
                  <div className="advantages-list">
                    {competitiveAdvantages.competitor.map((advantage, index) => (
                      <div key={index} className={`advantage-item impact-${advantage.impact}`}>
                        <advantage.icon size={20} />
                        <div className="advantage-content">
                          <h4>{advantage.title}</h4>
                          <p>{advantage.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-advantages">No significant advantages detected</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-grid">
          {/* Rating Distribution Comparison */}
          <Card className="chart-card">
            <CardHeader>
              <CardTitle>Rating Distribution Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ratingComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rating" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey={user.appName} fill={COLORS.user} />
                  <Bar dataKey={competitor.appName} fill={COLORS.competitor} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sentiment Comparison */}
          <Card className="chart-card">
            <CardHeader>
              <CardTitle>Sentiment Analysis Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sentimentComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sentiment" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey={user.appName} fill={COLORS.user} />
                  <Bar dataKey={competitor.appName} fill={COLORS.competitor} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Performance Radar */}
          <Card className="chart-card full-width">
            <CardHeader>
              <CardTitle>Multi-Dimensional Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar 
                    name={user.appName} 
                    dataKey="user" 
                    stroke={COLORS.user} 
                    fill={COLORS.user} 
                    fillOpacity={0.6} 
                  />
                  <Radar 
                    name={competitor.appName} 
                    dataKey="competitor" 
                    stroke={COLORS.competitor} 
                    fill={COLORS.competitor} 
                    fillOpacity={0.6} 
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Time Series Comparison */}
          <Card className="chart-card full-width">
            <CardHeader>
              <CardTitle>Rating Trends Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[1, 5]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="userRating" 
                    stroke={COLORS.user} 
                    name={user.appName}
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="competitorRating" 
                    stroke={COLORS.competitor} 
                    name={competitor.appName}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Word Analysis Section */}
        <div className="word-analysis-section">
          <h2 className="section-title">Keyword Analysis</h2>
          <div className="word-clouds-comparison">
            <Card className="word-cloud-card">
              <CardHeader>
                <CardTitle>{user.appName} - Top Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                <SentimentWordCloud 
                  wordData={user.topKeywords.map(kw => ({
                    ...kw,
                    sentimentPercentages: { positive: 60, negative: 20, neutral: 20 }
                  }))} 
                />
              </CardContent>
            </Card>

            <Card className="word-cloud-card">
              <CardHeader>
                <CardTitle>{competitor.appName} - Top Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                <SentimentWordCloud 
                  wordData={competitor.topKeywords.map(kw => ({
                    ...kw,
                    sentimentPercentages: { positive: 60, negative: 20, neutral: 20 }
                  }))} 
                />
              </CardContent>
            </Card>
          </div>

          {/* Common Keywords */}
          <Card className="keywords-comparison-card">
            <CardHeader>
              <CardTitle>Keyword Frequency Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="keywords-table">
                <div className="keywords-header">
                  <span>Keyword</span>
                  <span>{user.appName}</span>
                  <span>{competitor.appName}</span>
                  <span>Difference</span>
                </div>
                {wordComparison.slice(0, 10).map((item, index) => (
                  <div key={index} className="keyword-row">
                    <span className="keyword-text">{item.word}</span>
                    <span className="keyword-count user">{item.userCount}</span>
                    <span className="keyword-count competitor">{item.competitorCount}</span>
                    <span className={`keyword-diff ${item.diff > 0 ? 'positive' : item.diff < 0 ? 'negative' : ''}`}>
                      {item.diff > 0 ? '+' : ''}{item.diff}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Strategic Insights */}
        <Card className="strategic-insights-card">
          <CardHeader>
            <CardTitle>
              <Brain size={20} />
              Strategic Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="insights-grid">
              <div className="insight-section">
                <h3>Quick Wins</h3>
                <ul>
                  {comparativeMetrics.responseRate.winner === 'competitor' && (
                    <li>Improve response rate to match competitor's {competitor.responseRate}%</li>
                  )}
                  {comparativeMetrics.rating.diff < 0 && (
                    <li>Focus on addressing common complaints to improve rating</li>
                  )}
                  {user.sentimentDistribution.Negative > competitor.sentimentDistribution.Negative && (
                    <li>Reduce negative reviews by addressing top user pain points</li>
                  )}
                </ul>
              </div>
              
              <div className="insight-section">
                <h3>Long-term Strategy</h3>
                <ul>
                  <li>Analyze competitor's top-rated features and consider implementation</li>
                  <li>Monitor competitor's update cycle and user response</li>
                  <li>Build on your competitive advantages to maintain market position</li>
                </ul>
              </div>
              
              <div className="insight-section">
                <h3>Market Positioning</h3>
                <p>
                  {comparativeMetrics.rating.winner === 'user' 
                    ? `You're currently outperforming ${competitor.appName} with a ${comparativeMetrics.rating.diff.toFixed(2)} star advantage. Focus on maintaining this lead.`
                    : `${competitor.appName} has a ${Math.abs(comparativeMetrics.rating.diff).toFixed(2)} star advantage. Prioritize improvements to close this gap.`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BenchmarkDashboard;