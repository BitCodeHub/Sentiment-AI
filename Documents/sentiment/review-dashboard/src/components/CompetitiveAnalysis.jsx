import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, Star, MessageSquare, 
  Activity, Award, Globe, Calendar, Filter, X, Check,
  ChevronDown, Search, Zap, Shield, Target, Brain,
  Car, Battery, Gauge, DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { automotiveOEMs, getOEMById, getCompetitors, oemCategories } from '../data/automotiveOEMs';
import { analyzeCompetitors } from '../services/competitiveAnalysisService';
import './CompetitiveAnalysis.css';

const COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f'];

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

  // Toggle competitor selection
  const toggleCompetitor = (oemId) => {
    setSelectedCompetitors(prev => {
      if (prev.includes(oemId)) {
        return prev.filter(id => id !== oemId);
      } else if (prev.length < 5) {
        return [...prev, oemId];
      }
      return prev;
    });
  };

  // Fetch competitor data
  const fetchCompetitorData = async () => {
    if (selectedCompetitors.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would fetch real data from Reddit, app stores, etc.
      // For now, we'll simulate with mock data
      const mockData = {};
      
      for (const competitorId of selectedCompetitors) {
        const oem = getOEMById(competitorId);
        if (oem) {
          mockData[competitorId] = {
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
            appNames: oem.appNames
          };
        }
      }
      
      setCompetitorData(mockData);
      
      // Perform AI analysis
      const analysis = await analyzeCompetitors(currentAppName, mockData);
      setAnalysisResults(analysis);
      
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

  // Prepare data for radar chart
  const prepareRadarData = () => {
    if (Object.keys(competitorData).length === 0) return [];
    
    const metrics = [
      { metric: 'App Rating', key: 'appRating', max: 5 },
      { metric: 'Sentiment', key: 'sentimentScore', max: 1 },
      { metric: 'Innovation', key: 'innovationScore', max: 1 },
      { metric: 'Satisfaction', key: 'customerSatisfaction', max: 1 },
      { metric: 'Brand Strength', key: 'brandStrength', max: 1 },
      { metric: 'Market Share', key: 'marketShare', max: 100 }
    ];
    
    return metrics.map(({ metric, key, max }) => {
      const dataPoint = { metric };
      
      Object.entries(competitorData).forEach(([competitorId, data]) => {
        const value = data.metrics[key];
        dataPoint[data.name] = (value / max) * 100;
      });
      
      return dataPoint;
    });
  };

  // Prepare comparison data for bar chart
  const prepareComparisonData = () => {
    if (Object.keys(competitorData).length === 0) return [];
    
    return Object.entries(competitorData).map(([competitorId, data]) => ({
      name: data.name,
      'App Rating': data.metrics.appRating,
      'Review Count': data.metrics.reviewCount / 1000, // in thousands
      'Reddit Mentions': data.metrics.redditMentions,
      'Market Share': data.metrics.marketShare
    }));
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
      {/* Header */}
      <div className="competitive-header">
        <div className="header-content">
          <h2 className="competitive-title">
            <Car className="inline-icon" />
            Competitive Analysis
          </h2>
          <p className="competitive-subtitle">
            Compare your app with automotive industry competitors
          </p>
        </div>
        
        <Button
          onClick={() => setShowCompetitorSelect(!showCompetitorSelect)}
          className="select-competitors-btn"
        >
          <Users size={16} />
          Select Competitors ({selectedCompetitors.length}/5)
          <ChevronDown size={16} className={showCompetitorSelect ? 'rotated' : ''} />
        </Button>
      </div>

      {/* Competitor Selection Panel */}
      {showCompetitorSelect && (
        <div className="competitor-selection-panel">
          <div className="selection-header">
            <h3>Choose Competitors to Analyze</h3>
            <button 
              className="close-panel-btn"
              onClick={() => setShowCompetitorSelect(false)}
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Filters */}
          <div className="selection-filters">
            <div className="search-wrapper">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search OEMs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="category-filters">
              {oemCategories.map(category => (
                <button
                  key={category}
                  className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          
          {/* OEM Grid */}
          <div className="oem-grid">
            {filteredOEMs.map(oem => {
              const isSelected = selectedCompetitors.includes(oem.id);
              const isDisabled = !isSelected && selectedCompetitors.length >= 5;
              
              return (
                <div 
                  key={oem.id}
                  className={`oem-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => !isDisabled && toggleCompetitor(oem.id)}
                >
                  <div className="oem-header">
                    <h4>{oem.name}</h4>
                    {isSelected && <Check size={16} className="check-icon" />}
                  </div>
                  <div className="oem-details">
                    <span className="oem-country">{oem.country}</span>
                    <span className="oem-brands">{oem.brands.slice(0, 3).join(', ')}</span>
                  </div>
                  <div className="oem-categories">
                    {oem.categories.slice(0, 2).map(cat => (
                      <span key={cat} className="category-tag">{cat}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="selection-actions">
            <Button
              onClick={fetchCompetitorData}
              disabled={selectedCompetitors.length === 0}
              className="analyze-btn"
            >
              <Zap size={16} />
              Analyze Selected Competitors
            </Button>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {isLoading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Analyzing competitor data...</p>
        </div>
      )}

      {error && (
        <Alert className="error-alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {Object.keys(competitorData).length > 0 && !isLoading && (
        <>
          {/* Metrics Overview */}
          <div className="metrics-overview">
            <h3>Performance Comparison</h3>
            
            {/* Metric Selector */}
            <div className="metric-selector">
              <button 
                className={`metric-btn ${selectedMetric === 'overall' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('overall')}
              >
                <Activity size={16} />
                Overall
              </button>
              <button 
                className={`metric-btn ${selectedMetric === 'ratings' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('ratings')}
              >
                <Star size={16} />
                Ratings
              </button>
              <button 
                className={`metric-btn ${selectedMetric === 'sentiment' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('sentiment')}
              >
                <MessageSquare size={16} />
                Sentiment
              </button>
              <button 
                className={`metric-btn ${selectedMetric === 'market' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('market')}
              >
                <Globe size={16} />
                Market
              </button>
            </div>
            
            {/* Radar Chart */}
            <div className="chart-container radar-chart">
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={prepareRadarData()}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  {Object.entries(competitorData).map(([id, data], index) => (
                    <Radar
                      key={id}
                      name={data.name}
                      dataKey={data.name}
                      stroke={COLORS[index % COLORS.length]}
                      fill={COLORS[index % COLORS.length]}
                      fillOpacity={0.3}
                    />
                  ))}
                  <Tooltip />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparison Charts */}
          <div className="comparison-charts">
            <div className="chart-section">
              <h3>Key Metrics Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={prepareComparisonData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="App Rating" fill="#8884d8" />
                  <Bar dataKey="Market Share" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Trend Analysis */}
            <div className="chart-section">
              <h3>6-Month Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {Object.entries(competitorData).map(([id, data], index) => (
                    <Line
                      key={id}
                      type="monotone"
                      data={data.trends}
                      dataKey="rating"
                      name={data.name}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Insights */}
          {analysisResults && (
            <div className="ai-insights-section">
              <div className="insights-header">
                <Brain size={20} />
                <h3>AI Competitive Insights</h3>
              </div>
              
              <div className="insights-grid">
                <div className="insight-card">
                  <h4>Market Position</h4>
                  <p>{analysisResults.marketPosition}</p>
                </div>
                
                <div className="insight-card">
                  <h4>Competitive Advantages</h4>
                  <ul>
                    {analysisResults.advantages?.map((advantage, index) => (
                      <li key={index}>{advantage}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="insight-card">
                  <h4>Areas for Improvement</h4>
                  <ul>
                    {analysisResults.improvements?.map((improvement, index) => (
                      <li key={index}>{improvement}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="insight-card">
                  <h4>Strategic Recommendations</h4>
                  <p>{analysisResults.recommendations}</p>
                </div>
              </div>
              
              {/* Ask AI Section */}
              <div className="ask-ai-section">
                <h4>Ask AI About Competitors</h4>
                <div className="ai-question-suggestions">
                  <button 
                    onClick={() => handleAskAI("How does our app compare to Tesla's in terms of user experience?")}
                    className="suggestion-btn"
                  >
                    Compare UX with Tesla
                  </button>
                  <button 
                    onClick={() => handleAskAI("What features are competitors offering that we don't have?")}
                    className="suggestion-btn"
                  >
                    Missing Features Analysis
                  </button>
                  <button 
                    onClick={() => handleAskAI("Which competitor has the best customer satisfaction and why?")}
                    className="suggestion-btn"
                  >
                    Best Customer Satisfaction
                  </button>
                  <button 
                    onClick={() => handleAskAI("What are the emerging trends in automotive apps?")}
                    className="suggestion-btn"
                  >
                    Industry Trends
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Competitor Details */}
          <div className="competitor-details">
            <h3>Competitor Profiles</h3>
            <div className="competitor-cards">
              {Object.entries(competitorData).map(([id, data]) => {
                const oem = getOEMById(id);
                return (
                  <div key={id} className="competitor-card">
                    <div className="competitor-header">
                      <h4>{data.name}</h4>
                      <span className="market-cap">${oem?.marketCap}</span>
                    </div>
                    
                    <div className="competitor-metrics">
                      <div className="metric">
                        <Star size={16} />
                        <span>{data.metrics.appRating.toFixed(1)}</span>
                      </div>
                      <div className="metric">
                        <MessageSquare size={16} />
                        <span>{data.metrics.reviewCount.toLocaleString()}</span>
                      </div>
                      <div className="metric">
                        <TrendingUp size={16} />
                        <span>{(data.metrics.sentimentScore * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    
                    <div className="competitor-strengths">
                      <h5>Key Strengths</h5>
                      <ul>
                        {data.strengths.map((strength, index) => (
                          <li key={index}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="competitor-apps">
                      <h5>Apps</h5>
                      <div className="app-list">
                        {data.appNames.map((app, index) => (
                          <span key={index} className="app-tag">{app}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CompetitiveAnalysis;