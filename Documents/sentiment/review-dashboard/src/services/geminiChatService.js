import { GoogleGenerativeAI } from '@google/generative-ai';
import { rateLimiter } from './rateLimiter';

// Get API key with multiple fallbacks
let apiKey;
try {
  apiKey = import.meta.env?.VITE_GEMINI_API_KEY || 'AIzaSyCTBVDAQxdGCzVqH9x70p6gXNhoTl5RJN8';
} catch (e) {
  // Fallback if import.meta is not available
  apiKey = 'AIzaSyCTBVDAQxdGCzVqH9x70p6gXNhoTl5RJN8';
}

const genAI = new GoogleGenerativeAI(apiKey);

// Chat session storage
let chatSessions = new Map();

// Clean JSON response helper
function cleanJsonResponse(text) {
  // Remove any markdown code block formatting
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return cleaned;
}

/**
 * Initialize a new chat session with review data context
 * @param {string} sessionId - Unique session identifier
 * @param {Array} reviewData - The uploaded review data
 * @param {Object} metadata - Additional context like app info
 * @returns {Object} Chat session
 */
export async function initializeChatSession(sessionId, reviewData, metadata = {}) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Create system context from review data
    const context = `You are an AI assistant specialized in analyzing customer reviews and feedback. You have access to ${reviewData.length} customer reviews for analysis.

IMPORTANT INSTRUCTIONS:
1. You must ONLY answer questions based on the review data provided
2. Do not make up or invent information not present in the reviews
3. If asked about something not in the reviews, politely say you can only discuss the review data
4. Be helpful, concise, and insightful in your analysis
5. When analyzing patterns, provide specific examples from the reviews
6. Focus on actionable insights and trends

APP CONTEXT:
- Total Reviews: ${reviewData.length}
- App Name: ${metadata.appName || 'Not specified'}
- Date Range: ${metadata.dateRange || 'All time'}

REVIEW DATA SUMMARY:
- Ratings distribution: ${getDistributionSummary(reviewData)}
- Common platforms: ${getPlatformSummary(reviewData)}
- Key themes: Will be analyzed based on user questions

You have full access to all review content, ratings, dates, and metadata.`;

    // Initialize chat with context
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: context }],
        },
        {
          role: "model",
          parts: [{ text: "I understand. I'm ready to help you analyze the customer reviews. I have access to " + reviewData.length + " reviews and will only provide insights based on this data. What would you like to know about your customer feedback?" }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    // Store session
    chatSessions.set(sessionId, {
      chat,
      reviewData,
      metadata,
      history: [],
      createdAt: new Date(),
    });

    return { sessionId, success: true };
  } catch (error) {
    console.error('Error initializing chat session:', error);
    throw error;
  }
}

/**
 * Send a message to the chat and get a response
 * @param {string} sessionId - Session identifier
 * @param {string} message - User's message
 * @returns {Object} AI response
 */
export async function sendChatMessage(sessionId, message) {
  return rateLimiter.addRequest(async () => {
    try {
      const session = chatSessions.get(sessionId);
      if (!session) {
        throw new Error('Chat session not found');
      }

      const { chat, reviewData, metadata } = session;

      // Add review data context to the message if it's asking for analysis
      const enrichedMessage = enrichMessageWithContext(message, reviewData);

      // Send message and get response
      const result = await chat.sendMessage(enrichedMessage);
      const response = await result.response;
      const text = response.text();

      // Store in history
      session.history.push({
        role: 'user',
        message: message,
        timestamp: new Date(),
      });
      session.history.push({
        role: 'assistant',
        message: text,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: text,
        sessionId,
      };
    } catch (error) {
      console.error('Error sending chat message:', error);
      
      // Check for specific errors
      if (error.message?.includes('API_KEY_INVALID')) {
        throw new Error('Invalid API key. Please check your Gemini API configuration.');
      }
      if (error.message?.includes('RATE_LIMIT_EXCEEDED')) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      
      throw error;
    }
  });
}

/**
 * Get chat history for a session
 * @param {string} sessionId - Session identifier
 * @returns {Array} Chat history
 */
export function getChatHistory(sessionId) {
  const session = chatSessions.get(sessionId);
  return session?.history || [];
}

/**
 * Clear a chat session
 * @param {string} sessionId - Session identifier
 */
export function clearChatSession(sessionId) {
  chatSessions.delete(sessionId);
}

// Helper functions
function getDistributionSummary(reviews) {
  const ratings = reviews.reduce((acc, review) => {
    const rating = review.rating || review.Rating || 0;
    acc[rating] = (acc[rating] || 0) + 1;
    return acc;
  }, {});
  
  return Object.entries(ratings)
    .sort(([a], [b]) => b - a)
    .map(([rating, count]) => `${rating}★: ${count}`)
    .join(', ');
}

function getPlatformSummary(reviews) {
  const platforms = reviews.reduce((acc, review) => {
    const platform = review.platform || review.Platform || review.os || 'Unknown';
    acc[platform] = (acc[platform] || 0) + 1;
    return acc;
  }, {});
  
  return Object.entries(platforms)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([platform]) => platform)
    .join(', ');
}

function enrichMessageWithContext(message, reviewData) {
  // Keywords that suggest the user wants specific analysis
  const analysisKeywords = [
    'common', 'theme', 'pattern', 'issue', 'problem', 'pain point',
    'sentiment', 'feeling', 'satisfaction', 'complaint', 'praise',
    'feature', 'request', 'bug', 'crash', 'performance', 'ui', 'ux',
    'trend', 'most', 'top', 'frequent', 'recurring', 'main'
  ];

  const needsContext = analysisKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );

  if (needsContext) {
    // Add relevant review excerpts based on the question
    const relevantReviews = findRelevantReviews(message, reviewData);
    const context = relevantReviews.length > 0
      ? `\n\nRelevant review excerpts for analysis:\n${relevantReviews.map(r => 
          `- "${r.content || r.Review || r.Body}" (Rating: ${r.rating || r.Rating}★)`
        ).join('\n')}`
      : '';

    return message + context;
  }

  return message;
}

function findRelevantReviews(query, reviews, maxReviews = 10) {
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(' ').filter(word => word.length > 3);

  // Score reviews based on keyword relevance
  const scoredReviews = reviews.map(review => {
    const content = (review.content || review.Review || review.Body || '').toLowerCase();
    const score = keywords.reduce((acc, keyword) => {
      return acc + (content.includes(keyword) ? 1 : 0);
    }, 0);
    
    return { review, score };
  });

  // Return top relevant reviews
  return scoredReviews
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxReviews)
    .map(({ review }) => review);
}

// Export additional utilities
export function generateChatSuggestions(reviewData) {
  const totalReviews = reviewData.length;
  const avgRating = reviewData.reduce((acc, r) => acc + (r.rating || r.Rating || 0), 0) / totalReviews;
  
  const suggestions = [
    "What are the most common complaints in the reviews?",
    "What features are customers requesting most?",
    "What do customers love most about the app?",
    "Are there any recurring technical issues mentioned?",
    "How has sentiment changed over time?",
    "What are the main differences between positive and negative reviews?",
  ];

  if (avgRating < 3.5) {
    suggestions.unshift("Why are customers giving low ratings?");
  }

  return suggestions.slice(0, 4);
}