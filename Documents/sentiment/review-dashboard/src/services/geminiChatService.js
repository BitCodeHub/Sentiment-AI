import { GoogleGenerativeAI } from '@google/generative-ai';

// Get API key with multiple fallbacks
let apiKey;
try {
  // Try to get from import.meta.env first (Vite)
  apiKey = import.meta.env?.VITE_GEMINI_API_KEY;
  
  // Debug logging
  console.log('Environment check:', {
    hasImportMeta: !!import.meta,
    hasEnv: !!import.meta?.env,
    envKeys: import.meta?.env ? Object.keys(import.meta.env) : [],
    apiKeyLength: apiKey?.length || 0
  });
} catch (e) {
  // Fallback if import.meta is not available
  console.error('Error accessing import.meta.env:', e);
  apiKey = '';
}

// Check if API key is configured
if (!apiKey || apiKey === 'your-gemini-api-key-here') {
  console.error('GEMINI API KEY NOT CONFIGURED!');
  console.error('Please set VITE_GEMINI_API_KEY in your .env file');
  console.error('Get your API key from: https://makersuite.google.com/app/apikey');
  console.error('Current API key value:', apiKey ? '[HIDDEN]' : 'empty');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Simple rate limiting
let lastRequestTime = 0;
let requestCount = 0;
let requestWindowStart = Date.now();

// Helper function to execute requests with proper error handling
async function executeRequest(fn) {
  try {
    return await fn();
  } catch (error) {
    console.error('Gemini API Error:', error);
    
    // Check for rate limit errors from Gemini
    if (error.message?.includes('429') || 
        error.message?.includes('Resource has been exhausted') ||
        error.message?.includes('quota') ||
        error.status === 429) {
      throw new Error('Rate limit reached. Please wait a moment and try again.');
    }
    
    throw error;
  }
}

// Chat session storage
let chatSessions = new Map();

// Extract comprehensive data structure from reviews
function extractDataStructure(reviewData) {
  if (!reviewData || reviewData.length === 0) return {};
  
  // Get all unique fields across all reviews
  const allFields = new Set();
  const fieldTypes = {};
  const sampleValues = {};
  
  reviewData.forEach(review => {
    Object.keys(review).forEach(field => {
      allFields.add(field);
      
      // Determine field type and collect sample values
      const value = review[field];
      if (!fieldTypes[field]) {
        fieldTypes[field] = typeof value;
        sampleValues[field] = [];
      }
      
      if (sampleValues[field].length < 5 && value !== null && value !== undefined) {
        sampleValues[field].push(value);
      }
    });
  });
  
  return {
    totalRecords: reviewData.length,
    fields: Array.from(allFields),
    fieldTypes,
    sampleValues,
    dateRange: getDateRange(reviewData),
    uniqueValues: getUniqueValues(reviewData, allFields)
  };
}

// Get date range from data
function getDateRange(reviewData) {
  const dates = reviewData
    .map(r => r.date || r.Date || r['Review Date'])
    .filter(d => d)
    .map(d => new Date(d))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a - b);
  
  if (dates.length === 0) return null;
  
  return {
    start: dates[0].toISOString().split('T')[0],
    end: dates[dates.length - 1].toISOString().split('T')[0],
    totalDays: Math.ceil((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24))
  };
}

