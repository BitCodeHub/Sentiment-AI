// Deep Content Analysis Service for Reviews
import { categorizeReviewWithAI } from './enhancedCategorization';
import { analyzeReviewWithMockAI } from './mockAiAnalysis';

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
  const technicalKeywords = COMPLAINT_PATTERNS.technical.keywords;
  
  reviews.forEach(review => {
    const text = review.text.toLowerCase();
    technicalKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        const count = issues.get(keyword) || 0;
        issues.set(keyword, count + 1);
      }
    });
  });
  
  return Array.from(issues.entries())
    .map(([issue, count]) => ({ issue, count, percentage: (count / reviews.length) * 100 }))
    .sort((a, b) => b.count - a.count);
}

// Extract feature requests
function extractFeatureRequests(reviews) {
  const requests = new Map();
  const requestPatterns = [
    /would like (.*?) to/gi,
    /please add (.*?)[\.\,\!]/gi,
    /wish (.*?) could/gi,
    /need (.*?) feature/gi,
    /should have (.*?)[\.\,\!]/gi,
    /missing (.*?)[\.\,\!]/gi
  ];
  
  reviews.forEach(review => {
    const text = review.text;
    requestPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const request = match[1].trim();
        if (request.length > 3 && request.length < 50) {
          const count = requests.get(request) || 0;
          requests.set(request, count + 1);
        }
      }
    });
  });
  
  return Array.from(requests.entries())
    .map(([request, count]) => ({ request, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

// Analyze pain points
function analyzePainPoints(reviews) {
  const painPoints = {};
  
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
      const text = review.text.toLowerCase();
      if (pattern.keywords.some(keyword => text.includes(keyword))) {
        painPoints[category].count++;
        
        // Find subcategory
        Object.entries(pattern.subcategories).forEach(([subcat, keywords]) => {
          if (keywords.some(keyword => text.includes(keyword))) {
            painPoints[category].subcategories[subcat].count++;
            if (painPoints[category].subcategories[subcat].examples.length < 3) {
              painPoints[category].subcategories[subcat].examples.push({
                text: review.text.substring(0, 200),
                rating: review.rating,
                date: review.date
              });
            }
          }
        });
        
        if (painPoints[category].examples.length < 5) {
          painPoints[category].examples.push({
            text: review.text.substring(0, 200),
            rating: review.rating,
            date: review.date
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
  
  Object.keys(POSITIVE_PATTERNS).forEach(category => {
    satisfaction[category] = {
      count: 0,
      weight: POSITIVE_PATTERNS[category].weight,
      examples: []
    };
    
    reviews.forEach(review => {
      const text = review.text.toLowerCase();
      if (POSITIVE_PATTERNS[category].keywords.some(keyword => text.includes(keyword))) {
        satisfaction[category].count++;
        if (satisfaction[category].examples.length < 5) {
          satisfaction[category].examples.push({
            text: review.text.substring(0, 200),
            rating: review.rating,
            date: review.date
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
        metrics: {
          currentRate: gap.userRate,
          targetRate: gap.competitorRate,
          potentialImprovement: gap.difference
        }
      });
    }
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
            examples: subcatData.examples.slice(0, 2)
          });
        }
      });
    }
  });
  
  // Long-term strategic recommendations
  comparison.competitorStrengths.forEach(strength => {
    recommendations.longTerm.push({
      title: `Match Competitor's ${strength.category} Excellence`,
      description: `Competitor has ${strength.advantage}% advantage in ${strength.category} satisfaction`,
      impact: 'high',
      effort: 'high',
      strategy: `Study competitor's approach to ${strength.category} and implement similar improvements`
    });
  });
  
  // Feature requests
  if (analysis.featureRequests.length > 0) {
    const topRequests = analysis.featureRequests.slice(0, 5);
    recommendations.shortTerm.push({
      title: 'Implement Top Feature Requests',
      description: `Users frequently request these features`,
      impact: 'high',
      effort: 'variable',
      features: topRequests
    });
  }
  
  return recommendations;
}

// Main analysis function
export async function performDeepContentAnalysis(userReviews, competitorReviews) {
  // User app analysis
  const userAnalysis = {
    totalReviews: userReviews.length,
    technicalIssues: extractTechnicalIssues(userReviews),
    featureRequests: extractFeatureRequests(userReviews),
    painPoints: analyzePainPoints(userReviews),
    satisfaction: analyzeSatisfactionAreas(userReviews)
  };
  
  // Competitor app analysis
  const competitorAnalysis = {
    totalReviews: competitorReviews.length,
    technicalIssues: extractTechnicalIssues(competitorReviews),
    featureRequests: extractFeatureRequests(competitorReviews),
    painPoints: analyzePainPoints(competitorReviews),
    satisfaction: analyzeSatisfactionAreas(competitorReviews)
  };
  
  // Comparative analysis
  const comparison = performComparativeAnalysis(userAnalysis, competitorAnalysis);
  
  // Generate recommendations
  const recommendations = generateRecommendations(userAnalysis, comparison);
  
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