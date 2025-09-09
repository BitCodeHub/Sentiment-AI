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

// Model configuration with fallback
const MODEL_CONFIGS = {
  primary: 'models/gemini-2.5-flash',
  experimental: 'models/gemini-1.5-flash-latest',
  fallback: 'models/gemini-1.5-flash'
};

// Track which model is being used
let currentModelIndex = 0;
const modelOrder = ['primary', 'experimental', 'fallback'];

// Helper function to get model with fallback
async function getModelWithFallback(forceIndex = null) {
  if (!genAI) {
    throw new Error('Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
  }

  const startIndex = forceIndex !== null ? forceIndex : currentModelIndex;
  
  for (let i = startIndex; i < modelOrder.length; i++) {
    const modelKey = modelOrder[i];
    const modelName = MODEL_CONFIGS[modelKey];
    
    try {
      console.log(`Attempting to use ${modelKey} model:`, modelName);
      const model = genAI.getGenerativeModel({ model: modelName });
      currentModelIndex = i; // Remember which model worked
      return { model, modelKey, modelName };
    } catch (error) {
      console.warn(`${modelKey} model failed:`, error.message);
      if (i === modelOrder.length - 1) {
        // All models failed
        throw new Error('All Gemini models failed to initialize. Please check your API key and try again.');
      }
    }
  }
}

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
    // Get model with fallback strategy
    const { model, modelKey, modelName } = await getModelWithFallback();
    
    // Extract comprehensive data structure
    const dataStructure = extractDataStructure(reviewData);
    
    // Generate proactive insights and advanced analysis
    const proactiveInsights = generateProactiveInsights(reviewData);
    const userPersonas = identifyUserPersonas(reviewData);
    const aspectAnalysis = performAspectBasedSentiment(reviewData);
    const emotionAnalysis = detectEmotions(reviewData);
    
    // Create system context from review data
    const context = `You are Rivue, an advanced AI assistant combining the expertise of a Data Scientist, Business Intelligence Analyst, and Technical Analyst. You specialize in analyzing customer reviews and app data with ${reviewData.length} records at your disposal.

YOUR CORE CAPABILITIES:

As a DATA SCIENTIST, you:
- Perform advanced statistical analysis and predictive modeling
- Identify patterns, correlations, and anomalies in data
- Create forecasts and trend analyses
- Calculate confidence intervals and standard deviations
- Conduct sentiment analysis and NLP on review text
- Perform cohort and segmentation analysis

As a BUSINESS INTELLIGENCE ANALYST, you:
- Generate actionable insights and strategic recommendations
- Calculate KPIs like NPS, customer satisfaction scores, and retention metrics
- Create executive summaries and dashboards
- Identify growth opportunities and market trends
- Perform competitive analysis from user feedback
- Assess ROI and revenue impact of issues

As a TECHNICAL ANALYST, you:
- Diagnose technical issues and bugs from user reports
- Analyze performance, stability, and compatibility problems
- Create bug priority matrices based on impact
- Identify API, backend, and infrastructure issues
- Assess technical debt from user feedback
- Provide device and version-specific analysis

IMPORTANT INSTRUCTIONS:
1. You have access to ALL fields in the uploaded data, not just review content
2. Create sophisticated visualizations using the JSON formats below
3. Provide deep, actionable insights backed by data
4. Consider multiple perspectives: technical, business, and customer experience
5. Speak naturally - your responses will be converted to audio when users enable that feature
6. Be concise but comprehensive in your analysis

VISUALIZATION CAPABILITIES:
When users ask for visualizations:
1. ALWAYS provide a natural language explanation of what the visualization shows
2. Create the visualization using the special format below
3. Continue your analysis after the visualization in natural language

Available visualization types:
- Line charts/trends: Use {{VIZ:LINE}} format
- Bar charts: Use {{VIZ:BAR}} format  
- Pie charts: Use {{VIZ:PIE}} format
- Tables: Use {{VIZ:TABLE}} format
- Area charts: Use {{VIZ:AREA}} format

IMPORTANT VISUALIZATION RULES:
- NEVER show the JSON code to the user
- ALWAYS describe what the visualization will show before creating it
- ALWAYS continue with insights after creating the visualization
- The visualization JSON will be automatically rendered as a chart

Visualization Format (this is hidden from user):
{{VIZ:LINE}}
{
  "title": "Review Trend - Last 7 Days",
  "type": "line",
  "data": [{"date": "2024-01-01", "count": 10}, ...],
  "config": {"xAxis": "date", "yAxis": "count"}
}
{{/VIZ}}

Example Response Pattern:
"Let me analyze the review trends for you. I'll create a line chart showing the daily review volume over the last 7 days.

{{VIZ:LINE}}
{...json data...}
{{/VIZ}}

As you can see from the chart, there's a noticeable increase in reviews on weekdays..."

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

PROACTIVE INTELLIGENCE CAPABILITIES:

1. INSIGHT COPILOT MODE:
- Automatically generate executive briefings
- Surface top issues without being asked
- Provide weekly/monthly intelligence summaries
- Alert on emerging trends and anomalies
- Example: "This week's top 3 issues: 1) Login authentication errors (↑23%), 2) Subscription renewal confusion (15 mentions), 3) Battery drain on v3.2.1 (affecting 8% of Android users)"

2. SCENARIO TESTING & FORECASTING:
- Simulate "what-if" scenarios based on historical data
- Predict impact of issues if left unaddressed
- Forecast review trends based on patterns
- Model potential outcomes of fixes
- Example: "If login issues double next release, expect: 32% increase in 1-star reviews, 15% churn risk, $45K potential revenue impact"

3. PERSONA-BASED ANALYSIS:
- Segment users into distinct personas:
  * Power Users: High engagement, technical feedback, feature requests
  * New Users: Onboarding issues, basic functionality questions
  * Casual Users: Intermittent usage, UI/UX feedback
  * Enterprise Users: Security, integration, performance concerns
- Analyze feedback by persona
- Provide persona-specific recommendations
- Example: "Power users (18% of base) are frustrated by missing API features, while new users (45%) struggle with initial setup"

4. INTELLIGENT TRIGGERS:
- Monitor for critical thresholds (e.g., negative sentiment >20%)
- Detect sudden changes in feedback patterns
- Identify correlated issues across different user segments
- Proactively suggest deep-dives when anomalies detected

5. CONTEXTUAL RECOMMENDATIONS:
- Prioritize fixes based on business impact
- Suggest A/B testing for contentious features
- Recommend targeted communications to affected users
- Provide competitive insights from user comparisons

CURRENT INTELLIGENCE BRIEF:
${proactiveInsights}

USER PERSONAS IDENTIFIED:
${userPersonas}

ASPECT-BASED SENTIMENT ANALYSIS (ABSA):
${Object.entries(aspectAnalysis).map(([aspect, data]) => 
  `- ${aspect.toUpperCase()}: ${data.positive}% positive, ${data.negative}% negative, ${data.neutral}% neutral (${data.totalMentions} mentions)`
).join('\n')}

EMOTION DETECTION ANALYSIS:
${Object.entries(emotionAnalysis).map(([emotion, data]) => 
  `- ${emotion.toUpperCase()}: ${data.count} occurrences (${data.percentage}% of reviews), severity: ${data.avgSeverity}/3`
).join('\n')}

ADVANCED CAPABILITIES:

1. ASPECT-BASED SENTIMENT (ABSA):
- Split reviews into aspects (UI, performance, features, pricing, support, usability, reliability)
- Analyze sentiment for each aspect independently
- Example: "Review shows 2★ overall, but positive about UI design (85%), negative about subscription pricing (92%)"
- Identify which aspects drive overall satisfaction

2. EMOTION LAYER DETECTION:
- Detect emotions beyond positive/negative: anger, sadness, joy, fear, surprise, disgust, frustration, sarcasm
- Measure emotion severity (1-3 scale) for prioritization
- Example: "15% of reviews show high-severity anger - requires immediate attention"
- Use emotion data for triage and response strategy

When responding:
1. Start with proactive insights if relevant
2. Use ABSA to provide nuanced feedback analysis
3. Include emotion detection for severity assessment
4. Use scenario modeling for forward-looking questions
5. Segment analysis by persona when appropriate
6. Provide actionable recommendations with impact estimates
7. Alert on any critical patterns or anomalies detected

You have full access to all data fields and can perform any analysis, aggregation, or visualization requested by the user.`;

    // Create initial history
    const initialHistory = [
      {
        role: "user",
        parts: [{ text: context }],
      },
      {
        role: "model",
        parts: [{ text: "I understand. I'm Rivue, your AI-powered Data Scientist, Business Intelligence Analyst, and Technical Expert. I have access to " + reviewData.length + " records with " + extractDataStructure(reviewData).fields.length + " data fields.\n\n" + (proactiveInsights ? "🚨 **Intelligence Brief:**\n" + proactiveInsights + "\n\n" : "") + "I can help you with:\n📊 Advanced analytics and predictive modeling\n📈 Interactive visualizations and dashboards\n💡 Strategic business insights and recommendations\n🔧 Technical issue diagnosis and prioritization\n🎯 Customer experience optimization\n📃 Scenario testing and forecasting\n👥 Persona-based analysis\n🎨 Aspect-based sentiment analysis (UI, performance, features, pricing)\n😊 Emotion detection and severity assessment\n🔊 Audio responses for hands-free interaction\n\nWhat would you like to explore? I can also elaborate on any of the issues I've identified." }],
      },
    ];

    // Initialize chat with context
    const chat = model.startChat({
      history: initialHistory,
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
      modelKey,
      modelName,
      initialHistory, // Store for potential re-initialization
    });

    console.log(`Chat session ${sessionId} initialized with model: ${modelName}`);
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

      const { chat, reviewData, metadata, modelKey } = session;

      // Add review data context to the message if it's asking for analysis
      const enrichedMessage = enrichMessageWithContext(message, reviewData);

      let result, response, text;
      let retryCount = 0;
      const maxRetries = modelOrder.length - modelOrder.indexOf(modelKey);

      while (retryCount < maxRetries) {
        try {
          // Send message and get response
          result = await chat.sendMessage(enrichedMessage);
          response = await result.response;
          text = response.text();
          break; // Success!
        } catch (error) {
          // Check if this is a model not found error
          if (error.message?.includes('is not found') || 
              error.message?.includes('404') ||
              error.message?.includes('not supported')) {
            
            console.warn(`Model error with ${session.modelName}, trying fallback...`);
            retryCount++;
            
            // Try next model in the order
            const nextModelIndex = modelOrder.indexOf(modelKey) + retryCount;
            if (nextModelIndex < modelOrder.length) {
              try {
                // Get next model
                const { model: newModel, modelKey: newModelKey, modelName: newModelName } = 
                  await getModelWithFallback(nextModelIndex);
                
                // Build full history for new chat
                const fullHistory = [...(session.initialHistory || [])];
                
                // Add conversation history
                session.history.forEach(msg => {
                  fullHistory.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.message }]
                  });
                });
                
                // Reinitialize chat with new model and full history
                const newChat = newModel.startChat({
                  history: fullHistory,
                  generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 4096,
                  },
                });
                
                // Update session
                session.chat = newChat;
                session.modelKey = newModelKey;
                session.modelName = newModelName;
                
                continue; // Retry with new model
              } catch (modelError) {
                // If we can't get a new model, throw the original error
                throw error;
              }
            } else {
              throw error; // No more models to try
            }
          } else {
            throw error; // Not a model error, don't retry
          }
        }
      }

      // Parse and clean visualization commands
      const visualizations = [];
      const vizRegex = /{{VIZ:(LINE|BAR|PIE|TABLE|AREA)}}\s*([\s\S]*?)\s*{{\/VIZ}}/g;
      let cleanedText = text;
      let match;
      
      // First pass: collect all visualizations
      const matches = [];
      while ((match = vizRegex.exec(text)) !== null) {
        matches.push({
          fullMatch: match[0],
          vizType: match[1],
          vizJson: match[2],
          index: match.index
        });
      }
      
      // Process matches in reverse order to avoid index shifting
      for (let i = matches.length - 1; i >= 0; i--) {
        const { fullMatch, vizType, vizJson } = matches[i];
        try {
          const vizData = JSON.parse(vizJson);
          visualizations.unshift({
            type: vizType.toLowerCase(),
            ...vizData
          });
          
          // Remove the entire visualization block from the text
          cleanedText = cleanedText.replace(fullMatch, '');
        } catch (e) {
          console.error('Failed to parse visualization:', e);
          // Still remove the malformed JSON
          cleanedText = cleanedText.replace(fullMatch, '');
        }
      }
      
      // Clean up any extra whitespace left behind
      cleanedText = cleanedText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n\n')
        .trim();
      
      // Additional safety check: Remove any remaining JSON-like content
      // This catches any JSON blocks that might not be properly wrapped in VIZ tags
      cleanedText = cleanedText.replace(/```json[\s\S]*?```/g, '');
      cleanedText = cleanedText.replace(/```[\s\S]*?```/g, '');
      
      // Remove any standalone JSON objects that look like visualization data
      cleanedText = cleanedText.replace(/\{[\s]*"title"[\s]*:[\s]*"[^"]*"[\s]*,[\s]*"type"[\s]*:[\s]*"[^"]*"[\s\S]*?\}(?=\s*$|\s*\n|[^}])/gm, '');
      
      // Final cleanup
      cleanedText = cleanedText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n\n')
        .trim();
      
      // Update text to use cleaned version
      text = cleanedText;

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

