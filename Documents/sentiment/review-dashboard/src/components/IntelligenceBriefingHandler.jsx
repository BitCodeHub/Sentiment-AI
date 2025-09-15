import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, Send, Calendar, TrendingUp, AlertCircle, 
  BarChart3, Clock, Globe, Sparkles, ChevronRight,
  FileText, Shield, Users, Zap, Target, ArrowUp,
  ArrowDown, Minus
} from 'lucide-react';
import { generateIntelligenceBriefing, generateQuickBriefing } from '../services/geminiIntelligenceBriefing';
import './IntelligenceBriefingHandler.css';

const IntelligenceBriefingHandler = ({ reviews, dateRange, onRequestBriefing }) => {
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentBriefing, setCurrentBriefing] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded to be visible
  const messagesEndRef = useRef(null);
  
  // Debug logging
  useEffect(() => {
    console.log('[IntelligenceBriefingHandler] Component mounted/updated', {
      reviewsCount: reviews?.length || 0,
      dateRange,
      isExpanded
    });
  }, [reviews, dateRange, isExpanded]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const sampleRequests = [
    { text: "Give me this week's intelligence briefing", icon: Calendar, color: '#3b82f6' },
    { text: "Show me last week's executive analysis", icon: TrendingUp, color: '#10b981' },
    { text: "Generate today's intelligence briefing", icon: Brain, color: '#8b5cf6' },
    { text: "Create this month's executive summary", icon: FileText, color: '#f59e0b' },
    { text: "Show me the last 7 days intelligence briefing", icon: Clock, color: '#ef4444' }
  ];
  
  const formatBriefingSection = (briefing) => {
    if (!briefing) return null;
    
    return (
      <div className="briefing-content">
        {/* Headline */}
        <div className="briefing-headline">
          <Sparkles className="headline-icon" />
          <h3>{briefing.headline}</h3>
        </div>
        
        {/* Key Findings */}
        {briefing.keyFindings && briefing.keyFindings.length > 0 && (
          <div className="briefing-section">
            <h4><Target size={16} /> Key Findings</h4>
            <div className="findings-grid">
              {briefing.keyFindings.map((finding, idx) => (
                <div key={idx} className={`finding-card priority-${finding.priority}`}>
                  <div className="finding-header">
                    <span className="finding-priority">{finding.priority}</span>
                  </div>
                  <h5>{finding.finding}</h5>
                  <p className="finding-impact">{finding.impact}</p>
                  <p className="finding-evidence">{finding.evidence}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Critical Alerts */}
        {briefing.criticalAlerts && briefing.criticalAlerts.length > 0 && (
          <div className="briefing-section alerts-section">
            <h4><AlertCircle size={16} /> Critical Alerts</h4>
            {briefing.criticalAlerts.map((alert, idx) => (
              <div key={idx} className={`alert-card severity-${alert.severity}`}>
                <div className="alert-header">
                  <Shield size={18} />
                  <span className="alert-severity">{alert.severity}</span>
                </div>
                <h5>{alert.alert}</h5>
                <p>Affected Users: {alert.affectedUsers}</p>
                <div className="alert-recommendation">
                  <strong>Action Required:</strong> {alert.recommendation}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Trend Analysis */}
        {briefing.trendAnalysis && (
          <div className="briefing-section">
            <h4><TrendingUp size={16} /> Trend Analysis</h4>
            <div className="trend-overview">
              <div className={`trend-indicator ${briefing.trendAnalysis.overallTrend}`}>
                {briefing.trendAnalysis.overallTrend === 'improving' && <ArrowUp />}
                {briefing.trendAnalysis.overallTrend === 'declining' && <ArrowDown />}
                {briefing.trendAnalysis.overallTrend === 'stable' && <Minus />}
                <span>{briefing.trendAnalysis.overallTrend}</span>
              </div>
              <p>{briefing.trendAnalysis.sentimentShift}</p>
            </div>
            
            <div className="trend-details">
              {briefing.trendAnalysis.emergingIssues && briefing.trendAnalysis.emergingIssues.length > 0 && (
                <div className="trend-list">
                  <h5>Emerging Issues</h5>
                  <ul>
                    {briefing.trendAnalysis.emergingIssues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {briefing.trendAnalysis.improvingAreas && briefing.trendAnalysis.improvingAreas.length > 0 && (
                <div className="trend-list">
                  <h5>Improving Areas</h5>
                  <ul>
                    {briefing.trendAnalysis.improvingAreas.map((area, idx) => (
                      <li key={idx}>{area}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Customer Voice */}
        {briefing.customerVoice && (
          <div className="briefing-section">
            <h4><Users size={16} /> Customer Voice</h4>
            <div className="voice-grid">
              {briefing.customerVoice.topPraises && briefing.customerVoice.topPraises.length > 0 && (
                <div className="voice-card positive">
                  <h5>What They Love</h5>
                  <ul>
                    {briefing.customerVoice.topPraises.map((praise, idx) => (
                      <li key={idx}>{praise}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {briefing.customerVoice.topComplaints && briefing.customerVoice.topComplaints.length > 0 && (
                <div className="voice-card negative">
                  <h5>Main Frustrations</h5>
                  <ul>
                    {briefing.customerVoice.topComplaints.map((complaint, idx) => (
                      <li key={idx}>{complaint}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="emotional-tone">
              <strong>Overall Mood:</strong> {briefing.customerVoice.emotionalTone}
            </div>
          </div>
        )}
        
        {/* Actionable Insights */}
        {briefing.actionableInsights && briefing.actionableInsights.length > 0 && (
          <div className="briefing-section">
            <h4><Zap size={16} /> Actionable Insights</h4>
            <div className="insights-timeline">
              {briefing.actionableInsights.map((insight, idx) => (
                <div key={idx} className={`insight-card timeline-${insight.timeline}`}>
                  <div className="insight-header">
                    <span className="timeline-badge">{insight.timeline}</span>
                  </div>
                  <h5>{insight.insight}</h5>
                  <p className="insight-action"><strong>Action:</strong> {insight.action}</p>
                  <p className="insight-outcome"><strong>Expected Outcome:</strong> {insight.expectedOutcome}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Executive Summary */}
        {briefing.executiveSummary && (
          <div className="briefing-section executive-summary">
            <h4><FileText size={16} /> Executive Summary</h4>
            <div className="summary-content">
              <p>{briefing.executiveSummary}</p>
            </div>
          </div>
        )}
        
        {/* Metadata */}
        {briefing.metadata && (
          <div className="briefing-metadata">
            <span>Generated at {new Date(briefing.metadata.generatedAt).toLocaleString()}</span>
            <span>Based on {briefing.metadata.reviewCount} reviews</span>
          </div>
        )}
      </div>
    );
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isProcessing) return;
    
    const request = userInput.trim();
    setUserInput('');
    
    // Add user message
    setMessages(prev => [...prev, { type: 'user', text: request }]);
    setIsProcessing(true);
    
    try {
      // First try to handle it with the date range parsing
      if (window.handleIntelligenceBriefingRequest) {
        const handled = await window.handleIntelligenceBriefingRequest(request);
        
        if (handled) {
          setMessages(prev => [...prev, { 
            type: 'system', 
            text: 'Setting up the date range for your briefing...' 
          }]);
          
          // Wait a bit for the date range to be set
          setTimeout(async () => {
            await generateBriefing(request);
          }, 1000);
        } else {
          // Generate briefing with current data
          await generateBriefing(request);
        }
      } else {
        // Generate briefing with current data
        await generateBriefing(request);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        type: 'error', 
        text: `Error: ${error.message}` 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const generateBriefing = async (request) => {
    try {
      if (!reviews || reviews.length === 0) {
        setMessages(prev => [...prev, { 
          type: 'system', 
          text: 'No review data available. Please import or fetch reviews first.' 
        }]);
        return;
      }
      
      setMessages(prev => [...prev, { 
        type: 'system', 
        text: 'Analyzing data and generating intelligence briefing...' 
      }]);
      
      // Generate the briefing using Gemini
      const briefing = await generateIntelligenceBriefing(reviews, dateRange, request);
      
      // Add the formatted briefing as a message
      setCurrentBriefing(briefing);
      setMessages(prev => [...prev, { 
        type: 'briefing', 
        content: briefing 
      }]);
      
    } catch (error) {
      console.error('Error generating briefing:', error);
      setMessages(prev => [...prev, { 
        type: 'error', 
        text: error.message || 'Failed to generate briefing. Please try again.' 
      }]);
    }
  };
  
  const handleSampleClick = async (sample) => {
    setUserInput(sample.text);
    // Auto-submit for better UX
    const fakeEvent = { preventDefault: () => {} };
    setUserInput('');
    setMessages(prev => [...prev, { type: 'user', text: sample.text }]);
    setIsProcessing(true);
    
    try {
      if (window.handleIntelligenceBriefingRequest) {
        const handled = await window.handleIntelligenceBriefingRequest(sample.text);
        
        if (handled) {
          setMessages(prev => [...prev, { 
            type: 'system', 
            text: 'Setting up the date range for your briefing...' 
          }]);
          
          setTimeout(async () => {
            await generateBriefing(sample.text);
          }, 1000);
        } else {
          await generateBriefing(sample.text);
        }
      } else {
        await generateBriefing(sample.text);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        type: 'error', 
        text: `Error: ${error.message}` 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };
  
  console.log('[IntelligenceBriefingHandler] Rendering component', { isExpanded, messagesCount: messages.length });
  
  return (
    <div className={`intelligence-briefing-handler ${isExpanded ? 'expanded' : ''}`}>
      <div className="briefing-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="header-left">
          <Brain className="header-icon" />
          <h3>Intelligence Briefing Assistant</h3>
        </div>
        <ChevronRight className={`expand-icon ${isExpanded ? 'expanded' : ''}`} />
      </div>
      
      {isExpanded && (
        <>
          <div className="sample-requests">
            <p>Quick briefings:</p>
            <div className="sample-chips">
              {sampleRequests.map((sample, index) => {
                const Icon = sample.icon;
                return (
                  <button 
                    key={index}
                    className="sample-chip"
                    onClick={() => handleSampleClick(sample)}
                    style={{ '--chip-color': sample.color }}
                  >
                    <Icon size={16} />
                    <span>{sample.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="messages-container">
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.type}`}>
                {message.type === 'user' && (
                  <div className="message-content user-message">
                    <Users size={16} />
                    <span>{message.text}</span>
                  </div>
                )}
                {message.type === 'system' && (
                  <div className="message-content system-message">
                    <Brain size={16} className={isProcessing ? 'pulsing' : ''} />
                    <span>{message.text}</span>
                  </div>
                )}
                {message.type === 'error' && (
                  <div className="message-content error-message">
                    <AlertCircle size={16} />
                    <span>{message.text}</span>
                  </div>
                )}
                {message.type === 'briefing' && (
                  <div className="message-content briefing-message">
                    {formatBriefingSection(message.content)}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleSubmit} className="input-form">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Ask for an intelligence briefing..."
              disabled={isProcessing}
              className="briefing-input"
            />
            <button 
              type="submit" 
              disabled={isProcessing || !userInput.trim()}
              className="submit-button"
            >
              <Send size={18} />
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default IntelligenceBriefingHandler;