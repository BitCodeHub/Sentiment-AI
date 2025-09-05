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

export const performDeepAnalysis = async (reviews, aggregatedData) => {
  try {
    // Check cache
    const cacheKey = 'deep_analysis';
    const cachedResult = aiAnalysisCache.getReviewAnalysis({ key: cacheKey });
    if (cachedResult && cachedResult.deepAnalysis) {
      console.log('Using cached deep analysis');
      return cachedResult.deepAnalysis;
    }

    const prompt = `You are an expert product analyst specializing in automotive mobile applications. Perform a comprehensive competitive analysis based on these app reviews.

Review Data Summary:
- Total Reviews: ${aggregatedData.summary.totalReviews}
- Average Rating: ${aggregatedData.summary.avgRating}/5.0
- Sentiment: Positive: ${aggregatedData.sentimentDistribution.Positive}, Negative: ${aggregatedData.sentimentDistribution.Negative}, Neutral: ${aggregatedData.sentimentDistribution.Neutral}

Sample Recent Reviews:
${reviews.slice(0, 30).map(r => `- Rating: ${r.rating}/5, Sentiment: ${r.sentiment}, Content: "${r.content.substring(0, 200)}..."`).join('\n')}

Compare this app with major competitors: Tesla App, Ford Pass, Toyota Remote Connect, BMW Connected, Mercedes me.

Provide a comprehensive JSON analysis with:
{
  "competitiveAnalysis": {
    "marketPosition": "Detailed assessment of where this app stands in the market",
    "competitorComparison": {
      "teslaApp": { "strengths": [], "ourAdvantages": [], "theirAdvantages": [] },
      "fordPass": { "strengths": [], "ourAdvantages": [], "theirAdvantages": [] },
      "toyotaRemote": { "strengths": [], "ourAdvantages": [], "theirAdvantages": [] },
      "bmwConnected": { "strengths": [], "ourAdvantages": [], "theirAdvantages": [] },
      "mercedesMe": { "strengths": [], "ourAdvantages": [], "theirAdvantages": [] }
    },
    "uniqueSellingPoints": ["List unique features or strengths"],
    "competitiveGaps": ["List areas where competitors excel"]
  },
  "userSegmentation": {
    "primaryUsers": { "description": "...", "needs": [], "painPoints": [] },
    "secondaryUsers": { "description": "...", "needs": [], "painPoints": [] },
    "emergingSegments": { "description": "...", "opportunities": [] }
  },
  "innovationOpportunities": [
    { "opportunity": "...", "impact": "high|medium", "feasibility": "high|medium|low", "competitiveDifferentiation": "..." }
  ],
  "strategicRecommendations": {
    "immediate": ["Actions for next 30 days"],
    "shortTerm": ["Actions for next 3 months"],
    "longTerm": ["Actions for next 12 months"],
    "marketingFocus": ["Key messages and positioning strategies"]
  },
  "riskAssessment": {
    "competitiveThreats": ["List major threats"],
    "marketTrends": ["Trends that could impact the app"],
    "mitigationStrategies": ["How to address risks"]
  }
}

IMPORTANT: Return only valid JSON without any markdown formatting or additional text.`;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const response = await model.generateContent(prompt);
    
    const responseText = response.text();
    const cleanedResponse = cleanJsonResponse(responseText);
    const analysis = JSON.parse(cleanedResponse);
    
    // Cache the result
    aiAnalysisCache.setReviewAnalysis({ key: cacheKey }, { deepAnalysis: analysis });
    
    return analysis;
  } catch (error) {
    console.error('Deep analysis error:', error);
    
    if (error.message?.includes('API key')) {
      throw new Error('Invalid Gemini API key. Please check your configuration.');
    } else if (error.message?.includes('quota')) {
      throw new Error('API quota exceeded. Please try again later.');
    } else {
      throw new Error(`Deep analysis failed: ${error.message || 'Unknown error'}`);
    }
  }
};