// Generate proactive insights from review data
function generateProactiveInsights(reviewData) {
  if (!reviewData || reviewData.length === 0) return '';
  
  const insights = [];
  const now = new Date();
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  
  // Analyze recent reviews
  const recentReviews = reviewData.filter(r => {
    const reviewDate = new Date(r.date || r.Date || r['Review Date']);
    return reviewDate >= oneWeekAgo && !isNaN(reviewDate.getTime());
  });
  
  // Calculate trends
  const totalReviews = reviewData.length;
  const recentCount = recentReviews.length;
  const avgRating = reviewData.reduce((acc, r) => acc + (r.rating || r.Rating || 0), 0) / totalReviews;
  const recentAvgRating = recentCount > 0 ? 
    recentReviews.reduce((acc, r) => acc + (r.rating || r.Rating || 0), 0) / recentCount : 0;
  
  // Identify top issues
  const issueKeywords = ['bug', 'crash', 'error', 'problem', 'issue', 'broken', 'fail', 'slow', 'freeze'];
  const issues = {};
  
  reviewData.forEach(review => {
    const content = (review.content || review.Review || review.Body || '').toLowerCase();
    issueKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        if (!issues[keyword]) issues[keyword] = 0;
        issues[keyword]++;
      }
    });
  });
  
  // Sort issues by frequency
  const topIssues = Object.entries(issues)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);
  
  // Build insights
  if (recentAvgRating < avgRating - 0.5) {
    insights.push(`⚠️ Rating decline detected: ${recentAvgRating.toFixed(1)}★ this week vs ${avgRating.toFixed(1)}★ overall`);
  }
  
  if (topIssues.length > 0) {
    const issueList = topIssues.map(([issue, count]) => 
      `${issue} (${count} mentions)`
    ).join(', ');
    insights.push(`🔍 Top issues: ${issueList}`);
  }
  
  // Check for version-specific problems
  const versionIssues = {};
  reviewData.forEach(r => {
    const version = r.version || r.Version || r['App Version'];
    const rating = r.rating || r.Rating || 0;
    if (version && rating <= 2) {
      if (!versionIssues[version]) versionIssues[version] = 0;
      versionIssues[version]++;
    }
  });
  
  const problematicVersion = Object.entries(versionIssues)
    .sort(([,a], [,b]) => b - a)[0];
  
  if (problematicVersion && problematicVersion[1] > 5) {
    insights.push(`📱 Version ${problematicVersion[0]} has ${problematicVersion[1]} negative reviews`);
  }
  
  return insights.length > 0 ? insights.join('\\n') : '';
}

