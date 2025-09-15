import { GoogleGenerativeAI } from '@google/generative-ai';
import { aiAnalysisCache } from './cacheService';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyCgpECc-whrISaCwlwxXiZV_YppN4dTQT4';
const genAI = new GoogleGenerativeAI(apiKey);

// Model configuration with fallback (matching geminiChatService.js)
const MODEL_CONFIGS = {
  primary: 'gemini-2.5-flash',  // Best performance for general AI features
  experimental: 'gemini-1.5-flash-latest',
  fallback: 'gemini-1.5-flash'
};

// Track which model is being used
let currentModelIndex = 0;
const modelOrder = ['primary', 'experimental', 'fallback'];

// Helper function to get model with fallback
async function getModelWithFallback(forceIndex = null) {
  const startIndex = forceIndex !== null ? forceIndex : currentModelIndex;
  
  for (let i = startIndex; i < modelOrder.length; i++) {
    const modelKey = modelOrder[i];
    const modelName = MODEL_CONFIGS[modelKey];
    
    try {
      console.log(`[IntelligenceBriefing] Attempting to use ${modelKey} model:`, modelName);
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
        }
      });
      currentModelIndex = i; // Remember which model worked
      return { model, modelKey, modelName };
    } catch (error) {
      console.warn(`[IntelligenceBriefing] ${modelKey} model failed:`, error.message);
      if (i === modelOrder.length - 1) {
        // All models failed
        throw new Error('All Gemini models failed to initialize. Please check your API key and try again.');
      }
    }
  }
}

// Helper function to clean JSON response from Gemini
const cleanJsonResponse = (text) => {
  // Remove markdown code blocks if present
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  // Trim whitespace
  text = text.trim();
  return text;
};

// Format date for display
const formatDateRange = (startDate, endDate) => {
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  const start = new Date(startDate).toLocaleDateString('en-US', options);
  const end = new Date(endDate).toLocaleDateString('en-US', options);
  return `${start} - ${end}`;
};

// Calculate insights from review data
const calculateInsights = (reviews) => {
  const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
  const issueCounts = {};
  const versionStats = {};
  const countryStats = {};
  
  reviews.forEach(review => {
    // Sentiment tracking
    const sentiment = (review.sentiment || review.Sentiment || 'neutral').toLowerCase();
    if (sentimentCounts[sentiment] !== undefined) {
      sentimentCounts[sentiment]++;
    }
    
    // Issue tracking
    const category = review.primaryCategory || review.category || 'General';
    issueCounts[category] = (issueCounts[category] || 0) + 1;
    
    // Version tracking
    const version = review.version || review['App Version'] || 'Unknown';
    versionStats[version] = (versionStats[version] || 0) + 1;
    
    // Country tracking
    const country = review.country || review.Country || 'Unknown';
    countryStats[country] = (countryStats[country] || 0) + 1;
  });
  
  // Get top issues
  const topIssues = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));
  
  // Get top versions
  const topVersions = Object.entries(versionStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([version, count]) => ({ version, count }));
    
  // Get top countries
  const topCountries = Object.entries(countryStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([country, count]) => ({ country, count }));
  
  return {
    sentimentCounts,
    topIssues,
    topVersions,
    topCountries,
    totalReviews: reviews.length
  };
};

