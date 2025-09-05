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

export const performExecutiveAnalysis = async (aggregatedData, aiInsights, deepInsights) => {
  try {
    // Check cache
    const cacheKey = 'executive_analysis';
    const cachedResult = aiAnalysisCache.getReviewAnalysis({ key: cacheKey });
    if (cachedResult && cachedResult.executiveAnalysis) {
      console.log('Using cached executive analysis');
      return cachedResult.executiveAnalysis;
    }

    const prompt = `You are a C-suite strategic advisor. Create an executive briefing based on this comprehensive app analysis.

Key Metrics:
- Total Reviews: ${aggregatedData.summary.totalReviews}
- Average Rating: ${aggregatedData.summary.avgRating}/5.0
- Sentiment Distribution: Positive ${aggregatedData.sentimentDistribution.Positive}, Negative ${aggregatedData.sentimentDistribution.Negative}
- Response Rate: ${aggregatedData.responseRate}%

AI Analysis Summary:
${JSON.stringify(aiInsights?.executiveSummary || 'No AI insights available', null, 2)}

Key Issues Identified:
${aiInsights?.mainPainPoints?.slice(0, 3).join('\n') || 'No specific issues identified'}

Provide an executive-level JSON briefing with:
{
  "executiveSummary": {
    "overallHealth": "healthy|concerning|critical",
    "ratingTrend": "improving|stable|declining",
    "keyMetrics": {
      "userSatisfaction": "percentage",
      "retentionRisk": "low|medium|high",
      "competitivePosition": "leading|competitive|lagging"
    },
    "bottomLine": "2-3 sentence executive summary"
  },
  "boardLevelInsights": [
    "Insight 1: Impact on business objectives",
    "Insight 2: Competitive implications",
    "Insight 3: Growth opportunities",
    "Insight 4: Risk factors"
  ],
  "financialImpact": {
    "revenueRisk": { "level": "low|medium|high", "explanation": "..." },
    "growthOpportunity": { "potential": "percentage", "timeframe": "..." },
    "investmentNeeded": { "areas": [], "priority": "..." }
  },
  "strategicInitiatives": [
    {
      "initiative": "Name",
      "objective": "What it achieves",
      "timeline": "When to implement",
      "expectedImpact": "Business outcome",
      "resourceRequirement": "low|medium|high"
    }
  ],
  "competitiveLandscape": {
    "marketPosition": "Our position vs competitors",
    "differentiators": ["Key advantages"],
    "vulnerabilities": ["Areas of concern"],
    "emergingThreats": ["Market changes to monitor"]
  },
  "actionPlan": {
    "immediate": { "actions": [], "owner": "department/role", "deadline": "timeframe" },
    "quarterly": { "actions": [], "owner": "department/role", "deadline": "timeframe" },
    "annual": { "actions": [], "owner": "department/role", "deadline": "timeframe" }
  },
  "successMetrics": [
    { "metric": "name", "current": "value", "target": "value", "timeframe": "when" }
  ]
}

IMPORTANT: Return only valid JSON without any markdown formatting or additional text.`;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const response = await model.generateContent(prompt);
    
    const responseText = response.text();
    const cleanedResponse = cleanJsonResponse(responseText);
    const analysis = JSON.parse(cleanedResponse);
    
    // Cache the result
    aiAnalysisCache.setReviewAnalysis({ key: cacheKey }, { executiveAnalysis: analysis });
    
    return analysis;
  } catch (error) {
    console.error('Executive analysis error:', error);
    
    if (error.message?.includes('API key')) {
      throw new Error('Invalid Gemini API key. Please check your configuration.');
    } else if (error.message?.includes('quota')) {
      throw new Error('API quota exceeded. Please try again later.');
    } else {
      throw new Error(`Executive analysis failed: ${error.message || 'Unknown error'}`);
    }
  }
};