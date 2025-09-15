import { GoogleGenerativeAI } from '@google/generative-ai';
import { aiAnalysisCache } from './cacheService';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyCgpECc-whrISaCwlwxXiZV_YppN4dTQT4';
const genAI = new GoogleGenerativeAI(apiKey);

// Model configuration with fallback
const MODEL_CONFIGS = {
  primary: 'gemini-2.0-flash-exp',  // Latest flash model
  secondary: 'gemini-1.5-flash',  // Stable flash model
  fallback: 'gemini-pro'  // Final fallback
};

// Track which model is being used
let currentModelIndex = 0;
const modelOrder = ['primary', 'secondary', 'fallback'];

// Helper function to get model with fallback
async function getModelWithFallback(forceIndex = null) {
  const startIndex = forceIndex !== null ? forceIndex : currentModelIndex;
  
  for (let i = startIndex; i < modelOrder.length; i++) {
    const modelKey = modelOrder[i];
    const modelName = MODEL_CONFIGS[modelKey];
    
    try {
      console.log(`[IntelligenceBriefing] Attempting to use ${modelKey} model:`, modelName);
      // Note: responseMimeType might not be supported by all models
      const config = {
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192
        }
      };
      
      // Only add responseMimeType for models that support it
      if (modelName.includes('flash')) {
        config.generationConfig.responseMimeType = "application/json";
      }
      
      const model = genAI.getGenerativeModel(config);
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
  // First, try to find JSON between curly braces
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    text = jsonMatch[0];
  }
  
  // Remove markdown code blocks if present
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  // Remove any leading/trailing non-JSON content
  // Find the first { and last }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }
  
  // Trim whitespace
  text = text.trim();
  
  // Remove any trailing commas before closing braces/brackets
  text = text.replace(/,\s*([}\]])/g, '$1');
  
  return text;
};

// Format date for display
const formatDateRange = (startDate, endDate) => {
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  const start = new Date(startDate).toLocaleDateString('en-US', options);
  const end = new Date(endDate).toLocaleDateString('en-US', options);
  return `${start} - ${end}`;
};

