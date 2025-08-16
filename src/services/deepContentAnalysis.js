// Deep Content Analysis Service for Reviews
import { analyzeReviewsWithGemini, compareAppsWithGemini } from './geminiService';

// Common complaint patterns and categories
const COMPLAINT_PATTERNS = {
  technical: {
    keywords: ['bug', 'crash', 'freeze', 'slow', 'lag', 'error', 'broken', 'stuck', 'loading', 'glitch', 'not working'],
    subcategories: {
      performance: ['slow', 'lag', 'freeze', 'loading', 'performance'],
      stability: ['crash', 'error', 'broken', 'stuck', 'glitch'],
      functionality: ['not working', 'bug', 'issue', 'problem']
    }
  },
  usability: {
    keywords: ['confusing', 'hard to use', 'complicated', 'difficult', 'intuitive', 'user interface', 'ui', 'ux', 'design'],
    subcategories: {
      navigation: ['confusing', 'hard to find', 'navigation', 'menu'],
      interface: ['ui', 'design', 'layout', 'interface'],
      complexity: ['complicated', 'difficult', 'hard to use']
    }
  },
  pricing: {
    keywords: ['expensive', 'price', 'cost', 'subscription', 'free', 'paid', 'premium', 'money', 'worth'],
    subcategories: {
      value: ['expensive', 'worth', 'value', 'overpriced'],
      subscription: ['subscription', 'monthly', 'yearly', 'recurring'],
      features: ['premium', 'paid features', 'free version']
    }
  },
  features: {
    keywords: ['missing', 'feature', 'want', 'need', 'should', 'could', 'would like', 'request', 'add', 'improve'],
    subcategories: {
      missing: ['missing', 'need', 'want', 'should have'],
      improvement: ['improve', 'better', 'enhance', 'update'],
      request: ['add', 'request', 'would like', 'please']
    }
  },
  support: {
    keywords: ['support', 'help', 'response', 'customer service', 'contact', 'reply', 'answer'],
    subcategories: {
      responsiveness: ['response', 'reply', 'answer', 'waiting'],
      quality: ['helpful', 'unhelpful', 'support quality'],
      availability: ['contact', 'reach', 'available']
    }
  }
};

const POSITIVE_PATTERNS = {
  performance: {
    keywords: ['fast', 'quick', 'smooth', 'responsive', 'efficient', 'works well', 'great performance'],
    weight: 1.2
  },
  usability: {
    keywords: ['easy', 'simple', 'intuitive', 'user-friendly', 'clean', 'beautiful', 'love the design'],
    weight: 1.1
  },
  features: {
    keywords: ['useful', 'helpful', 'amazing features', 'love this feature', 'great functionality'],
    weight: 1.0
  },
  value: {
    keywords: ['worth it', 'great value', 'affordable', 'good price', 'free', 'reasonable'],
    weight: 0.9
  },
  overall: {
    keywords: ['perfect', 'excellent', 'amazing', 'best', 'love it', 'recommend', '5 stars'],
    weight: 1.3
  }
};

// Extract technical issues from reviews
function extractTechnicalIssues(reviews) {
  const issues = new Map();
  const issueDetails = new Map();
  const technicalKeywords = COMPLAINT_PATTERNS.technical.keywords;
  
  reviews.forEach(review => {
    // Handle different review text field names
    const text = (review.text || review.content || review['Review Text'] || review.Body || '').toLowerCase();
    const rating = review.rating || review.Rating || 0;
    
    technicalKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        const count = issues.get(keyword) || 0;
        issues.set(keyword, count + 1);
        
        // Store details for better insights
        if (!issueDetails.has(keyword)) {
          issueDetails.set(keyword, {
            examples: [],
            avgRating: 0,
            totalRating: 0
          });
        }
        
        const details = issueDetails.get(keyword);
        details.totalRating += rating;
        if (details.examples.length < 3) {
          details.examples.push(text.substring(0, 150));
        }
      }
    });
  });
  
  return Array.from(issues.entries())
    .map(([issue, count]) => {
      const details = issueDetails.get(issue);
      const severity = count > reviews.length * 0.1 ? 'high' : 
                      count > reviews.length * 0.05 ? 'medium' : 'low';
      
      return { 
        issue, 
        count, 
        percentage: (count / reviews.length) * 100,
        frequency: count,
        severity,
        avgRating: details ? (details.totalRating / count).toFixed(1) : 0,
        examples: details?.examples || [],
        impact: `Affects ${((count / reviews.length) * 100).toFixed(1)}% of users`
      };
    })
    .sort((a, b) => b.count - a.count);
}

