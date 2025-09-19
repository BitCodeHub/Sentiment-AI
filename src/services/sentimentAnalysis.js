import OpenAI from 'openai';
import { aiAnalysisCache } from './cacheService';
import { rateLimiter } from './rateLimiter';

// Initialize OpenAI client
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: apiKey || 'sk-dummy-key',
  dangerouslyAllowBrowser: true
});

export const performSentimentAnalysis = async (reviews) => {
  try {
    // Check cache first
    const cacheKey = `sentiment_analysis_${reviews.length}_${reviews[0]?.id}`;
    const cachedResult = aiAnalysisCache.getReviewAnalysis(cacheKey);
    if (cachedResult) {
      console.log('Using cached sentiment analysis');
      return cachedResult;
    }

    // Calculate basic metrics
    const totalReviews = reviews.length;
    const positiveReviews = reviews.filter(r => r.sentiment === 'Positive').length;
    const negativeReviews = reviews.filter(r => r.sentiment === 'Negative').length;
    const neutralReviews = reviews.filter(r => r.sentiment === 'Neutral').length;

    // Sample reviews for detailed analysis
    const positiveSample = reviews
      .filter(r => r.sentiment === 'Positive')
      .slice(0, 30)
      .map(r => r.content);
    
    const negativeSample = reviews
      .filter(r => r.sentiment === 'Negative')
      .slice(0, 30)
      .map(r => r.content);

    const prompt = `You are an expert in customer sentiment analysis. Analyze these customer reviews to provide a comprehensive understanding of why customers love or hate this product/service.

STATISTICS:
- Total Reviews: ${totalReviews}
- Positive Reviews: ${positiveReviews} (${((positiveReviews/totalReviews)*100).toFixed(1)}%)
- Negative Reviews: ${negativeReviews} (${((negativeReviews/totalReviews)*100).toFixed(1)}%)
- Neutral Reviews: ${neutralReviews} (${((neutralReviews/totalReviews)*100).toFixed(1)}%)

POSITIVE REVIEW SAMPLES:
${positiveSample.join('\n---\n')}

NEGATIVE REVIEW SAMPLES:
${negativeSample.join('\n---\n')}

Provide a comprehensive JSON analysis with these exact fields:
{
  "overallVerdict": {
    "sentiment": "LOVED|MIXED|HATED",
    "score": 0-100,
    "summary": "2-3 sentence executive summary of overall customer sentiment"
  },
  "whyCustomersLove": {
    "topReasons": [
      {
        "reason": "Specific reason why customers love the product",
        "frequency": "How often this is mentioned",
        "quotes": ["Direct quote 1", "Direct quote 2"],
        "impact": "HIGH|MEDIUM|LOW"
      }
    ],
    "emotionalDrivers": ["Key emotional benefits customers experience"],
    "valuePropositions": ["Main value customers perceive"]
  },
  "whyCustomersHate": {
    "topReasons": [
      {
        "reason": "Specific reason why customers hate the product",
        "frequency": "How often this is mentioned", 
        "quotes": ["Direct quote 1", "Direct quote 2"],
        "severity": "CRITICAL|HIGH|MEDIUM|LOW"
      }
    ],
    "frustrationPoints": ["Main sources of customer frustration"],
    "dealBreakers": ["Issues that make customers abandon the product"]
  },
  "sentimentBreakdown": {
    "positiveThemes": {
      "features": ["List of loved features"],
      "experiences": ["Positive experiences mentioned"],
      "comparisons": ["Positive comparisons to competitors"]
    },
    "negativeThemes": {
      "issues": ["List of hated issues"],
      "failures": ["Product/service failures"],
      "comparisons": ["Negative comparisons to competitors"]
    }
  },
  "customerJourney": {
    "honeymoonPhase": "What customers love initially",
    "realityCheck": "When dissatisfaction typically starts",
    "breakingPoint": "What causes customers to leave negative reviews",
    "loyaltyFactors": "What keeps satisfied customers loyal"
  },
  "recommendations": {
    "immediate": ["3-5 urgent actions to address hate factors"],
    "strategic": ["3-5 long-term improvements to enhance love factors"],
    "messaging": ["3 key messages to emphasize based on positive sentiment"]
  },
  "competitiveInsights": {
    "advantages": ["What customers love that competitors lack"],
    "disadvantages": ["What competitors do better according to reviews"]
  }
}`;

    const response = await rateLimiter.addRequest(async () => 
      openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { 
            role: "system", 
            content: "You are an expert in customer psychology and sentiment analysis. Provide deep insights into why customers love or hate products based on their reviews. Focus on emotional drivers, specific pain points, and actionable insights. Always return valid JSON."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      })
    );

    try {
      const analysis = JSON.parse(response.choices[0].message.content);
      
      // Add computed metrics
      analysis.metrics = {
        positivePercentage: ((positiveReviews/totalReviews)*100).toFixed(1),
        negativePercentage: ((negativeReviews/totalReviews)*100).toFixed(1),
        neutralPercentage: ((neutralReviews/totalReviews)*100).toFixed(1),
        totalReviews,
        positiveCount: positiveReviews,
        negativeCount: negativeReviews,
        neutralCount: neutralReviews,
        sentimentScore: ((positiveReviews - negativeReviews) / totalReviews * 100).toFixed(1)
      };

      // Cache the result
      aiAnalysisCache.setReviewAnalysis(cacheKey, analysis);
      return analysis;
    } catch (parseError) {
      console.error('Failed to parse sentiment analysis:', parseError);
      throw new Error('Failed to parse sentiment analysis response');
    }
  } catch (error) {
    console.error('Sentiment Analysis error:', error);
    
    if (error.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your .env file.');
    } else if (error.status === 429) {
      throw new Error('API rate limit exceeded. Please try again in a few moments.');
    } else if (error.status === 500 || error.status === 503) {
      throw new Error('AI service is temporarily unavailable. Please try again later.');
    } else {
      throw new Error(`Failed to analyze sentiment: ${error.message || 'Unknown error'}`);
    }
  }
};

export const analyzeSentimentTrends = async (reviews, timeRange = 30) => {
  try {
    // Group reviews by date
    const now = new Date();
    const startDate = new Date(now.getTime() - (timeRange * 24 * 60 * 60 * 1000));
    
    const recentReviews = reviews.filter(r => {
      const reviewDate = new Date(r.date);
      return reviewDate >= startDate;
    });

    // Calculate daily sentiment
    const dailySentiment = {};
    recentReviews.forEach(review => {
      const date = new Date(review.date).toISOString().split('T')[0];
      if (!dailySentiment[date]) {
        dailySentiment[date] = { positive: 0, negative: 0, neutral: 0, total: 0 };
      }
      dailySentiment[date][review.sentiment.toLowerCase()]++;
      dailySentiment[date].total++;
    });

    // Convert to array for charting
    const trendData = Object.entries(dailySentiment).map(([date, data]) => ({
      date,
      positiveRate: (data.positive / data.total * 100).toFixed(1),
      negativeRate: (data.negative / data.total * 100).toFixed(1),
      sentimentScore: ((data.positive - data.negative) / data.total * 100).toFixed(1),
      total: data.total
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      trendData,
      summary: {
        improving: trendData[trendData.length - 1]?.sentimentScore > trendData[0]?.sentimentScore,
        currentScore: trendData[trendData.length - 1]?.sentimentScore || 0,
        previousScore: trendData[0]?.sentimentScore || 0,
        volatility: calculateVolatility(trendData.map(d => parseFloat(d.sentimentScore)))
      }
    };
  } catch (error) {
    console.error('Trend analysis error:', error);
    return null;
  }
};

function calculateVolatility(scores) {
  if (scores.length < 2) return 'stable';
  
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev < 5) return 'stable';
  if (stdDev < 10) return 'moderate';
  return 'high';
}