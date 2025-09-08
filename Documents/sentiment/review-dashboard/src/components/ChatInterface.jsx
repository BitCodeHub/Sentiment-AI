import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, X, Loader, Sparkles, 
  AlertCircle, RotateCcw, ChevronDown, Bot, User
} from 'lucide-react';
import { 
  initializeChatSession, 
  sendChatMessage, 
  getChatHistory,
  clearChatSession,
  generateChatSuggestions 
} from '../services/geminiChatService';
import './ChatInterface.css';

const ChatInterface = ({ isOpen, onClose, reviewData = [] }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize chat session when opened
  useEffect(() => {
    if (isOpen && !sessionId && reviewData.length > 0) {
      initializeChat();
    }
  }, [isOpen, reviewData]);

  // Generate suggestions when session is ready
  useEffect(() => {
    if (sessionId && reviewData.length > 0) {
      setSuggestions(generateChatSuggestions(reviewData));
    }
  }, [sessionId, reviewData]);

  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    setIsInitializing(true);
    setError(null);
    
    try {
      const session = `chat_${Date.now()}`;
      const metadata = {
        appName: reviewData[0]?.appName || reviewData[0]?.['App Name'] || 'Unknown App',
        totalReviews: reviewData.length,
      };
      
      await initializeChatSession(session, reviewData, metadata);
      setSessionId(session);
      
      // Add welcome message
      setMessages([{
        id: 1,
        role: 'assistant',
        content: `Hello! I'm your AI assistant specialized in analyzing customer reviews. I have access to ${reviewData.length} reviews from your app.\n\nI can help you understand:\n• Common themes and patterns\n• Customer pain points\n• Feature requests\n• Technical issues\n• Sentiment trends\n\nWhat would you like to know about your customer feedback?`,
        timestamp: new Date(),
      }]);
    } catch (err) {
      console.error('Failed to initialize chat:', err);
      if (err.message.includes('API key')) {
        setError(
          <div>
            <strong>API Key Required</strong>
            <br />
            Please configure your Gemini API key:
            <br />
            1. Get a free API key from{' '}
            <a 
              href="https://makersuite.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#60a5fa', textDecoration: 'underline' }}
            >
              Google AI Studio
            </a>
            <br />
            2. Create a .env file in your project root
            <br />
            3. Add: VITE_GEMINI_API_KEY=your-key-here
            <br />
            4. Restart your development server
          </div>
        );
      } else {
        setError('Failed to start chat session. Please try again.');
      }
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !sessionId) return;

    const userMessage = {
      id: messages.length + 1,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendChatMessage(sessionId, userMessage.content);
      
      const assistantMessage = {
        id: messages.length + 2,
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setSuggestions([]); // Clear suggestions after first interaction
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err.message || 'Failed to get response. Please try again.');
      
      // Remove the user message if failed
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      setInputMessage(userMessage.content); // Restore input
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

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
    inputRef.current?.focus();
  };

  const handleReset = () => {
    if (sessionId) {
      clearChatSession(sessionId);
    }
    setMessages([]);
    setSessionId(null);
    setError(null);
    setSuggestions([]);
    initializeChat();
  };

  if (!isOpen) return null;

  return (
    <div className="chat-interface-overlay">
      <div className="chat-interface-container">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <div className="chat-header-icon">
              <Sparkles size={20} />
            </div>
            <div className="chat-header-info">
              <h3>Review Insights Assistant</h3>
              <span className="chat-header-subtitle">
                Analyzing {reviewData.length} reviews
              </span>
            </div>
          </div>
          <div className="chat-header-actions">
            <button 
              className="chat-header-btn"
              onClick={handleReset}
              title="Reset conversation"
            >
              <RotateCcw size={16} />
            </button>
            <button 
              className="chat-header-btn"
              onClick={onClose}
              title="Close chat"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="chat-messages">
          {isInitializing && (
            <div className="chat-initializing">
              <Loader className="spin" size={20} />
              <span>Initializing chat assistant...</span>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-message ${message.role}`}
            >
              <div className="message-avatar">
                {message.role === 'user' ? (
                  <User size={16} />
                ) : (
                  <Bot size={16} />
                )}
              </div>
              <div className="message-content">
                <div className="message-bubble">
                  {message.content}
                </div>
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="chat-message assistant">
              <div className="message-avatar">
                <Bot size={16} />
              </div>
              <div className="message-content">
                <div className="message-bubble loading">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && messages.length <= 1 && (
            <div className="chat-suggestions">
              <p className="suggestions-title">Suggested questions:</p>
              <div className="suggestions-grid">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    className="suggestion-chip"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="chat-error">
              <AlertCircle size={16} />
              <div>{error}</div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <textarea
              ref={inputRef}
              className="chat-input"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your customer reviews..."
              rows={1}
              disabled={isLoading || !sessionId}
            />
            <button
              className="chat-send-btn"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading || !sessionId}
            >
              <Send size={18} />
            </button>
          </div>
          <div className="chat-input-hint">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;