// Generate a fallback briefing when AI fails
const generateFallbackBriefing = (insights, dateRangeText) => {
  const sentimentTotal = insights.sentimentCounts.positive + insights.sentimentCounts.negative + insights.sentimentCounts.neutral;
  const positivePercentage = Math.round((insights.sentimentCounts.positive / sentimentTotal) * 100);
  const negativePercentage = Math.round((insights.sentimentCounts.negative / sentimentTotal) * 100);
  
  const overallTrend = positivePercentage > 60 ? 'improving' : 
                       negativePercentage > 40 ? 'declining' : 'stable';
  
  return {
    headline: `Analysis of ${insights.totalReviews} reviews for ${dateRangeText} shows ${overallTrend} customer sentiment with ${positivePercentage}% positive feedback`,
    keyFindings: insights.topIssues.slice(0, 3).map((issue, idx) => ({
      finding: `${issue.category} mentioned in ${issue.count} reviews`,
      impact: `${Math.round((issue.count / insights.totalReviews) * 100)}% of total feedback relates to ${issue.category}`,
      evidence: `${issue.count} customer mentions`,
      priority: idx === 0 ? 'high' : idx === 1 ? 'medium' : 'low'
    })),
    trendAnalysis: {
      overallTrend,
      sentimentShift: `${positivePercentage}% positive, ${negativePercentage}% negative sentiment`,
      emergingIssues: insights.topIssues.slice(0, 3).map(i => i.category),
      improvingAreas: positivePercentage > 50 ? ['Customer satisfaction'] : []
    },
    criticalAlerts: negativePercentage > 30 ? [{
      alert: `High negative sentiment detected (${negativePercentage}%)`,
      severity: negativePercentage > 40 ? 'critical' : 'high',
      affectedUsers: `${insights.sentimentCounts.negative} customers`,
      recommendation: 'Investigate top complaint categories immediately'
    }] : [],
    competitiveIntelligence: {
      marketPosition: 'Analysis based on review data',
      competitorMentions: [],
      differentiators: [],
      gaps: []
    },
    customerVoice: {
      topPraises: positivePercentage > 50 ? ['Product quality', 'User experience'] : [],
      topComplaints: insights.topIssues.slice(0, 3).map(i => i.category),
      featureRequests: [],
      emotionalTone: overallTrend === 'improving' ? 'Generally positive' : 
                     overallTrend === 'declining' ? 'Frustrated' : 'Mixed'
    },
    actionableInsights: [{
      insight: `Focus on ${insights.topIssues[0]?.category || 'top issues'} to improve customer satisfaction`,
      action: `Address ${insights.topIssues[0]?.category || 'main concerns'} mentioned in ${insights.topIssues[0]?.count || 0} reviews`,
      expectedOutcome: 'Improved customer satisfaction scores',
      timeline: 'immediate'
    }],
    executiveSummary: `During ${dateRangeText}, we analyzed ${insights.totalReviews} customer reviews. The overall sentiment is ${overallTrend} with ${positivePercentage}% positive and ${negativePercentage}% negative feedback. The top concern is ${insights.topIssues[0]?.category || 'general feedback'}, mentioned in ${insights.topIssues[0]?.count || 0} reviews. Immediate attention to these areas is recommended to improve customer satisfaction.`
  };
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
    // Log input parameters for debugging
    console.log('[IntelligenceBriefing] Starting generation with:', {
      reviewsCount: reviews?.length || 0,
      dateRange,
      requestType,
      apiKeyPresent: !!apiKey,
      apiKeyLength: apiKey?.length
    });

    if (!reviews || reviews.length === 0) {
      throw new Error('No reviews provided for intelligence briefing');
    }

    const insights = calculateInsights(reviews);
    
    // Create a context-aware prompt based on the request type
    const dateRangeText = dateRange ? formatDateRange(dateRange.start, dateRange.end) : 'the selected period';
    
    const prompt = `IMPORTANT: You must respond with ONLY a valid JSON object. Do not include any explanatory text, markdown formatting, or comments before or after the JSON.

You are an expert product intelligence analyst. Generate a comprehensive intelligence briefing for ${dateRangeText} based on customer review data.

Review Data Summary:
- Total Reviews: ${insights.totalReviews}
- Sentiment Distribution: Positive (${insights.sentimentCounts.positive}), Negative (${insights.sentimentCounts.negative}), Neutral (${insights.sentimentCounts.neutral})
- Top Issues: ${insights.topIssues.map(i => `${i.category} (${i.count})`).join(', ')}
- Top Versions: ${insights.topVersions.map(v => `${v.version} (${v.count} reviews)`).join(', ')}
- Top Markets: ${insights.topCountries.map(c => `${c.country} (${c.count} reviews)`).join(', ')}

Sample Recent Reviews:
${reviews.slice(0, 10).map(r => `- Rating: ${r.rating || r.Rating}/5, ${r.content || r['Review Text'] || r.Body || ''}`).join('\n').substring(0, 1000)}

Return a JSON object with this exact structure:
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

CRITICAL: Your entire response must be a valid JSON object starting with { and ending with }. Do not include any text before or after the JSON.`;

    // Use Gemini 2.5 Flash with fallback to 1.5 Flash
    const { model, modelName } = await getModelWithFallback();
    console.log(`[IntelligenceBriefing] Using model: ${modelName}`);
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    if (!responseText) {
      console.error('[IntelligenceBriefing] No response text received from model');
      throw new Error('No response received from AI model');
    }
    
    console.log('[IntelligenceBriefing] Raw response length:', responseText.length);
    console.log('[IntelligenceBriefing] Raw response first 500 chars:', responseText.substring(0, 500));
    console.log('[IntelligenceBriefing] Raw response last 500 chars:', responseText.substring(Math.max(0, responseText.length - 500)));
    
    const cleanedResponse = cleanJsonResponse(responseText);
    
    console.log('[IntelligenceBriefing] Cleaned response length:', cleanedResponse.length);
    console.log('[IntelligenceBriefing] Cleaned response first 500 chars:', cleanedResponse.substring(0, 500));
    console.log('[IntelligenceBriefing] Attempting to parse JSON...');
    
    let briefing;
    try {
      briefing = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('[IntelligenceBriefing] JSON parse error:', parseError);
      console.error('[IntelligenceBriefing] Failed to parse:', cleanedResponse.substring(0, 500));
      
      // Try multiple strategies to extract JSON
      let extractionSuccessful = false;
      
      // Strategy 1: Try to find JSON between curly braces (already done in cleanJsonResponse)
      // Strategy 2: Try to fix common JSON errors
      try {
        // Fix common issues like single quotes, trailing commas, etc.
        let fixedJson = cleanedResponse
          .replace(/'/g, '"') // Replace single quotes with double quotes
          .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // Quote unquoted keys
          .replace(/:\s*undefined/g, ': null') // Replace undefined with null
          .replace(/,\s*}/g, '}') // Remove trailing commas
          .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
          
        briefing = JSON.parse(fixedJson);
        extractionSuccessful = true;
        console.log('[IntelligenceBriefing] Successfully parsed JSON after fixing common errors');
      } catch (fixError) {
        console.error('[IntelligenceBriefing] Failed to fix JSON:', fixError.message);
      }
      
      // Strategy 3: If all else fails, use fallback
      if (!extractionSuccessful) {
        console.error('[IntelligenceBriefing] All JSON extraction strategies failed, using fallback briefing');
        briefing = generateFallbackBriefing(insights, dateRangeText);
      }
    }
    
    // Validate the briefing structure
    if (!briefing || typeof briefing !== 'object') {
      console.error('[IntelligenceBriefing] Invalid briefing structure, using fallback');
      briefing = generateFallbackBriefing(insights, dateRangeText);
    }
    
    // Ensure required fields exist
    const requiredFields = ['headline', 'keyFindings', 'trendAnalysis', 'executiveSummary'];
    const missingFields = requiredFields.filter(field => !briefing[field]);
    
    if (missingFields.length > 0) {
      console.warn('[IntelligenceBriefing] Missing required fields:', missingFields);
      // Fill in missing fields with defaults
      if (!briefing.headline) briefing.headline = `Analysis of ${insights.totalReviews} reviews for ${dateRangeText}`;
      if (!briefing.keyFindings) briefing.keyFindings = [];
      if (!briefing.trendAnalysis) briefing.trendAnalysis = { overallTrend: 'stable', sentimentShift: 'No significant change' };
      if (!briefing.executiveSummary) briefing.executiveSummary = `Analyzed ${insights.totalReviews} reviews for ${dateRangeText}.`;
    }
    
    // Add metadata
    briefing.metadata = {
      generatedAt: new Date().toISOString(),
      dateRange: dateRange || null,
      reviewCount: insights.totalReviews,
      requestType: requestType || 'general',
      usingFallback: briefing === generateFallbackBriefing(insights, dateRangeText)
    };
    
    console.log('[IntelligenceBriefing] Successfully generated briefing');
    return briefing;
  } catch (error) {
    console.error('[IntelligenceBriefing] Detailed error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      apiKeyPresent: !!apiKey
    });
    
    // Provide more specific error message
    if (error.message.includes('API key')) {
      throw new Error('Invalid or missing Gemini API key. Please check your configuration.');
    } else if (error.message.includes('parse')) {
      throw new Error('Failed to parse AI response. The AI might have returned an invalid format.');
    } else if (error.message.includes('quota')) {
      throw new Error('API quota exceeded. Please try again later.');
    } else if (error.message.includes('model')) {
      throw new Error('Failed to initialize AI model. Please check your API access.');
    } else {
      throw new Error(`Failed to generate intelligence briefing: ${error.message}`);
    }
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
    
    const result = await model.generateContent(prompt);
    return result.response.text();
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
    const result = await model.generateContent(prompt);
    
    const responseText = result.response.text();
    const cleanedResponse = cleanJsonResponse(responseText);
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error comparing time periods:', error);
    throw new Error('Failed to compare time periods');
  }
};