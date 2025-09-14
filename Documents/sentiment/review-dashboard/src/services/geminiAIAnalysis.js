import { GoogleGenerativeAI } from '@google/generative-ai';
import { aiAnalysisCache } from './cacheService';
import { rateLimiter } from './rateLimiter';

// Initialize Gemini client with provided API key
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyCgpECc-whrISaCwlwxXiZV_YppN4dTQT4';

// Validate API key format
if (!apiKey || apiKey === 'your-gemini-api-key-here') {
  console.warn('Gemini API key is not properly configured. Using default key.');
}

const genAI = new GoogleGenerativeAI(apiKey);

// Export function to get the API key
export const getGeminiApiKey = () => {
  return apiKey;
};

// Helper function to clean JSON response from Gemini
const cleanJsonResponse = (text) => {
  // Remove markdown code blocks if present
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  // Trim whitespace
  text = text.trim();
  return text;
};

export const analyzeReviews = async (reviews) => {
  try {
    // Check cache first
    const cachedResult = aiAnalysisCache.getReviewAnalysis(reviews);
    if (cachedResult) {
      console.log('Using cached review analysis');
      return cachedResult;
    }

    // Prepare a sample of reviews for analysis
    const reviewSample = reviews.slice(0, 50).map(r => ({
      rating: r.rating,
      content: r.content,
      sentiment: r.sentiment
    }));

    const prompt = `You are an expert app review analyst. Analyze these app reviews and provide comprehensive insights:

Reviews: ${JSON.stringify(reviewSample, null, 2)}

Total reviews analyzed: ${reviews.length}
Average rating: ${(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2)}

Please provide a detailed JSON response with exactly these fields:
{
  "mainPainPoints": [
    "Be specific about the top 5 pain points users are experiencing",
    "Include frequency and severity indicators",
    "Quote actual user feedback where relevant",
    "Focus on issues that impact user experience most",
    "Identify patterns across multiple reviews"
  ],
  "featureRequests": [
    "List top 5 most requested features based on user feedback",
    "Include why users want these features",
    "Prioritize by frequency of requests",
    "Note any features competitors might have",
    "Suggest implementation priority"
  ],
  "technicalIssues": [
    "List specific technical problems (crashes, bugs, performance)",
    "Include affected platforms/versions if mentioned",
    "Note frequency and impact of each issue",
    "Identify patterns in technical complaints"
  ],
  "uiuxFeedback": "Provide a comprehensive summary of UI/UX feedback including navigation issues, design complaints, usability problems, and positive UI elements users appreciate",
  "overallSentiment": "Provide a detailed sentiment analysis explaining whether feedback is positive/negative/mixed, include specific percentages, highlight sentiment trends, and explain the reasoning behind the assessment",
  "recommendations": [
    "Provide 5-7 specific, actionable recommendations",
    "Prioritize by impact and urgency",
    "Include quick wins and long-term improvements",
    "Base recommendations on actual user feedback",
    "Consider technical feasibility and user value"
  ]
}

IMPORTANT: Return only valid JSON without any markdown formatting or additional text.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const response = await rateLimiter.addRequest(async () => {
      const result = await model.generateContent(prompt);
      return result.response;
    });

    try {
      const responseText = response.text();
      const cleanedResponse = cleanJsonResponse(responseText);
      const analysis = JSON.parse(cleanedResponse);
      
      // Cache the successful result
      aiAnalysisCache.setReviewAnalysis(reviews, analysis);
      return analysis;
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      console.error('Raw response:', response.text());
      
      // Return a structured response even if parsing fails
      return {
        mainPainPoints: ["Failed to parse AI response", "Please check the console for details"],
        featureRequests: ["Analysis unavailable"],
        technicalIssues: ["Please try again"],
        uiuxFeedback: "Unable to analyze UI/UX feedback",
        overallSentiment: "Unknown",
        recommendations: ["Please check your API configuration and try again"]
      };
    }
  } catch (error) {
    console.error('Gemini Analysis error:', error);
    
    // Check for specific error types and provide helpful messages
    if (error.message?.includes('API key not valid')) {
      throw new Error('Invalid Gemini API key. Please check your configuration.');
    } else if (error.message?.includes('quota')) {
      throw new Error('Gemini API quota exceeded. Please try again later.');
    } else if (error.message?.includes('500') || error.message?.includes('503')) {
      throw new Error('Gemini service is temporarily unavailable. Please try again later.');
    } else {
      throw new Error(`Failed to analyze reviews: ${error.message || 'Unknown error'}`);
    }
  }
};

export const categorizeReview = async (reviewContent) => {
  try {
    // Check cache first
    const cachedResult = aiAnalysisCache.getCategorizedReview(reviewContent);
    if (cachedResult) {
      console.log('Using cached categorization');
      return cachedResult;
    }

    const prompt = `Categorize this app review into relevant tags. Return a JSON array of tags.

Review: "${reviewContent}"

Possible tags include but are not limited to:
- Bug Report
- Feature Request
- Performance Issue
- UI/UX Feedback
- Login Problems
- Connectivity Issues
- Battery Drain
- Crash Report
- Payment Issue
- Data Sync Problem
- Navigation Issue
- Remote Features
- Vehicle Status
- Notifications
- Customer Service
- Technical Issues
- Positive Feedback
- General Feedback

Analyze the review and assign appropriate tags based on the content. Also determine the priority level.

Return format: {"tags": ["tag1", "tag2", ...], "priority": "high|medium|low"}

IMPORTANT: Return only valid JSON without any markdown formatting or additional text.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const response = await rateLimiter.addRequest(async () => {
      const result = await model.generateContent(prompt);
      return result.response;
    });

    const responseText = response.text();
    const cleanedResponse = cleanJsonResponse(responseText);
    const result = JSON.parse(cleanedResponse);
    
    // Cache the successful result
    aiAnalysisCache.setCategorizedReview(reviewContent, result);
    return result;
  } catch (error) {
    console.error('Gemini categorization error:', error);
    return { tags: ['General Feedback'], priority: 'medium' };
  }
};