// Perform Aspect-Based Sentiment Analysis (ABSA)
function performAspectBasedSentiment(reviewData) {
  if (!reviewData || reviewData.length === 0) return {};
  
  const aspects = {
    ui: { positive: 0, negative: 0, neutral: 0, keywords: ['ui', 'interface', 'design', 'layout', 'button', 'screen', 'visual', 'look'] },
    performance: { positive: 0, negative: 0, neutral: 0, keywords: ['performance', 'speed', 'fast', 'slow', 'lag', 'crash', 'freeze', 'responsive'] },
    features: { positive: 0, negative: 0, neutral: 0, keywords: ['feature', 'function', 'capability', 'option', 'tool', 'missing', 'need'] },
    pricing: { positive: 0, negative: 0, neutral: 0, keywords: ['price', 'cost', 'subscription', 'expensive', 'cheap', 'value', 'money', 'free'] },
    support: { positive: 0, negative: 0, neutral: 0, keywords: ['support', 'help', 'customer', 'service', 'response', 'team', 'contact'] },
    usability: { positive: 0, negative: 0, neutral: 0, keywords: ['easy', 'hard', 'confusing', 'intuitive', 'simple', 'complex', 'user-friendly'] },
    reliability: { positive: 0, negative: 0, neutral: 0, keywords: ['reliable', 'stable', 'buggy', 'error', 'issue', 'problem', 'work'] }
  };
  
  const positiveWords = ['great', 'good', 'excellent', 'love', 'perfect', 'amazing', 'best', 'awesome', 'fantastic', 'wonderful'];
  const negativeWords = ['bad', 'poor', 'terrible', 'hate', 'worst', 'awful', 'horrible', 'sucks', 'disappointing', 'frustrating'];
  
  reviewData.forEach(review => {
    const content = (review.content || review.Review || review.Body || '').toLowerCase();
    const rating = review.rating || review.Rating || 0;
    const generalSentiment = rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral';
    
    // Analyze each aspect
    Object.entries(aspects).forEach(([aspectName, aspectData]) => {
      const { keywords } = aspectData;
      let aspectFound = false;
      let aspectSentiment = 'neutral';
      
      // Check if this review mentions the aspect
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          aspectFound = true;
          
          // Look for sentiment words near the keyword
          const wordIndex = content.indexOf(keyword);
          const contextStart = Math.max(0, wordIndex - 50);
          const contextEnd = Math.min(content.length, wordIndex + 50);
          const context = content.substring(contextStart, contextEnd);
          
          // Check for positive/negative words in context
          let hasPositive = positiveWords.some(word => context.includes(word));
          let hasNegative = negativeWords.some(word => context.includes(word));
          
          if (hasPositive && !hasNegative) {
            aspectSentiment = 'positive';
          } else if (hasNegative && !hasPositive) {
            aspectSentiment = 'negative';
          } else {
            // Use overall rating as fallback
            aspectSentiment = generalSentiment;
          }
          
          break;
        }
      }
      
      if (aspectFound) {
        aspects[aspectName][aspectSentiment]++;
      }
    });
  });
  
  // Calculate percentages and summaries
  const aspectSummaries = {};
  Object.entries(aspects).forEach(([aspectName, sentiments]) => {
    const total = sentiments.positive + sentiments.negative + sentiments.neutral;
    if (total > 0) {
      aspectSummaries[aspectName] = {
        positive: Math.round((sentiments.positive / total) * 100),
        negative: Math.round((sentiments.negative / total) * 100),
        neutral: Math.round((sentiments.neutral / total) * 100),
        totalMentions: total
      };
    }
  });
  
  return aspectSummaries;
}

