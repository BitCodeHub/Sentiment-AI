import OpenAI from 'openai';
import { aiAnalysisCache } from './cacheService';

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

    const prompt = `Analyze these app reviews and provide insights:

Reviews: ${JSON.stringify(reviewSample, null, 2)}

Please provide a JSON response with exactly these fields:
{
  "mainPainPoints": ["list of top 5 pain points"],
  "featureRequests": ["list of top 5 feature requests"],
  "technicalIssues": ["list of technical issues"],
  "uiuxFeedback": "summary of UI/UX feedback as a string",
  "overallSentiment": "positive/negative/mixed analysis with reasons",
  "recommendations": ["list of actionable recommendations"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

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
    throw error; // Propagate error to handle in UI
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

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 150
    });

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

    const prompt = `Based on this app review data, provide strategic insights:

Summary:
- Total Reviews: ${aggregatedData.summary.totalReviews}
- Average Rating: ${aggregatedData.summary.avgRating}
- Sentiment Distribution: ${JSON.stringify(aggregatedData.sentimentDistribution)}
- Top Keywords: ${aggregatedData.topKeywords.slice(0, 10).map(k => k.word).join(', ')}

Please provide a JSON response with exactly these fields:
{
  "executiveSummary": "2-3 sentence executive summary",
  "keyStrengths": ["list of key strengths based on positive reviews"],
  "criticalIssues": ["list of critical issues requiring immediate attention"],
  "trendAnalysis": "insights about trends in the reviews",
  "competitivePositioning": "recommendations for competitive positioning"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: "json_object" }
    });

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
    throw error; // Propagate error to handle in UI
  }
};