import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Send, X, Loader, Sparkles, 
  AlertCircle, RotateCcw, ChevronDown, Bot, User,
  Mic, MicOff, Menu, ArrowLeft, Plus, Trash2,
  Settings, History
} from 'lucide-react';
import { 
  initializeChatSession, 
  sendChatMessage, 
  clearChatSession,
  generateChatSuggestions 
} from '../services/geminiChatService';
import './ChatPage.css';

const ChatPage = ({ reviewData = [] }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const navigate = useNavigate();

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        setInputMessage(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setError('Voice recognition error. Please try again.');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Initialize chat session when component mounts
  useEffect(() => {
    if (reviewData.length > 0 && !sessionId) {
      initializeChat();
    }
  }, [reviewData]);

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

  // Focus input when component mounts
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

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

      // Save conversation
      const newConvo = {
        id: session,
        title: 'New conversation',
        timestamp: new Date(),
        lastMessage: 'Welcome message',
      };
      setConversations([newConvo, ...conversations]);
      setActiveConversation(session);
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

      // Update conversation title if it's the first real message
      if (messages.length === 1) {
        const updatedConvos = conversations.map(conv => 
          conv.id === sessionId 
            ? { ...conv, title: userMessage.content.substring(0, 50) + '...', lastMessage: assistantMessage.content.substring(0, 50) + '...' }
            : conv
        );
        setConversations(updatedConvos);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      
      // Handle rate limit errors gracefully
      if (err.message?.includes('Rate limit') || err.message?.includes('quota')) {
        setError(
          <div>
            <strong>Rate Limit Reached</strong>
            <br />
            Too many requests. Please wait a moment and try again.
            <br />
            <small>Free tier allows 60 requests per minute</small>
          </div>
        );
      } else {
        setError(err.message || 'Failed to get response. Please try again.');
      }
      
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

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      setError('Voice input is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setError(null);
    }
  };

  const handleNewConversation = () => {
    if (sessionId) {
      clearChatSession(sessionId);
    }
    setMessages([]);
    setSessionId(null);
    setError(null);
    setSuggestions([]);
    initializeChat();
  };

  const handleDeleteConversation = (convId) => {
    if (convId === sessionId) {
      handleNewConversation();
    }
    setConversations(conversations.filter(c => c.id !== convId));
  };

  return (
    <div className="chat-page">
      {/* Sidebar */}
      <div className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button 
            className="back-button"
            onClick={() => navigate('/')}
            title="Back to dashboard"
          >
            <ArrowLeft size={20} />
            <span>Dashboard</span>
          </button>
          <button
            className="new-chat-button"
            onClick={handleNewConversation}
          >
            <Plus size={20} />
            <span>New chat</span>
          </button>
        </div>

        <div className="conversations-list">
          <div className="conversations-header">
            <History size={16} />
            <span>Recent conversations</span>
          </div>
          {conversations.map(conv => (
            <div 
              key={conv.id}
              className={`conversation-item ${conv.id === activeConversation ? 'active' : ''}`}
              onClick={() => {
                // Load conversation logic here
                setActiveConversation(conv.id);
              }}
            >
              <div className="conversation-content">
                <div className="conversation-title">{conv.title}</div>
                <div className="conversation-preview">{conv.lastMessage}</div>
              </div>
              <button
                className="delete-conversation"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteConversation(conv.id);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="review-count">
            <MessageSquare size={16} />
            <span>{reviewData.length} reviews loaded</span>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {/* Header */}
        <div className="chat-page-header">
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={20} />
          </button>
          <div className="chat-page-title">
            <Sparkles size={20} />
            <span>Review Insights Assistant</span>
          </div>
          <button 
            className="reset-button"
            onClick={handleNewConversation}
            title="Reset conversation"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="chat-messages-container">
          {isInitializing && (
            <div className="chat-initializing">
              <Loader className="spin" size={20} />
              <span>Initializing chat assistant...</span>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-message-wrapper ${message.role}`}
            >
              <div className="chat-message-inner">
                <div className="message-avatar">
                  {message.role === 'user' ? (
                    <User size={20} />
                  ) : (
                    <Bot size={20} />
                  )}
                </div>
                <div className="message-content-wrapper">
                  <div className="message-role">
                    {message.role === 'user' ? 'You' : 'Assistant'}
                  </div>
                  <div className="message-content">
                    {message.content}
                  </div>
                  <div className="message-timestamp">
                    {new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="chat-message-wrapper assistant">
              <div className="chat-message-inner">
                <div className="message-avatar">
                  <Bot size={20} />
                </div>
                <div className="message-content-wrapper">
                  <div className="message-role">Assistant</div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && messages.length <= 1 && (
            <div className="chat-suggestions-container">
              <p className="suggestions-title">Try asking:</p>
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
            <div className="chat-error-message">
              <AlertCircle size={16} />
              <div>{error}</div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
          <div className="chat-input-container">
            <textarea
              ref={inputRef}
              className="chat-input-field"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message Review Insights Assistant..."
              rows={1}
              disabled={isLoading || !sessionId}
            />
            <div className="chat-input-actions">
              <button
                className={`voice-input-btn ${isListening ? 'listening' : ''}`}
                onClick={handleVoiceInput}
                disabled={isLoading || !sessionId}
                title={isListening ? "Stop voice input" : "Start voice input"}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button
                className="chat-send-button"
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading || !sessionId}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;