// Extract feature requests
function extractFeatureRequests(reviews) {
  const requests = new Map();
  const requestDetails = new Map();
  
  const requestPatterns = [
    /would like (.*?) to/gi,
    /please add (.*?)[\.\,\!]/gi,
    /wish (.*?) could/gi,
    /need (.*?) feature/gi,
    /should have (.*?)[\.\,\!]/gi,
    /missing (.*?)[\.\,\!]/gi,
    /want (.*?) to/gi,
    /hope (.*?) will/gi,
    /request (.*?)[\.\,\!]/gi
  ];
  
  // Also look for common feature keywords
  const featureKeywords = [
    'dark mode', 'offline', 'sync', 'export', 'import', 'backup',
    'notification', 'widget', 'theme', 'customiz', 'integrat',
    'automat', 'schedul', 'remind', 'share', 'collaborat'
  ];
  
  reviews.forEach(review => {
    const text = review.text || review.content || review['Review Text'] || review.Body || '';
    const rating = review.rating || review.Rating || 0;
    
    // Pattern-based extraction
    requestPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const request = match[1].trim().toLowerCase();
        if (request.length > 3 && request.length < 50) {
          const count = requests.get(request) || 0;
          requests.set(request, count + 1);
          
          if (!requestDetails.has(request)) {
            requestDetails.set(request, { ratings: [] });
          }
          requestDetails.get(request).ratings.push(rating);
        }
      }
    });
    
    // Keyword-based extraction
    const lowerText = text.toLowerCase();
    featureKeywords.forEach(keyword => {
      if (lowerText.includes(keyword) && lowerText.includes('want') || lowerText.includes('need') || lowerText.includes('wish')) {
        const count = requests.get(keyword) || 0;
        requests.set(keyword, count + 1);
        
        if (!requestDetails.has(keyword)) {
          requestDetails.set(keyword, { ratings: [] });
        }
        requestDetails.get(keyword).ratings.push(rating);
      }
    });
  });
  
  return Array.from(requests.entries())
    .map(([request, count]) => {
      const details = requestDetails.get(request);
      const avgRating = details ? 
        (details.ratings.reduce((a, b) => a + b, 0) / details.ratings.length).toFixed(1) : 0;
      
      return { 
        request,
        feature: request,
        count,
        requestCount: count,
        priority: count > reviews.length * 0.05 ? 'high' : 
                 count > reviews.length * 0.02 ? 'medium' : 'low',
        avgUserRating: avgRating,
        userBenefit: `Requested by ${count} users (${((count / reviews.length) * 100).toFixed(1)}%)`
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

// Analyze pain points
function analyzePainPoints(reviews) {
  const painPoints = {};
  
  if (!reviews || reviews.length === 0) {
    // Return empty structure
    Object.keys(COMPLAINT_PATTERNS).forEach(category => {
      painPoints[category] = {
        count: 0,
        subcategories: {},
        examples: []
      };
    });
    return painPoints;
  }
  
  Object.keys(COMPLAINT_PATTERNS).forEach(category => {
    painPoints[category] = {
      count: 0,
      subcategories: {},
      examples: []
    };
    
    const pattern = COMPLAINT_PATTERNS[category];
    Object.keys(pattern.subcategories).forEach(subcat => {
      painPoints[category].subcategories[subcat] = {
        count: 0,
        examples: []
      };
    });
    
    reviews.forEach(review => {
      const text = (review.text || review.content || review['Review Text'] || review.Body || '').toLowerCase();
      if (pattern.keywords.some(keyword => text.includes(keyword))) {
        painPoints[category].count++;
        
        // Find subcategory
        Object.entries(pattern.subcategories).forEach(([subcat, keywords]) => {
          if (keywords.some(keyword => text.includes(keyword))) {
            painPoints[category].subcategories[subcat].count++;
            if (painPoints[category].subcategories[subcat].examples.length < 3) {
              painPoints[category].subcategories[subcat].examples.push({
                text: (review.text || review.content || review['Review Text'] || review.Body || '').substring(0, 200),
                rating: review.rating || review.Rating,
                date: review.date || review.Date
              });
            }
          }
        });
        
        if (painPoints[category].examples.length < 5) {
          painPoints[category].examples.push({
            text: (review.text || review.content || review['Review Text'] || review.Body || '').substring(0, 200),
            rating: review.rating || review.Rating,
            date: review.date || review.Date
          });
        }
      }
    });
  });
  
  return painPoints;
}

// Analyze satisfaction areas
function analyzeSatisfactionAreas(reviews) {
  const satisfaction = {};
  
  if (!reviews || reviews.length === 0) {
    // Return empty structure
    Object.keys(POSITIVE_PATTERNS).forEach(category => {
      satisfaction[category] = {
        count: 0,
        weight: POSITIVE_PATTERNS[category].weight,
        examples: []
      };
    });
    return satisfaction;
  }
  
  Object.keys(POSITIVE_PATTERNS).forEach(category => {
    satisfaction[category] = {
      count: 0,
      weight: POSITIVE_PATTERNS[category].weight,
      examples: []
    };
    
    reviews.forEach(review => {
      const text = (review.text || review.content || review['Review Text'] || review.Body || '').toLowerCase();
      if (POSITIVE_PATTERNS[category].keywords.some(keyword => text.includes(keyword))) {
        satisfaction[category].count++;
        if (satisfaction[category].examples.length < 5) {
          satisfaction[category].examples.push({
            text: (review.text || review.content || review['Review Text'] || review.Body || '').substring(0, 200),
            rating: review.rating || review.Rating,
            date: review.date || review.Date
          });
        }
      }
    });
  });
  
  return satisfaction;
}

// Comparative analysis between apps
function performComparativeAnalysis(userAnalysis, competitorAnalysis) {
  const comparison = {
    gaps: [],
    opportunities: [],
    userStrengths: [],
    competitorStrengths: [],
    commonIssues: []
  };
  
  // Compare pain points
  Object.keys(COMPLAINT_PATTERNS).forEach(category => {
    const userPain = userAnalysis.painPoints[category].count;
    const competitorPain = competitorAnalysis.painPoints[category].count;
    const userTotal = userAnalysis.totalReviews;
    const competitorTotal = competitorAnalysis.totalReviews;
    
    const userRate = (userPain / userTotal) * 100;
    const competitorRate = (competitorPain / competitorTotal) * 100;
    
    if (userRate > competitorRate * 1.5) {
      comparison.gaps.push({
        category,
        userRate: userRate.toFixed(1),
        competitorRate: competitorRate.toFixed(1),
        difference: (userRate - competitorRate).toFixed(1),
        severity: userRate > competitorRate * 2 ? 'high' : 'medium'
      });
    }
    
    if (competitorRate > userRate * 1.5) {
      comparison.opportunities.push({
        category,
        description: `Competitor struggles with ${category} issues (${competitorRate.toFixed(1)}% vs your ${userRate.toFixed(1)}%)`,
        advantage: (competitorRate - userRate).toFixed(1)
      });
    }
    
    if (userRate > 10 && competitorRate > 10) {
      comparison.commonIssues.push({
        category,
        userRate: userRate.toFixed(1),
        competitorRate: competitorRate.toFixed(1)
      });
    }
  });
  
  // Compare satisfaction areas
  Object.keys(POSITIVE_PATTERNS).forEach(category => {
    const userSat = userAnalysis.satisfaction[category].count;
    const competitorSat = competitorAnalysis.satisfaction[category].count;
    const userTotal = userAnalysis.totalReviews;
    const competitorTotal = competitorAnalysis.totalReviews;
    
    const userRate = (userSat / userTotal) * 100;
    const competitorRate = (competitorSat / competitorTotal) * 100;
    
    if (userRate > competitorRate * 1.2) {
      comparison.userStrengths.push({
        category,
        userRate: userRate.toFixed(1),
        competitorRate: competitorRate.toFixed(1),
        advantage: (userRate - competitorRate).toFixed(1)
      });
    }
    
    if (competitorRate > userRate * 1.2) {
      comparison.competitorStrengths.push({
        category,
        userRate: userRate.toFixed(1),
        competitorRate: competitorRate.toFixed(1),
        advantage: (competitorRate - userRate).toFixed(1)
      });
    }
  });
  
  return comparison;
}

// Generate actionable recommendations
function generateRecommendations(analysis, comparison) {
  const recommendations = {
    immediate: [],
    shortTerm: [],
    longTerm: []
  };
  
  // Immediate actions (Quick wins)
  comparison.gaps.forEach(gap => {
    if (gap.severity === 'high') {
      recommendations.immediate.push({
        title: `Address Critical ${gap.category} Issues`,
        description: `Your app has ${gap.difference}% more ${gap.category} complaints than competitor`,
        impact: 'high',
        effort: 'medium',
        action: `Focus on resolving top ${gap.category} issues to match competitor performance`,
        metrics: {
          currentRate: gap.userRate,
          targetRate: gap.competitorRate,
          potentialImprovement: gap.difference
        },
        estimatedImprovement: `Could improve user satisfaction by ${(gap.difference * 0.7).toFixed(1)}%`
      });
    }
  });
  
  // Add critical technical issues as immediate fixes
  const criticalIssues = analysis.technicalIssues.filter(issue => issue.severity === 'high');
  criticalIssues.slice(0, 3).forEach(issue => {
    recommendations.immediate.push({
      title: `Fix "${issue.issue}" Problems`,
      description: `${issue.count} users (${issue.percentage.toFixed(1)}%) experiencing this issue`,
      impact: 'high',
      effort: 'medium',
      action: `Investigate and fix "${issue.issue}" errors affecting ${issue.impact}`,
      rationale: `Users with this issue rate the app ${issue.avgRating}/5 on average`
    });
  });
  
  // Short-term improvements
  Object.entries(analysis.painPoints).forEach(([category, data]) => {
    if (data.count > analysis.totalReviews * 0.1) {
      Object.entries(data.subcategories).forEach(([subcat, subcatData]) => {
        if (subcatData.count > data.count * 0.3) {
          recommendations.shortTerm.push({
            title: `Improve ${category} - ${subcat}`,
            description: `${((subcatData.count / analysis.totalReviews) * 100).toFixed(1)}% of users report ${subcat} issues`,
            impact: 'medium',
            effort: 'medium',
            action: `Redesign ${subcat} experience based on user feedback`,
            examples: subcatData.examples.slice(0, 2)
          });
        }
      });
    }
  });
  
  // Feature requests
  if (analysis.featureRequests.length > 0) {
    const highPriorityRequests = analysis.featureRequests.filter(r => r.priority === 'high');
    const topRequests = highPriorityRequests.length > 0 ? highPriorityRequests : analysis.featureRequests.slice(0, 5);
    
    recommendations.shortTerm.push({
      title: 'Implement High-Priority Feature Requests',
      description: `Users frequently request these features`,
      impact: 'high',
      effort: 'variable',
      action: 'Prioritize development of most requested features',
      features: topRequests,
      implementation: 'Start with features requested by users with higher ratings'
    });
  }
  
  // Long-term strategic recommendations
  comparison.competitorStrengths.forEach(strength => {
    recommendations.longTerm.push({
      title: `Match Competitor's ${strength.category} Excellence`,
      description: `Competitor has ${strength.advantage}% advantage in ${strength.category} satisfaction`,
      impact: 'high',
      effort: 'high',
      strategy: `Study competitor's approach to ${strength.category} and implement similar improvements`,
      timeframe: 'long-term',
      recommendation: `Conduct user research to understand why competitor excels in ${strength.category}`
    });
  });
  
  // Add market positioning recommendation
  if (comparison.gaps.length > comparison.opportunities.length) {
    recommendations.longTerm.push({
      title: 'Strengthen Market Position',
      description: 'Focus on differentiation and unique value proposition',
      impact: 'high',
      effort: 'high',
      strategy: 'Develop features that competitor lacks while fixing critical issues',
      timeframe: 'long-term'
    });
  }
  
  return recommendations;
}

// Main analysis function
export async function performDeepContentAnalysis(userReviews, competitorReviews) {
  console.log('Starting deep content analysis:', {
    userReviewsCount: userReviews?.length || 0,
    competitorReviewsCount: competitorReviews?.length || 0
  });
  
  try {
    // Try Gemini AI first, but make it optional
    let userGeminiAnalysis = null;
    let competitorGeminiAnalysis = null;
    let geminiComparison = null;
    
    // Always attempt Gemini AI analysis
    const skipGemini = false; // Always use AI
    
    if (!skipGemini) {
      try {
        console.log('Attempting Gemini analysis...');
        
        // Import the initialization function
        const { initializeGeminiModel } = await import('./geminiService');
        
        // Ensure model is initialized
        console.log('Checking Gemini model initialization...');
        const initResult = await initializeGeminiModel();
        console.log('Gemini initialization result:', initResult);
        
        [userGeminiAnalysis, competitorGeminiAnalysis] = await Promise.all([
          analyzeReviewsWithGemini(userReviews, { appName: 'User App' }).catch(err => {
            console.warn('Gemini analysis failed for user app:', err.message);
            return null;
          }),
          analyzeReviewsWithGemini(competitorReviews, { appName: 'Competitor App' }).catch(err => {
            console.warn('Gemini analysis failed for competitor app:', err.message);
            return null;
          })
        ]);
        
        if (userGeminiAnalysis || competitorGeminiAnalysis) {
          console.log('At least one Gemini analysis succeeded');
        } else {
          console.log('Both Gemini analyses returned null');
        }
      } catch (err) {
        console.error('Gemini analysis error:', err);
      }
    }

    // Get competitive comparison from Gemini
    if (!skipGemini && (userGeminiAnalysis || competitorGeminiAnalysis)) {
      geminiComparison = await compareAppsWithGemini(
        userReviews, 
        competitorReviews, 
        'User App', 
        'Competitor App'
      ).catch(err => {
        console.warn('Gemini comparison failed:', err);
        return null;
      });
    }

    console.log('Gemini analysis results:', {
      userGeminiAnalysis: !!userGeminiAnalysis,
      competitorGeminiAnalysis: !!competitorGeminiAnalysis
    });

    // Combine AI insights with pattern-based analysis
    const userAnalysis = {
      totalReviews: userReviews?.length || 0,
      technicalIssues: userGeminiAnalysis?.technicalIssues || extractTechnicalIssues(userReviews || []),
      featureRequests: userGeminiAnalysis?.featureRequests || extractFeatureRequests(userReviews || []),
      painPoints: userGeminiAnalysis?.painPoints?.categories || userGeminiAnalysis?.painPoints || analyzePainPoints(userReviews || []),
      satisfaction: userGeminiAnalysis?.positiveAspects?.categories || userGeminiAnalysis?.positiveAspects || analyzeSatisfactionAreas(userReviews || []),
      aiInsights: userGeminiAnalysis
    };
    
    const competitorAnalysis = {
      totalReviews: competitorReviews?.length || 0,
      technicalIssues: competitorGeminiAnalysis?.technicalIssues || extractTechnicalIssues(competitorReviews || []),
      featureRequests: competitorGeminiAnalysis?.featureRequests || extractFeatureRequests(competitorReviews || []),
      painPoints: competitorGeminiAnalysis?.painPoints?.categories || competitorGeminiAnalysis?.painPoints || analyzePainPoints(competitorReviews || []),
      satisfaction: competitorGeminiAnalysis?.positiveAspects?.categories || competitorGeminiAnalysis?.positiveAspects || analyzeSatisfactionAreas(competitorReviews || []),
      aiInsights: competitorGeminiAnalysis
    };
    
    // Comparative analysis
    const comparison = geminiComparison ? {
      gaps: extractGapsFromGemini(geminiComparison),
      opportunities: extractOpportunitiesFromGemini(geminiComparison),
      userStrengths: geminiComparison.competitivePositioning?.['User App']?.strengths || [],
      competitorStrengths: geminiComparison.competitivePositioning?.['Competitor App']?.strengths || [],
      commonIssues: findCommonIssues(userAnalysis, competitorAnalysis)
    } : performComparativeAnalysis(userAnalysis, competitorAnalysis);
    
    // Generate recommendations
    const recommendations = geminiComparison?.strategicRecommendations ? 
      formatGeminiRecommendations(geminiComparison.strategicRecommendations) :
      generateRecommendations(userAnalysis, comparison);
    
    const result = {
      user: userAnalysis,
      competitor: competitorAnalysis,
      comparison,
      recommendations,
      geminiInsights: geminiComparison
    };
    
    console.log('Deep analysis completed successfully:', {
      userTechnicalIssues: result.user.technicalIssues.length,
      competitorTechnicalIssues: result.competitor.technicalIssues.length,
      gaps: result.comparison.gaps.length,
      recommendations: Object.keys(result.recommendations).map(k => `${k}: ${result.recommendations[k].length}`)
    });
    
    return result;
  } catch (error) {
    console.error('Deep analysis error:', error);
    // Fallback to pattern-based analysis
    console.log('Falling back to pattern-based analysis');
    return performPatternBasedAnalysis(userReviews, competitorReviews);
  }
}

// Helper function to extract gaps from Gemini response
function extractGapsFromGemini(geminiComparison) {
  return (geminiComparison.performanceGaps || []).map(gap => ({
    category: gap.area,
    userRate: gap.userPerformance,
    competitorRate: gap.competitorPerformance,
    difference: gap.competitorPerformance - gap.userPerformance,
    severity: gap.severity,
    description: gap.gap
  }));
}

// Helper function to extract opportunities from Gemini response
function extractOpportunitiesFromGemini(geminiComparison) {
  return (geminiComparison.marketInsights?.userOpportunities || []).map(opp => ({
    category: 'market',
    description: opp,
    advantage: 'high'
  }));
}

// Helper function to format Gemini recommendations
function formatGeminiRecommendations(recommendations) {
  const formatted = {
    immediate: [],
    shortTerm: [],
    longTerm: []
  };

  recommendations.forEach(rec => {
    const formattedRec = {
      title: rec.recommendation,
      description: rec.expectedImpact,
      impact: rec.priority <= 3 ? 'high' : 'medium',
      implementation: rec.implementation
    };

    if (rec.timeframe === 'immediate') {
      formatted.immediate.push(formattedRec);
    } else if (rec.timeframe === 'short-term') {
      formatted.shortTerm.push(formattedRec);
    } else {
      formatted.longTerm.push(formattedRec);
    }
  });

  return formatted;
}

// Helper function to find common issues
function findCommonIssues(userAnalysis, competitorAnalysis) {
  const commonIssues = [];
  
  if (userAnalysis.technicalIssues && competitorAnalysis.technicalIssues) {
    const userIssueNames = new Set(userAnalysis.technicalIssues.map(i => i.issue));
    competitorAnalysis.technicalIssues.forEach(issue => {
      if (userIssueNames.has(issue.issue)) {
        commonIssues.push({
          category: 'technical',
          issue: issue.issue,
          userRate: userAnalysis.technicalIssues.find(i => i.issue === issue.issue)?.frequency || 0,
          competitorRate: issue.frequency
        });
      }
    });
  }
  
  return commonIssues;
}

// Fallback pattern-based analysis
function performPatternBasedAnalysis(userReviews, competitorReviews) {
  console.log('Performing pattern-based analysis');
  
  // Ensure reviews are arrays
  const safeUserReviews = Array.isArray(userReviews) ? userReviews : [];
  const safeCompetitorReviews = Array.isArray(competitorReviews) ? competitorReviews : [];
  
  const userAnalysis = {
    totalReviews: safeUserReviews.length,
    technicalIssues: extractTechnicalIssues(safeUserReviews),
    featureRequests: extractFeatureRequests(safeUserReviews),
    painPoints: analyzePainPoints(safeUserReviews),
    satisfaction: analyzeSatisfactionAreas(safeUserReviews)
  };
  
  const competitorAnalysis = {
    totalReviews: safeCompetitorReviews.length,
    technicalIssues: extractTechnicalIssues(safeCompetitorReviews),
    featureRequests: extractFeatureRequests(safeCompetitorReviews),
    painPoints: analyzePainPoints(safeCompetitorReviews),
    satisfaction: analyzeSatisfactionAreas(safeCompetitorReviews)
  };
  
  const comparison = performComparativeAnalysis(userAnalysis, competitorAnalysis);
  const recommendations = generateRecommendations(userAnalysis, comparison);
  
  console.log('Pattern-based analysis completed:', {
    userTechnicalIssues: userAnalysis.technicalIssues.length,
    competitorTechnicalIssues: competitorAnalysis.technicalIssues.length
  });
  
  return {
    user: userAnalysis,
    competitor: competitorAnalysis,
    comparison,
    recommendations
  };
}

// Export helper functions for testing
export {
  extractTechnicalIssues,
  extractFeatureRequests,
  analyzePainPoints,
  analyzeSatisfactionAreas,
  performComparativeAnalysis,
  generateRecommendations
};