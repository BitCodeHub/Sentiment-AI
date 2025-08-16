import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Treemap, Sankey
} from 'recharts';
import { 
  Card, CardContent, CardHeader, CardTitle 
} from './ui/card';
import { 
  AlertCircle, Bug, DollarSign, Users, HeartHandshake, 
  Lightbulb, TrendingUp, TrendingDown, Target, Shield,
  MessageSquare, Star, Activity, Zap, AlertTriangle,
  CheckCircle, XCircle, ArrowRight, Filter, Search,
  Download, RefreshCw, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import { performDeepContentAnalysis } from '../services/deepContentAnalysis';
import { testGeminiConnection, initializeGeminiModel } from '../services/geminiService';
import IssueFrequencyChart from './IssueFrequencyChart';
import SentimentByCategory from './SentimentByCategory';
import './DeepContentAnalysis.css';

const COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#10b981',
  user: '#3b82f6',
  competitor: '#8b5cf6',
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#64748b'
};

const DeepContentAnalysis = ({ userReviews, competitorReviews, userAppName, competitorAppName }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('overview'); // overview, technical, features, comparison
  const [expandedSections, setExpandedSections] = useState({});
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const runAnalysis = async () => {
      setLoading(true);
      setError(null);
      try {
        // First test Gemini connection
        console.log('Testing Gemini connection...');
        const geminiTest = await testGeminiConnection();
        console.log('Gemini test result:', geminiTest);
        
        console.log('Starting deep analysis with:', {
          userReviewsCount: userReviews?.length || 0,
          competitorReviewsCount: competitorReviews?.length || 0,
          userSample: userReviews?.[0],
          competitorSample: competitorReviews?.[0]
        });
        
        const result = await performDeepContentAnalysis(userReviews, competitorReviews);
        console.log('Deep analysis result:', result);
        setAnalysis(result);
      } catch (error) {
        console.error('Deep analysis failed:', error);
        setError(error.message || 'Failed to perform analysis');
        // Set a basic analysis structure to avoid blank screen
        const defaultPainPoints = {
          technical: { 
            count: 0, 
            subcategories: {
              performance: { count: 0, examples: [] },
              stability: { count: 0, examples: [] },
              functionality: { count: 0, examples: [] }
            }, 
            examples: [] 
          },
          usability: { 
            count: 0, 
            subcategories: {
              navigation: { count: 0, examples: [] },
              interface: { count: 0, examples: [] },
              complexity: { count: 0, examples: [] }
            }, 
            examples: [] 
          },
          pricing: { 
            count: 0, 
            subcategories: {
              value: { count: 0, examples: [] },
              subscription: { count: 0, examples: [] },
              features: { count: 0, examples: [] }
            }, 
            examples: [] 
          },
          features: { 
            count: 0, 
            subcategories: {
              missing: { count: 0, examples: [] },
              improvement: { count: 0, examples: [] },
              request: { count: 0, examples: [] }
            }, 
            examples: [] 
          },
          support: { 
            count: 0, 
            subcategories: {
              responsiveness: { count: 0, examples: [] },
              quality: { count: 0, examples: [] },
              availability: { count: 0, examples: [] }
            }, 
            examples: [] 
          }
        };
        
        const defaultSatisfaction = {
          performance: { count: 0, weight: 1.2, examples: [] },
          usability: { count: 0, weight: 1.1, examples: [] },
          features: { count: 0, weight: 1.0, examples: [] },
          value: { count: 0, weight: 0.9, examples: [] },
          overall: { count: 0, weight: 1.3, examples: [] }
        };
        
        setAnalysis({
          user: {
            totalReviews: userReviews?.length || 0,
            technicalIssues: [],
            featureRequests: [],
            painPoints: defaultPainPoints,
            satisfaction: defaultSatisfaction
          },
          competitor: {
            totalReviews: competitorReviews?.length || 0,
            technicalIssues: [],
            featureRequests: [],
            painPoints: defaultPainPoints,
            satisfaction: defaultSatisfaction
          },
          comparison: {
            gaps: [],
            opportunities: [],
            userStrengths: [],
            competitorStrengths: [],
            commonIssues: []
          },
          recommendations: {
            immediate: [],
            shortTerm: [],
            longTerm: []
          }
        });
      }
      setLoading(false);
    };

    if (userReviews && competitorReviews && userReviews.length > 0 && competitorReviews.length > 0) {
      runAnalysis();
    } else {
      setLoading(false);
      setError('No reviews data available for analysis');
      // Also set the default analysis structure when no data
      const defaultPainPoints = {
        technical: { 
          count: 0, 
          subcategories: {
            performance: { count: 0, examples: [] },
            stability: { count: 0, examples: [] },
            functionality: { count: 0, examples: [] }
          }, 
          examples: [] 
        },
        usability: { 
          count: 0, 
          subcategories: {
            navigation: { count: 0, examples: [] },
            interface: { count: 0, examples: [] },
            complexity: { count: 0, examples: [] }
          }, 
          examples: [] 
        },
        pricing: { 
          count: 0, 
          subcategories: {
            value: { count: 0, examples: [] },
            subscription: { count: 0, examples: [] },
            features: { count: 0, examples: [] }
          }, 
          examples: [] 
        },
        features: { 
          count: 0, 
          subcategories: {
            missing: { count: 0, examples: [] },
            improvement: { count: 0, examples: [] },
            request: { count: 0, examples: [] }
          }, 
          examples: [] 
        },
        support: { 
          count: 0, 
          subcategories: {
            responsiveness: { count: 0, examples: [] },
            quality: { count: 0, examples: [] },
            availability: { count: 0, examples: [] }
          }, 
          examples: [] 
        }
      };
      
      const defaultSatisfaction = {
        performance: { count: 0, weight: 1.2, examples: [] },
        usability: { count: 0, weight: 1.1, examples: [] },
        features: { count: 0, weight: 1.0, examples: [] },
        value: { count: 0, weight: 0.9, examples: [] },
        overall: { count: 0, weight: 1.3, examples: [] }
      };
      
      setAnalysis({
        user: {
          totalReviews: 0,
          technicalIssues: [],
          featureRequests: [],
          painPoints: defaultPainPoints,
          satisfaction: defaultSatisfaction
        },
        competitor: {
          totalReviews: 0,
          technicalIssues: [],
          featureRequests: [],
          painPoints: defaultPainPoints,
          satisfaction: defaultSatisfaction
        },
        comparison: {
          gaps: [],
          opportunities: [],
          userStrengths: [],
          competitorStrengths: [],
          commonIssues: []
        },
        recommendations: {
          immediate: [],
          shortTerm: [],
          longTerm: []
        }
      });
    }
  }, [userReviews, competitorReviews, retryCount]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Prepare data for technical issues comparison
  const technicalIssuesComparison = useMemo(() => {
    if (!analysis || !analysis.user?.technicalIssues || !analysis.competitor?.technicalIssues) return [];
    
    const userIssues = new Map((analysis.user.technicalIssues || []).map(i => [i.issue, i]));
    const competitorIssues = new Map((analysis.competitor.technicalIssues || []).map(i => [i.issue, i]));
    
    const allIssues = new Set([...userIssues.keys(), ...competitorIssues.keys()]);
    
    return Array.from(allIssues).map(issue => ({
      issue,
      [userAppName]: userIssues.get(issue)?.percentage || 0,
      [competitorAppName]: competitorIssues.get(issue)?.percentage || 0,
      userCount: userIssues.get(issue)?.count || 0,
      competitorCount: competitorIssues.get(issue)?.count || 0
    })).sort((a, b) => (b.userCount + b.competitorCount) - (a.userCount + a.competitorCount));
  }, [analysis, userAppName, competitorAppName]);

  // Prepare pain points radar data
  const painPointsRadarData = useMemo(() => {
    if (!analysis || !analysis.user?.painPoints || !analysis.competitor?.painPoints) return [];
    
    // Ensure painPoints is an object before using Object.keys
    const userPainPoints = analysis.user.painPoints;
    if (!userPainPoints || typeof userPainPoints !== 'object') return [];
    
    return Object.keys(userPainPoints).map(category => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      [userAppName]: analysis.user.totalReviews > 0 
        ? (analysis.user.painPoints[category]?.count || 0) / analysis.user.totalReviews * 100 
        : 0,
      [competitorAppName]: analysis.competitor.totalReviews > 0 
        ? (analysis.competitor.painPoints[category]?.count || 0) / analysis.competitor.totalReviews * 100 
        : 0
    }));
  }, [analysis, userAppName, competitorAppName]);

  // Prepare satisfaction comparison
  const satisfactionComparison = useMemo(() => {
    if (!analysis || !analysis.user?.satisfaction || !analysis.competitor?.satisfaction) return [];
    
    // Ensure satisfaction is an object before using Object.keys
    const userSatisfaction = analysis.user.satisfaction;
    if (!userSatisfaction || typeof userSatisfaction !== 'object') return [];
    
    return Object.keys(userSatisfaction).map(category => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      [userAppName]: analysis.user.totalReviews > 0 
        ? (analysis.user.satisfaction[category]?.count || 0) / analysis.user.totalReviews * 100 
        : 0,
      [competitorAppName]: analysis.competitor.totalReviews > 0 
        ? (analysis.competitor.satisfaction[category]?.count || 0) / analysis.competitor.totalReviews * 100 
        : 0,
      userCount: analysis.user.satisfaction[category]?.count || 0,
      competitorCount: analysis.competitor.satisfaction[category]?.count || 0
    })).sort((a, b) => (b.userCount + b.competitorCount) - (a.userCount + a.competitorCount));
  }, [analysis, userAppName, competitorAppName]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="tooltip-item" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="deep-analysis-loading">
        <div className="loading-spinner">
          <RefreshCw size={32} className="spin" />
          <p>Performing deep content analysis...</p>
        </div>
      </div>
    );
  }

  if (!analysis && !loading) {
    return (
      <div className="deep-analysis-error">
        <AlertCircle size={48} />
        <p>Unable to perform analysis. Please try again.</p>
        {error && <p style={{fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem'}}>{error}</p>}
      </div>
    );
  }

  if (!analysis) {
    return null; // Don't render anything if analysis is not ready
  }

  return (
    <div className="deep-content-analysis">
      {/* Header with View Mode Selector */}
      <div className="analysis-header">
        <h2 className="analysis-title">
          <Activity size={28} />
          Deep Content Analysis
        </h2>
        <div className="view-mode-selector">
          <button
            className={`mode-button ${viewMode === 'overview' ? 'active' : ''}`}
            onClick={() => setViewMode('overview')}
          >
            Overview
          </button>
          <button
            className={`mode-button ${viewMode === 'technical' ? 'active' : ''}`}
            onClick={() => setViewMode('technical')}
          >
            Technical Issues
          </button>
          <button
            className={`mode-button ${viewMode === 'features' ? 'active' : ''}`}
            onClick={() => setViewMode('features')}
          >
            Features & Requests
          </button>
          <button
            className={`mode-button ${viewMode === 'comparison' ? 'active' : ''}`}
            onClick={() => setViewMode('comparison')}
          >
            Competitive Analysis
          </button>
        </div>
      </div>

      {/* AI Insights Banner or Warning */}
      {analysis && (
        <Card className={analysis.geminiInsights || analysis.user?.aiInsights || analysis.competitor?.aiInsights ? "ai-insights-banner" : "analysis-warning-banner"}>
          <CardHeader>
            <CardTitle>
              {analysis.geminiInsights || analysis.user?.aiInsights || analysis.competitor?.aiInsights ? (
                <>
                  <Sparkles size={20} />
                  AI-Powered Insights (Google Gemini 2.5)
                </>
              ) : (
                <>
                  <AlertCircle size={20} />
                  Pattern-Based Analysis
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              {analysis.geminiInsights || analysis.user?.aiInsights || analysis.competitor?.aiInsights
                ? "Deep analysis powered by Google Gemini 2.5 AI provides intelligent insights and recommendations based on review content."
                : "Analysis is based on pattern matching. Click below to enable AI-powered analysis."}
            </p>
            {error && error !== 'No reviews data available for analysis' && (
              <p style={{fontSize: '0.875rem', color: '#f59e0b', marginTop: '0.5rem'}}>
                Note: {error}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              {(!analysis.geminiInsights && !analysis.user?.aiInsights && !analysis.competitor?.aiInsights) && (
                <button
                  onClick={async () => {
                    setLoading(true);
                    setError(null);
                    try {
                      // Test Gemini connection first
                      console.log('Testing Gemini before re-analysis...');
                      const testResult = await testGeminiConnection();
                      if (testResult.success) {
                        console.log('Gemini is working, re-running analysis...');
                        // Clear the analysis to force complete re-run
                        setAnalysis(null);
                        // Force re-run the analysis by incrementing retry count
                        setRetryCount(prev => prev + 1);
                      } else {
                        setError(`Gemini connection failed: ${testResult.error}`);
                        setLoading(false);
                      }
                    } catch (error) {
                      console.error('Failed to connect to Gemini:', error);
                      setError('Failed to connect to Gemini AI');
                      setLoading(false);
                    }
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <RefreshCw size={16} />
                  Enable AI Analysis
                </button>
              )}
              {(analysis.geminiInsights || analysis.user?.aiInsights || analysis.competitor?.aiInsights) && (
                <button
                  onClick={async () => {
                    setLoading(true);
                    setError(null);
                    try {
                      // Clear and re-run analysis
                      console.log('Re-running AI analysis...');
                      setAnalysis(null);
                      setRetryCount(prev => prev + 1);
                    } catch (error) {
                      console.error('Failed to re-run analysis:', error);
                      setError('Failed to re-run analysis');
                      setLoading(false);
                    }
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <RefreshCw size={16} />
                  Refresh AI Analysis
                </button>
              )}
              <button
                onClick={async () => {
                  console.log('Testing Gemini connection...');
                  const testResult = await testGeminiConnection();
                  console.log('Test result:', testResult);
                  
                  if (testResult.success) {
                    alert('Gemini Test Result: Success! Click "Enable AI Analysis" to use AI-powered insights.');
                  } else {
                    alert(`Gemini Test Result: Failed - ${testResult.error}`);
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#64748b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                Test Connection
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <div className="overview-section">
          {/* Key Insights Summary */}
          <div className="insights-summary">
            <Card className="insight-card critical">
              <CardHeader>
                <CardTitle>
                  <AlertTriangle size={20} />
                  Critical Gaps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="insight-count">{analysis.comparison?.gaps?.filter(g => g.severity === 'high').length || 0}</div>
                <p className="insight-description">Areas where competitor significantly outperforms</p>
              </CardContent>
            </Card>

            <Card className="insight-card opportunity">
              <CardHeader>
                <CardTitle>
                  <Target size={20} />
                  Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="insight-count">{analysis.comparison?.opportunities?.length || 0}</div>
                <p className="insight-description">Areas where you can gain competitive advantage</p>
              </CardContent>
            </Card>

            <Card className="insight-card strength">
              <CardHeader>
                <CardTitle>
                  <Shield size={20} />
                  Your Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="insight-count">{analysis.comparison?.userStrengths?.length || 0}</div>
                <p className="insight-description">Areas where you excel over competitor</p>
              </CardContent>
            </Card>

            <Card className="insight-card common">
              <CardHeader>
                <CardTitle>
                  <Users size={20} />
                  Common Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="insight-count">{analysis.comparison?.commonIssues?.length || 0}</div>
                <p className="insight-description">Issues affecting both apps</p>
              </CardContent>
            </Card>
          </div>

          {/* Pain Points Radar Chart */}
          <Card className="analysis-card">
            <CardHeader>
              <CardTitle>Pain Points Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={painPointsRadarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" />
                  <PolarRadiusAxis angle={90} domain={[0, 'auto']} />
                  <Radar
                    name={userAppName}
                    dataKey={userAppName}
                    stroke={COLORS.user}
                    fill={COLORS.user}
                    fillOpacity={0.6}
                  />
                  <Radar
                    name={competitorAppName}
                    dataKey={competitorAppName}
                    stroke={COLORS.competitor}
                    fill={COLORS.competitor}
                    fillOpacity={0.6}
                  />
                  <Legend />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Satisfaction Areas */}
          <Card className="analysis-card">
            <CardHeader>
              <CardTitle>User Satisfaction Areas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={satisfactionComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey={userAppName} fill={COLORS.user} />
                  <Bar dataKey={competitorAppName} fill={COLORS.competitor} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Issue Frequency Analysis */}
          <IssueFrequencyChart 
            userAnalysis={analysis.user}
            competitorAnalysis={analysis.competitor}
            userAppName={userAppName}
            competitorAppName={competitorAppName}
          />

          {/* Sentiment By Category Analysis */}
          <SentimentByCategory
            userAnalysis={analysis.user}
            competitorAnalysis={analysis.competitor}
            userAppName={userAppName}
            competitorAppName={competitorAppName}
          />
        </div>
      )}

      {/* Technical Issues Mode */}
      {viewMode === 'technical' && (
        <div className="technical-section">
          <Card className="analysis-card">
            <CardHeader>
              <CardTitle>
                <Bug size={20} />
                Technical Issues Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={technicalIssuesComparison.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="issue" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey={userAppName} fill={COLORS.user} />
                  <Bar dataKey={competitorAppName} fill={COLORS.competitor} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed Technical Issues */}
          <div className="technical-details-grid">
            {(() => {
              const painPoints = analysis.user?.painPoints;
              if (!painPoints || typeof painPoints !== 'object' || Array.isArray(painPoints)) return null;
              
              try {
                return Object.entries(painPoints).map(([category, data]) => {
                if (!data || typeof data !== 'object' || !data.count || data.count === 0) return null;
                const isExpanded = expandedSections[`tech-${category}`];
                
                return (
                <Card key={category} className="pain-point-card">
                  <CardHeader 
                    className="clickable-header"
                    onClick={() => toggleSection(`tech-${category}`)}
                  >
                    <CardTitle>
                      <div className="header-content">
                        <span>{category.charAt(0).toUpperCase() + category.slice(1)} Issues</span>
                        <div className="header-stats">
                          <span className="issue-count">{data?.count || 0} reports</span>
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent>
                      <div className="subcategories">
                        {(() => {
                          const subcats = data?.subcategories;
                          if (!subcats || typeof subcats !== 'object' || Array.isArray(subcats)) return null;
                          
                          try {
                            return Object.entries(subcats).map(([subcat, subcatData]) => {
                            if (!subcatData || typeof subcatData !== 'object' || !subcatData.count || subcatData.count === 0) return null;
                            return (
                            <div key={subcat} className="subcategory">
                              <div className="subcat-header">
                                <span className="subcat-name">{subcat}</span>
                                <span className="subcat-count">{subcatData?.count || 0} mentions</span>
                              </div>
                              {subcatData?.examples && subcatData.examples.length > 0 && (
                                <div className="examples">
                                  {subcatData.examples.map((example, idx) => (
                                    <div key={idx} className="example">
                                      <p>"{example.text}..."</p>
                                      <div className="example-meta">
                                        <span className="rating">
                                          <Star size={14} fill="#fbbf24" />
                                          {example.rating}
                                        </span>
                                        <span className="date">{new Date(example.date).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        });
                          } catch (error) {
                            console.error('Error rendering subcategories:', error);
                            return null;
                          }
                        })()}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            });
              } catch (error) {
                console.error('Error rendering pain points:', error);
                return null;
              }
            })()}
          </div>
        </div>
      )}

      {/* Features Mode */}
      {viewMode === 'features' && (
        <div className="features-section">
          <div className="feature-requests-grid">
            <Card className="feature-card">
              <CardHeader>
                <CardTitle>
                  <Lightbulb size={20} />
                  Top Feature Requests - {userAppName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="feature-list">
                  {(analysis.user?.featureRequests || []).slice(0, 10).map((request, idx) => (
                    <div key={idx} className="feature-item">
                      <span className="feature-number">{idx + 1}</span>
                      <span className="feature-text">{request.request}</span>
                      <span className="feature-count">{request?.count || 0} requests</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="feature-card">
              <CardHeader>
                <CardTitle>
                  <Lightbulb size={20} />
                  Top Feature Requests - {competitorAppName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="feature-list">
                  {(analysis.competitor?.featureRequests || []).slice(0, 10).map((request, idx) => (
                    <div key={idx} className="feature-item">
                      <span className="feature-number">{idx + 1}</span>
                      <span className="feature-text">{request.request}</span>
                      <span className="feature-count">{request?.count || 0} requests</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature Implementation Opportunities */}
          <Card className="analysis-card">
            <CardHeader>
              <CardTitle>Feature Implementation Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="opportunities-list">
                {(analysis.competitor?.featureRequests || []).slice(0, 5).map((request, idx) => {
                  const userHasRequest = (analysis.user?.featureRequests || []).find(r => 
                    r?.request && request?.request && r.request.toLowerCase().includes(request.request.toLowerCase().split(' ')[0])
                  );
                  
                  if (!userHasRequest || (userHasRequest?.count || 0) < (request?.count || 0) * 0.5) {
                    return (
                      <div key={idx} className="opportunity-item">
                        <div className="opportunity-icon">
                          <Target size={20} />
                        </div>
                        <div className="opportunity-content">
                          <h4>Implement: {request.request}</h4>
                          <p>Competitor users requested this {request?.count || 0} times. 
                             {userHasRequest ? ` Your users requested it ${userHasRequest?.count || 0} times.` : ' Not requested by your users yet.'}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Comparison Mode */}
      {viewMode === 'comparison' && (
        <div className="comparison-section">
          {/* Competitive Gaps */}
          <Card className="analysis-card">
            <CardHeader>
              <CardTitle>
                <AlertTriangle size={20} />
                Critical Performance Gaps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gaps-list">
                {(analysis.comparison?.gaps || []).map((gap, idx) => (
                  <div key={idx} className={`gap-item severity-${gap.severity}`}>
                    <div className="gap-header">
                      <span className="gap-category">{gap.category.charAt(0).toUpperCase() + gap.category.slice(1)}</span>
                      <span className="gap-severity">{gap.severity}</span>
                    </div>
                    <div className="gap-metrics">
                      <div className="metric">
                        <span className="metric-label">Your Rate</span>
                        <span className="metric-value negative">{gap.userRate}%</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Competitor</span>
                        <span className="metric-value">{gap.competitorRate}%</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Gap</span>
                        <span className="metric-value gap-value">-{gap.difference}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Opportunities */}
          <Card className="analysis-card">
            <CardHeader>
              <CardTitle>
                <Target size={20} />
                Competitive Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="opportunities-grid">
                {(analysis.comparison?.opportunities || []).map((opp, idx) => (
                  <div key={idx} className="opportunity-card">
                    <h4>{opp.category.charAt(0).toUpperCase() + opp.category.slice(1)}</h4>
                    <p>{opp.description}</p>
                    <div className="advantage-badge">+{opp.advantage}% advantage</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="recommendations-card">
            <CardHeader>
              <CardTitle>
                <Zap size={20} />
                Actionable Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="recommendations-timeline">
                {/* Immediate Actions */}
                <div className="timeline-section">
                  <h3 className="timeline-title">
                    <AlertCircle size={18} />
                    Immediate Actions (1-2 weeks)
                  </h3>
                  <div className="recommendations-list">
                    {(analysis.recommendations?.immediate || []).map((rec, idx) => (
                      <div key={idx} className="recommendation-item">
                        <div className="rec-header">
                          <h4>{rec.title}</h4>
                          <span className={`impact-badge impact-${rec.impact}`}>{rec.impact} impact</span>
                        </div>
                        <p>{rec.description}</p>
                        {rec.metrics && (
                          <div className="rec-metrics">
                            <span>Current: {rec.metrics.currentRate}%</span>
                            <ArrowRight size={16} />
                            <span>Target: {rec.metrics.targetRate}%</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Short-term Improvements */}
                <div className="timeline-section">
                  <h3 className="timeline-title">
                    <TrendingUp size={18} />
                    Short-term Improvements (1-3 months)
                  </h3>
                  <div className="recommendations-list">
                    {(analysis.recommendations?.shortTerm || []).map((rec, idx) => (
                      <div key={idx} className="recommendation-item">
                        <div className="rec-header">
                          <h4>{rec.title}</h4>
                          <span className={`impact-badge impact-${rec.impact}`}>{rec.impact} impact</span>
                        </div>
                        <p>{rec.description}</p>
                        {rec.features && (
                          <div className="feature-recommendations">
                            {rec.features.map((feat, fidx) => (
                              <div key={fidx} className="feature-rec">
                                <CheckCircle size={16} />
                                <span>{feat?.request || 'Feature'} ({feat?.count || 0} requests)</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Long-term Strategy */}
                <div className="timeline-section">
                  <h3 className="timeline-title">
                    <Target size={18} />
                    Long-term Strategy (3-6 months)
                  </h3>
                  <div className="recommendations-list">
                    {(analysis.recommendations?.longTerm || []).map((rec, idx) => (
                      <div key={idx} className="recommendation-item">
                        <div className="rec-header">
                          <h4>{rec.title}</h4>
                          <span className={`impact-badge impact-${rec.impact}`}>{rec.impact} impact</span>
                        </div>
                        <p>{rec.description}</p>
                        {rec.strategy && (
                          <p className="strategy-note">{rec.strategy}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DeepContentAnalysis;