// Detect emotions in reviews
function detectEmotions(reviewData) {
  if (!reviewData || reviewData.length === 0) return {};
  
  const emotions = {
    anger: { count: 0, severity: 0, keywords: ['angry', 'furious', 'rage', 'mad', 'pissed', 'annoyed', 'irritated'] },
    sadness: { count: 0, severity: 0, keywords: ['sad', 'disappointed', 'unhappy', 'depressed', 'upset', 'let down'] },
    joy: { count: 0, severity: 0, keywords: ['happy', 'joy', 'delighted', 'pleased', 'excited', 'love', 'amazing'] },
    fear: { count: 0, severity: 0, keywords: ['afraid', 'scared', 'worried', 'concern', 'anxious', 'nervous'] },
    surprise: { count: 0, severity: 0, keywords: ['surprised', 'shocked', 'amazed', 'unexpected', 'wow', 'unbelievable'] },
    disgust: { count: 0, severity: 0, keywords: ['disgusting', 'gross', 'terrible', 'awful', 'hate', 'horrible'] },
    frustration: { count: 0, severity: 0, keywords: ['frustrated', 'annoying', 'irritating', 'infuriating', 'exasperating'] },
    sarcasm: { count: 0, severity: 0, patterns: ['yeah right', 'sure thing', 'great job', 'thanks for nothing', 'wonderful'] }
  };
  
  // Severity indicators
  const severityWords = {
    high: ['very', 'extremely', 'incredibly', 'absolutely', 'totally', 'completely'],
    medium: ['quite', 'pretty', 'rather', 'fairly'],
    low: ['slightly', 'a bit', 'somewhat', 'a little']
  };
  
  reviewData.forEach(review => {
    const content = (review.content || review.Review || review.Body || '').toLowerCase();
    const rating = review.rating || review.Rating || 0;
    
    Object.entries(emotions).forEach(([emotionName, emotionData]) => {
      let emotionDetected = false;
      let severity = 1;
      
      // Check for emotion keywords
      if (emotionData.keywords) {
        for (const keyword of emotionData.keywords) {
          if (content.includes(keyword)) {
            emotionDetected = true;
            
            // Check severity
            const wordIndex = content.indexOf(keyword);
            const contextStart = Math.max(0, wordIndex - 30);
            const context = content.substring(contextStart, wordIndex);
            
            if (severityWords.high.some(word => context.includes(word))) severity = 3;
            else if (severityWords.medium.some(word => context.includes(word))) severity = 2;
            
            break;
          }
        }
      }
      
      // Special handling for sarcasm
      if (emotionName === 'sarcasm' && emotionData.patterns) {
        for (const pattern of emotionData.patterns) {
          if (content.includes(pattern) && rating <= 2) {
            emotionDetected = true;
            severity = 2;
            break;
          }
        }
      }
      
      if (emotionDetected) {
        emotions[emotionName].count++;
        emotions[emotionName].severity += severity;
      }
    });
  });
  
  // Calculate average severity and create summary
  const emotionSummary = {};
  Object.entries(emotions).forEach(([emotionName, data]) => {
    if (data.count > 0) {
      emotionSummary[emotionName] = {
        count: data.count,
        avgSeverity: (data.severity / data.count).toFixed(1),
        percentage: Math.round((data.count / reviewData.length) * 100)
      };
    }
  });
  
  return emotionSummary;
}