// Get unique values for categorical fields
function getUniqueValues(reviewData, fields) {
  const uniqueValues = {};
  
  fields.forEach(field => {
    const values = new Set();
    reviewData.forEach(review => {
      if (review[field] && typeof review[field] === 'string') {
        values.add(review[field]);
      }
    });
    
    // Only store if there are reasonable number of unique values (categorical)
    if (values.size > 0 && values.size < 50) {
      uniqueValues[field] = Array.from(values);
    }
  });
  
  return uniqueValues;
}

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
    if (!genAI) {
      throw new Error('Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
    }
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Extract comprehensive data structure
    const dataStructure = extractDataStructure(reviewData);
    
    // Create system context from review data
    const context = `You are Rivue, an AI assistant specialized in analyzing customer reviews and app data. You have access to ${reviewData.length} records with comprehensive data.

IMPORTANT INSTRUCTIONS:
1. You can answer ANY questions about the uploaded data, not just review content
2. You can create visualizations by outputting special JSON structures
3. When asked for graphs, charts, or tables, respond with the appropriate visualization format
4. Be helpful, concise, and data-driven in your analysis
5. You have access to ALL fields in the data, including metadata

VISUALIZATION CAPABILITIES:
When users ask for visualizations, you can create:
- Line charts/trends: Use {{VIZ:LINE}} format
- Bar charts: Use {{VIZ:BAR}} format  
- Pie charts: Use {{VIZ:PIE}} format
- Tables: Use {{VIZ:TABLE}} format
- Area charts: Use {{VIZ:AREA}} format

Visualization Format Example:
{{VIZ:LINE}}
{
  "title": "Review Trend - Last 7 Days",
  "type": "line",
  "data": [{"date": "2024-01-01", "count": 10}, ...],
  "config": {"xAxis": "date", "yAxis": "count"}
}
{{/VIZ}}

DATA STRUCTURE:
- Total Records: ${dataStructure.totalRecords}
- Available Fields: ${dataStructure.fields.join(', ')}
- Date Range: ${dataStructure.dateRange ? `${dataStructure.dateRange.start} to ${dataStructure.dateRange.end} (${dataStructure.dateRange.totalDays} days)` : 'No dates available'}

FIELD DETAILS:
${Object.entries(dataStructure.fieldTypes).map(([field, type]) => 
  `- ${field} (${type}): ${dataStructure.sampleValues[field]?.slice(0, 3).join(', ')}...`
).join('\n')}

UNIQUE VALUES IN CATEGORICAL FIELDS:
${Object.entries(dataStructure.uniqueValues).map(([field, values]) => 
  `- ${field}: ${values.slice(0, 10).join(', ')}${values.length > 10 ? '...' : ''}`
).join('\n')}

APP CONTEXT:
- App Name: ${metadata.appName || 'Not specified'}
- Total Reviews: ${reviewData.length}
- Rating Distribution: ${getDistributionSummary(reviewData)}
- Common Platforms: ${getPlatformSummary(reviewData)}

You have full access to all data fields and can perform any analysis, aggregation, or visualization requested by the user.`;

    // Initialize chat with context
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: context }],
        },
        {
          role: "model",
          parts: [{ text: "I understand. I'm Rivue, your comprehensive data analysis assistant. I have access to " + reviewData.length + " records with " + extractDataStructure(reviewData).fields.length + " data fields. I can analyze any aspect of your data, create visualizations (graphs, charts, tables), and provide insights. What would you like to know?" }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
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
  // Simple rate limiting for Gemini - 60 requests per minute
  const now = Date.now();
  const minInterval = 1000; // 1 second between requests
  
  if (lastRequestTime && (now - lastRequestTime) < minInterval) {
    await new Promise(resolve => setTimeout(resolve, minInterval - (now - lastRequestTime)));
  }
  
  lastRequestTime = now;
  
  return executeRequest(async () => {
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
      let text = response.text();

      // Parse visualization commands
      const visualizations = [];
      const vizRegex = /{{VIZ:(LINE|BAR|PIE|TABLE|AREA)}}\s*([\s\S]*?)\s*{{/VIZ}}/g;
      let match;
      
      while ((match = vizRegex.exec(text)) !== null) {
        try {
          const vizType = match[1].toLowerCase();
          const vizData = JSON.parse(match[2]);
          visualizations.push({
            type: vizType,
            ...vizData
          });
          
          // Remove visualization JSON from text
          text = text.replace(match[0], `[${vizData.title || 'Visualization'}]`);
        } catch (e) {
          console.error('Failed to parse visualization:', e);
        }
      }

      // Store in history
      session.history.push({
        role: 'user',
        message: message,
        timestamp: new Date(),
      });
      session.history.push({
        role: 'assistant',
        message: text,
        visualizations,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: text,
        visualizations,
        sessionId,
      };
    } catch (error) {
      console.error('Error sending chat message:', error);
      
      // Check for specific errors
      if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('API key not valid')) {
        throw new Error('Invalid Gemini API key. Please add a valid VITE_GEMINI_API_KEY to your .env file. Get your API key from: https://makersuite.google.com/app/apikey');
      }
      if (error.message?.includes('RATE_LIMIT_EXCEEDED')) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (!genAI) {
        throw new Error('Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
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
  // Keywords that suggest the user wants specific analysis or visualization
  const analysisKeywords = [
    'common', 'theme', 'pattern', 'issue', 'problem', 'pain point',
    'sentiment', 'feeling', 'satisfaction', 'complaint', 'praise',
    'feature', 'request', 'bug', 'crash', 'performance', 'ui', 'ux',
    'trend', 'most', 'top', 'frequent', 'recurring', 'main',
    'graph', 'chart', 'table', 'show', 'display', 'visualize', 'plot',
    'device', 'version', 'platform', 'os', 'android', 'ios', 'distribution'
  ];

  const needsContext = analysisKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );

  // Check if user is asking for time-based analysis
  const timeKeywords = ['last', 'past', 'recent', 'day', 'week', 'month', 'trend', 'over time'];
  const needsTimeContext = timeKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );

  if (needsContext || needsTimeContext) {
    // Add relevant data based on the question
    const relevantReviews = findRelevantReviews(message, reviewData);
    let context = '';
    
    // Add review excerpts if asking about review content
    if (relevantReviews.length > 0 && !message.toLowerCase().includes('graph') && !message.toLowerCase().includes('chart')) {
      context += `\n\nRelevant review excerpts for analysis:\n${relevantReviews.map(r => 
        `- "${r.content || r.Review || r.Body}" (Rating: ${r.rating || r.Rating}★)`
      ).join('\n')}`;
    }
    
    // Add data summary for visualization requests
    if (message.toLowerCase().includes('device') || message.toLowerCase().includes('android') || message.toLowerCase().includes('ios')) {
      const deviceStats = getDeviceStatistics(reviewData);
      context += `\n\nDevice/Platform statistics: ${JSON.stringify(deviceStats)}`;
    }
    
    if (message.toLowerCase().includes('version')) {
      const versionStats = getVersionStatistics(reviewData);
      context += `\n\nVersion statistics: ${JSON.stringify(versionStats)}`;
    }

    return message + context;
  }

  return message;
}

// Get device/platform statistics
function getDeviceStatistics(reviewData) {
  const stats = {};
  reviewData.forEach(r => {
    const device = r.device || r.Device || r.platform || r.Platform || r.os || 'Unknown';
    stats[device] = (stats[device] || 0) + 1;
  });
  return stats;
}

// Get version statistics
function getVersionStatistics(reviewData) {
  const stats = {};
  reviewData.forEach(r => {
    const version = r.version || r.Version || r['App Version'] || 'Unknown';
    stats[version] = (stats[version] || 0) + 1;
  });
  return stats;
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
  const hasDeviceInfo = reviewData.some(r => r.device || r.Device || r.platform);
  const hasVersionInfo = reviewData.some(r => r.version || r.Version || r['App Version']);
  
  const suggestions = [
    "Show me a trend graph of reviews over the last 7 days",
    "What are the most common complaints in the reviews?",
    "Display a table of device distribution (Android vs iOS)",
    "Create a bar chart of ratings distribution",
    "What features are customers requesting most?",
    "Show me app version usage statistics",
    "Generate a pie chart of sentiment analysis",
    "What do customers love most about the app?",
    "Show review volume trends by week",
    "Are there any recurring technical issues mentioned?",
  ];

  // Prioritize suggestions based on data availability
  const prioritizedSuggestions = [];
  
  if (avgRating < 3.5) {
    prioritizedSuggestions.push("Why are customers giving low ratings?");
  }
  
  prioritizedSuggestions.push("Show me a trend graph of reviews over the last 7 days");
  
  if (hasDeviceInfo) {
    prioritizedSuggestions.push("Display a table of device distribution (Android vs iOS)");
  }
  
  if (hasVersionInfo) {
    prioritizedSuggestions.push("Show me app version usage statistics");
  }
  
  prioritizedSuggestions.push("Create a bar chart of ratings distribution");
  
  // Add remaining suggestions
  suggestions.forEach(s => {
    if (!prioritizedSuggestions.includes(s) && prioritizedSuggestions.length < 6) {
      prioritizedSuggestions.push(s);
    }
  });

  return prioritizedSuggestions.slice(0, 4);
}