export const generateIntelligenceBriefing = async (reviews, dateRange, requestType) => {
  try {
    const insights = calculateInsights(reviews);
    
    // Create a context-aware prompt based on the request type
    const dateRangeText = dateRange ? formatDateRange(dateRange.start, dateRange.end) : 'the selected period';
    
    const prompt = `You are an expert product intelligence analyst. Generate a comprehensive intelligence briefing for ${dateRangeText} based on customer review data.

Review Data Summary:
- Total Reviews: ${insights.totalReviews}
- Sentiment Distribution: Positive (${insights.sentimentCounts.positive}), Negative (${insights.sentimentCounts.negative}), Neutral (${insights.sentimentCounts.neutral})
- Top Issues: ${insights.topIssues.map(i => `${i.category} (${i.count})`).join(', ')}
- Top Versions: ${insights.topVersions.map(v => `${v.version} (${v.count} reviews)`).join(', ')}
- Top Markets: ${insights.topCountries.map(c => `${c.country} (${c.count} reviews)`).join(', ')}

Sample Recent Reviews:
${reviews.slice(0, 10).map(r => `- Rating: ${r.rating || r.Rating}/5, ${r.content || r['Review Text'] || r.Body || ''}`).join('\n').substring(0, 1000)}

Generate a JSON briefing with:
{
  "headline": "A compelling one-sentence summary of the period",
  "keyFindings": [
    {
      "finding": "Major insight from the data",
      "impact": "Business impact",
      "evidence": "Supporting data points",
      "priority": "high|medium|low"
    }
  ],
  "trendAnalysis": {
    "overallTrend": "improving|stable|declining",
    "sentimentShift": "Description of sentiment changes",
    "emergingIssues": ["New problems appearing"],
    "improvingAreas": ["Areas showing improvement"]
  },
  "criticalAlerts": [
    {
      "alert": "Urgent issue requiring attention",
      "severity": "critical|high|medium",
      "affectedUsers": "Estimated impact",
      "recommendation": "Immediate action needed"
    }
  ],
  "competitiveIntelligence": {
    "marketPosition": "Assessment based on reviews",
    "competitorMentions": ["Any competitor references"],
    "differentiators": ["Our strengths mentioned"],
    "gaps": ["Areas where we fall short"]
  },
  "customerVoice": {
    "topPraises": ["What users love most"],
    "topComplaints": ["Main frustrations"],
    "featureRequests": ["Most requested features"],
    "emotionalTone": "Overall customer mood"
  },
  "actionableInsights": [
    {
      "insight": "Specific actionable finding",
      "action": "Recommended response",
      "expectedOutcome": "Potential impact",
      "timeline": "immediate|short-term|long-term"
    }
  ],
  "executiveSummary": "2-3 paragraph executive-level summary of the entire briefing"
}

IMPORTANT: Return only valid JSON without any markdown formatting or additional text.
Focus on actionable intelligence that drives business decisions.`;

    // Use Gemini 2.5 Flash with fallback to 1.5 Flash
    const { model, modelName } = await getModelWithFallback();
    console.log(`[IntelligenceBriefing] Using model: ${modelName}`);
    
    const response = await model.generateContent(prompt);
    const responseText = response.text();
    const cleanedResponse = cleanJsonResponse(responseText);
    const briefing = JSON.parse(cleanedResponse);
    
    // Add metadata
    briefing.metadata = {
      generatedAt: new Date().toISOString(),
      dateRange: dateRange || null,
      reviewCount: insights.totalReviews,
      requestType: requestType || 'general'
    };
    
    return briefing;
  } catch (error) {
    console.error('Error generating intelligence briefing:', error);
    throw new Error('Failed to generate intelligence briefing');
  }
};

// Generate a quick summary briefing
export const generateQuickBriefing = async (reviews, topic) => {
  try {
    const { model } = await getModelWithFallback();
    
    const prompt = `Generate a quick 2-3 sentence briefing about ${topic} based on these ${reviews.length} customer reviews. 
    Focus on the most important finding and its business impact. Be concise and actionable.
    
    Sample reviews: ${reviews.slice(0, 5).map(r => 
      `${r.rating || r.Rating}/5: ${(r.content || r['Review Text'] || '').substring(0, 100)}`
    ).join('; ')}`;
    
    const response = await model.generateContent(prompt);
    return response.text();
  } catch (error) {
    console.error('Error generating quick briefing:', error);
    return 'Unable to generate briefing at this time.';
  }
};

// Analyze specific time period comparisons
export const compareTimePeriods = async (currentReviews, previousReviews, currentPeriod, previousPeriod) => {
  try {
    const currentInsights = calculateInsights(currentReviews);
    const previousInsights = calculateInsights(previousReviews);
    
    const prompt = `Compare these two time periods and identify significant changes:

Current Period (${currentPeriod}):
- Reviews: ${currentInsights.totalReviews}
- Sentiment: Positive ${currentInsights.sentimentCounts.positive}, Negative ${currentInsights.sentimentCounts.negative}
- Top Issues: ${currentInsights.topIssues.slice(0, 3).map(i => i.category).join(', ')}

Previous Period (${previousPeriod}):
- Reviews: ${previousInsights.totalReviews}
- Sentiment: Positive ${previousInsights.sentimentCounts.positive}, Negative ${previousInsights.sentimentCounts.negative}
- Top Issues: ${previousInsights.topIssues.slice(0, 3).map(i => i.category).join(', ')}

Generate a JSON comparison:
{
  "periodComparison": {
    "headline": "One-sentence summary of the change",
    "reviewVolume": { "change": "percentage", "trend": "up|down|stable" },
    "sentimentShift": { "change": "description", "significance": "high|medium|low" },
    "emergingIssues": ["New problems in current period"],
    "resolvedIssues": ["Problems that improved"],
    "keyChanges": ["Most important changes to note"]
  },
  "recommendations": ["Actions based on the comparison"]
}

Return only valid JSON.`;

    const { model } = await getModelWithFallback();
    const response = await model.generateContent(prompt);
    
    const responseText = response.text();
    const cleanedResponse = cleanJsonResponse(responseText);
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error comparing time periods:', error);
    throw new Error('Failed to compare time periods');
  }
};