// Identify user personas from review data
function identifyUserPersonas(reviewData) {
  if (!reviewData || reviewData.length === 0) return '';
  
  const personas = {
    powerUsers: [],
    newUsers: [],
    casualUsers: [],
    enterpriseUsers: []
  };
  
  reviewData.forEach(review => {
    const content = (review.content || review.Review || review.Body || '').toLowerCase();
    const rating = review.rating || review.Rating || 0;
    
    // Identify power users
    if (content.includes('api') || content.includes('integration') || 
        content.includes('workflow') || content.includes('advanced')) {
      personas.powerUsers.push(review);
    }
    
    // Identify new users
    if (content.includes('setup') || content.includes('getting started') || 
        content.includes('tutorial') || content.includes('confus')) {
      personas.newUsers.push(review);
    }
    
    // Identify enterprise users
    if (content.includes('team') || content.includes('enterprise') || 
        content.includes('security') || content.includes('sso') || 
        content.includes('admin')) {
      personas.enterpriseUsers.push(review);
    }
  });
  
  // Build persona summary
  const personaSummary = [];
  
  if (personas.powerUsers.length > 0) {
    const percent = ((personas.powerUsers.length / reviewData.length) * 100).toFixed(1);
    personaSummary.push(`Power Users (${percent}%): Focus on API, integrations, advanced features`);
  }
  
  if (personas.newUsers.length > 0) {
    const percent = ((personas.newUsers.length / reviewData.length) * 100).toFixed(1);
    personaSummary.push(`New Users (${percent}%): Struggle with setup, need better onboarding`);
  }
  
  if (personas.enterpriseUsers.length > 0) {
    const percent = ((personas.enterpriseUsers.length / reviewData.length) * 100).toFixed(1);
    personaSummary.push(`Enterprise Users (${percent}%): Need security, team features, admin controls`);
  }
  
  return personaSummary.join('\\n');
}

