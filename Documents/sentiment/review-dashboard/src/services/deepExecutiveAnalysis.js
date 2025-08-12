// Deep Executive Analysis Service - Real Data Driven Insights
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Cache for expensive calculations
const analysisCache = new Map();

// Helper to get cache key
function getCacheKey(reviews, type) {
  const reviewIds = reviews.map(r => r.id || `${r.date}-${r.rating}`).sort().join('-');
  return `${type}-${reviewIds}-${reviews.length}`;
}

// Analyze reviews using GPT for deep insights
async function analyzeWithGPT(reviews, analysisType, prompt) {
  const cacheKey = getCacheKey(reviews, analysisType);
  if (analysisCache.has(cacheKey)) {
    console.log(`Using cached ${analysisType} analysis`);
    return analysisCache.get(cacheKey);
  }

  try {
    // Sample reviews if too many (to manage token limits)
    const reviewSample = reviews.length > 50 
      ? reviews.sort(() => Math.random() - 0.5).slice(0, 50)
      : reviews;
    
    const reviewTexts = reviewSample.map(r => ({
      rating: r.rating || r.Rating,
      content: r.content || r['Review Text'] || r.Body || '',
      date: r.date || r.Date || r.created_at || ''
    }));

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert business analyst specializing in mobile app analytics and revenue impact analysis. Provide data-driven insights based on actual review content.'
        },
        {
          role: 'user',
          content: `${prompt}\n\nReviews to analyze:\n${JSON.stringify(reviewTexts, null, 2)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const result = JSON.parse(response.choices[0].message.content);
    analysisCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`GPT analysis error for ${analysisType}:`, error);
    throw error;
  }
}

// Calculate real revenue impact based on review data
export async function calculateRevenueImpact(reviews, userMetrics = {}) {
  const prompt = `Analyze these app reviews and calculate realistic revenue impact. Consider:
  1. Issues mentioned and their frequency
  2. User churn indicators (uninstalling, canceling subscription, switching to competitors)
  3. Feature requests that could drive new revenue
  4. Sentiment trends over time
  
  Assume:
  - Average subscription value: $30/year
  - Total user base: ~400,000 users
  - Current subscriber base: ~140,000 (35% conversion)
  
  Return a JSON object with:
  {
    "currentIssuesImpact": {
      "estimatedChurn": number (users),
      "monthlyRevenueLoss": number ($),
      "annualRevenueLoss": number ($),
      "reasoning": "explanation"
    },
    "opportunityCost": {
      "missedSubscriptions": number (users),
      "potentialRevenue": number ($),
      "keyMissingFeatures": ["feature1", "feature2"],
      "reasoning": "explanation"
    },
    "competitiveThreat": {
      "usersAtRisk": number,
      "revenueAtRisk": number ($),
      "mainCompetitors": ["competitor1", "competitor2"],
      "reasoning": "explanation"
    },
    "fixImpact": {
      "potentialRetention": number (users),
      "revenueRecovery": number ($),
      "timelineWeeks": number,
      "reasoning": "explanation"
    }
  }`;

  return await analyzeWithGPT(reviews, 'revenue-impact', prompt);
}

// Analyze real competitor mentions and comparisons
export async function analyzeCompetitorMentions(reviews) {
  const prompt = `Analyze these reviews for competitor mentions and comparisons. Extract:
  1. Which competitors are mentioned most
  2. What features users praise in competitor apps
  3. Direct comparisons and switching threats
  4. Market positioning insights
  
  Return a JSON object with:
  {
    "competitorMentions": {
      "competitor_name": {
        "mentions": number,
        "praisedFeatures": ["feature1", "feature2"],
        "userQuotes": ["quote1", "quote2"],
        "threatLevel": "high|medium|low"
      }
    },
    "featureGaps": [
      {
        "feature": "feature name",
        "competitorsWithFeature": ["comp1", "comp2"],
        "userDemand": "high|medium|low",
        "revenueImpact": "explanation"
      }
    ],
    "switchingIndicators": {
      "activelyConsidering": number (% of reviews),
      "alreadySwitched": number (% of reviews),
      "mainReasons": ["reason1", "reason2"]
    },
    "marketPosition": {
      "currentPerception": "leader|follower|laggard",
      "strengthAreas": ["area1", "area2"],
      "weaknessAreas": ["area1", "area2"],
      "recommendation": "strategic positioning advice"
    }
  }`;

  return await analyzeWithGPT(reviews, 'competitor-analysis', prompt);
}

// Deep analysis of user journey pain points
export async function analyzeUserJourneyPainPoints(reviews) {
  const prompt = `Analyze these reviews to map user journey pain points. Identify:
  1. Onboarding/setup issues
  2. Daily usage friction points
  3. Feature discovery problems
  4. Support/help seeking patterns
  5. Subscription/payment issues
  
  Return a JSON object with:
  {
    "journeyStages": {
      "discovery": {
        "painPoints": ["point1", "point2"],
        "dropoffRate": "estimated %",
        "userQuotes": ["quote1", "quote2"],
        "improvements": ["suggestion1", "suggestion2"]
      },
      "onboarding": {
        "painPoints": ["point1", "point2"],
        "dropoffRate": "estimated %",
        "userQuotes": ["quote1", "quote2"],
        "improvements": ["suggestion1", "suggestion2"]
      },
      "firstUse": {
        "painPoints": ["point1", "point2"],
        "successRate": "estimated %",
        "userQuotes": ["quote1", "quote2"],
        "improvements": ["suggestion1", "suggestion2"]
      },
      "dailyUse": {
        "painPoints": ["point1", "point2"],
        "frustrationLevel": "high|medium|low",
        "userQuotes": ["quote1", "quote2"],
        "improvements": ["suggestion1", "suggestion2"]
      },
      "renewal": {
        "painPoints": ["point1", "point2"],
        "churnRate": "estimated %",
        "userQuotes": ["quote1", "quote2"],
        "improvements": ["suggestion1", "suggestion2"]
      }
    },
    "criticalDropoffPoints": [
      {
        "stage": "stage name",
        "issue": "description",
        "impact": "% users affected",
        "priority": "critical|high|medium"
      }
    ]
  }`;

  return await analyzeWithGPT(reviews, 'journey-analysis', prompt);
}

// Analyze feature requests and their potential impact
export async function analyzeFeatureRequests(reviews) {
  const prompt = `Analyze these reviews for feature requests and enhancement suggestions. Identify:
  1. Most requested features
  2. User problems these would solve
  3. Potential adoption rates
  4. Revenue impact
  
  Return a JSON object with:
  {
    "topRequests": [
      {
        "feature": "feature name",
        "frequency": number (mentions),
        "userProblem": "problem it solves",
        "potentialUsers": "% who would use",
        "revenueImpact": {
          "newSubscriptions": number,
          "retentionImprovement": "%",
          "estimatedValue": "$"
        },
        "competitorComparison": "who has this",
        "implementationComplexity": "low|medium|high",
        "userQuotes": ["quote1", "quote2"]
      }
    ],
    "quickWins": [
      {
        "feature": "name",
        "effort": "days/weeks",
        "impact": "description",
        "userSatisfaction": "improvement %"
      }
    ],
    "strategicFeatures": [
      {
        "feature": "name",
        "vision": "how it transforms the app",
        "marketDifferentiation": "explanation",
        "longTermValue": "description"
      }
    ]
  }`;

  return await analyzeWithGPT(reviews, 'feature-requests', prompt);
}

// Analyze technical issues and their business impact
export async function analyzeTechnicalIssues(reviews) {
  const prompt = `Analyze these reviews for technical issues and bugs. Identify:
  1. Critical bugs affecting usability
  2. Performance issues
  3. Platform-specific problems
  4. Reliability/stability concerns
  
  Return a JSON object with:
  {
    "criticalBugs": [
      {
        "issue": "description",
        "platform": "iOS|Android|Both",
        "frequency": "% of reviews mentioning",
        "userImpact": "description",
        "businessImpact": {
          "affectedUsers": number,
          "revenueRisk": "$",
          "brandDamage": "high|medium|low"
        },
        "userQuotes": ["quote1", "quote2"],
        "fixPriority": "immediate|high|medium"
      }
    ],
    "performanceIssues": [
      {
        "issue": "description",
        "frequency": "how often occurs",
        "userTolerance": "high|medium|low",
        "competitorBenchmark": "comparison",
        "improvementTarget": "specific metric"
      }
    ],
    "reliabilityMetrics": {
      "crashRate": "estimated %",
      "failureRate": "% of commands failing",
      "uptimeIssues": "description",
      "userTrust": "high|medium|low"
    },
    "technicalDebt": {
      "coreIssues": ["issue1", "issue2"],
      "modernizationNeeds": ["need1", "need2"],
      "architectureProblems": ["problem1", "problem2"]
    }
  }`;

  return await analyzeWithGPT(reviews, 'technical-analysis', prompt);
}

// Calculate ROI for improvements
export async function calculateImprovementROI(reviews, technicalIssues, featureRequests) {
  const prompt = `Based on these reviews, technical issues, and feature requests, calculate ROI for improvements:
  
  Technical Issues: ${JSON.stringify(technicalIssues, null, 2)}
  Feature Requests: ${JSON.stringify(featureRequests, null, 2)}
  
  Consider:
  - Development costs (assume $150/hour)
  - User retention impact
  - New user acquisition
  - Support cost reduction
  - Brand value improvement
  
  Return a JSON object with:
  {
    "improvements": [
      {
        "improvement": "name/description",
        "type": "bugfix|feature|performance",
        "cost": {
          "developmentHours": number,
          "totalCost": "$",
          "timeline": "weeks"
        },
        "benefits": {
          "usersRetained": number,
          "newUsers": number,
          "supportReduction": "$",
          "revenueIncrease": "$"
        },
        "roi": {
          "percentage": number,
          "paybackMonths": number,
          "fiveYearValue": "$"
        },
        "priority": 1-10,
        "dependencies": ["dep1", "dep2"]
      }
    ],
    "roadmap": {
      "phase1": {
        "focus": "description",
        "duration": "weeks",
        "cost": "$",
        "expectedImpact": "description"
      },
      "phase2": {
        "focus": "description",
        "duration": "weeks",
        "cost": "$",
        "expectedImpact": "description"
      },
      "phase3": {
        "focus": "description",
        "duration": "weeks", 
        "cost": "$",
        "expectedImpact": "description"
      }
    },
    "totalInvestment": "$",
    "expectedReturn": "$",
    "breakEvenMonth": number
  }`;

  const reviewData = reviews.slice(0, 30); // Limit for token management
  return await analyzeWithGPT(reviewData, 'roi-analysis', prompt);
}

// Generate strategic recommendations
export async function generateStrategicRecommendations(allAnalysis) {
  const prompt = `Based on this comprehensive analysis, generate executive-level strategic recommendations:
  
  ${JSON.stringify(allAnalysis, null, 2)}
  
  Return a JSON object with:
  {
    "executiveSummary": {
      "currentState": "brief description",
      "urgentIssues": ["issue1", "issue2"],
      "opportunities": ["opp1", "opp2"],
      "threats": ["threat1", "threat2"],
      "recommendedAction": "primary recommendation"
    },
    "strategicPriorities": [
      {
        "priority": "name",
        "rationale": "why this matters",
        "expectedOutcome": "what success looks like",
        "timeline": "when to complete",
        "owner": "who should lead",
        "investment": "$",
        "risk": "what could go wrong"
      }
    ],
    "quickWins": [
      {
        "action": "specific action",
        "timeline": "days/weeks",
        "impact": "expected result",
        "owner": "who does this"
      }
    ],
    "longTermVision": {
      "yearOne": "focus and goals",
      "yearTwo": "focus and goals",
      "yearThree": "focus and goals",
      "marketPosition": "where this puts us"
    },
    "successMetrics": {
      "immediate": ["metric1", "metric2"],
      "quarterly": ["metric1", "metric2"],
      "annual": ["metric1", "metric2"]
    },
    "riskMitigation": [
      {
        "risk": "description",
        "likelihood": "high|medium|low",
        "impact": "high|medium|low",
        "mitigation": "strategy",
        "contingency": "plan B"
      }
    ]
  }`;

  // Create a condensed version of analysis to fit token limits
  const condensedAnalysis = {
    revenueImpact: allAnalysis.revenueImpact?.currentIssuesImpact,
    topCompetitors: Object.keys(allAnalysis.competitorAnalysis?.competitorMentions || {}).slice(0, 3),
    criticalIssues: allAnalysis.technicalAnalysis?.criticalBugs?.slice(0, 3),
    topFeatures: allAnalysis.featureAnalysis?.topRequests?.slice(0, 3),
    journeyPainPoints: allAnalysis.journeyAnalysis?.criticalDropoffPoints
  };

  return await analyzeWithGPT([], 'strategic-recommendations', 
    prompt.replace('${JSON.stringify(allAnalysis, null, 2)}', JSON.stringify(condensedAnalysis, null, 2)));
}

// Main comprehensive analysis function
export async function performDeepExecutiveAnalysis(reviews, aggregatedData) {
  try {
    console.log('Starting deep executive analysis with', reviews.length, 'reviews');
    
    // Validate input
    if (!reviews || reviews.length === 0) {
      throw new Error('No reviews provided for analysis');
    }

    // Perform all analyses in parallel where possible
    const [
      revenueImpact,
      competitorAnalysis,
      journeyAnalysis,
      featureAnalysis,
      technicalAnalysis
    ] = await Promise.all([
      calculateRevenueImpact(reviews),
      analyzeCompetitorMentions(reviews),
      analyzeUserJourneyPainPoints(reviews),
      analyzeFeatureRequests(reviews),
      analyzeTechnicalIssues(reviews)
    ]);

    // Calculate ROI based on findings
    const roiAnalysis = await calculateImprovementROI(
      reviews, 
      technicalAnalysis,
      featureAnalysis
    );

    // Generate strategic recommendations
    const allAnalysis = {
      revenueImpact,
      competitorAnalysis,
      journeyAnalysis,
      featureAnalysis,
      technicalAnalysis,
      roiAnalysis,
      aggregatedData
    };

    const strategicRecommendations = await generateStrategicRecommendations(allAnalysis);

    // Calculate confidence scores based on data quality
    const confidenceScores = {
      overall: Math.min(100, (reviews.length / 10)), // 1% per 10 reviews, max 100%
      revenueProjections: reviews.length > 100 ? 'High' : reviews.length > 50 ? 'Medium' : 'Low',
      competitorInsights: competitorAnalysis.competitorMentions ? 'High' : 'Low',
      technicalAccuracy: reviews.length > 200 ? 'High' : 'Medium'
    };

    return {
      executiveSummary: strategicRecommendations.executiveSummary,
      revenueAnalysis: {
        current: revenueImpact,
        projections: {
          withoutAction: {
            sixMonths: revenueImpact.currentIssuesImpact.monthlyRevenueLoss * 6,
            oneYear: revenueImpact.currentIssuesImpact.annualRevenueLoss,
            threeYears: revenueImpact.currentIssuesImpact.annualRevenueLoss * 3
          },
          withImprovements: {
            sixMonths: roiAnalysis.expectedReturn * 0.3,
            oneYear: roiAnalysis.expectedReturn * 0.7,
            threeYears: roiAnalysis.expectedReturn * 2.5
          }
        }
      },
      competitivePosition: {
        analysis: competitorAnalysis,
        threats: competitorAnalysis.switchingIndicators,
        opportunities: competitorAnalysis.marketPosition
      },
      customerExperience: {
        journeyMap: journeyAnalysis,
        painPoints: journeyAnalysis.criticalDropoffPoints,
        improvementAreas: journeyAnalysis.journeyStages
      },
      productStrategy: {
        featurePriorities: featureAnalysis,
        technicalPriorities: technicalAnalysis,
        roadmap: roiAnalysis.roadmap
      },
      investmentPlan: {
        totalRequired: roiAnalysis.totalInvestment,
        expectedROI: roiAnalysis.improvements?.[0]?.roi || {},
        priorities: roiAnalysis.improvements,
        timeline: roiAnalysis.roadmap
      },
      recommendations: strategicRecommendations,
      confidenceScores,
      dataTimestamp: new Date().toISOString(),
      analysisVersion: '2.0'
    };

  } catch (error) {
    console.error('Deep executive analysis error:', error);
    throw new Error(`Executive analysis failed: ${error.message}`);
  }
}

// Export individual analysis functions for modular use
export {
  analyzeWithGPT,
  analysisCache
};