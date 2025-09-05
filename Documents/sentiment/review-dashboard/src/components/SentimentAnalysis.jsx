import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar, AreaChart, Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import {
  Heart, HeartCrack, TrendingUp, TrendingDown, AlertCircle,
  ThumbsUp, ThumbsDown, MessageSquare, BarChart2, Sparkles,
  Target, Shield, Zap, Brain, ChevronRight, Loader2
} from 'lucide-react';
import { performSentimentAnalysis, analyzeSentimentTrends } from '../services/geminiSentimentAnalysis';
import './SentimentAnalysis.css';

const SentimentAnalysis = ({ reviews, onClose }) => {
  const [analysis, setAnalysis] = useState(null);
  const [trends, setTrends] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState({
    love: true,
    hate: true,
    journey: false,
    recommendations: false
  });

  useEffect(() => {
    if (reviews && reviews.length > 0) {
      analyzeSentiment();
    }
  }, [reviews]);

  const analyzeSentiment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [sentimentResult, trendResult] = await Promise.all([
        performSentimentAnalysis(reviews),
        analyzeSentimentTrends(reviews)
      ]);
      
      setAnalysis(sentimentResult);
      setTrends(trendResult);
    } catch (err) {
      setError(err.message);
      console.error('Sentiment analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'LOVED': return <Heart className="text-green-500" size={24} />;
      case 'HATED': return <HeartCrack className="text-red-500" size={24} />;
      default: return <AlertCircle className="text-yellow-500" size={24} />;
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'LOVED': return '#10b981';
      case 'HATED': return '#ef4444';
      default: return '#f59e0b';
    }
  };

  if (isLoading) {
    return (
      <div className="sentiment-analysis-container">
        <div className="loading-state">
          <Loader2 className="animate-spin" size={48} />
          <h3>Analyzing Customer Sentiment...</h3>
          <p>Understanding why customers love or hate your product</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sentiment-analysis-container">
        <Alert className="error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={analyzeSentiment} className="retry-button">
          Retry Analysis
        </Button>
      </div>
    );
  }

  if (!analysis) return null;

  const sentimentData = [
    {
      name: 'Love it',
      value: parseInt(analysis.metrics.positivePercentage),
      count: analysis.metrics.positiveCount,
      color: '#10b981'
    },
    {
      name: 'Hate it',
      value: parseInt(analysis.metrics.negativePercentage),
      count: analysis.metrics.negativeCount,
      color: '#ef4444'
    },
    {
      name: 'Neutral',
      value: parseInt(analysis.metrics.neutralPercentage),
      count: analysis.metrics.neutralCount,
      color: '#6b7280'
    }
  ];

  const radialData = [
    {
      name: 'Sentiment Score',
      value: Math.max(0, parseFloat(analysis.metrics.sentimentScore) + 100) / 2,
      fill: getSentimentColor(analysis.overallVerdict.sentiment)
    }
  ];

  return (
    <div className="sentiment-analysis-container">
      <div className="sentiment-header">
        <div className="header-content">
          <h2 className="header-title">
            <Brain className="header-icon" />
            AI-Powered Sentiment Analysis
          </h2>
          <Button onClick={onClose} variant="outline" className="close-button">
            Close
          </Button>
        </div>
        
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-button ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
          >
            Deep Insights
          </button>
          <button
            className={`tab-button ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('trends')}
          >
            Trends
          </button>
          <button
            className={`tab-button ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            Actions
          </button>
        </div>
      </div>

      <div className="sentiment-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            {/* Overall Verdict Card */}
            <Card className="verdict-card">
              <CardHeader>
                <CardTitle className="verdict-title">
                  Overall Customer Sentiment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="verdict-content">
                  <div className="verdict-icon">
                    {getSentimentIcon(analysis.overallVerdict.sentiment)}
                  </div>
                  <div className="verdict-details">
                    <h3 className="verdict-label">
                      Customers {analysis.overallVerdict.sentiment === 'LOVED' ? 'Love' : 
                               analysis.overallVerdict.sentiment === 'HATED' ? 'Hate' : 
                               'Have Mixed Feelings About'} This Product
                    </h3>
                    <p className="verdict-summary">{analysis.overallVerdict.summary}</p>
                    <div className="sentiment-score">
                      <span className="score-label">Sentiment Score:</span>
                      <span className="score-value" style={{ color: getSentimentColor(analysis.overallVerdict.sentiment) }}>
                        {analysis.overallVerdict.score}/100
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sentiment Distribution */}
            <div className="charts-row">
              <Card className="chart-card">
                <CardHeader>
                  <CardTitle>Sentiment Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="sentiment-stats">
                    {sentimentData.map((item, index) => (
                      <div key={index} className="stat-item">
                        <div className="stat-color" style={{ backgroundColor: item.color }}></div>
                        <span className="stat-label">{item.name}:</span>
                        <span className="stat-value">{item.count} reviews ({item.value}%)</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="chart-card">
                <CardHeader>
                  <CardTitle>Sentiment Score Meter</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={radialData}>
                      <RadialBar dataKey="value" cornerRadius={10} fill="#8884d8" />
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="radial-label">
                        <tspan x="50%" dy="-0.5em" className="radial-score">
                          {analysis.metrics.sentimentScore}
                        </tspan>
                        <tspan x="50%" dy="1.5em" className="radial-text">
                          Net Sentiment
                        </tspan>
                      </text>
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="score-interpretation">
                    <p>{analysis.metrics.sentimentScore > 0 ? 'Positive' : 'Negative'} sentiment overall</p>
                    <p className="score-detail">
                      {Math.abs(analysis.metrics.sentimentScore)}% more {analysis.metrics.sentimentScore > 0 ? 'positive' : 'negative'} than {analysis.metrics.sentimentScore > 0 ? 'negative' : 'positive'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="insights-section">
            {/* Why Customers Love */}
            <Card className={`insight-card ${expandedSections.love ? 'expanded' : ''}`}>
              <CardHeader onClick={() => toggleSection('love')} className="clickable-header">
                <CardTitle className="insight-title">
                  <Heart className="text-green-500" size={20} />
                  Why Customers Love This Product
                  <ChevronRight className={`chevron ${expandedSections.love ? 'rotated' : ''}`} size={20} />
                </CardTitle>
              </CardHeader>
              {expandedSections.love && (
                <CardContent>
                  <div className="love-reasons">
                    {analysis.whyCustomersLove.topReasons.map((reason, index) => (
                      <div key={index} className="reason-card positive">
                        <div className="reason-header">
                          <h4>{reason.reason}</h4>
                          <span className={`impact-badge ${reason.impact.toLowerCase()}`}>
                            {reason.impact} Impact
                          </span>
                        </div>
                        <p className="frequency">Mentioned {reason.frequency}</p>
                        <div className="quotes">
                          {reason.quotes.map((quote, qIndex) => (
                            <blockquote key={qIndex}>"{quote}"</blockquote>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="additional-insights">
                    <div className="insight-group">
                      <h4>Emotional Drivers</h4>
                      <div className="tags">
                        {analysis.whyCustomersLove.emotionalDrivers.map((driver, index) => (
                          <span key={index} className="tag positive">{driver}</span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="insight-group">
                      <h4>Value Propositions</h4>
                      <div className="tags">
                        {analysis.whyCustomersLove.valuePropositions.map((value, index) => (
                          <span key={index} className="tag positive">{value}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Why Customers Hate */}
            <Card className={`insight-card ${expandedSections.hate ? 'expanded' : ''}`}>
              <CardHeader onClick={() => toggleSection('hate')} className="clickable-header">
                <CardTitle className="insight-title">
                  <HeartCrack className="text-red-500" size={20} />
                  Why Customers Hate This Product
                  <ChevronRight className={`chevron ${expandedSections.hate ? 'rotated' : ''}`} size={20} />
                </CardTitle>
              </CardHeader>
              {expandedSections.hate && (
                <CardContent>
                  <div className="hate-reasons">
                    {analysis.whyCustomersHate.topReasons.map((reason, index) => (
                      <div key={index} className="reason-card negative">
                        <div className="reason-header">
                          <h4>{reason.reason}</h4>
                          <span className={`severity-badge ${reason.severity.toLowerCase()}`}>
                            {reason.severity} Severity
                          </span>
                        </div>
                        <p className="frequency">Mentioned {reason.frequency}</p>
                        <div className="quotes">
                          {reason.quotes.map((quote, qIndex) => (
                            <blockquote key={qIndex}>"{quote}"</blockquote>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="additional-insights">
                    <div className="insight-group">
                      <h4>Frustration Points</h4>
                      <div className="tags">
                        {analysis.whyCustomersHate.frustrationPoints.map((point, index) => (
                          <span key={index} className="tag negative">{point}</span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="insight-group">
                      <h4>Deal Breakers</h4>
                      <div className="tags">
                        {analysis.whyCustomersHate.dealBreakers.map((breaker, index) => (
                          <span key={index} className="tag negative">{breaker}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Customer Journey */}
            <Card className={`insight-card ${expandedSections.journey ? 'expanded' : ''}`}>
              <CardHeader onClick={() => toggleSection('journey')} className="clickable-header">
                <CardTitle className="insight-title">
                  <Target size={20} />
                  Customer Journey Analysis
                  <ChevronRight className={`chevron ${expandedSections.journey ? 'rotated' : ''}`} size={20} />
                </CardTitle>
              </CardHeader>
              {expandedSections.journey && (
                <CardContent>
                  <div className="journey-timeline">
                    <div className="journey-phase">
                      <div className="phase-icon honeymoon">
                        <Heart size={20} />
                      </div>
                      <div className="phase-content">
                        <h4>Honeymoon Phase</h4>
                        <p>{analysis.customerJourney.honeymoonPhase}</p>
                      </div>
                    </div>
                    
                    <div className="journey-phase">
                      <div className="phase-icon reality">
                        <AlertCircle size={20} />
                      </div>
                      <div className="phase-content">
                        <h4>Reality Check</h4>
                        <p>{analysis.customerJourney.realityCheck}</p>
                      </div>
                    </div>
                    
                    <div className="journey-phase">
                      <div className="phase-icon breaking">
                        <HeartCrack size={20} />
                      </div>
                      <div className="phase-content">
                        <h4>Breaking Point</h4>
                        <p>{analysis.customerJourney.breakingPoint}</p>
                      </div>
                    </div>
                    
                    <div className="journey-phase">
                      <div className="phase-icon loyalty">
                        <Shield size={20} />
                      </div>
                      <div className="phase-content">
                        <h4>Loyalty Factors</h4>
                        <p>{analysis.customerJourney.loyaltyFactors}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Competitive Insights */}
            <Card className="insight-card">
              <CardHeader>
                <CardTitle className="insight-title">
                  <BarChart2 size={20} />
                  Competitive Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="competitive-insights">
                  <div className="competitive-section">
                    <h4 className="section-title positive">Our Advantages</h4>
                    <ul className="competitive-list">
                      {analysis.competitiveInsights.advantages.map((advantage, index) => (
                        <li key={index} className="advantage-item">
                          <ThumbsUp size={16} className="text-green-500" />
                          {advantage}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="competitive-section">
                    <h4 className="section-title negative">Areas to Improve</h4>
                    <ul className="competitive-list">
                      {analysis.competitiveInsights.disadvantages.map((disadvantage, index) => (
                        <li key={index} className="disadvantage-item">
                          <ThumbsDown size={16} className="text-red-500" />
                          {disadvantage}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'trends' && trends && (
          <div className="trends-section">
            <Card className="trend-card">
              <CardHeader>
                <CardTitle>Sentiment Trends (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={trends.trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                      formatter={(value) => `${value}%`}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="positiveRate" 
                      stackId="1" 
                      stroke="#10b981" 
                      fill="#10b981" 
                      name="Positive"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="negativeRate" 
                      stackId="1" 
                      stroke="#ef4444" 
                      fill="#ef4444" 
                      name="Negative"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                
                <div className="trend-summary">
                  <div className="trend-indicator">
                    {trends.summary.improving ? (
                      <>
                        <TrendingUp className="text-green-500" size={24} />
                        <span>Sentiment is improving</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="text-red-500" size={24} />
                        <span>Sentiment is declining</span>
                      </>
                    )}
                  </div>
                  <div className="trend-details">
                    <p>Current score: <strong>{trends.summary.currentScore}%</strong></p>
                    <p>Previous score: <strong>{trends.summary.previousScore}%</strong></p>
                    <p>Volatility: <strong>{trends.summary.volatility}</strong></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="recommendations-section">
            <Card className="recommendations-card">
              <CardHeader>
                <CardTitle>
                  <Zap size={20} />
                  Immediate Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="recommendations-list">
                  {analysis.recommendations.immediate.map((rec, index) => (
                    <div key={index} className="recommendation-item immediate">
                      <div className="rec-number">{index + 1}</div>
                      <div className="rec-content">
                        <p>{rec}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="recommendations-card">
              <CardHeader>
                <CardTitle>
                  <Target size={20} />
                  Strategic Improvements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="recommendations-list">
                  {analysis.recommendations.strategic.map((rec, index) => (
                    <div key={index} className="recommendation-item strategic">
                      <div className="rec-number">{index + 1}</div>
                      <div className="rec-content">
                        <p>{rec}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="recommendations-card">
              <CardHeader>
                <CardTitle>
                  <MessageSquare size={20} />
                  Key Messages to Emphasize
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="messaging-list">
                  {analysis.recommendations.messaging.map((msg, index) => (
                    <div key={index} className="message-item">
                      <Sparkles size={16} className="text-blue-500" />
                      <p>{msg}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SentimentAnalysis;