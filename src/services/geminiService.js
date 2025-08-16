// Google Gemini API Service for Deep Content Analysis
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini with API key
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyCJP6OG7y82p0Eju_Qv-GsUeaWz-vjhvRg';

console.log('Gemini API Key status:', API_KEY ? `Key found (length: ${API_KEY.length})` : 'No key found');
console.log('Environment:', import.meta.env.MODE);
console.log('All env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));

let genAI;
let model;

// Function to initialize/reinitialize the model
export async function initializeGeminiModel() {
  try {
    console.log('Initializing Gemini AI with API key:', API_KEY ? `${API_KEY.substring(0, 10)}...` : 'missing');
    
    // Check if API key is valid format
    if (!API_KEY || API_KEY.length < 30) {
      throw new Error(`Invalid API key format. Key length: ${API_KEY?.length || 0}`);
    }
    
    genAI = new GoogleGenerativeAI(API_KEY);
    
    // Try different models with better error handling
    const generationConfig = {
      temperature: 0.7,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    };

    const safetySettings = [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE"
      }
    ];

    // Try models in order of availability (based on API key test)
    const modelsToTry = [
      'gemini-1.5-flash',  // Fast and available
      'gemini-1.5-flash-latest',
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-1.5-pro',
      'gemini-1.5-pro-latest',
      'gemini-2.0-flash-lite'
    ];

    const triedModels = [];
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying model: ${modelName}`);
        model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig,
          safetySettings
        });
        
        // Test the model with a simple prompt
        const testResult = await model.generateContent('Respond with: "OK"');
        const testResponse = await testResult.response;
        const testText = testResponse.text();
        
        console.log(`Model ${modelName} initialized and tested successfully`);
        return { success: true, model: modelName, triedModels };
      } catch (error) {
        console.warn(`Model ${modelName} failed:`, error.message, error);
        
        const errorInfo = {
          model: modelName,
          error: error.message,
          status: error.status,
          statusText: error.statusText
        };
        
        triedModels.push(errorInfo);
        
        // Log more details for debugging
        if (error.message?.includes('API key') || error.message?.includes('API_KEY')) {
          console.error('API key issue detected for model:', modelName);
        }
        if (error.message?.includes('404') || error.message?.includes('not found')) {
          console.error('Model not found:', modelName);
        }
        if (error.status) {
          console.error(`HTTP status ${error.status} for model ${modelName}`);
        }
      }
    }
    
    // Try one more time with gemini-1.5-flash as a last resort
    try {
      console.log('Final attempt with basic gemini-1.5-flash configuration...');
      model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const testResult = await model.generateContent('Say OK');
      const testResponse = await testResult.response;
      console.log('Basic gemini-1.5-flash model worked!');
      return { success: true, model: 'gemini-1.5-flash', triedModels };
    } catch (finalError) {
      console.error('Final attempt failed:', finalError.message);
    }
    
    const errorDetails = {
      message: `No Gemini models available`,
      apiKey: `${API_KEY.substring(0, 10)}... (${API_KEY.length} chars)`,
      triedModels: triedModels
    };
    
    throw new Error(JSON.stringify(errorDetails));
  } catch (error) {
    console.error('Failed to initialize any Gemini model:', error);
    model = null;
    return { success: false, error: error.message, triedModels: error.triedModels || [] };
  }
}

// Initialize on load
initializeGeminiModel();

// Cache for API responses
const analysisCache = new Map();

// Test function to verify Gemini is working
export async function testGeminiConnection() {
  try {
    // First check if we have an API key
    if (!API_KEY) {
      return { 
        success: false, 
        error: 'No API key found. Please set VITE_GEMINI_API_KEY in Render environment variables.',
        apiKey: 'Missing',
        envVars: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'))
      };
    }
    
    if (!model) {
      console.log('Model not initialized, attempting to initialize...');
      const initResult = await initializeGeminiModel();
      if (!initResult.success) {
        return { 
          success: false, 
          error: 'Failed to initialize model: ' + initResult.error,
          apiKey: `Present (${API_KEY.length} chars)`,
          triedModels: initResult.triedModels || []
        };
      }
    }
    
    console.log('Testing Gemini connection with API key:', API_KEY ? 'Present' : 'Missing');
    const testPrompt = 'Reply with only this JSON: {"status": "working", "message": "Gemini AI is operational"}';
    
    const result = await model.generateContent(testPrompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini test response:', text);
    return { success: true, response: text };
  } catch (error) {
    console.error('Gemini test error:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      details: error,
      apiKey: API_KEY ? `Present (${API_KEY.length} chars)` : 'Missing',
      apiKeyStart: API_KEY ? API_KEY.substring(0, 10) : 'N/A'
    };
  }
}

export async function analyzeReviewsWithGemini(reviews, context = {}) {
  try {
    console.log('analyzeReviewsWithGemini called with:', {
      reviewCount: reviews?.length,
      hasModel: !!model,
      apiKey: API_KEY ? `${API_KEY.substring(0, 10)}...` : 'missing'
    });
    
    if (!model) {
      console.error('Gemini model not initialized');
      return null;
    }
    
    // Remove the API key check since we have a valid key
    if (!API_KEY) {
      console.warn('No API key found');
      return null;
    }
    
    // Create a cache key
    const cacheKey = `${context.appName}_${reviews.length}_${Date.now()}`;
    
    // Check cache (with 5 minute expiry)
    const cached = analysisCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 300000)) {
      return cached.data;
    }

    // Prepare review sample (limit to avoid token limits)
    const reviewSample = reviews.slice(0, 15).map(r => ({
      rating: r.rating || r.Rating,
      content: (r.content || r['Review Text'] || r.Body || '').substring(0, 100),
      date: r.date || r.Date
    }));

    const prompt = `You are a helpful assistant analyzing mobile app reviews. Please analyze these reviews and provide insights in JSON format.

App: ${context.appName || 'Unknown'}
Total Reviews: ${reviews.length}

Sample Reviews:
${reviewSample.map(r => `- Rating: ${r.rating}/5 - "${r.content}"`).join('\n')}

Please analyze these reviews and return a valid JSON response with this structure:
{
  "technicalIssues": [
    {"issue": "crash on startup", "frequency": 45, "severity": "high"},
    {"issue": "slow loading", "frequency": 32, "severity": "medium"}
  ],
  "featureRequests": [
    {"feature": "dark mode", "count": 28, "priority": "high"},
    {"feature": "offline mode", "count": 19, "priority": "medium"}
  ],
  "painPoints": {
    "categories": {
      "performance": {"count": 67, "percentage": 22.3, "mainIssues": ["slow", "lag"], "severity": "high"},
      "usability": {"count": 45, "percentage": 15.0, "mainIssues": ["confusing UI"], "severity": "medium"},
      "reliability": {"count": 38, "percentage": 12.7, "mainIssues": ["crashes"], "severity": "high"},
      "features": {"count": 55, "percentage": 18.3, "mainIssues": ["missing features"], "severity": "medium"},
      "support": {"count": 12, "percentage": 4.0, "mainIssues": ["no response"], "severity": "low"}
    }
  },
  "positiveAspects": {
    "categories": {
      "performance": {"mentions": 23, "examples": ["fast", "smooth"]},
      "usability": {"mentions": 45, "examples": ["easy to use", "intuitive"]},
      "features": {"mentions": 67, "examples": ["love the filters", "great functionality"]},
      "design": {"mentions": 34, "examples": ["beautiful UI", "clean design"]}
    }
  },
  "recommendations": {
    "immediate": [
      {"action": "Fix app crashes on startup", "impact": "high", "effort": "medium"},
      {"action": "Improve loading speed", "impact": "high", "effort": "low"}
    ],
    "shortTerm": [
      {"action": "Add dark mode", "impact": "medium", "effort": "medium"}
    ],
    "longTerm": [
      {"action": "Redesign navigation", "impact": "high", "effort": "high"}
    ]
  }
}`;

    console.log('Sending prompt to Gemini API...');
    console.log('Prompt length:', prompt.length);
    
    try {
      // Add retry logic for better reliability
      let result;
      let retries = 2;
      let lastError;
      
      while (retries >= 0) {
        try {
          console.log(`Attempting Gemini API call (attempt ${3 - retries}/3)...`);
          result = await model.generateContent(prompt);
          console.log('Gemini API call successful!');
          break; // Success, exit retry loop
        } catch (error) {
          console.error(`Gemini API error on attempt ${3 - retries}:`, {
            name: error.name,
            message: error.message,
            status: error.status,
            statusText: error.statusText
          });
          lastError = error;
          retries--;
          if (retries >= 0) {
            console.log(`Retrying in 1 second... (${retries + 1} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
      }
      
      if (!result) {
        console.error('All Gemini API attempts failed');
        throw lastError || new Error('Failed to get response from Gemini');
      }
      
      const response = await result.response;
      const text = response.text();
      
      console.log('Received response from Gemini, length:', text.length);
      
      // Parse JSON from response
      let analysisData;
      try {
        // Clean the response - remove markdown code blocks if present
        let cleanedText = text;
        if (text.includes('```json')) {
          cleanedText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        } else if (text.includes('```')) {
          cleanedText = text.replace(/```\s*/g, '');
        }
        
        // Extract JSON from the response
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisData = JSON.parse(jsonMatch[0]);
          console.log('Successfully parsed Gemini response');
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', parseError);
        console.log('Raw response:', text.substring(0, 500));
        // Try to extract useful information even if JSON parsing fails
        analysisData = parseGeminiTextResponse(text);
      }

      // Cache the result
      analysisCache.set(cacheKey, {
        data: analysisData,
        timestamp: Date.now()
      });

      console.log('Analysis completed successfully');
      return analysisData;
    } catch (apiError) {
      console.error('Gemini API call failed:', apiError.message || apiError);
      console.error('Error details:', {
        name: apiError.name,
        message: apiError.message,
        stack: apiError.stack?.substring(0, 200),
        statusCode: apiError.statusCode,
        status: apiError.status
      });
      
      // Check for specific error types
      if (apiError.message?.includes('API key not valid') || apiError.message?.includes('invalid API key')) {
        console.error('Invalid API key. Please check your Gemini API key.');
      } else if (apiError.message?.includes('quota') || apiError.message?.includes('rate limit')) {
        console.error('API quota exceeded or rate limit hit. Using pattern-based analysis.');
      } else if (apiError.message?.includes('model not found')) {
        console.error('Model not available. Check if the model name is correct.');
      }
      
      throw apiError;
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

// Compare two apps using Gemini
export async function compareAppsWithGemini(userReviews, competitorReviews, userAppName, competitorAppName) {
  try {
    if (!model) {
      console.error('Gemini model not initialized');
      return null;
    }
    const userSample = userReviews.slice(0, 15).map(r => ({
      rating: r.rating || r.Rating,
      content: (r.content || r['Review Text'] || r.Body || '').substring(0, 150)
    }));
    
    const competitorSample = competitorReviews.slice(0, 15).map(r => ({
      rating: r.rating || r.Rating,
      content: (r.content || r['Review Text'] || r.Body || '').substring(0, 150)
    }));

    const prompt = `Compare these two mobile apps based on user reviews.

App 1: ${userAppName} (${userReviews.length} reviews)
Sample: ${userSample.map(r => `${r.rating}★: "${r.content}"`).join('\n')}

App 2: ${competitorAppName} (${competitorReviews.length} reviews)
Sample: ${competitorSample.map(r => `${r.rating}★: "${r.content}"`).join('\n')}

Analyze and return ONLY valid JSON:
{
  "competitivePositioning": {
    "${userAppName}": {
      "strengths": ["list of strengths vs competitor"],
      "weaknesses": ["list of weaknesses"],
      "opportunities": ["improvement opportunities"],
      "threats": ["competitive threats"]
    },
    "${competitorAppName}": {
      "strengths": ["list"],
      "weaknesses": ["list"],
      "opportunities": ["list"],
      "threats": ["list"]
    }
  },
  "performanceGaps": [
    {
      "area": "Area name",
      "gap": "Description",
      "userPerformance": number,
      "competitorPerformance": number,
      "severity": "critical/high/medium/low",
      "recommendation": "What to do"
    }
  ],
  "featureComparison": {
    "userHas_competitorLacks": ["list"],
    "competitorHas_userLacks": ["list"],
    "commonFeatures": ["list"],
    "userRequests_competitorHas": ["features users want that competitor already has"]
  },
  "marketInsights": {
    "userDifferentiation": "How user app differs",
    "competitorDifferentiation": "How competitor differs",
    "marketTrends": ["identified trends"],
    "userOpportunities": ["specific opportunities"]
  },
  "strategicRecommendations": [
    {
      "priority": 1,
      "recommendation": "Specific recommendation",
      "expectedImpact": "Description",
      "implementation": "How to implement",
      "timeframe": "immediate/short-term/long-term"
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse comparison response:', parseError);
    }
    
    return null;
  } catch (error) {
    console.error('Gemini comparison error:', error);
    throw error;
  }
}

// Fallback parser for text responses
function parseGeminiTextResponse(text) {
  // Basic structure with parsed content
  return {
    summary: {
      overallSentiment: "mixed",
      keyThemes: extractThemes(text),
      criticalIssuesCount: 0,
      satisfactionScore: 50
    },
    technicalIssues: [],
    featureRequests: [],
    painPoints: {
      categories: {
        performance: { count: 0, percentage: 0, mainIssues: [], severity: "medium" },
        usability: { count: 0, percentage: 0, mainIssues: [], severity: "medium" },
        reliability: { count: 0, percentage: 0, mainIssues: [], severity: "medium" },
        features: { count: 0, percentage: 0, mainIssues: [], severity: "medium" },
        support: { count: 0, percentage: 0, mainIssues: [], severity: "medium" }
      }
    },
    positiveAspects: {
      categories: {}
    },
    recommendations: {
      immediate: [],
      shortTerm: [],
      longTerm: []
    }
  };
}

function extractThemes(text) {
  // Simple theme extraction
  const themes = [];
  const keywords = ['performance', 'feature', 'bug', 'crash', 'design', 'user interface', 'support'];
  keywords.forEach(keyword => {
    if (text.toLowerCase().includes(keyword)) {
      themes.push(keyword);
    }
  });
  return themes;
}

// Get insights for specific category
export async function getCategoryInsights(reviews, category) {
  try {
    const categoryReviews = reviews.filter(r => {
      const content = (r.content || r['Review Text'] || r.Body || '').toLowerCase();
      return content.includes(category.toLowerCase());
    });

    if (categoryReviews.length === 0) {
      return null;
    }

    const prompt = `Analyze these reviews specifically for ${category} issues and provide detailed insights:

Reviews: ${JSON.stringify(categoryReviews.slice(0, 20).map(r => ({
      rating: r.rating || r.Rating,
      content: r.content || r['Review Text'] || r.Body || ''
    })), null, 2)}

Provide insights in JSON format:
{
  "categoryAnalysis": {
    "mainIssues": ["list"],
    "rootCauses": ["possible causes"],
    "userImpact": "description",
    "suggestedFixes": ["actionable fixes"],
    "priority": "critical/high/medium/low"
  }
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return null;
  } catch (error) {
    console.error('Category insights error:', error);
    return null;
  }
}