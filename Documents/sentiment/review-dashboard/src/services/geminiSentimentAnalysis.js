import { GoogleGenerativeAI } from '@google/generative-ai';
import { aiAnalysisCache } from './cacheService';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyCgpECc-whrISaCwlwxXiZV_YppN4dTQT4';
const genAI = new GoogleGenerativeAI(apiKey);

// Helper function to clean JSON response from Gemini
const cleanJsonResponse = (text) => {
  // Remove markdown code blocks if present
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  // Trim whitespace
  text = text.trim();
  return text;
};

export const performSentimentAnalysis = async (reviews) => {
  try {
    // Check cache first
    const cachedResult = aiAnalysisCache.getSentimentAnalysis(reviews);
    if (cachedResult) {
      console.log('Using cached sentiment analysis');
      return cachedResult;
    }

    // Prepare review samples by sentiment
    const positiveReviews = reviews.filter(r => r.sentiment === 'Positive' || r.sentiment === 'positive').slice(0, 20);
    const negativeReviews = reviews.filter(r => r.sentiment === 'Negative' || r.sentiment === 'negative').slice(0, 20);
    const neutralReviews = reviews.filter(r => r.sentiment === 'Neutral' || r.sentiment === 'neutral').slice(0, 10);

    const prompt = `Analyze the sentiment patterns and emotional drivers in these app reviews.

Positive Reviews (${positiveReviews.length} samples):
${positiveReviews.map(r => `- "${r.content?.substring(0, 150)}..." (Rating: ${r.rating})`).join('\n')}

Negative Reviews (${negativeReviews.length} samples):
${negativeReviews.map(r => `- "${r.content?.substring(0, 150)}..." (Rating: ${r.rating})`).join('\n')}

Neutral Reviews (${neutralReviews.length} samples):
${neutralReviews.map(r => `- "${r.content?.substring(0, 150)}..." (Rating: ${r.rating})`).join('\n')}

Total Reviews: ${reviews.length}
Sentiment Distribution: Positive: ${reviews.filter(r => r.sentiment?.toLowerCase() === 'positive').length}, Negative: ${reviews.filter(r => r.sentiment?.toLowerCase() === 'negative').length}, Neutral: ${reviews.filter(r => r.sentiment?.toLowerCase() === 'neutral').length}

Provide a comprehensive JSON sentiment analysis:
{
  "overallMood": {
    "primary": "satisfied|frustrated|mixed|neutral",
    "secondary": ["list of secondary emotions"],
    "score": -1 to 1,
    "confidence": 0 to 1
  },
  "emotionalDrivers": {
    "positive": [
      { "driver": "What makes users happy", "frequency": "high|medium|low", "examples": ["quotes"] }
    ],
    "negative": [
      { "driver": "What frustrates users", "frequency": "high|medium|low", "examples": ["quotes"] }
    ]
  },
  "sentimentTrends": {
    "direction": "improving|stable|declining",
    "keyShifts": ["Notable changes in sentiment"],
    "predictions": "Expected sentiment trajectory"
  },
  "customerVoice": {
    "loves": ["Top 3-5 things users love about the app"],
    "hates": ["Top 3-5 things users hate about the app"],
    "wishes": ["Top 3-5 things users wish for"]
  },
  "emotionalJourney": {
    "painPoints": [
      { "stage": "onboarding|usage|support", "emotion": "frustrated|confused|angry", "cause": "description" }
    ],
    "delightMoments": [
      { "stage": "onboarding|usage|support", "emotion": "happy|satisfied|impressed", "cause": "description" }
    ]
  },
  "actionableInsights": [
    {
      "insight": "Specific observation",
      "impact": "high|medium|low",
      "recommendation": "What to do about it",
      "expectedOutcome": "How it will improve sentiment"
    }
  ]
}

IMPORTANT: Return only valid JSON without any markdown formatting or additional text.`;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const response = await model.generateContent(prompt);
    
    const responseText = response.text();
    const cleanedResponse = cleanJsonResponse(responseText);
    const analysis = JSON.parse(cleanedResponse);
    
    // Cache the successful result
    aiAnalysisCache.setSentimentAnalysis(reviews, analysis);
    return analysis;
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    
    if (error.message?.includes('API key')) {
      throw new Error('Invalid Gemini API key. Please check your configuration.');
    } else if (error.message?.includes('quota')) {
      throw new Error('API quota exceeded. Please try again later.');
    } else {
      throw new Error(`Sentiment analysis failed: ${error.message || 'Unknown error'}`);
    }
  }
};

