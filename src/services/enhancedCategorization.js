import OpenAI from 'openai';
import { aiAnalysisCache } from './cacheService';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

// Log for debugging (remove in production)
console.log('API Key loaded:', apiKey ? 'Yes' : 'No');

const openai = new OpenAI({
  apiKey: apiKey || 'sk-dummy-key',
  dangerouslyAllowBrowser: true
});

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
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Changed to a more available model
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    
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
    // Return fallback structure
    return {
      issueCategories: {
        technicalIssues: {},
        functionalIssues: {},
        userExperience: {},
        businessIssues: {}
      },
      commonComplaints: [],
      featureRequests: [],
      positiveAspects: [],
      trendingTopics: [],
      urgentIssues: []
    };
  }
};

// Categorize individual review with enhanced detail
export const categorizeReviewEnhanced = async (review) => {
  try {
    const reviewText = review.content || review['Review Text'] || review.Body || '';
    const cacheKey = `enhanced_cat_${reviewText.substring(0, 100)}`;
    const cachedResult = aiAnalysisCache.getCategorizedReview(cacheKey);
    if (cachedResult && cachedResult.primaryCategory) {
      return cachedResult;
    }

    const prompt = `Analyze this app review and categorize it. Be specific and accurate.

Review: "${reviewText}"
Rating: ${review.rating || review.Rating}/5

Categories to choose from:
- Technical Issues (crashes, bugs, performance, battery drain)
- Login & Authentication (login problems, password issues, account access)
- Feature Requests (new features, improvements, enhancements)
- UI/UX Issues (design, usability, navigation, layout)
- Payment & Billing (payment issues, subscription, pricing)
- Customer Service (support, response time, help)
- Connectivity (network issues, sync problems, connection failed)
- Positive Feedback (praise, satisfaction, recommendations)
- General Feedback (neutral, mixed feedback, other)

Return EXACTLY this JSON format:
{
  "primaryCategory": "ONE of the categories listed above",
  "categories": ["array of ALL relevant categories from the list"],
  "issueType": "technical|functional|ux|business|praise|neutral",
  "severity": "critical|high|medium|low|none",
  "sentiment": "positive|negative|neutral|mixed",
  "isActionable": true|false,
  "suggestedAction": "specific action to address the issue or null",
  "tags": ["specific feature/area tags"],
  "keyPhrases": ["key phrases from review"],
  "emotion": "frustrated|satisfied|angry|happy|neutral|disappointed"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 400,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    // Validate and ensure we have proper category
    if (!result.primaryCategory || result.primaryCategory === 'Uncategorized') {
      // Try to determine category from review content
      const lowerReview = reviewText.toLowerCase();
      if (lowerReview.includes('crash') || lowerReview.includes('bug') || lowerReview.includes('error')) {
        result.primaryCategory = 'Technical Issues';
      } else if (lowerReview.includes('login') || lowerReview.includes('password')) {
        result.primaryCategory = 'Login & Authentication';
      } else if (lowerReview.includes('feature') || lowerReview.includes('want') || lowerReview.includes('add')) {
        result.primaryCategory = 'Feature Requests';
      } else if (lowerReview.includes('ui') || lowerReview.includes('design') || lowerReview.includes('layout')) {
        result.primaryCategory = 'UI/UX Issues';
      } else if (lowerReview.includes('pay') || lowerReview.includes('subscription') || lowerReview.includes('price')) {
        result.primaryCategory = 'Payment & Billing';
      } else if (lowerReview.includes('support') || lowerReview.includes('help') || lowerReview.includes('customer')) {
        result.primaryCategory = 'Customer Service';
      } else if (lowerReview.includes('connect') || lowerReview.includes('network') || lowerReview.includes('sync')) {
        result.primaryCategory = 'Connectivity';
      } else if ((review.rating || review.Rating) >= 4) {
        result.primaryCategory = 'Positive Feedback';
      } else {
        result.primaryCategory = 'General Feedback';
      }
    }
    
    aiAnalysisCache.setCategorizedReview(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Enhanced categorization error:', error);
    
    // Better fallback categorization based on review content
    const reviewText = (review.content || review['Review Text'] || review.Body || '').toLowerCase();
    const rating = review.rating || review.Rating || 3;
    
    let primaryCategory = 'General Feedback';
    let issueType = 'neutral';
    let severity = 'none';
    let sentiment = 'neutral';
    
    if (reviewText.includes('crash') || reviewText.includes('bug') || reviewText.includes('error') || reviewText.includes('not working')) {
      primaryCategory = 'Technical Issues';
      issueType = 'technical';
      severity = 'high';
      sentiment = 'negative';
    } else if (reviewText.includes('login') || reviewText.includes('password') || reviewText.includes('sign') || reviewText.includes('auth')) {
      primaryCategory = 'Login & Authentication';
      issueType = 'functional';
      severity = 'medium';
      sentiment = 'negative';
    } else if (reviewText.includes('pay') || reviewText.includes('charge') || reviewText.includes('subscription') || reviewText.includes('bill')) {
      primaryCategory = 'Payment & Billing';
      issueType = 'business';
      severity = 'high';
      sentiment = 'negative';
    } else if (reviewText.includes('feature') || reviewText.includes('add') || reviewText.includes('want') || reviewText.includes('wish')) {
      primaryCategory = 'Feature Requests';
      issueType = 'functional';
      sentiment = 'neutral';
    } else if (reviewText.includes('ui') || reviewText.includes('design') || reviewText.includes('interface') || reviewText.includes('layout')) {
      primaryCategory = 'UI/UX Issues';
      issueType = 'ux';
      severity = 'medium';
      sentiment = 'negative';
    } else if (reviewText.includes('support') || reviewText.includes('help') || reviewText.includes('customer service')) {
      primaryCategory = 'Customer Service';
      issueType = 'business';
      severity = 'medium';
      sentiment = 'negative';
    } else if (reviewText.includes('connect') || reviewText.includes('network') || reviewText.includes('wifi') || reviewText.includes('sync')) {
      primaryCategory = 'Connectivity';
      issueType = 'technical';
      severity = 'high';
      sentiment = 'negative';
    } else if (reviewText.includes('love') || reviewText.includes('great') || reviewText.includes('excellent') || reviewText.includes('perfect')) {
      primaryCategory = 'Positive Feedback';
      issueType = 'praise';
      sentiment = 'positive';
    } else if (rating >= 4) {
      primaryCategory = 'Positive Feedback';
      issueType = 'praise';
      sentiment = 'positive';
    } else if (rating <= 2) {
      primaryCategory = 'Technical Issues';
      issueType = 'technical';
      sentiment = 'negative';
      severity = 'medium';
    }
    
    return {
      primaryCategory,
      categories: [primaryCategory],
      issueType,
      severity,
      sentiment,
      isActionable: sentiment === 'negative',
      suggestedAction: null,
      tags: [],
      keyPhrases: [],
      emotion: sentiment === 'positive' ? 'satisfied' : sentiment === 'negative' ? 'frustrated' : 'neutral'
    };
  }
};

// Get issue distribution for visualization
export const getIssueDistribution = (categorizedReviews) => {
  const distribution = {
    byCategory: {},
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0, none: 0 },
    byType: { technical: 0, functional: 0, ux: 0, business: 0, praise: 0, neutral: 0 },
    byEmotion: {},
    timeline: {}
  };

  categorizedReviews.forEach(review => {
    // Count by primary category
    distribution.byCategory[review.primaryCategory] = 
      (distribution.byCategory[review.primaryCategory] || 0) + 1;

    // Count by severity
    distribution.bySeverity[review.severity] = 
      (distribution.bySeverity[review.severity] || 0) + 1;

    // Count by type
    distribution.byType[review.issueType] = 
      (distribution.byType[review.issueType] || 0) + 1;

    // Count by emotion
    distribution.byEmotion[review.emotion] = 
      (distribution.byEmotion[review.emotion] || 0) + 1;

    // Timeline analysis (group by date)
    const date = new Date(review.date || review.Date).toLocaleDateString();
    if (!distribution.timeline[date]) {
      distribution.timeline[date] = { total: 0, negative: 0, positive: 0 };
    }
    distribution.timeline[date].total++;
    if (review.sentiment === 'negative') distribution.timeline[date].negative++;
    if (review.sentiment === 'positive') distribution.timeline[date].positive++;
  });

  return distribution;
};