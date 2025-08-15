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
  Users, MessageSquare, BarChart3, Activity,
  ArrowUp, ArrowDown, Minus
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
  const [timeFrame, setTimeFrame] = useState('30'); // 30, 60, 90, all days

  const { user, competitor } = benchmarkData;

  // Extract clean app names
  const userAppName = user.appName || 'Your App';
  const competitorAppName = competitor.appName || 'Competitor App';
  
  // Calculate growth metrics
  const calculateGrowthRate = (data) => {
    if (!data.timeSeriesData || data.timeSeriesData.length < 30) return 0;
    
    const last30Days = data.timeSeriesData.slice(-30);
    const prev30Days = data.timeSeriesData.slice(-60, -30);
    
    if (prev30Days.length === 0) return 0;
    
    const currentAvg = last30Days.reduce((sum, d) => sum + d.avgRating, 0) / last30Days.length;
    const prevAvg = prev30Days.reduce((sum, d) => sum + d.avgRating, 0) / prev30Days.length;
    
    return ((currentAvg - prevAvg) / prevAvg) * 100;
  };
  
  const userGrowthRate = calculateGrowthRate(user);
  const competitorGrowthRate = calculateGrowthRate(competitor);

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
      [userAppName]: user.ratingDistribution[rating] || 0,
      [competitorAppName]: competitor.ratingDistribution[rating] || 0,
      userPercent: ((user.ratingDistribution[rating] || 0) / user.summary.totalReviews * 100).toFixed(1),
      competitorPercent: ((competitor.ratingDistribution[rating] || 0) / competitor.summary.totalReviews * 100).toFixed(1)
    }));
  }, [user, competitor, userAppName, competitorAppName]);

  // Prepare sentiment comparison data
  const sentimentComparisonData = useMemo(() => {
    return ['Positive', 'Neutral', 'Negative'].map(sentiment => ({
      sentiment,
      [userAppName]: user.sentimentDistribution[sentiment] || 0,
      [competitorAppName]: competitor.sentimentDistribution[sentiment] || 0
    }));
  }, [user, competitor, userAppName, competitorAppName]);

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
    
    const allData = Array.from(dateMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Filter based on timeFrame
    if (timeFrame === 'all') return allData;
    const days = parseInt(timeFrame);
    return allData.slice(-days);
  }, [user, competitor, timeFrame]);

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

  // Calculate growth trends
  const growthTrends = useMemo(() => {
    const calculateGrowth = (data) => {
      if (!data.timeSeriesData || data.timeSeriesData.length < 2) return 0;
      const recent = data.timeSeriesData.slice(-7);
      const previous = data.timeSeriesData.slice(-14, -7);
      
      const recentAvg = recent.reduce((sum, d) => sum + d.avgRating, 0) / recent.length;
      const previousAvg = previous.reduce((sum, d) => sum + d.avgRating, 0) / previous.length;
      
      return ((recentAvg - previousAvg) / previousAvg * 100).toFixed(1);
    };
    
    return {
      user: calculateGrowth(user),
      competitor: calculateGrowth(competitor)
    };
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

  // Market share estimation
  const marketShare = useMemo(() => {
    const totalReviews = user.summary.totalReviews + competitor.summary.totalReviews;
    return {
      user: ((user.summary.totalReviews / totalReviews) * 100).toFixed(1),
      competitor: ((competitor.summary.totalReviews / totalReviews) * 100).toFixed(1)
    };
  }, [user, competitor]);

  // Calculate performance score
  const performanceScore = useMemo(() => {
    const calculateScore = (appData) => {
      let score = 0;
      
      // Rating score (40% weight)
      score += (appData.summary.avgRating / 5) * 40;
      
      // Positive sentiment score (30% weight)
      const positivePct = (appData.sentimentBreakdown.positive / appData.summary.totalReviews) * 100;
      score += (positivePct / 100) * 30;
      
      // Response rate score (20% weight)
      score += (appData.responseRate / 100) * 20;
      
      // Volume score (10% weight) - normalized to 1000 reviews
      score += Math.min((appData.summary.totalReviews / 1000), 1) * 10;
      
      return Math.round(score);
    };
    
    return {
      user: calculateScore(user),
      competitor: calculateScore(competitor)
    };
  }, [user, competitor]);

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
              Comparing <span className="app-name user" title={userAppName}>{userAppName}</span> vs{' '}
              <span className="app-name competitor" title={competitorAppName}>{competitorAppName}</span>
            </p>
            <div className="header-stats">
              <div className="stat-item">
                <span className="stat-label">Market Share</span>
                <span className="stat-value">{marketShare.user}% vs {marketShare.competitor}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">7-Day Trend</span>
                <span className={`stat-value ${growthTrends.user > 0 ? 'positive' : 'negative'}`}>
                  {growthTrends.user > 0 ? '+' : ''}{growthTrends.user}% vs {growthTrends.competitor > 0 ? '+' : ''}{growthTrends.competitor}%
                </span>
              </div>
            </div>
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
        <h2 className="section-title">
          <BarChart3 size={24} />
          Key Performance Metrics
        </h2>
        <div className="key-metrics-grid">
          <Card className="metric-comparison-card">
            <CardHeader>
              <CardTitle>
                <Star size={20} />
                Overall Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="metric-comparison">
                <div className="metric-side user">
                  <span className="metric-label">{userAppName}</span>
                  <span className="metric-value">{user.summary.avgRating.toFixed(2)}</span>
                  <div className="star-display">
                    {[1,2,3,4,5].map(star => (
                      <Star 
                        key={star} 
                        size={18} 
                        fill={star <= Math.round(user.summary.avgRating) ? '#fbbf24' : '#e5e7eb'}
                        color={star <= Math.round(user.summary.avgRating) ? '#fbbf24' : '#e5e7eb'}
                      />
                    ))}
                  </div>
                </div>
                <div className="vs-indicator">VS</div>
                <div className="metric-side competitor">
                  <span className="metric-label">{competitorAppName}</span>
                  <span className="metric-value">{competitor.summary.avgRating.toFixed(2)}</span>
                  <div className="star-display">
                    {[1,2,3,4,5].map(star => (
                      <Star 
                        key={star} 
                        size={18} 
                        fill={star <= Math.round(competitor.summary.avgRating) ? '#fbbf24' : '#e5e7eb'}
                        color={star <= Math.round(competitor.summary.avgRating) ? '#fbbf24' : '#e5e7eb'}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className={`metric-diff ${comparativeMetrics.rating.diff > 0 ? 'positive' : 'negative'}`}>
                {comparativeMetrics.rating.diff > 0 ? <ArrowUp size={16} /> : comparativeMetrics.rating.diff < 0 ? <ArrowDown size={16} /> : <Minus size={16} />}
                <span>{comparativeMetrics.rating.diff > 0 ? '+' : ''}{comparativeMetrics.rating.diff.toFixed(2)} stars ({comparativeMetrics.rating.diffPercent}%)</span>
              </div>
            </CardContent>
          </Card>

          <Card className="metric-comparison-card">
            <CardHeader>
              <CardTitle>
                <TrendingUp size={20} />
                Positive Sentiment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="metric-comparison">
                <div className="metric-side user">
                  <span className="metric-label">{userAppName}</span>
                  <span className="metric-value">{comparativeMetrics.sentiment.user.toFixed(1)}%</span>
                  <div className="mini-bar">
                    <div className="bar-fill positive" style={{ width: `${comparativeMetrics.sentiment.user}%` }} />
                  </div>
                </div>
                <div className="vs-indicator">VS</div>
                <div className="metric-side competitor">
                  <span className="metric-label">{competitorAppName}</span>
                  <span className="metric-value">{comparativeMetrics.sentiment.competitor.toFixed(1)}%</span>
                  <div className="mini-bar">
                    <div className="bar-fill positive" style={{ width: `${comparativeMetrics.sentiment.competitor}%` }} />
                  </div>
                </div>
              </div>
              <div className={`metric-diff ${comparativeMetrics.sentiment.diff > 0 ? 'positive' : 'negative'}`}>
                {comparativeMetrics.sentiment.diff > 0 ? <ArrowUp size={16} /> : comparativeMetrics.sentiment.diff < 0 ? <ArrowDown size={16} /> : <Minus size={16} />}
                <span>{comparativeMetrics.sentiment.diff > 0 ? '+' : ''}{comparativeMetrics.sentiment.diff.toFixed(1)}% difference</span>
              </div>
            </CardContent>
          </Card>

          <Card className="metric-comparison-card">
            <CardHeader>
              <CardTitle>
                <Users size={20} />
                Review Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="metric-comparison">
                <div className="metric-side user">
                  <span className="metric-label">{userAppName}</span>
                  <span className="metric-value">{user.summary.totalReviews.toLocaleString()}</span>
                  <div className="mini-bar">
                    <div className="bar-fill positive" style={{ width: `${Math.min((user.summary.totalReviews / Math.max(user.summary.totalReviews, competitor.summary.totalReviews)) * 100, 100)}%` }} />
                  </div>
                </div>
                <div className="vs-indicator">VS</div>
                <div className="metric-side competitor">
                  <span className="metric-label">{competitorAppName}</span>
                  <span className="metric-value">{competitor.summary.totalReviews.toLocaleString()}</span>
                  <div className="mini-bar">
                    <div className="bar-fill positive" style={{ width: `${Math.min((competitor.summary.totalReviews / Math.max(user.summary.totalReviews, competitor.summary.totalReviews)) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
              <div className={`metric-diff ${comparativeMetrics.volume.diff > 0 ? 'positive' : 'negative'}`}>
                {comparativeMetrics.volume.diff > 0 ? <ArrowUp size={16} /> : comparativeMetrics.volume.diff < 0 ? <ArrowDown size={16} /> : <Minus size={16} />}
                <span>{comparativeMetrics.volume.diff > 0 ? '+' : ''}{Math.abs(comparativeMetrics.volume.diff).toLocaleString()} reviews</span>
              </div>
            </CardContent>
          </Card>

          <Card className="metric-comparison-card">
            <CardHeader>
              <CardTitle>
                <MessageSquare size={20} />
                Response Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="metric-comparison">
                <div className="metric-side user">
                  <span className="metric-label">{userAppName}</span>
                  <span className="metric-value">{comparativeMetrics.responseRate.user}%</span>
                  <div className="mini-bar">
                    <div className="bar-fill positive" style={{ width: `${comparativeMetrics.responseRate.user}%` }} />
                  </div>
                </div>
                <div className="vs-indicator">VS</div>
                <div className="metric-side competitor">
                  <span className="metric-label">{competitorAppName}</span>
                  <span className="metric-value">{comparativeMetrics.responseRate.competitor}%</span>
                  <div className="mini-bar">
                    <div className="bar-fill positive" style={{ width: `${comparativeMetrics.responseRate.competitor}%` }} />
                  </div>
                </div>
              </div>
              <div className={`metric-diff ${comparativeMetrics.responseRate.diff > 0 ? 'positive' : 'negative'}`}>
                {comparativeMetrics.responseRate.diff > 0 ? <ArrowUp size={16} /> : comparativeMetrics.responseRate.diff < 0 ? <ArrowDown size={16} /> : <Minus size={16} />}
                <span>{comparativeMetrics.responseRate.diff > 0 ? '+' : ''}{Math.abs(comparativeMetrics.responseRate.diff).toFixed(0)}% difference</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Competitive Advantages Section */}
        <div className="competitive-advantages-section">
          <h2 className="section-title">
            <Trophy size={24} />
            Competitive Analysis
          </h2>
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
        <h2 className="section-title">
          <BarChart3 size={24} />
          Detailed Analytics
        </h2>
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
                  <Bar dataKey={userAppName} fill={COLORS.user} />
                  <Bar dataKey={competitorAppName} fill={COLORS.competitor} />
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
                  <Bar dataKey={userAppName} fill={COLORS.user} />
                  <Bar dataKey={competitorAppName} fill={COLORS.competitor} />
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
                    name={userAppName} 
                    dataKey="user" 
                    stroke={COLORS.user} 
                    fill={COLORS.user} 
                    fillOpacity={0.6} 
                  />
                  <Radar 
                    name={competitorAppName} 
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
              <CardTitle>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span>Rating Trends Over Time</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['30', '60', '90', 'all'].map(frame => (
                      <button
                        key={frame}
                        onClick={() => setTimeFrame(frame)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: timeFrame === frame ? '#3b82f6' : 'white',
                          color: timeFrame === frame ? 'white' : '#64748b',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {frame === 'all' ? 'All Time' : `${frame} Days`}
                      </button>
                    ))}
                  </div>
                </div>
              </CardTitle>
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
                    name={userAppName}
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="competitorRating" 
                    stroke={COLORS.competitor} 
                    name={competitorAppName}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Word Analysis Section */}
        <div className="word-analysis-section">
          <h2 className="section-title">
            <Activity size={24} />
            Keyword Analysis
          </h2>
          <div className="word-clouds-comparison">
            <Card className="word-cloud-card">
              <CardHeader>
                <CardTitle>{userAppName} - Top Keywords</CardTitle>
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
                <CardTitle>{competitorAppName} - Top Keywords</CardTitle>
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
                  <span>{userAppName}</span>
                  <span>{competitorAppName}</span>
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

        {/* Growth Analysis */}
        <div className="growth-analysis-section">
          <h2 className="section-title">
            <TrendingUp size={24} />
            Growth Analysis
          </h2>
          <div className="growth-cards-grid">
            <Card className="growth-card">
              <CardHeader>
                <CardTitle>30-Day Rating Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="growth-comparison">
                  <div className="growth-metric">
                    <span className="growth-label">{userAppName}</span>
                    <div className={`growth-rate ${userGrowthRate > 0 ? 'positive' : userGrowthRate < 0 ? 'negative' : 'neutral'}`}>
                      {userGrowthRate > 0 ? <ArrowUp size={20} /> : userGrowthRate < 0 ? <ArrowDown size={20} /> : <Minus size={20} />}
                      <span>{Math.abs(userGrowthRate).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="growth-metric">
                    <span className="growth-label">{competitorAppName}</span>
                    <div className={`growth-rate ${competitorGrowthRate > 0 ? 'positive' : competitorGrowthRate < 0 ? 'negative' : 'neutral'}`}>
                      {competitorGrowthRate > 0 ? <ArrowUp size={20} /> : competitorGrowthRate < 0 ? <ArrowDown size={20} /> : <Minus size={20} />}
                      <span>{Math.abs(competitorGrowthRate).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="growth-card">
              <CardHeader>
                <CardTitle>Market Position Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="market-position">
                  <p>
                    {comparativeMetrics.rating.winner === 'user' && comparativeMetrics.volume.winner === 'user' 
                      ? `${userAppName} is the market leader with both higher ratings and more reviews.`
                      : comparativeMetrics.rating.winner === 'user' && comparativeMetrics.volume.winner === 'competitor'
                      ? `${userAppName} has higher quality but ${competitorAppName} has larger market share.`
                      : comparativeMetrics.rating.winner === 'competitor' && comparativeMetrics.volume.winner === 'user'
                      ? `${userAppName} has market share but ${competitorAppName} offers better quality.`
                      : `${competitorAppName} leads in both quality and market share.`
                    }
                  </p>
                  <div className="position-metrics">
                    <div className="position-metric">
                      <span className="metric-name">Quality Score</span>
                      <div className="metric-bars">
                        <div className="metric-bar user">
                          <div className="bar-fill" style={{ width: `${(user.summary.avgRating / 5) * 100}%` }} />
                        </div>
                        <div className="metric-bar competitor">
                          <div className="bar-fill" style={{ width: `${(competitor.summary.avgRating / 5) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="position-metric">
                      <span className="metric-name">Market Share</span>
                      <div className="metric-bars">
                        <div className="metric-bar user">
                          <div className="bar-fill" style={{ width: `${(user.summary.totalReviews / (user.summary.totalReviews + competitor.summary.totalReviews)) * 100}%` }} />
                        </div>
                        <div className="metric-bar competitor">
                          <div className="bar-fill" style={{ width: `${(competitor.summary.totalReviews / (user.summary.totalReviews + competitor.summary.totalReviews)) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Strategic Insights */}
        <Card className="strategic-insights-card">
          <CardHeader>
            <CardTitle>
              <Brain size={20} />
              Strategic Recommendations & Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="insights-grid">
              <div className="insight-section">
                <h3><Zap size={18} /> Quick Wins</h3>
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
                  {(user.ratingDistribution[1] + user.ratingDistribution[2]) > (competitor.ratingDistribution[1] + competitor.ratingDistribution[2]) && (
                    <li>Convert 1-2 star reviews to 4-5 stars through targeted improvements</li>
                  )}
                </ul>
              </div>
              
              <div className="insight-section">
                <h3><Target size={18} /> Long-term Strategy</h3>
                <ul>
                  <li>Analyze competitor's top-rated features and consider implementation</li>
                  <li>Monitor competitor's update cycle and user response patterns</li>
                  <li>Build on your competitive advantages to maintain market position</li>
                  {comparativeMetrics.volume.winner === 'competitor' && (
                    <li>Increase marketing efforts to boost review volume</li>
                  )}
                </ul>
              </div>
              
              <div className="insight-section">
                <h3><Activity size={18} /> Market Positioning</h3>
                <p>
                  {comparativeMetrics.rating.winner === 'user' 
                    ? `You're currently outperforming ${competitorAppName} with a ${comparativeMetrics.rating.diff.toFixed(2)} star advantage. Focus on maintaining this lead.`
                    : `${competitorAppName} has a ${Math.abs(comparativeMetrics.rating.diff).toFixed(2)} star advantage. Prioritize improvements to close this gap.`
                  }
                </p>
                <p style={{marginTop: '0.75rem'}}>
                  Review velocity: {user.summary.totalReviews > competitor.summary.totalReviews 
                    ? `You have ${((user.summary.totalReviews / competitor.summary.totalReviews - 1) * 100).toFixed(0)}% more reviews`
                    : `Competitor has ${((competitor.summary.totalReviews / user.summary.totalReviews - 1) * 100).toFixed(0)}% more reviews`
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