export const analyzeSentimentTrends = async (reviews, timeRange = 30) => {
  try {
    // Check cache
    const cacheKey = `sentiment_trends_${reviews.length}_${timeRange}`;
    const cachedResult = aiAnalysisCache.getSentimentAnalysis({ key: cacheKey });
    if (cachedResult) {
      console.log('Using cached sentiment trends');
      return cachedResult;
    }

    // Filter reviews by time range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRange);
    
    const recentReviews = reviews.filter(r => {
      const reviewDate = new Date(r.date || r.Date);
      return reviewDate >= cutoffDate;
    });

    const prompt = `Analyze sentiment trends and patterns over the last ${timeRange} days.

Total Reviews in Period: ${recentReviews.length}
Date Range: Last ${timeRange} days

Review Samples:
${recentReviews.slice(0, 20).map(r => `- Date: ${new Date(r.date).toLocaleDateString()}, Rating: ${r.rating}, Sentiment: ${r.sentiment}, Content: "${r.content?.substring(0, 100)}..."`).join('\n')}

Provide a comprehensive JSON analysis of sentiment trends:
{
  "trendSummary": {
    "direction": "improving|stable|declining",
    "magnitude": "significant|moderate|slight",
    "confidence": 0.0 to 1.0,
    "description": "Brief description of the trend"
  },
  "sentimentShifts": [
    {
      "period": "date range or description",
      "change": "what changed",
      "impact": "positive|negative|neutral",
      "possibleCause": "hypothesis about why it changed"
    }
  ],
  "weeklyPattern": {
    "bestDays": ["days when sentiment is highest"],
    "worstDays": ["days when sentiment is lowest"],
    "pattern": "description of weekly patterns if any"
  },
  "emergingThemes": [
    {
      "theme": "topic or issue",
      "sentiment": "positive|negative|mixed",
      "frequency": "increasing|stable|decreasing",
      "firstAppeared": "approximate date",
      "examples": ["sample reviews mentioning this"]
    }
  ],
  "predictions": {
    "nextWeek": {
      "sentiment": "likely to improve|remain stable|decline",
      "confidence": 0.0 to 1.0,
      "reasoning": "why we predict this"
    },
    "risksOpportunities": [
      {
        "type": "risk|opportunity",
        "description": "what to watch for",
        "likelihood": "high|medium|low",
        "impact": "high|medium|low"
      }
    ]
  },
  "recommendations": [
    {
      "action": "specific recommendation",
      "urgency": "immediate|high|medium|low",
      "expectedImpact": "what this will achieve"
    }
  ]
}

IMPORTANT: Return only valid JSON without any markdown formatting or additional text.`;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const response = await model.generateContent(prompt);
    
    const responseText = response.text();
    const cleanedResponse = cleanJsonResponse(responseText);
    const analysis = JSON.parse(cleanedResponse);
    
    // Cache the result
    aiAnalysisCache.setSentimentAnalysis({ key: cacheKey }, analysis);
    
    return analysis;
  } catch (error) {
    console.error('Sentiment trends analysis error:', error);
    
    if (error.message?.includes('API key')) {
      throw new Error('Invalid Gemini API key. Please check your configuration.');
    } else if (error.message?.includes('quota')) {
      throw new Error('API quota exceeded. Please try again later.');
    } else {
      throw new Error(`Sentiment trends analysis failed: ${error.message || 'Unknown error'}`);
    }
  }
};