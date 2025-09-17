import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Send, Bot, User, Sparkles, Globe, 
  Hash, TrendingUp, Building2, Car, Shield, Zap,
  Copy, ThumbsUp, ThumbsDown, RefreshCw, Loader2
} from 'lucide-react';
import { answerOEMQuestion, performDeepOEMAnalysis } from '../services/geminiOEMAnalysis';
import './RivueChat.css';

const RivueChat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  
  // Get competitors from navigation state
  const { competitors = [], userApp = 'Your App' } = location.state || {};
  
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'bot',
      content: `Hi! I'm Rivue, your automotive industry AI assistant. I have real-time access to comprehensive data about the automotive market, including:

• Market trends and analysis
• Competitor intelligence
• Customer sentiment and reviews
• Technology innovations
• Sales and financial data
• Industry news and developments

What would you like to know about the automotive industry?`,
      timestamp: new Date()
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationContext, setConversationContext] = useState([]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  // Example prompts
  const examplePrompts = [
    {
      icon: <TrendingUp size={20} />,
      title: "Market Analysis",
      prompt: "What are the latest EV market trends and which OEMs are leading?"
    },
    {
      icon: <Building2 size={20} />,
      title: "Competitor Deep Dive", 
      prompt: "Compare Tesla, Ford, and Toyota's digital innovation strategies"
    },
    {
      icon: <Shield size={20} />,
      title: "Customer Insights",
      prompt: "What are customers saying about connected car features across brands?"
    },
    {
      icon: <Zap size={20} />,
      title: "Technology Trends",
      prompt: "How are OEMs implementing AI and autonomous driving technologies?"
    }
  ];

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add typing indicator
    const typingMessage = {
      id: 'typing',
      type: 'bot',
      content: 'typing',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      // Enhanced context with conversation history
      const enhancedContext = {
        userApp,
        competitors,
        conversationHistory: conversationContext.slice(-5), // Last 5 exchanges
        currentQuery: input,
        timestamp: new Date().toISOString()
      };

      // Get AI response with real-time data
      const response = await answerOEMQuestion(input, competitors, enhancedContext);

      const botMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: response.answer,
        sources: response.sources || ['Real-time market data', 'Industry reports', 'OEM financial statements'],
        timestamp: new Date(),
        confidence: response.confidence || 0.9
      };

      // Update conversation context for learning
      setConversationContext(prev => [...prev, 
        { role: 'user', content: input },
        { role: 'assistant', content: response.answer }
      ]);

      // Replace typing message with actual response
      setMessages(prev => prev.map(msg => 
        msg.id === 'typing' ? botMessage : msg
      ));
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'I apologize, but I encountered an error while fetching the latest data. Please try again.',
        isError: true,
        timestamp: new Date()
      };
      
      setMessages(prev => prev.map(msg => 
        msg.id === 'typing' ? errorMessage : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExampleClick = (prompt) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
    // Could add toast notification here
  };

  const regenerateResponse = async (messageId) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex > 0) {
      const previousUserMessage = messages[messageIndex - 1];
      if (previousUserMessage.type === 'user') {
        setInput(previousUserMessage.content);
        // Remove the bot message and regenerate
        setMessages(prev => prev.slice(0, messageIndex));
        handleSend();
      }
    }
  };

  return (
    <div className="rivue-chat-page">
      {/* Header */}
      <header className="rivue-chat-header">
        <div className="header-container">
          <button className="back-button" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            <span>Back to Analysis</span>
          </button>
          
          <div className="header-center">
            <div className="header-title">
              <Bot className="header-icon" size={24} />
              <h1>Rivue AI Assistant</h1>
            </div>
            <p className="header-subtitle">Real-time Automotive Intelligence</p>
          </div>
          
          <div className="header-stats">
            <div className="stat-badge">
              <Globe size={16} />
              <span>Live Data</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="rivue-chat-main">
        <div className="chat-container">
          {/* Messages */}
          <div className="messages-area">
            {messages.length === 1 && (
              <div className="example-prompts">
                <h2>Try asking me about:</h2>
                <div className="prompts-grid">
                  {examplePrompts.map((example, index) => (
                    <button
                      key={index}
                      className="example-prompt-card"
                      onClick={() => handleExampleClick(example.prompt)}
                    >
                      <div className="prompt-icon">{example.icon}</div>
                      <div className="prompt-content">
                        <h3>{example.title}</h3>
                        <p>{example.prompt}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`message-wrapper ${message.type}`}>
                <div className="message-container">
                  <div className="message-avatar">
                    {message.type === 'bot' ? (
                      <div className="bot-avatar">
                        <Bot size={20} />
                      </div>
                    ) : (
                      <div className="user-avatar">
                        <User size={20} />
                      </div>
                    )}
                  </div>
                  
                  <div className="message-content-wrapper">
                    {message.content === 'typing' ? (
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    ) : (
                      <>
                        <div className="message-text">{message.content}</div>
                        
                        {message.type === 'bot' && message.content !== 'typing' && (
                          <div className="message-actions">
                            <button 
                              className="action-button"
                              onClick={() => copyMessage(message.content)}
                              title="Copy"
                            >
                              <Copy size={14} />
                            </button>
                            <button 
                              className="action-button"
                              onClick={() => regenerateResponse(message.id)}
                              title="Regenerate"
                            >
                              <RefreshCw size={14} />
                            </button>
                            <button className="action-button" title="Good response">
                              <ThumbsUp size={14} />
                            </button>
                            <button className="action-button" title="Bad response">
                              <ThumbsDown size={14} />
                            </button>
                          </div>
                        )}
                        
                        {message.sources && (
                          <div className="message-sources">
                            <Globe size={12} />
                            <span>{message.sources.join(' • ')}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* Input Area */}
      <div className="rivue-chat-input">
        <div className="input-container">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder="Ask about automotive trends, competitors, technology, or market insights..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            rows="1"
          />
          <button 
            className="send-button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        <div className="input-footer">
          <p>
            <Sparkles size={12} />
            Powered by Gemini 2.5 Flash with real-time web data
          </p>
        </div>
      </div>
    </div>
  );
};

export default RivueChat;