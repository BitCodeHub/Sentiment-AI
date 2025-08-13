import OpenAI from 'openai';
import { aiAnalysisCache } from './cacheService';
import { rateLimiter } from './rateLimiter';

// Initialize OpenAI client
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

// Validate API key format
if (!apiKey || apiKey === 'your-openai-api-key-here') {
  console.warn('OpenAI API key is not properly configured. Please check your .env file.');
}

const openai = new OpenAI({
  apiKey: apiKey || 'sk-dummy-key', // Use dummy key to prevent initialization errors
  dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
});

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
}`;

    const response = await rateLimiter.addRequest(async () => 
      openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are an expert app review analyst. Provide detailed, data-driven insights that help product teams make informed decisions. Always return valid JSON."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      })
    );

    try {
      const analysis = JSON.parse(response.choices[0].message.content);
      // Cache the successful result
      aiAnalysisCache.setReviewAnalysis(reviews, analysis);
      return analysis;
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return a structured response even if parsing fails
      return {
        mainPainPoints: ["Failed to parse AI response"],
        featureRequests: ["Analysis unavailable"],
        technicalIssues: ["Please try again"],
        uiuxFeedback: "Unable to analyze UI/UX feedback",
        overallSentiment: "Unknown",
        recommendations: ["Please check your API key and try again"]
      };
    }
  } catch (error) {
    console.error('AI Analysis error:', error);
    
    // Check for specific error types and provide helpful messages
    if (error.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your .env file and ensure VITE_OPENAI_API_KEY is set correctly.');
    } else if (error.status === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please try again in a few moments.');
    } else if (error.status === 500 || error.status === 503) {
      throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
    } else if (error.message?.includes('apiKey')) {
      throw new Error('OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
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

Return format: {"tags": ["tag1", "tag2", ...], "priority": "high|medium|low"}`;

    const response = await rateLimiter.addRequest(async () => 
      openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 150
      })
    );

    const result = JSON.parse(response.choices[0].message.content);
    // Cache the successful result
    aiAnalysisCache.setCategorizedReview(reviewContent, result);
    return result;
  } catch (error) {
    console.error('Categorization error:', error);
    return { tags: ['General'], priority: 'medium' };
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
}`;

    const response = await rateLimiter.addRequest(async () => 
      openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are a strategic business analyst specializing in app performance and user satisfaction. Provide executive-level insights that drive business decisions. Always return valid JSON."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      })
    );

    try {
      const insights = JSON.parse(response.choices[0].message.content);
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
    console.error('Insights generation error:', error);
    
    // Check for specific error types and provide helpful messages
    if (error.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your .env file and ensure VITE_OPENAI_API_KEY is set correctly.');
    } else if (error.status === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please try again in a few moments.');
    } else if (error.status === 500 || error.status === 503) {
      throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
    } else if (error.message?.includes('apiKey')) {
      throw new Error('OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
    } else {
      throw new Error(`Failed to generate insights: ${error.message || 'Unknown error'}`);
    }
  }
};