// Export additional utilities
export function generateChatSuggestions(reviewData) {
  if (!reviewData || reviewData.length === 0) return [];
  
  // Analyze data characteristics
  const totalReviews = reviewData.length;
  const avgRating = reviewData.reduce((acc, r) => acc + (r.rating || r.Rating || 0), 0) / totalReviews;
  const hasDeviceInfo = reviewData.some(r => r.device || r.Device || r.platform || r.Platform);
  const hasVersionInfo = reviewData.some(r => r.version || r.Version || r['App Version']);
  const hasDateInfo = reviewData.some(r => r.date || r.Date || r['Review Date']);
  const hasLocation = reviewData.some(r => r.location || r.Location || r.country || r.Country);
  const hasLanguage = reviewData.some(r => r.language || r.Language || r.lang);
  const hasUserInfo = reviewData.some(r => r.username || r.user || r['User Name']);
  
  // Get date range if available
  const dateRange = getDateRange(reviewData);
  const hasRecentData = dateRange && dateRange.totalDays < 30;
  
  // Define question categories
  const categories = {
    // Aspect-Based Sentiment & Emotion Analysis
    aspectAndEmotion: [
      "Show me aspect-based sentiment analysis across all reviews",
      "Which aspects of our app are users most positive/negative about?",
      "Create a visualization showing emotion distribution in recent reviews",
      "Which features trigger the most anger or frustration?",
      "How does UI sentiment compare to performance sentiment?",
      "Show me reviews with high-severity negative emotions for immediate action",
      "What percentage of reviews contain sarcasm or disappointment?",
      "Break down pricing sentiment by user persona",
      "Which aspects correlate most strongly with 1-star vs 5-star reviews?",
      "Create an emotion heatmap for the last 30 days"
    ],
    
    // Proactive Intelligence & Scenario Testing
    proactiveIntelligence: [
      "Give me this week's intelligence briefing on top issues and trends",
      "What happens if our login issues double in the next release?",
      "Simulate the impact if we don't fix the top 3 issues this month",
      "What are power users complaining about vs new users?",
      "Show me a forecast of our rating trajectory for next quarter",
      "What's the business impact if current negative trends continue?",
      "Which user personas are most at risk of churning?",
      "Alert me to any emerging issues in the last 48 hours",
      "What would happen if we removed the most complained about feature?",
      "Generate a risk assessment for our next release based on current feedback"
    ],
    
    // Data Science & Analytics
    dataScience: [
      "Perform sentiment analysis and show the emotional distribution in a pie chart",
      "What statistical patterns emerge from the review data?",
      "Can you identify any correlation between ratings and device types?",
      "Show me a predictive trend analysis for future ratings",
      "What's the standard deviation of ratings across different app versions?",
      "Perform a cohort analysis of users by review month",
      "Can you detect any anomalies or outliers in the review patterns?",
      "What's the confidence interval for our average rating?",
      "Show me a time series decomposition of review volume",
      "Calculate the review velocity and forecast next month's volume"
    ],
    
    // Business Intelligence
    businessIntelligence: [
      "Create a comprehensive dashboard showing key metrics and KPIs",
      "What insights can help improve our app's market position?",
      "Show me a competitive analysis based on user feedback",
      "What's our Net Promoter Score (NPS) based on the reviews?",
      "Identify the top 3 opportunities for business growth",
      "Create an executive summary with actionable insights",
      "What's the customer lifetime value indicated by review patterns?",
      "Show me a SWOT analysis based on customer feedback",
      "What market segments should we focus on based on the data?",
      "Calculate the potential revenue impact of addressing top complaints",
      "What's the ROI of fixing the most common issues?"
    ],
    
    // Technical Analysis
    technicalAnalysis: [
      "What technical issues are most frequently reported?",
      "Show me a breakdown of crashes and errors by device type",
      "Which app versions have the highest stability issues?",
      "Create a bug priority matrix based on user impact",
      "What performance issues are users experiencing?",
      "Show me a compatibility analysis across different OS versions",
      "Identify memory or battery drain complaints",
      "What API or backend issues are users reporting?",
      "Create a technical debt assessment from user feedback",
      "Which features have the most technical problems?"
    ],
    
    // Visualizations
    visualizations: [
      "Create an interactive line chart showing review trends over time",
      "Show me a heatmap of ratings by day and hour",
      "Generate a word cloud of most common terms in reviews",
      "Create a stacked bar chart of ratings by category",
      "Show me a geographic distribution map of reviews",
      "Create a bubble chart of feature requests by frequency and impact",
      "Generate a Sankey diagram of user journey issues",
      "Show me a radar chart comparing different app aspects",
      "Create a treemap of complaint categories",
      "Generate a correlation matrix of all review attributes"
    ],
    
    // Customer Experience
    customerExperience: [
      "What do customers love most about our product?",
      "Identify the top pain points in the customer journey",
      "Show me the customer satisfaction trend over the last quarter",
      "What features are customers requesting most frequently?",
      "Create a customer persona based on review data",
      "What's causing customer churn based on negative reviews?",
      "Show me the emotional journey map of our users",
      "What onboarding issues are new users facing?",
      "How has customer satisfaction evolved over time?",
      "What would make users give us 5 stars?"
    ],
    
    // Comparative Analysis
    comparativeAnalysis: [
      "Compare Android vs iOS user satisfaction",
      "Show me how different app versions perform",
      "Compare weekday vs weekend review patterns",
      "What's the difference between new and returning user feedback?",
      "Compare ratings across different countries/regions",
      "Show me seasonal patterns in customer feedback",
      "Compare premium vs free user satisfaction",
      "How do power users differ from casual users?",
      "Compare morning vs evening review sentiments"
    ]
  };
  
  // Build contextual suggestions based on data characteristics
  const contextualSuggestions = [];
  
  // Always include proactive intelligence questions
  contextualSuggestions.push("Give me this week's intelligence briefing");
  contextualSuggestions.push("What are the top 3 issues I should know about?");
  contextualSuggestions.push("Compare feedback from different user personas");
  
  // Add rating-based suggestions
  if (avgRating < 3.0) {
    contextualSuggestions.push("Why are we getting such low ratings? Create a root cause analysis");
    contextualSuggestions.push("What immediate actions can improve our rating to 4+ stars?");
  } else if (avgRating > 4.5) {
    contextualSuggestions.push("What makes our app so successful? Analyze our strengths");
    contextualSuggestions.push("How can we maintain and improve our high ratings?");
  }
  
  // Add time-based suggestions if date data exists
  if (hasDateInfo) {
    if (hasRecentData) {
      contextualSuggestions.push("Show me the review trend for the last 7 days with daily breakdown");
      contextualSuggestions.push("What changed in the last week that affected reviews?");
    } else {
      contextualSuggestions.push("Create a historical analysis of review trends");
      contextualSuggestions.push("Show me the long-term rating evolution");
    }
  }
  
  // Add device-specific suggestions
  if (hasDeviceInfo) {
    contextualSuggestions.push("Create a detailed device compatibility report");
    contextualSuggestions.push("Which devices have the most issues?");
  }
  
  // Add version-specific suggestions
  if (hasVersionInfo) {
    contextualSuggestions.push("Show me a version comparison dashboard");
    contextualSuggestions.push("Which version should we roll back to based on user feedback?");
  }
  
  // Add location-based suggestions
  if (hasLocation) {
    contextualSuggestions.push("Create a geographic analysis of user satisfaction");
    contextualSuggestions.push("Which markets should we prioritize for improvement?");
  }
  
  // Intelligently select from categories
  const selectedSuggestions = [];
  
  // Ensure variety by picking from different categories
  const categoryKeys = Object.keys(categories);
  const shuffledCategories = categoryKeys.sort(() => Math.random() - 0.5);
  
  // Pick at least one from each major category
  shuffledCategories.forEach(category => {
    const categoryQuestions = categories[category];
    const randomIndex = Math.floor(Math.random() * categoryQuestions.length);
    selectedSuggestions.push(categoryQuestions[randomIndex]);
  });
  
  // Combine contextual and category suggestions
  const allSuggestions = [...contextualSuggestions, ...selectedSuggestions];
  
  // Shuffle and ensure diversity
  const shuffled = allSuggestions.sort(() => Math.random() - 0.5);
  
  // Ensure we have a good mix of visualization and analysis questions
  const finalSuggestions = [];
  let hasViz = false;
  let hasAnalysis = false;
  let hasActionable = false;
  
  for (const suggestion of shuffled) {
    if (finalSuggestions.length >= 6) break;
    
    const isViz = suggestion.toLowerCase().includes('chart') || 
                  suggestion.toLowerCase().includes('graph') || 
                  suggestion.toLowerCase().includes('show') ||
                  suggestion.toLowerCase().includes('display') ||
                  suggestion.toLowerCase().includes('create');
    
    const isAnalysis = suggestion.toLowerCase().includes('analyze') || 
                      suggestion.toLowerCase().includes('why') || 
                      suggestion.toLowerCase().includes('what');
    
    const isActionable = suggestion.toLowerCase().includes('improve') || 
                        suggestion.toLowerCase().includes('action') || 
                        suggestion.toLowerCase().includes('should');
    
    // Ensure variety
    if (isViz && hasViz && finalSuggestions.length > 2) continue;
    if (isAnalysis && hasAnalysis && finalSuggestions.length > 2) continue;
    
    finalSuggestions.push(suggestion);
    
    if (isViz) hasViz = true;
    if (isAnalysis) hasAnalysis = true;
    if (isActionable) hasActionable = true;
  }
  
  // If we don't have certain types, add them
  if (!hasViz && finalSuggestions.length < 6) {
    finalSuggestions.push("Create a comprehensive visual dashboard of all key metrics");
  }
  
  if (!hasActionable && finalSuggestions.length < 6) {
    finalSuggestions.push("What are the top 3 actions we should take to improve user satisfaction?");
  }
  
  // Return 12-15 diverse, relevant suggestions for horizontal scrolling
  return finalSuggestions.slice(0, Math.min(15, Math.max(12, finalSuggestions.length)));
}