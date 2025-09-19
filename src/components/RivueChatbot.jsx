import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Loader, Bot, User, Globe, Sparkles } from 'lucide-react';
import { answerOEMQuestion } from '../services/geminiOEMAnalysis';
import './RivueChatbot.css';

const RivueChatbot = ({ competitors, userApp, analysisType, isOpen, onClose, context = 'competitive' }) => {
  const getInitialMessage = () => {
    if (context === 'competitive' && competitors?.length > 0) {
      return `👋 Hi! I'm Rivue, your AI automotive industry assistant. I can help you understand competitive insights about ${competitors.map(c => c.name).join(', ')}. What would you like to know?`;
    } else if (context === 'dashboard') {
      return `👋 Hi! I'm Rivue, your AI assistant. I can help you analyze reviews, understand sentiment patterns, and provide insights about your app performance. What would you like to know?`;
    } else {
      return `👋 Hi! I'm Rivue, your AI assistant. How can I help you today?`;
    }
  };

  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: getInitialMessage(),
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const getSuggestedQuestions = () => {
    if (context === 'competitive' && competitors?.length > 0) {
      return [
        `How does ${userApp} compare to ${competitors[0]?.name} in electric vehicle technology?`,
        `What are the main customer complaints about ${competitors[0]?.name}?`,
        `Which OEM has the best customer satisfaction scores?`,
        `What are the market share trends for these automotive brands?`
      ];
    } else if (context === 'dashboard') {
      return [
        `What are the main themes in negative reviews?`,
        `Show me sentiment trends for the last month`,
        `What features are users requesting most?`,
        `How has our rating changed over time?`
      ];
    } else {
      return [
        `What insights can you provide?`,
        `Help me understand the data`,
        `What are the key trends?`,
        `Provide analysis recommendations`
      ];
    }
  };

  const suggestedQuestions = getSuggestedQuestions();

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Add loading message
    const loadingMessage = {
      id: messages.length + 2,
      type: 'bot',
      content: 'loading',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      let response;
      
      if (context === 'competitive' && competitors?.length > 0) {
        response = await answerOEMQuestion(inputValue, competitors, {
          userApp,
          analysisType
        });
      } else {
        // For dashboard context, use a general AI response
        // In a real implementation, this would call a dashboard-specific AI service
        response = {
          answer: `I understand you're asking about: "${inputValue}". In the dashboard context, I would analyze your app's review data, sentiment patterns, and user feedback to provide insights. This feature is currently being implemented.`,
          sources: ['App Reviews', 'Sentiment Analysis', 'User Feedback']
        };
      }

      const botMessage = {
        id: messages.length + 2,
        type: 'bot',
        content: response.answer,
        sources: response.sources,
        timestamp: new Date()
      };

      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id ? botMessage : msg
      ));
    } catch (error) {
      console.error('Error getting response:', error);
      const errorMessage = {
        id: messages.length + 2,
        type: 'bot',
        content: 'Sorry, I encountered an error. Please try asking your question again.',
        isError: true,
        timestamp: new Date()
      };

      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id ? errorMessage : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (question) => {
    setInputValue(question);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="chatbot-backdrop" onClick={onClose} />
    <div className="rivue-chatbot-container">
      <div className="chatbot-header">
        <div className="header-left">
          <div className="chatbot-icon">
            <Bot size={24} />
          </div>
          <div className="header-info">
            <h3>Rivue AI Assistant</h3>
            <p>Automotive Industry Expert</p>
          </div>
        </div>
        <button className="close-button" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="chatbot-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-avatar">
              {message.type === 'bot' ? <Bot size={20} /> : <User size={20} />}
            </div>
            <div className="message-content">
              {message.content === 'loading' ? (
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : (
                <>
                  <div className="message-text">{message.content}</div>
                  {message.sources && (
                    <div className="message-sources">
                      <Globe size={12} />
                      <span>Sources: {message.sources.join(', ')}</span>
                    </div>
                  )}
                </>
              )}
              <div className="message-time">
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="suggested-questions">
          <p className="suggestions-title">
            <Sparkles size={14} />
            Suggested questions
          </p>
          <div className="suggestions-grid">
            {suggestedQuestions.slice(0, 4).map((question, index) => (
              <button
                key={index}
                className="suggestion-chip"
                onClick={() => handleSuggestionClick(question)}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chatbot-input-container">
        <input
          ref={inputRef}
          type="text"
          className="chatbot-input"
          placeholder={context === 'competitive' ? "Ask about competitor insights, market trends..." : "Ask about reviews, sentiment, app performance..."}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
        />
        <button 
          className="send-button" 
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading}
        >
          <Send size={20} />
        </button>
      </div>

      <div className="chatbot-footer">
        <p>
          <Globe size={12} />
          {context === 'competitive' ? 'Powered by real-time web data and industry reports' : 'Powered by AI analysis of your app data'}
        </p>
      </div>
    </div>
    </>
  );
};

export default RivueChatbot;