export const generateInsights = async (aggregatedData) => {
  try {
    // Check cache first
    const cachedResult = aiAnalysisCache.getInsights(aggregatedData);
    if (cachedResult) {
      console.log('Using cached insights');
      return cachedResult;
    }

    const prompt = `You are a strategic business analyst. Based on this app review data, provide comprehensive strategic insights:

App Review Analytics Summary:
- Total Reviews: ${aggregatedData.summary.totalReviews}
- Average Rating: ${aggregatedData.summary.avgRating}/5.0
- Rating Distribution: ${JSON.stringify(aggregatedData.ratingDistribution)}
- Sentiment Distribution: Positive: ${aggregatedData.sentimentDistribution.Positive}, Neutral: ${aggregatedData.sentimentDistribution.Neutral}, Negative: ${aggregatedData.sentimentDistribution.Negative}
- Top Keywords: ${aggregatedData.topKeywords.slice(0, 15).map(k => k.word).join(', ')}
- Response Rate: ${aggregatedData.responseRate}%
- Platform Distribution: ${JSON.stringify(aggregatedData.platformDistribution)}

Please provide a comprehensive JSON response with exactly these fields:
{
  "executiveSummary": "Provide a 3-4 sentence executive summary that captures the overall health of the app, key challenges, opportunities, and recommended focus areas. Be specific and data-driven.",
  "keyStrengths": [
    "List 4-6 key strengths based on positive reviews and high ratings",
    "Include specific features or aspects users love",
    "Mention competitive advantages",
    "Highlight what's driving user satisfaction",
    "Use data to support each strength"
  ],
  "criticalIssues": [
    "List 4-6 critical issues requiring immediate attention",
    "Prioritize by impact on user retention and ratings",
    "Include specific user complaints and their frequency",
    "Note issues that could lead to user churn",
    "Suggest urgency level for each issue"
  ],
  "trendAnalysis": "Provide detailed insights about trends in the reviews including: sentiment trends over time, emerging issues, improving areas, seasonal patterns if any, and predictions for future user satisfaction based on current trajectory.",
  "competitivePositioning": "Provide strategic recommendations for competitive positioning including: unique value propositions to emphasize, features to develop for competitive advantage, market gaps to exploit, positioning strategies based on user feedback, and specific actions to differentiate from competitors."
}

IMPORTANT: Return only valid JSON without any markdown formatting or additional text.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const response = await rateLimiter.addRequest(async () => {
      const result = await model.generateContent(prompt);
      return result.response;
    });

    try {
      const responseText = response.text();
      const cleanedResponse = cleanJsonResponse(responseText);
      const insights = JSON.parse(cleanedResponse);
      
      // Cache the successful result
      aiAnalysisCache.setInsights(aggregatedData, insights);
      return insights;
    } catch (parseError) {
      console.error('Failed to parse insights response:', parseError);
      return {
        executiveSummary: "Unable to generate insights due to parsing error",
        keyStrengths: ["Analysis unavailable"],
        criticalIssues: ["Please try again"],
        trendAnalysis: "Unable to analyze trends",
        competitivePositioning: "Unable to provide positioning recommendations"
      };
    }
  } catch (error) {
    console.error('Gemini insights generation error:', error);
    
    // Check for specific error types and provide helpful messages
    if (error.message?.includes('API key not valid')) {
      throw new Error('Invalid Gemini API key. Please check your configuration.');
    } else if (error.message?.includes('quota')) {
      throw new Error('Gemini API quota exceeded. Please try again later.');
    } else if (error.message?.includes('500') || error.message?.includes('503')) {
      throw new Error('Gemini service is temporarily unavailable. Please try again later.');
    } else {
      throw new Error(`Failed to generate insights: ${error.message || 'Unknown error'}`);
    }
  }
};