import React, { useState } from 'react';
import { MessageSquare, Send, Calendar, Brain } from 'lucide-react';
import './IntelligenceBriefingHandler.css';

const IntelligenceBriefingHandler = ({ onRequestBriefing }) => {
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isProcessing) return;
    
    const request = userInput.trim();
    setUserInput('');
    
    // Add user message
    setMessages(prev => [...prev, { type: 'user', text: request }]);
    
    setIsProcessing(true);
    
    try {
      // Check if window.handleIntelligenceBriefingRequest exists
      if (window.handleIntelligenceBriefingRequest) {
        const handled = await window.handleIntelligenceBriefingRequest(request);
        
        if (handled) {
          setMessages(prev => [...prev, { 
            type: 'system', 
            text: 'Generating your intelligence briefing with the requested time period...' 
          }]);
        } else {
          setMessages(prev => [...prev, { 
            type: 'system', 
            text: 'Please specify a time period for your intelligence briefing (e.g., "this week\'s intelligence briefing")' 
          }]);
        }
      } else {
        setMessages(prev => [...prev, { 
          type: 'system', 
          text: 'Intelligence briefing system is not available. Please ensure the dashboard is loaded.' 
        }]);
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
  
  const sampleRequests = [
    "Give me this week's intelligence briefing",
    "Show me last week's executive analysis",
    "Generate today's intelligence briefing",
    "Create this month's executive summary",
    "Show me the last 7 days intelligence briefing"
  ];
  
  return (
    <div className="intelligence-briefing-handler">
      <div className="briefing-header">
        <Brain size={24} />
        <h3>Intelligence Briefing Assistant</h3>
      </div>
      
      <div className="sample-requests">
        <p>Try these sample requests:</p>
        <div className="sample-chips">
          {sampleRequests.map((sample, index) => (
            <button 
              key={index}
              className="sample-chip"
              onClick={() => setUserInput(sample)}
            >
              {sample}
            </button>
          ))}
        </div>
      </div>
      
      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.type}`}>
            {message.type === 'user' && <MessageSquare size={16} />}
            {message.type === 'system' && <Brain size={16} />}
            <span>{message.text}</span>
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Ask for an intelligence briefing (e.g., 'Give me this week's intelligence briefing')"
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
    </div>
  );
};

export default IntelligenceBriefingHandler;