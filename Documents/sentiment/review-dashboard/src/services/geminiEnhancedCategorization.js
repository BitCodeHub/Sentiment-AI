import { GoogleGenerativeAI } from '@google/generative-ai';
import { aiAnalysisCache } from './cacheService';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyCgpECc-whrISaCwlwxXiZV_YppN4dTQT4';

// Log for debugging (remove in production)
console.log('Gemini API Key loaded:', apiKey ? 'Yes' : 'No');

const genAI = new GoogleGenerativeAI(apiKey);

// Helper function to clean JSON response from Gemini
const cleanJsonResponse = (text) => {
  // Remove markdown code blocks if present
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  // Trim whitespace
  text = text.trim();
  return text;
};

// Enhanced categorization with issue detection
export const analyzeReviewsWithIssues = async (reviews) => {
  try {
    // Check cache first
    const cacheKey = `enhanced_analysis_${reviews.length}`;
    const cachedResult = aiAnalysisCache.getReviewAnalysis(reviews);
    if (cachedResult && cachedResult.enhancedAnalysis) {
      return cachedResult.enhancedAnalysis;
    }

    // Prepare review sample
    const reviewSample = reviews.slice(0, 100).map(r => ({
      rating: r.rating || r.Rating,
      content: r.content || r['Review Text'] || r.Body || '',
      date: r.date || r.Date,
      author: r.author || r.Author,
      version: r.version || r.Version || r['App Version']
    }));

    const prompt = `Analyze these app reviews and categorize them by issues, complaints, and feedback types.

Reviews: ${JSON.stringify(reviewSample, null, 2)}

Please provide a comprehensive JSON response with:
{
  "issueCategories": {
    "technicalIssues": {
      "connectivity": { "count": 0, "severity": "high|medium|low", "examples": [] },
      "crashes": { "count": 0, "severity": "high|medium|low", "examples": [] },
      "performance": { "count": 0, "severity": "high|medium|low", "examples": [] },
      "bugs": { "count": 0, "severity": "high|medium|low", "examples": [] },
      "battery": { "count": 0, "severity": "high|medium|low", "examples": [] }
    },
    "functionalIssues": {
      "loginAuthentication": { "count": 0, "severity": "high|medium|low", "examples": [] },
      "dataSync": { "count": 0, "severity": "high|medium|low", "examples": [] },
      "navigation": { "count": 0, "severity": "high|medium|low", "examples": [] },
      "remoteControl": { "count": 0, "severity": "high|medium|low", "examples": [] },
      "notifications": { "count": 0, "severity": "high|medium|low", "examples": [] }
    },
    "userExperience": {
      "uiDesign": { "count": 0, "severity": "high|medium|low", "examples": [] },
      "usability": { "count": 0, "severity": "high|medium|low", "examples": [] },
      "features": { "count": 0, "severity": "high|medium|low", "examples": [] },
      "documentation": { "count": 0, "severity": "high|medium|low", "examples": [] }
    },
    "businessIssues": {
      "pricing": { "count": 0, "severity": "high|medium|low", "examples": [] },
      "customerService": { "count": 0, "severity": "high|medium|low", "examples": [] },
      "billing": { "count": 0, "severity": "high|medium|low", "examples": [] },
      "availability": { "count": 0, "severity": "high|medium|low", "examples": [] }
    }
  },
  "commonComplaints": [
    { "complaint": "description", "frequency": 0, "impact": "high|medium|low" }
  ],
  "featureRequests": [
    { "feature": "description", "frequency": 0, "potential": "high|medium|low" }
  ],
  "positiveAspects": [
    { "aspect": "description", "frequency": 0 }
  ],
  "trendingTopics": [
    { "topic": "name", "sentiment": "positive|negative|mixed", "count": 0 }
  ],
  "urgentIssues": [
    { "issue": "description", "affectedUsers": 0, "recommendedAction": "action" }
  ]
}

IMPORTANT: Return only valid JSON without any markdown formatting or additional text.`;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const response = await model.generateContent(prompt);
    
    const responseText = response.text();
    const cleanedResponse = cleanJsonResponse(responseText);
    const analysis = JSON.parse(cleanedResponse);
    
    // Cache the result
    if (cachedResult) {
      cachedResult.enhancedAnalysis = analysis;
      aiAnalysisCache.setReviewAnalysis(reviews, cachedResult);
    } else {
      aiAnalysisCache.setReviewAnalysis(reviews, { enhancedAnalysis: analysis });
    }
    
    return analysis;
  } catch (error) {
    console.error('Enhanced analysis error:', error);
    return getDefaultEnhancedAnalysis();
  }
};

// Enhanced categorization for individual reviews
export const categorizeReviewEnhanced = async (review) => {
  try {
    // Check cache first
    const cachedResult = aiAnalysisCache.getCategorizedReview(review.content);
    if (cachedResult && cachedResult.enhanced) {
      return cachedResult.enhanced;
    }

    const prompt = `Analyze this app review in detail and provide comprehensive categorization:

Review: "${review.content}"
Rating: ${review.rating}/5
Author: ${review.author || 'Anonymous'}
Date: ${review.date}

Please provide a JSON response with:
{
  "categories": {
    "primary": "Technical Issues|Login & Authentication|Feature Requests|UI/UX Issues|Payment & Billing|Customer Service|Connectivity|Positive Feedback|General Feedback",
    "secondary": ["list of secondary categories"],
    "tags": ["specific tags like 'crash', 'slow', 'login-failed', etc"]
  },
  "sentiment": {
    "overall": "positive|negative|neutral|mixed",
    "score": -1 to 1,
    "emotion": "frustrated|satisfied|angry|happy|neutral|disappointed"
  },
  "severity": {
    "level": "critical|high|medium|low",
    "urgency": "immediate|high|medium|low",
    "userImpact": "blocking|major|minor|none"
  },
  "issue": {
    "type": "bug|request|complaint|praise|question",
    "specific": "describe the specific issue or feedback",
    "suggestion": "any suggested action or response"
  },
  "actionable": true|false,
  "requiresResponse": true|false
}

IMPORTANT: Return only valid JSON without any markdown formatting or additional text.`;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const response = await model.generateContent(prompt);
    
    const responseText = response.text();
    const cleanedResponse = cleanJsonResponse(responseText);
    const categorization = JSON.parse(cleanedResponse);
    
    // Cache the result
    const cacheData = cachedResult || {};
    cacheData.enhanced = categorization;
    aiAnalysisCache.setCategorizedReview(review.content, cacheData);
    
    return categorization;
  } catch (error) {
    console.error('Enhanced categorization error:', error);
    return {
      categories: {
        primary: 'General Feedback',
        secondary: [],
        tags: []
      },
      sentiment: {
        overall: 'neutral',
        score: 0,
        emotion: 'neutral'
      },
      severity: {
        level: 'medium',
        urgency: 'medium',
        userImpact: 'minor'
      },
      issue: {
        type: 'complaint',
        specific: 'Unable to categorize',
        suggestion: 'Manual review required'
      },
      actionable: false,
      requiresResponse: false
    };
  }
};

// Helper function to aggregate issue distributions
export const getIssueDistribution = (categorizedReviews) => {
  const distribution = {
    byCategory: {},
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
    bySentiment: { positive: 0, negative: 0, neutral: 0, mixed: 0 },
    byType: { bug: 0, request: 0, complaint: 0, praise: 0, question: 0 },
    urgentIssues: [],
    topIssues: []
  };

  categorizedReviews.forEach(review => {
    if (!review.enhanced) return;

    const cat = review.enhanced;
    
    // Count by primary category
    distribution.byCategory[cat.categories.primary] = 
      (distribution.byCategory[cat.categories.primary] || 0) + 1;
    
    // Count by severity
    if (cat.severity && distribution.bySeverity[cat.severity.level] !== undefined) {
      distribution.bySeverity[cat.severity.level]++;
    }
    
    // Count by sentiment
    if (cat.sentiment && distribution.bySentiment[cat.sentiment.overall] !== undefined) {
      distribution.bySentiment[cat.sentiment.overall]++;
    }
    
    // Count by type
    if (cat.issue && distribution.byType[cat.issue.type] !== undefined) {
      distribution.byType[cat.issue.type]++;
    }
    
    // Collect urgent issues
    if (cat.severity?.urgency === 'immediate' || cat.severity?.level === 'critical') {
      distribution.urgentIssues.push({
        content: review.content,
        category: cat.categories.primary,
        severity: cat.severity.level,
        issue: cat.issue.specific,
        author: review.author,
        date: review.date
      });
    }
  });

  // Sort categories by frequency to get top issues
  distribution.topIssues = Object.entries(distribution.byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([category, count]) => ({ category, count }));

  return distribution;
};

// Default response for errors
const getDefaultEnhancedAnalysis = () => ({
  issueCategories: {
    technicalIssues: {
      connectivity: { count: 0, severity: 'medium', examples: [] },
      crashes: { count: 0, severity: 'medium', examples: [] },
      performance: { count: 0, severity: 'medium', examples: [] },
      bugs: { count: 0, severity: 'medium', examples: [] },
      battery: { count: 0, severity: 'medium', examples: [] }
    },
    functionalIssues: {
      loginAuthentication: { count: 0, severity: 'medium', examples: [] },
      dataSync: { count: 0, severity: 'medium', examples: [] },
      navigation: { count: 0, severity: 'medium', examples: [] },
      remoteControl: { count: 0, severity: 'medium', examples: [] },
      notifications: { count: 0, severity: 'medium', examples: [] }
    },
    userExperience: {
      uiDesign: { count: 0, severity: 'medium', examples: [] },
      usability: { count: 0, severity: 'medium', examples: [] },
      features: { count: 0, severity: 'medium', examples: [] },
      documentation: { count: 0, severity: 'medium', examples: [] }
    },
    businessIssues: {
      pricing: { count: 0, severity: 'medium', examples: [] },
      customerService: { count: 0, severity: 'medium', examples: [] },
      billing: { count: 0, severity: 'medium', examples: [] },
      availability: { count: 0, severity: 'medium', examples: [] }
    }
  },
  commonComplaints: [],
  featureRequests: [],
  positiveAspects: [],
  trendingTopics: [],
  urgentIssues: []
});