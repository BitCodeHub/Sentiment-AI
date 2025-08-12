import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  Users,
  Zap,
  Target,
  BarChart3,
  Star,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Loader,
  Trophy,
  XCircle
} from 'lucide-react';
import { performDeepAnalysis, generateCompetitorInsights } from '../services/deepAnalysis';
import './DeepAnalysisView.css';

const DeepAnalysisView = ({ reviews, aggregatedData, loading, analysis, onAnalysisComplete }) => {
  const [expandedSections, setExpandedSections] = useState({
    executive: true,
    competitive: true,
    complaints: true,
    technical: false,
    ux: false,
    features: false,
    trends: false,
    recommendations: true,
    business: false
  });

  const [competitorData] = useState(generateCompetitorInsights());

  useEffect(() => {
    if (analysis) {
      onAnalysisComplete?.(analysis);
    }
  }, [analysis, onAnalysisComplete]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (loading) {
    return (
      <div className="deep-analysis-container">
        <div className="analysis-loading">
          <Brain className="loading-brain" size={48} />
          <h2>Performing Deep Analysis</h2>
          <p>Analyzing customer feedback patterns and comparing with industry competitors...</p>
          <div className="loading-progress">
            <div className="progress-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getEffortColor = (effort) => {
    switch (effort?.toLowerCase()) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <div className="deep-analysis-container">
      <div className="analysis-header">
        <Brain size={32} className="header-icon" />
        <h1>Deep Customer Insights & Competitive Analysis</h1>
      </div>

      {/* Executive Summary */}
      <div className="analysis-section">
        <div 
          className="section-header"
          onClick={() => toggleSection('executive')}
        >
          <div className="header-left">
            <Target size={24} />
            <h2>Executive Summary</h2>
          </div>
          {expandedSections.executive ? <ChevronUp /> : <ChevronDown />}
        </div>
        
        {expandedSections.executive && analysis.executiveSummary && (
          <div className="section-content">
            <div className="overview-box">
              <p>{analysis.executiveSummary.overview}</p>
            </div>
            
            <div className="summary-grid">
              <div className="summary-card">
                <h3>Key Findings</h3>
                <ul>
                  {analysis.executiveSummary.keyFindings?.map((finding, idx) => (
                    <li key={idx}>
                      <CheckCircle size={16} className="list-icon positive" />
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="summary-card urgent">
                <h3>Urgent Actions Required</h3>
                <ul>
                  {analysis.executiveSummary.urgentActions?.map((action, idx) => (
                    <li key={idx}>
                      <AlertCircle size={16} className="list-icon negative" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Competitive Analysis */}
      <div className="analysis-section">
        <div 
          className="section-header"
          onClick={() => toggleSection('competitive')}
        >
          <div className="header-left">
            <Trophy size={24} />
            <h2>Competitive Analysis</h2>
          </div>
          {expandedSections.competitive ? <ChevronUp /> : <ChevronDown />}
        </div>
        
        {expandedSections.competitive && analysis.competitiveAnalysis && (
          <div className="section-content">
            <div className="market-position">
              <h3>Market Position</h3>
              <p>{analysis.competitiveAnalysis.marketPosition}</p>
            </div>

            <div className="competitor-grid">
              {Object.entries(competitorData).map(([brand, data]) => (
                <div key={brand} className="competitor-card">
                  <div className="competitor-header">
                    <h4>{brand}</h4>
                    <div className="rating">
                      <Star size={16} fill="#fbbf24" />
                      <span>{data.appRating}</span>
                    </div>
                  </div>
                  <div className="strengths">
                    <h5>Strengths:</h5>
                    <ul>
                      {(analysis.competitiveAnalysis.competitorStrengths?.[brand] || data.strengths.slice(0, 3)).map((strength, idx) => (
                        <li key={idx}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            <div className="competitive-insights">
              <div className="insight-card gaps">
                <h3>
                  <XCircle size={20} />
                  Competitive Gaps
                </h3>
                <ul>
                  {analysis.competitiveAnalysis.competitiveGaps?.map((gap, idx) => (
                    <li key={idx}>{gap}</li>
                  ))}
                </ul>
              </div>
              
              <div className="insight-card advantages">
                <h3>
                  <CheckCircle size={20} />
                  Our Competitive Advantages
                </h3>
                <ul>
                  {analysis.competitiveAnalysis.competitiveAdvantages?.map((advantage, idx) => (
                    <li key={idx}>{advantage}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customer Complaints Analysis */}
      <div className="analysis-section">
        <div 
          className="section-header"
          onClick={() => toggleSection('complaints')}
        >
          <div className="header-left">
            <AlertTriangle size={24} />
            <h2>Top Customer Complaints</h2>
          </div>
          {expandedSections.complaints ? <ChevronUp /> : <ChevronDown />}
        </div>
        
        {expandedSections.complaints && analysis.customerComplaints && (
          <div className="section-content">
            <div className="complaints-grid">
              {analysis.customerComplaints.topIssues?.map((issue, idx) => (
                <div key={idx} className="complaint-card">
                  <div className="complaint-header">
                    <h3>{issue.issue}</h3>
                    <div className="metrics">
                      <span className="frequency">{issue.frequency}</span>
                      <span 
                        className="severity"
                        style={{ backgroundColor: getSeverityColor(issue.severity) }}
                      >
                        {issue.severity} severity
                      </span>
                    </div>
                  </div>
                  
                  <div className="complaint-details">
                    <div className="customer-quotes">
                      <h4>Customer Feedback:</h4>
                      {issue.customerQuotes?.map((quote, qIdx) => (
                        <blockquote key={qIdx}>"{quote}"</blockquote>
                      ))}
                    </div>
                    
                    <div className="impact-resolution">
                      <div className="impact">
                        <h4>Business Impact:</h4>
                        <p>{issue.impact}</p>
                      </div>
                      
                      <div className="resolution">
                        <h4>Resolution Strategy:</h4>
                        <p>{issue.resolution}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {analysis.customerComplaints.emergingIssues && (
              <div className="emerging-issues">
                <h3>Emerging Issues to Monitor</h3>
                <ul>
                  {analysis.customerComplaints.emergingIssues.map((issue, idx) => (
                    <li key={idx}>
                      <AlertCircle size={16} className="warning" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="analysis-section">
        <div 
          className="section-header"
          onClick={() => toggleSection('recommendations')}
        >
          <div className="header-left">
            <Zap size={24} />
            <h2>Strategic Recommendations</h2>
          </div>
          {expandedSections.recommendations ? <ChevronUp /> : <ChevronDown />}
        </div>
        
        {expandedSections.recommendations && analysis.recommendations && (
          <div className="section-content">
            <div className="recommendations-timeline">
              {/* Immediate Actions */}
              <div className="timeline-section immediate">
                <h3>Immediate Actions (0-4 weeks)</h3>
                <div className="recommendation-cards">
                  {analysis.recommendations.immediate?.map((rec, idx) => (
                    <div key={idx} className="recommendation-card">
                      <div className="rec-header">
                        <ArrowRight size={20} />
                        <h4>{rec.action}</h4>
                      </div>
                      <div className="rec-details">
                        <div className="impact">
                          <strong>Impact:</strong> {rec.impact}
                        </div>
                        <div className="effort-timeline">
                          <span 
                            className="effort"
                            style={{ color: getEffortColor(rec.effort) }}
                          >
                            {rec.effort} effort
                          </span>
                          <span className="timeline">{rec.timeline}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Wins */}
              {analysis.recommendations.quickWins && (
                <div className="quick-wins">
                  <h3>
                    <Zap size={20} />
                    Quick Wins
                  </h3>
                  <ul>
                    {analysis.recommendations.quickWins.map((win, idx) => (
                      <li key={idx}>{win}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Short Term */}
              {analysis.recommendations.shortTerm && (
                <div className="timeline-section short-term">
                  <h3>Short Term (1-3 months)</h3>
                  <div className="recommendation-cards">
                    {analysis.recommendations.shortTerm.map((rec, idx) => (
                      <div key={idx} className="recommendation-card">
                        <div className="rec-header">
                          <ArrowRight size={20} />
                          <h4>{rec.action}</h4>
                        </div>
                        <div className="rec-details">
                          <div className="impact">
                            <strong>Impact:</strong> {rec.impact}
                          </div>
                          <div className="effort-timeline">
                            <span 
                              className="effort"
                              style={{ color: getEffortColor(rec.effort) }}
                            >
                              {rec.effort} effort
                            </span>
                            <span className="timeline">{rec.timeline}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Technical Analysis */}
      {analysis.technicalAnalysis && (
        <div className="analysis-section">
          <div 
            className="section-header"
            onClick={() => toggleSection('technical')}
          >
            <div className="header-left">
              <AlertCircle size={24} />
              <h2>Technical Analysis</h2>
            </div>
            {expandedSections.technical ? <ChevronUp /> : <ChevronDown />}
          </div>
          
          {expandedSections.technical && (
            <div className="section-content">
              <div className="technical-grid">
                <div className="performance-issues">
                  <h3>Performance Issues</h3>
                  <div className="issue-cards">
                    <div className="issue-card">
                      <h4>App Crashes</h4>
                      <p>Frequency: {analysis.technicalAnalysis.performanceIssues?.appCrashes?.frequency}</p>
                      <p>Platforms: {analysis.technicalAnalysis.performanceIssues?.appCrashes?.platforms?.join(', ')}</p>
                    </div>
                    <div className="issue-card">
                      <h4>Slow Loading</h4>
                      <p>Frequency: {analysis.technicalAnalysis.performanceIssues?.slowLoading?.frequency}</p>
                    </div>
                    <div className="issue-card">
                      <h4>Connectivity</h4>
                      <p>Frequency: {analysis.technicalAnalysis.performanceIssues?.connectivityProblems?.frequency}</p>
                    </div>
                  </div>
                </div>

                {analysis.technicalAnalysis.platformSpecificIssues && (
                  <div className="platform-issues">
                    <h3>Platform-Specific Issues</h3>
                    <div className="platform-grid">
                      <div className="platform-card ios">
                        <h4>iOS</h4>
                        <ul>
                          {analysis.technicalAnalysis.platformSpecificIssues.iOS?.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="platform-card android">
                        <h4>Android</h4>
                        <ul>
                          {analysis.technicalAnalysis.platformSpecificIssues.Android?.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Business Impact */}
      {analysis.businessImpact && (
        <div className="analysis-section">
          <div 
            className="section-header"
            onClick={() => toggleSection('business')}
          >
            <div className="header-left">
              <BarChart3 size={24} />
              <h2>Business Impact</h2>
            </div>
            {expandedSections.business ? <ChevronUp /> : <ChevronDown />}
          </div>
          
          {expandedSections.business && (
            <div className="section-content">
              <div className="impact-grid">
                <div className="impact-card">
                  <h3>Revenue Impact</h3>
                  <p>{analysis.businessImpact.revenueImpact}</p>
                </div>
                <div className="impact-card">
                  <h3>Customer Retention</h3>
                  <p>{analysis.businessImpact.customerRetention}</p>
                </div>
                <div className="impact-card">
                  <h3>Brand Reputation</h3>
                  <p>{analysis.businessImpact.brandReputation}</p>
                </div>
                <div className="impact-card">
                  <h3>Support Costs</h3>
                  <p>{analysis.businessImpact.supportCosts}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DeepAnalysisView;