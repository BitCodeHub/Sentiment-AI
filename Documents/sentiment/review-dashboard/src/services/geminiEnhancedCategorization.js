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
  // TEMPORARY: Force content-based categorization to debug
  const USE_API = false; // Change to true to enable API calls
  
  try {
    // Extract review content properly
    const reviewContent = review.content || review['Review Text'] || review.Body || '';
    const reviewRating = review.rating || review.Rating || 3;
    
    console.log('Categorizing review with content:', reviewContent.substring(0, 100), 'Rating:', reviewRating);
    
    // Check cache first
    const cachedResult = aiAnalysisCache.getCategorizedReview(reviewContent);
    if (cachedResult && cachedResult.enhanced) {
      console.log('Using cached categorization for:', reviewContent.substring(0, 50) + '...');
      return cachedResult.enhanced;
    }
    
    // If API is disabled, throw to trigger content-based categorization
    if (!USE_API) {
      throw new Error('API disabled for debugging - using content-based categorization');
    }
    
    const prompt = `Analyze this app review and categorize it intelligently:

Review: "${reviewContent}"
Rating: ${reviewRating}/5
Author: ${review.author || review.Author || 'Anonymous'}
Date: ${review.date || review.Date || 'Unknown'}

Categorize this review into ONE of these primary categories based on its content:
1. "Technical Issues" - for crashes, bugs, errors, app not working, performance problems
2. "Login & Authentication" - for login problems, password issues, account access issues
3. "Feature Requests" - for suggestions, new features, improvements, enhancements
4. "UI/UX Issues" - for design complaints, usability issues, navigation problems, layout issues
5. "Payment & Billing" - for payment errors, subscription issues, pricing complaints
6. "Customer Service" - for support complaints, response time, help requests
7. "Connectivity" - for network issues, sync problems, connection failures, vehicle connection
8. "Positive Feedback" - for praise, compliments, satisfaction, positive experiences
9. "General Feedback" - ONLY if it doesn't fit any above category

Return a JSON response with this exact structure:
{
  "categories": {
    "primary": "[Choose exactly ONE category from the list above]",
    "secondary": ["any additional relevant categories"],
    "tags": ["specific keywords like 'crash', 'slow', 'login-failed', 'vehicle-connection', etc"]
  },
  "sentiment": {
    "overall": "positive" or "negative" or "neutral" or "mixed",
    "score": number between -1 and 1,
    "emotion": "frustrated" or "satisfied" or "angry" or "happy" or "neutral" or "disappointed"
  },
  "severity": {
    "level": "critical" or "high" or "medium" or "low" or "none",
    "urgency": "immediate" or "high" or "medium" or "low",
    "userImpact": "blocking" or "major" or "minor" or "none"
  },
  "issue": {
    "type": "bug" or "request" or "complaint" or "praise" or "question",
    "specific": "brief description of the specific issue",
    "suggestion": "suggested action or response"
  },
  "actionable": true or false,
  "requiresResponse": true or false
}

IMPORTANT: Return ONLY valid JSON without any markdown formatting, backticks, or additional text.`;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    console.log('Sending categorization request to Gemini for review:', reviewContent.substring(0, 50) + '...');
    
    const response = await model.generateContent(prompt);
    
    const responseText = response.text();
    console.log('Raw Gemini response:', responseText);
    
    const cleanedResponse = cleanJsonResponse(responseText);
    console.log('Cleaned response:', cleanedResponse);
    
    const categorization = JSON.parse(cleanedResponse);
    console.log('Parsed categorization:', categorization);
    
    // Cache the result
    const cacheData = cachedResult || {};
    cacheData.enhanced = categorization;
    aiAnalysisCache.setCategorizedReview(review.content || reviewContent, cacheData);
    
    return categorization;
  } catch (error) {
    console.error('Enhanced categorization error:', error);
    console.error('Error details:', error.message);
    
    // Intelligent fallback based on content
    const reviewContent = review.content || review['Review Text'] || review.Body || '';
    const reviewText = reviewContent.toLowerCase();
    const rating = review.rating || review.Rating || 3;
    
    let primary = 'General Feedback';
    let sentiment = 'neutral';
    let severity = 'medium';
    let issueType = 'general';
    let tags = [];
    
    // Content-based categorization
    if (reviewText.includes('crash') || reviewText.includes('bug') || reviewText.includes('error') || 
        reviewText.includes('broken') || reviewText.includes('fix') || reviewText.includes('problem') ||
        reviewText.includes('issue') || reviewText.includes('not work') || reviewText.includes('problematic')) {
      primary = 'Technical Issues';
      sentiment = 'negative';
      severity = reviewText.includes('crash') ? 'critical' : 'high';
      issueType = 'bug';
      tags = ['technical', 'bug'];
    } else if (reviewText.includes('login') || reviewText.includes('password') || reviewText.includes('sign in') ||
               reviewText.includes('authentication') || reviewText.includes('account') || reviewText.includes('access')) {
      primary = 'Login & Authentication';
      sentiment = 'negative';
      severity = 'high';
      issueType = 'bug';
      tags = ['login', 'auth'];
    } else if (reviewText.includes('connect') || reviewText.includes('vehicle') || reviewText.includes('sync') ||
               reviewText.includes('network') || reviewText.includes('connection') || reviewText.includes('bluetooth')) {
      primary = 'Connectivity';
      sentiment = 'negative';
      severity = 'high';
      issueType = 'bug';
      tags = ['connectivity', 'sync'];
    } else if (reviewText.includes('pay') || reviewText.includes('charge') || reviewText.includes('subscription') ||
               reviewText.includes('billing') || reviewText.includes('price') || reviewText.includes('money')) {
      primary = 'Payment & Billing';
      sentiment = 'negative';
      severity = 'high';
      issueType = 'complaint';
      tags = ['payment', 'billing'];
    } else if (reviewText.includes('support') || reviewText.includes('help') || reviewText.includes('customer service') ||
               reviewText.includes('response') || reviewText.includes('contact') || reviewText.includes('ticket')) {
      primary = 'Customer Service';
      sentiment = 'negative';
      severity = 'medium';
      issueType = 'complaint';
      tags = ['support', 'service'];
    } else if (reviewText.includes('ui') || reviewText.includes('design') || reviewText.includes('interface') ||
               reviewText.includes('layout') || reviewText.includes('button') || reviewText.includes('screen')) {
      primary = 'UI/UX Issues';
      sentiment = 'negative';
      severity = 'low';
      issueType = 'complaint';
      tags = ['ui', 'design'];
    } else if (reviewText.includes('feature') || reviewText.includes('add') || reviewText.includes('would be nice') ||
               reviewText.includes('should') || reviewText.includes('could') || reviewText.includes('wish')) {
      primary = 'Feature Requests';
      sentiment = 'neutral';
      severity = 'low';
      issueType = 'request';
      tags = ['feature', 'request'];
    } else if ((reviewText.includes('love') || reviewText.includes('great') || reviewText.includes('excellent') ||
                reviewText.includes('perfect') || reviewText.includes('amazing')) && rating >= 4) {
      primary = 'Positive Feedback';
      sentiment = 'positive';
      severity = 'none';
      issueType = 'praise';
      tags = ['positive'];
    } else if (rating <= 2) {
      primary = 'Technical Issues';
      sentiment = 'negative';
      severity = 'medium';
      issueType = 'complaint';
    } else if (rating >= 4) {
      primary = 'Positive Feedback';
      sentiment = 'positive';
      severity = 'none';
      issueType = 'praise';
    }
    
    console.log('Fallback categorization:', primary);
    
    return {
      categories: {
        primary: primary,
        secondary: [],
        tags: tags
      },
      sentiment: {
        overall: sentiment,
        score: sentiment === 'positive' ? 0.8 : sentiment === 'negative' ? -0.8 : 0,
        emotion: sentiment === 'positive' ? 'satisfied' : sentiment === 'negative' ? 'frustrated' : 'neutral'
      },
      severity: {
        level: severity,
        urgency: severity === 'critical' ? 'immediate' : severity === 'high' ? 'high' : 'medium',
        userImpact: severity === 'critical' ? 'blocking' : severity === 'high' ? 'major' : 'minor'
      },
      issue: {
        type: issueType,
        specific: 'Categorized using content analysis',
        suggestion: sentiment === 'negative' ? 'Investigate and respond' : null
      },
      actionable: sentiment === 'negative',
      requiresResponse: sentiment === 'negative'
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
    // Handle both structures - enhanced property or direct properties
    const cat = review.enhanced || review;
    
    // Skip if no primary category
    if (!review.primaryCategory && !cat.categories?.primary) return;
    
    // Count by primary category
    const primaryCat = review.primaryCategory || cat.categories?.primary || 'General Feedback';
    distribution.byCategory[primaryCat] = 
      (distribution.byCategory[primaryCat] || 0) + 1;
    
    // Count by severity - handle both structures
    const severity = review.severity || cat.severity?.level || 'none';
    if (severity && distribution.bySeverity[severity] !== undefined) {
      distribution.bySeverity[severity]++;
    }
    
    // Count by sentiment - handle both structures
    const sentiment = review.sentiment || cat.sentiment?.overall || 'neutral';
    if (sentiment && distribution.bySentiment[sentiment] !== undefined) {
      distribution.bySentiment[sentiment]++;
    }
    
    // Count by type - handle both structures
    const issueType = review.issueType || cat.issue?.type || 'general';
    if (issueType && distribution.byType[issueType] !== undefined) {
      distribution.byType[issueType]++;
    }
    
    // Collect urgent issues
    const isUrgent = severity === 'critical' || 
                    cat.severity?.urgency === 'immediate' || 
                    cat.severity?.level === 'critical';
    if (isUrgent) {
      distribution.urgentIssues.push({
        content: review.content || review['Review Text'] || review.Body || '',
        category: primaryCat,
        severity: severity,
        issue: review.suggestedAction || cat.issue?.specific || 'Critical issue',
        author: review.author || review.Author || 'Unknown',
        date: review.date || review.Date
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