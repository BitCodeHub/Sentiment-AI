import React from 'react';
import { 
  Brain, 
  AlertTriangle, 
  Lightbulb, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Info,
  Loader
} from 'lucide-react';
import './AIInsights.css';

const AIInsights = ({ analysis, insights, loading }) => {
  if (loading) {
    return (
      <div className="ai-insights-container card">
        <div className="ai-loading">
          <Loader className="spinner" size={32} />
          <p>AI is analyzing your reviews...</p>
        </div>
      </div>
    );
  }

  if (!analysis && !insights) {
    return (
      <div className="ai-insights-container card">
        <div className="ai-loading">
          <AlertCircle className="icon-negative" size={32} />
          <p>No insights available. Please check your OpenAI API key and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-insights-container">
      <div className="ai-insights-header">
        <Brain size={28} />
        <h2>AI-Powered Analysis & Insights</h2>
      </div>

      <div className="insights-grid">
        {/* Pain Points */}
        {analysis?.mainPainPoints && (
          <div className="insight-card card">
            <div className="insight-header">
              <AlertTriangle className="icon-negative" size={20} />
              <h3>Main Pain Points</h3>
            </div>
            <ol className="insight-list">
              {analysis.mainPainPoints.slice(0, 5).map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Feature Requests */}
        {analysis?.featureRequests && (
          <div className="insight-card card">
            <div className="insight-header">
              <Lightbulb className="icon-feature" size={20} />
              <h3>Top Feature Requests</h3>
            </div>
            <ol className="insight-list">
              {analysis.featureRequests.slice(0, 5).map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Technical Issues */}
        {analysis?.technicalIssues && (
          <div className="insight-card card">
            <div className="insight-header">
              <AlertCircle className="icon-bug" size={20} />
              <h3>Technical Issues</h3>
            </div>
            <ul className="insight-list">
              {analysis.technicalIssues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* UI/UX Feedback */}
        {analysis?.uiuxFeedback && (
          <div className="insight-card card">
            <div className="insight-header">
              <Info className="icon-info" size={20} />
              <h3>UI/UX Feedback</h3>
            </div>
            <p className="insight-summary">{analysis.uiuxFeedback}</p>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {analysis?.recommendations && (
        <div className="recommendations-section card">
          <div className="insight-header">
            <TrendingUp className="icon-positive" size={20} />
            <h3>Actionable Recommendations</h3>
          </div>
          <div className="recommendations-grid">
            {analysis.recommendations.map((rec, index) => (
              <div key={index} className="recommendation-item">
                <CheckCircle className="rec-icon" size={16} />
                <p>{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategic Insights */}
      {insights && Object.keys(insights).length > 0 && (
        <div className="strategic-insights card">
          <h3>Strategic Insights</h3>
          
          {insights.executiveSummary && (
            <div className="insight-section">
              <h4>Executive Summary</h4>
              <p>{insights.executiveSummary}</p>
            </div>
          )}
          
          {insights.keyStrengths && insights.keyStrengths.length > 0 && (
            <div className="insight-section">
              <h4 className="positive">Key Strengths</h4>
              <ul>
                {insights.keyStrengths.map((strength, index) => (
                  <li key={index}>{strength}</li>
                ))}
              </ul>
            </div>
          )}

          {insights.criticalIssues && insights.criticalIssues.length > 0 && (
            <div className="insight-section">
              <h4 className="negative">Critical Issues</h4>
              <ul>
                {insights.criticalIssues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {insights.trendAnalysis && (
            <div className="insight-section">
              <h4>Trend Analysis</h4>
              <p>{insights.trendAnalysis}</p>
            </div>
          )}

          {insights.competitivePositioning && (
            <div className="insight-section">
              <h4>Competitive Positioning</h4>
              <p>{insights.competitivePositioning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIInsights;