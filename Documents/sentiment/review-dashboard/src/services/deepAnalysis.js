import OpenAI from 'openai';

// Initialize OpenAI client
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: apiKey || 'sk-dummy-key',
  dangerouslyAllowBrowser: true
});

export const performDeepAnalysis = async (reviews, aggregatedData) => {
  try {
    // Prepare comprehensive review data
    const reviewSample = reviews.slice(0, 100).map(r => ({
      rating: r.rating || r.Rating,
      content: r.content || r['Review Text'] || r.Body || '',
      sentiment: r.sentiment || r.Sentiment || 'Neutral',
      date: r.date || r.Date,
      version: r.appVersion || r['App Version'],
      platform: r.platform || r.Platform,
      device: r.deviceModel || r['Device Model']
    }));

    const prompt = `Perform a comprehensive deep analysis of these mobile app reviews for MyHyundai with Blue Link app. Provide detailed insights comparing with competitor apps (Tesla, Ford, Toyota, BMW, Mercedes).

Review Data:
${JSON.stringify(reviewSample, null, 2)}

Summary Statistics:
- Total Reviews: ${aggregatedData.summary.totalReviews}
- Average Rating: ${aggregatedData.summary.avgRating}
- Rating Distribution: ${JSON.stringify(aggregatedData.ratingDistribution)}
- Sentiment: ${JSON.stringify(aggregatedData.sentimentDistribution)}

Provide a comprehensive analysis in this exact JSON format:
{
  "executiveSummary": {
    "overview": "2-3 paragraph executive overview",
    "keyFindings": ["list of 5-7 key findings"],
    "urgentActions": ["list of 3-5 urgent actions needed"]
  },
  "competitiveAnalysis": {
    "marketPosition": "detailed comparison with Tesla, Ford, Toyota, BMW, Mercedes apps",
    "competitorStrengths": {
      "Tesla": ["list of Tesla app strengths"],
      "Ford": ["list of Ford app strengths"],
      "Toyota": ["list of Toyota app strengths"],
      "BMW": ["list of BMW app strengths"],
      "Mercedes": ["list of Mercedes app strengths"]
    },
    "competitiveGaps": ["list of features competitors have that we lack"],
    "competitiveAdvantages": ["list of our unique strengths"]
  },
  "customerComplaints": {
    "topIssues": [
      {
        "issue": "issue name",
        "frequency": "percentage of reviews mentioning this",
        "severity": "high/medium/low",
        "customerQuotes": ["2-3 actual review quotes"],
        "impact": "business impact description",
        "resolution": "detailed resolution strategy"
      }
    ],
    "emergingIssues": ["list of new/growing problems"],
    "resolvedIssues": ["list of previously fixed issues still mentioned"]
  },
  "technicalAnalysis": {
    "performanceIssues": {
      "appCrashes": { "frequency": "X%", "platforms": ["iOS/Android"], "versions": ["affected versions"] },
      "slowLoading": { "frequency": "X%", "averageLoadTime": "estimate", "userTolerance": "description" },
      "connectivityProblems": { "frequency": "X%", "types": ["Bluetooth", "WiFi", "Cellular"] }
    },
    "bugPatterns": ["list of recurring bug patterns"],
    "platformSpecificIssues": {
      "iOS": ["iOS-specific problems"],
      "Android": ["Android-specific problems"]
    }
  },
  "userExperienceAnalysis": {
    "navigationIssues": ["specific UX problems"],
    "designFeedback": {
      "positive": ["what users like about design"],
      "negative": ["design complaints"]
    },
    "featureUsability": {
      "mostUsed": ["frequently mentioned features"],
      "mostConfusing": ["features users struggle with"],
      "missing": ["features users expect but don't find"]
    },
    "userJourneyPainPoints": ["list of friction points in user flow"]
  },
  "featureAnalysis": {
    "mostLovedFeatures": [
      { "feature": "name", "sentiment": "X% positive", "userBenefit": "description" }
    ],
    "mostRequestedFeatures": [
      { "feature": "name", "mentions": "X%", "competitorComparison": "who has it", "priority": "high/medium/low" }
    ],
    "underutilizedFeatures": ["features that exist but users don't know about"]
  },
  "sentimentTrends": {
    "overallTrend": "improving/declining/stable",
    "trendByCategory": {
      "reliability": "trend description",
      "features": "trend description",
      "performance": "trend description",
      "support": "trend description"
    },
    "sentimentDrivers": {
      "positive": ["what drives positive sentiment"],
      "negative": ["what drives negative sentiment"]
    }
  },
  "recommendations": {
    "immediate": [
      {
        "action": "specific action",
        "impact": "expected outcome",
        "effort": "high/medium/low",
        "timeline": "X weeks/months"
      }
    ],
    "shortTerm": [
      {
        "action": "specific action",
        "impact": "expected outcome",
        "effort": "high/medium/low",
        "timeline": "X weeks/months"
      }
    ],
    "longTerm": [
      {
        "action": "specific action",
        "impact": "expected outcome",
        "effort": "high/medium/low",
        "timeline": "X weeks/months"
      }
    ],
    "quickWins": ["list of easy improvements with high impact"]
  },
  "businessImpact": {
    "revenueImpact": "potential revenue loss/gain analysis",
    "customerRetention": "churn risk assessment",
    "brandReputation": "impact on brand perception",
    "supportCosts": "impact on customer support volume"
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ 
        role: "system", 
        content: "You are an expert mobile app analyst specializing in automotive apps. Provide detailed, actionable insights based on real user feedback. Compare with actual competitor apps and industry standards."
      }, {
        role: "user", 
        content: prompt 
      }],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Deep Analysis error:', error);
    
    // Use GPT-3.5 as fallback
    if (error.message?.includes('model')) {
      return performDeepAnalysisWithGPT35(reviews, aggregatedData);
    }
    
    throw error;
  }
};

// Fallback to GPT-3.5 with condensed analysis
export const performDeepAnalysisWithGPT35 = async (reviews, aggregatedData) => {
  try {
    const reviewSample = reviews.slice(0, 50).map(r => ({
      rating: r.rating || r.Rating,
      content: (r.content || r['Review Text'] || r.Body || '').substring(0, 200),
      sentiment: r.sentiment || r.Sentiment || 'Neutral'
    }));

    const prompt = `Analyze these MyHyundai app reviews and provide insights compared to competitors (Tesla, Ford, Toyota).

Reviews: ${JSON.stringify(reviewSample)}
Average Rating: ${aggregatedData.summary.avgRating}

Provide analysis in this JSON format:
{
  "executiveSummary": {
    "overview": "brief overview",
    "keyFindings": ["top 5 findings"],
    "urgentActions": ["top 3 urgent actions"]
  },
  "competitiveAnalysis": {
    "marketPosition": "brief comparison",
    "competitorStrengths": {
      "Tesla": ["2-3 strengths"],
      "Ford": ["2-3 strengths"],
      "Toyota": ["2-3 strengths"]
    },
    "competitiveGaps": ["top 5 gaps"],
    "competitiveAdvantages": ["our top 3 advantages"]
  },
  "customerComplaints": {
    "topIssues": [
      {
        "issue": "issue name",
        "frequency": "high/medium/low",
        "severity": "high/medium/low",
        "customerQuotes": ["1-2 quotes"],
        "impact": "brief impact",
        "resolution": "brief strategy"
      }
    ]
  },
  "recommendations": {
    "immediate": [
      {
        "action": "specific action",
        "impact": "expected outcome",
        "effort": "high/medium/low"
      }
    ],
    "quickWins": ["top 3 quick wins"]
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const condensedAnalysis = JSON.parse(response.choices[0].message.content);
    
    // Expand the condensed analysis with default values for missing fields
    return {
      ...condensedAnalysis,
      technicalAnalysis: {
        performanceIssues: {
          appCrashes: { frequency: "To be analyzed", platforms: ["iOS", "Android"] },
          slowLoading: { frequency: "To be analyzed" },
          connectivityProblems: { frequency: "To be analyzed" }
        },
        bugPatterns: ["Requires deeper analysis"],
        platformSpecificIssues: { iOS: ["Requires analysis"], Android: ["Requires analysis"] }
      },
      userExperienceAnalysis: {
        navigationIssues: ["Requires detailed UX audit"],
        designFeedback: { positive: ["To be analyzed"], negative: ["To be analyzed"] },
        featureUsability: {
          mostUsed: ["Remote start", "Vehicle status"],
          mostConfusing: ["Requires user testing"],
          missing: ["Based on reviews"]
        }
      },
      featureAnalysis: {
        mostLovedFeatures: [{ feature: "Remote start", sentiment: "Positive", userBenefit: "Convenience" }],
        mostRequestedFeatures: condensedAnalysis.competitiveGaps?.map(gap => ({
          feature: gap,
          mentions: "High",
          priority: "high"
        })) || []
      },
      sentimentTrends: {
        overallTrend: "Requires time-series analysis",
        trendByCategory: {
          reliability: "To be analyzed",
          features: "To be analyzed",
          performance: "To be analyzed"
        }
      },
      businessImpact: {
        revenueImpact: "Requires business metrics integration",
        customerRetention: "Based on sentiment analysis",
        brandReputation: "Mixed - requires improvement",
        supportCosts: "High due to technical issues"
      }
    };
  } catch (error) {
    console.error('GPT-3.5 Analysis error:', error);
    throw error;
  }
};

// Generate competitor insights
export const generateCompetitorInsights = () => {
  return {
    Tesla: {
      appRating: 4.8,
      strengths: [
        "Seamless phone key functionality",
        "Real-time vehicle monitoring",
        "Over-the-air updates",
        "Integrated energy management",
        "Autopilot controls"
      ],
      weaknesses: ["Limited to Tesla vehicles", "No Android Auto/CarPlay"]
    },
    Ford: {
      appRating: 4.2,
      strengths: [
        "FordPass rewards program",
        "Integrated maintenance scheduling",
        "Wide dealer network integration",
        "Good Android Auto/CarPlay support"
      ],
      weaknesses: ["Occasional sync issues", "Complex UI"]
    },
    Toyota: {
      appRating: 3.9,
      strengths: [
        "Reliable remote start",
        "Service history tracking",
        "Safety Connect integration",
        "Multi-language support"
      ],
      weaknesses: ["Limited smart features", "Basic UI design"]
    },
    BMW: {
      appRating: 4.5,
      strengths: [
        "Premium UI/UX design",
        "Advanced remote controls",
        "Integrated BMW Digital Key",
        "Personalization options"
      ],
      weaknesses: ["Subscription required for features", "High data usage"]
    },
    Mercedes: {
      appRating: 4.4,
      strengths: [
        "Mercedes me ecosystem",
        "Luxury experience",
        "Comprehensive vehicle data",
        "Concierge services"
      ],
      weaknesses: ["Complex setup", "Premium features costly"]
    }
  };
};