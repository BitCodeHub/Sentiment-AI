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
import CompetitiveInsightsVisualizer from './CompetitiveInsightsVisualizer';
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

const DeepContentAnalysis = ({ userReviews, competitorReviews, userAppName, competitorAppName, initialAnalysisData }) => {
  const [analysis, setAnalysis] = useState(initialAnalysisData || null);
  const [loading, setLoading] = useState(!initialAnalysisData);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('overview'); // overview, technical, features, comparison
  const [expandedSections, setExpandedSections] = useState({});
  const [retryCount, setRetryCount] = useState(0);
  const [animateCharts, setAnimateCharts] = useState(false);

  useEffect(() => {
    // Use initial data if provided
    if (initialAnalysisData) {
      setAnalysis(initialAnalysisData);
      setLoading(false);
      // Trigger chart animations after mount
      setTimeout(() => setAnimateCharts(true), 100);
      return;
    }

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
        
        // Log review structure to understand field names
        if (userReviews?.length > 0) {
          console.log('User review fields:', Object.keys(userReviews[0]));
          console.log('Sample user review:', {
            text: userReviews[0].text || userReviews[0].content || userReviews[0]['Review Text'] || userReviews[0].Body,
            rating: userReviews[0].rating || userReviews[0].Rating,
            fullReview: userReviews[0]
          });
        }
        if (competitorReviews?.length > 0) {
          console.log('Competitor review fields:', Object.keys(competitorReviews[0]));
        }
        
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

    if (!initialAnalysisData && userReviews && competitorReviews && userReviews.length > 0 && competitorReviews.length > 0) {
      runAnalysis();
    } else if (!initialAnalysisData) {
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
  }, [userReviews, competitorReviews, retryCount, initialAnalysisData]);

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
    
    // Debug logging
    console.log('Satisfaction Comparison Debug:', {
      hasAnalysis: !!analysis,
      hasUserSatisfaction: !!analysis?.user?.satisfaction,
      hasCompetitorSatisfaction: !!analysis?.competitor?.satisfaction,
      userSatisfaction: analysis?.user?.satisfaction,
      competitorSatisfaction: analysis?.competitor?.satisfaction,
      userTotalReviews: analysis?.user?.totalReviews,
      competitorTotalReviews: analysis?.competitor?.totalReviews
    });
    
    // Additional debug: check individual categories
    if (analysis?.user?.satisfaction) {
      console.log('User satisfaction details:', {
        performance: analysis.user.satisfaction.performance,
        usability: analysis.user.satisfaction.usability,
        features: analysis.user.satisfaction.features,
        value: analysis.user.satisfaction.value,
        overall: analysis.user.satisfaction.overall
      });
    }
    
    // Ensure satisfaction is an object before using Object.keys
    const userSatisfaction = analysis.user.satisfaction;
    if (!userSatisfaction || typeof userSatisfaction !== 'object') return [];
    
    // Calculate total satisfaction mentions for relative scaling
    const userTotalSatisfaction = Object.values(userSatisfaction)
      .reduce((sum, cat) => sum + (cat.count || 0), 0);
    const competitorTotalSatisfaction = Object.values(analysis.competitor.satisfaction || {})
      .reduce((sum, cat) => sum + (cat.count || 0), 0);
    
    console.log('Total satisfaction counts:', {
      user: userTotalSatisfaction,
      competitor: competitorTotalSatisfaction
    });
    
    const result = Object.keys(userSatisfaction).map((category, index) => {
      const userCount = analysis.user.satisfaction[category]?.count || 0;
      const competitorCount = analysis.competitor.satisfaction[category]?.count || 0;
      
      // Use multiple scaling strategies
      let userValue, competitorValue;
      
      if (userTotalSatisfaction > 0 || competitorTotalSatisfaction > 0) {
        // Scale relative to total satisfaction mentions
        const maxSatisfaction = Math.max(userTotalSatisfaction, competitorTotalSatisfaction, 1);
        userValue = (userCount / maxSatisfaction) * 100;
        competitorValue = (competitorCount / maxSatisfaction) * 100;
      } else {
        // If no satisfaction data, use category weights to show relative importance
        const weight = analysis.user.satisfaction[category]?.weight || 1;
        const totalWeight = 5.5; // Sum of all weights
        // Scale to show relative importance (20-40% range)
        userValue = (weight / totalWeight) * 30;
        competitorValue = (weight / totalWeight) * 30;
      }
      
      // Ensure minimum visibility (at least 3% if any data exists)
      if (userCount > 0 && userValue < 3) userValue = 3;
      if (competitorCount > 0 && competitorValue < 3) competitorValue = 3;
      
      if (index === 0) {
        console.log(`\n📊 Processing satisfaction categories:`);
      }
      
      console.log(`  ${category}:`, {
        userCount,
        competitorCount,
        userValue: userValue.toFixed(1) + '%',
        competitorValue: competitorValue.toFixed(1) + '%',
        weight: analysis.user.satisfaction[category]?.weight
      });
      
      return {
        category: category.charAt(0).toUpperCase() + category.slice(1),
        [userAppName]: userValue,
        [competitorAppName]: competitorValue,
        userCount: userCount,
        competitorCount: competitorCount
      };
    }).sort((a, b) => (b.userCount + b.competitorCount) - (a.userCount + a.competitorCount));
    
    console.log('\n✅ Final satisfaction comparison data:');
    result.forEach(item => {
      console.log(`  ${item.category}: ${userAppName}=${item[userAppName].toFixed(1)}%, ${competitorAppName}=${item[competitorAppName].toFixed(1)}%`);
    });
    
    // If no data, provide sample data to show the chart structure
    if (result.length === 0 && analysis) {
      console.warn('\n⚠️ No satisfaction data found, using default structure');
      const defaultData = [
        { category: 'Performance', [userAppName]: 0, [competitorAppName]: 0, userCount: 0, competitorCount: 0 },
        { category: 'Usability', [userAppName]: 0, [competitorAppName]: 0, userCount: 0, competitorCount: 0 },
        { category: 'Features', [userAppName]: 0, [competitorAppName]: 0, userCount: 0, competitorCount: 0 },
        { category: 'Value', [userAppName]: 0, [competitorAppName]: 0, userCount: 0, competitorCount: 0 },
        { category: 'Overall', [userAppName]: 0, [competitorAppName]: 0, userCount: 0, competitorCount: 0 }
      ];
      console.log('Returning default data structure');
      return defaultData;
    }
    
    return result;
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
      <div className="analysis-header elevated">
        <h2 className="analysis-title">
          <Activity size={28} className="icon-glow" />
          Deep Content Analysis
          {analysis?.geminiInsights && (
            <span className="ai-powered-badge">
              <Sparkles size={16} />
              AI-Enhanced
            </span>
          )}
        </h2>
        <div className="view-mode-selector modern">
          <button
            className={`mode-button ${viewMode === 'overview' ? 'active' : ''}`}
            onClick={() => setViewMode('overview')}
          >
            <Activity size={16} />
            Overview
          </button>
          <button
            className={`mode-button ${viewMode === 'technical' ? 'active' : ''}`}
            onClick={() => setViewMode('technical')}
          >
            <Bug size={16} />
            Technical Issues
          </button>
          <button
            className={`mode-button ${viewMode === 'features' ? 'active' : ''}`}
            onClick={() => setViewMode('features')}
          >
            <Lightbulb size={16} />
            Features & Requests
          </button>
          <button
            className={`mode-button ${viewMode === 'comparison' ? 'active' : ''}`}
            onClick={() => setViewMode('comparison')}
          >
            <Target size={16} />
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
            {/* Debug logging */}
            {console.log('AI Analysis Debug:', {
              hasGeminiInsights: !!analysis.geminiInsights,
              hasUserAiInsights: !!analysis.user?.aiInsights,
              hasCompetitorAiInsights: !!analysis.competitor?.aiInsights,
              shouldShowEnableButton: !(analysis.geminiInsights || analysis.user?.aiInsights || analysis.competitor?.aiInsights)
            })}
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
              {/* Show Enable AI button when no AI insights are present */}
              {!(analysis.geminiInsights || analysis.user?.aiInsights || analysis.competitor?.aiInsights) && (
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
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    color: 'white',
                    border: '2px solid #8b5cf6',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 6px rgba(139, 92, 246, 0.3)',
                    transition: 'all 0.2s ease',
                    animation: 'pulse 2s infinite'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 12px rgba(139, 92, 246, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 6px rgba(139, 92, 246, 0.3)';
                  }}
                >
                  <Sparkles size={18} />
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
              <button
                onClick={async () => {
                  const { testSatisfactionAnalysis, checkReviewsForPositiveKeywords } = await import('../utils/testSatisfactionAnalysis');
                  console.log('=== Testing Satisfaction Analysis ===');
                  testSatisfactionAnalysis();
                  console.log('\n=== Checking User Reviews ===');
                  if (userReviews && userReviews.length > 0) {
                    checkReviewsForPositiveKeywords(userReviews);
                  } else {
                    console.log('No user reviews available');
                  }
                  console.log('\n=== Checking Competitor Reviews ===');
                  if (competitorReviews && competitorReviews.length > 0) {
                    checkReviewsForPositiveKeywords(competitorReviews);
                  } else {
                    console.log('No competitor reviews available');
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#059669',
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
                <Bug size={16} />
                Test Satisfaction
              </button>
              <button
                onClick={() => {
                  console.log('=== CURRENT SATISFACTION DEBUG ===');
                  console.log('Analysis object:', analysis);
                  console.log('User satisfaction:', analysis?.user?.satisfaction);
                  console.log('Competitor satisfaction:', analysis?.competitor?.satisfaction);
                  console.log('satisfactionComparison array:', satisfactionComparison);
                  console.log('Chart should show data:', satisfactionComparison.length > 0);
                  
                  // Force recalculation
                  const testData = [];
                  if (analysis?.user?.satisfaction) {
                    Object.entries(analysis.user.satisfaction).forEach(([cat, data]) => {
                      testData.push({
                        category: cat,
                        userCount: data.count,
                        competitorCount: analysis.competitor?.satisfaction?.[cat]?.count || 0
                      });
                    });
                  }
                  console.log('Test recalculation:', testData);
                  alert(`Check console for satisfaction debug info. Data points: ${satisfactionComparison.length}`);
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
                <Activity size={16} />
                Debug Chart Data
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <div className="overview-section">
          {/* Key Insights Summary */}
          <div className="insights-summary animated-grid">
            <Card className="insight-card critical animated-card" style={{ animationDelay: '0.1s' }}>
              <div className="card-background-effect" />
              <CardHeader>
                <CardTitle>
                  <div className="icon-wrapper critical">
                    <AlertTriangle size={20} />
                  </div>
                  Critical Gaps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="insight-count animated-number">{analysis.comparison?.gaps?.filter(g => g.severity === 'high').length || 0}</div>
                <p className="insight-description">Areas where competitor significantly outperforms</p>
                <div className="insight-sparkline">
                  <svg viewBox="0 0 100 20">
                    <polyline
                      points="0,10 20,8 40,12 60,6 80,14 100,4"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </CardContent>
            </Card>

            <Card className="insight-card opportunity animated-card" style={{ animationDelay: '0.2s' }}>
              <div className="card-background-effect" />
              <CardHeader>
                <CardTitle>
                  <div className="icon-wrapper opportunity">
                    <Target size={20} />
                  </div>
                  Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="insight-count animated-number">{analysis.comparison?.opportunities?.length || 0}</div>
                <p className="insight-description">Areas where you can gain competitive advantage</p>
                <div className="insight-sparkline">
                  <svg viewBox="0 0 100 20">
                    <polyline
                      points="0,15 20,12 40,8 60,10 80,5 100,2"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </CardContent>
            </Card>

            <Card className="insight-card strength animated-card" style={{ animationDelay: '0.3s' }}>
              <div className="card-background-effect" />
              <CardHeader>
                <CardTitle>
                  <div className="icon-wrapper strength">
                    <Shield size={20} />
                  </div>
                  Your Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="insight-count animated-number">{analysis.comparison?.userStrengths?.length || 0}</div>
                <p className="insight-description">Areas where you excel over competitor</p>
                <div className="insight-sparkline">
                  <svg viewBox="0 0 100 20">
                    <polyline
                      points="0,18 20,15 40,10 60,8 80,6 100,3"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </CardContent>
            </Card>

            <Card className="insight-card common animated-card" style={{ animationDelay: '0.4s' }}>
              <div className="card-background-effect" />
              <CardHeader>
                <CardTitle>
                  <div className="icon-wrapper common">
                    <Users size={20} />
                  </div>
                  Common Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="insight-count animated-number">{analysis.comparison?.commonIssues?.length || 0}</div>
                <p className="insight-description">Issues affecting both apps</p>
                <div className="insight-sparkline">
                  <svg viewBox="0 0 100 20">
                    <polyline
                      points="0,10 20,10 40,10 60,10 80,10 100,10"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pain Points Radar Chart */}
          <Card className="analysis-card animated-card" style={{ animationDelay: '0.5s' }}>
            <CardHeader>
              <CardTitle>
                <Bug size={20} />
                Pain Points Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={painPointsRadarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: '#64748b' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 'auto']} tick={{ fill: '#64748b' }} />
                  <Radar
                    name={userAppName}
                    dataKey={userAppName}
                    stroke={COLORS.user}
                    fill={COLORS.user}
                    fillOpacity={0.6}
                    strokeWidth={2}
                  />
                  <Radar
                    name={competitorAppName}
                    dataKey={competitorAppName}
                    stroke={COLORS.competitor}
                    fill={COLORS.competitor}
                    fillOpacity={0.6}
                    strokeWidth={2}
                  />
                  <Legend />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Satisfaction Areas */}
          <Card className="analysis-card animated-card" style={{ animationDelay: '0.6s' }}>
            <CardHeader>
              <CardTitle>
                <HeartHandshake size={20} />
                User Satisfaction Areas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Debug info */}
              {satisfactionComparison.length === 0 && (
                <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                  <p style={{ color: '#92400e', fontWeight: '500' }}>
                    🔍 No satisfaction data found. Check console for debugging information.
                  </p>
                  <p style={{ color: '#92400e', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    Data points: {satisfactionComparison.length} | 
                    User reviews: {analysis?.user?.totalReviews || 0} | 
                    Competitor reviews: {analysis?.competitor?.totalReviews || 0}
                  </p>
                  <p style={{ color: '#92400e', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    Analysis type: {analysis?.user?.aiInsights ? 'AI-powered' : 'Pattern-based'}
                  </p>
                  <p style={{ color: '#92400e', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    User satisfaction exists: {analysis?.user?.satisfaction ? 'Yes' : 'No'} | 
                    Competitor satisfaction exists: {analysis?.competitor?.satisfaction ? 'Yes' : 'No'}
                  </p>
                </div>
              )}
              {/* Show data summary even when chart has data */}
              {satisfactionComparison.length > 0 && (
                <div style={{ padding: '0.5rem', background: '#f0f9ff', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  <p style={{ color: '#075985' }}>
                    ✅ Showing {satisfactionComparison.length} satisfaction categories
                  </p>
                </div>
              )}
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={satisfactionComparison}>
                  <defs>
                    <linearGradient id="userBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.user} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={COLORS.user} stopOpacity={0.6}/>
                    </linearGradient>
                    <linearGradient id="competitorBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.competitor} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={COLORS.competitor} stopOpacity={0.6}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="category" tick={{ fill: '#64748b' }} />
                  <YAxis tick={{ fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey={userAppName} fill="url(#userBarGradient)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey={competitorAppName} fill="url(#competitorBarGradient)" radius={[8, 8, 0, 0]} />
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

          {/* Competitive Insights Visualizations */}
          <CompetitiveInsightsVisualizer
            analysis={analysis}
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