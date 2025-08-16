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
  },
  other: {
    keywords: ['other', 'general', 'miscellaneous', 'various'],
    subcategories: {
      general: ['other', 'general', 'miscellaneous'],
      various: ['various', 'different', 'multiple']
    }
  }
};

const POSITIVE_PATTERNS = {
  performance: {
    keywords: ['fast', 'quick', 'smooth', 'responsive', 'efficient', 'works well', 'great performance', 
               'no lag', 'speedy', 'runs great', 'works great', 'performs well', 'reliable', 'stable',
               'no issues', 'working', 'good', 'fine', 'ok', 'no problem', 'no crash', 'doesnt crash',
               'doesn\'t crash', 'works fine', 'runs fine', 'performs', 'speed', 'loads quick', 'snappy',
               'flawless', 'solid', 'consistent', 'dependable', 'never fails', 'always works'],
    weight: 1.2
  },
  usability: {
    keywords: ['easy', 'simple', 'intuitive', 'user-friendly', 'clean', 'beautiful', 'love the design',
               'easy to use', 'straightforward', 'convenient', 'nice design', 'great ui', 'great ux',
               'well designed', 'looks great', 'nice interface', 'good design', 'pretty', 'nice looking',
               'looks good', 'good interface', 'clear', 'understand', 'makes sense', 'logical', 'sleek',
               'modern', 'polished', 'professional', 'elegant', 'refined', 'thoughtful', 'smart'],
    weight: 1.1
  },
  features: {
    keywords: ['useful', 'helpful', 'amazing features', 'love this feature', 'great functionality',
               'great app', 'love the', 'awesome', 'fantastic', 'powerful', 'comprehensive',
               'everything i need', 'all the features', 'feature-rich', 'works as expected',
               'good app', 'nice app', 'like', 'enjoy', 'fun', 'cool', 'interesting', 'addictive',
               'handy', 'convenient', 'does what', 'does the job', 'gets the job done', 'practical',
               'versatile', 'flexible', 'customizable', 'well thought', 'complete', 'full featured'],
    weight: 1.0
  },
  value: {
    keywords: ['worth it', 'great value', 'affordable', 'good price', 'free', 'reasonable',
               'worth the money', 'good deal', 'fair price', 'worth every penny', 'great for the price',
               'not expensive', 'cheap', 'budget', 'economical', 'good for free', 'cant complain',
               'can\'t complain', 'no complaints', 'satisfied', 'happy', 'money well spent',
               'bargain', 'steal', 'underpriced', 'generous', 'fair pricing', 'reasonable price'],
    weight: 0.9
  },
  overall: {
    keywords: ['perfect', 'excellent', 'amazing', 'best', 'love it', 'recommend', '5 stars',
               'highly recommend', 'must have', 'essential', 'very satisfied', 'great overall',
               'wonderful', 'fantastic app', 'superb', 'outstanding', 'impressed', 'brilliant',
               'happy with', 'very good', 'really good', 'absolutely love', 'thank', 'thanks',
               'appreciate', 'glad', 'finally', 'exactly what', 'just what', 'life saver',
               'game changer', 'cant live without', 'can\'t live without', 'daily use',
               'use every day', 'everyday', 'always use', 'go to app', 'go-to app', 'favorite',
               'five star', '5 star', 'top notch', 'first class', 'world class', 'exceptional',
               'phenomenal', 'terrific', 'marvelous', 'splendid', 'delightful', 'fabulous'],
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
  
  console.log('\n=== analyzeSatisfactionAreas ===');
  console.log('Review count:', reviews?.length || 0);
  console.log('Sample review fields:', reviews?.[0] ? Object.keys(reviews[0]) : 'No reviews');
  
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
  
  // Log review structure for debugging
  if (reviews.length > 0) {
    const sampleReview = reviews[0];
    console.log('Review structure:', {
      fields: Object.keys(sampleReview),
      sampleText: sampleReview.text || sampleReview.content || sampleReview['Review Text'] || sampleReview.Body || 'NO TEXT FOUND',
      rating: sampleReview.rating || sampleReview.Rating
    });
  }
  
  Object.keys(POSITIVE_PATTERNS).forEach(category => {
    satisfaction[category] = {
      count: 0,
      weight: POSITIVE_PATTERNS[category].weight,
      examples: []
    };
    
    let categoryMatches = 0;
    reviews.forEach((review, index) => {
      const text = (review.text || review.content || review['Review Text'] || review.Body || '').toLowerCase();
      const matchedKeywords = POSITIVE_PATTERNS[category].keywords.filter(keyword => text.includes(keyword));
      
      // Debug first few reviews for each category
      if (index < 3 && category === 'performance') {
        console.log(`Review ${index} text sample:`, text.substring(0, 100));
        console.log(`Matched keywords for ${category}:`, matchedKeywords);
      }
      
      if (matchedKeywords.length > 0) {
        categoryMatches++;
        satisfaction[category].count++;
        
        // Log match for debugging
        if (categoryMatches === 1) {
          console.log(`  First match in ${category}: "${text.substring(0, 50)}..." matched [${matchedKeywords.join(', ')}]`);
        }
        
        if (satisfaction[category].examples.length < 5) {
          satisfaction[category].examples.push({
            text: (review.text || review.content || review['Review Text'] || review.Body || '').substring(0, 200),
            rating: review.rating || review.Rating,
            date: review.date || review.Date,
            matchedKeywords: matchedKeywords
          });
        }
      }
    });
    
    console.log(`Satisfaction category ${category}: found ${categoryMatches} matches out of ${reviews.length} reviews`);
  });
  
  console.log('Final satisfaction areas result:', satisfaction);
  
  // If no positive keywords matched, use sentiment-based fallback
  const totalMatches = Object.values(satisfaction).reduce((sum, cat) => sum + cat.count, 0);
  
  // Special handling: ensure value and overall categories have minimal representation
  // if we have high-rating reviews but no keyword matches
  if (reviews.length > 0) {
    const highRatingReviews = reviews.filter(r => (r.rating || r.Rating || 0) >= 4);
    
    if (satisfaction.value.count === 0 && highRatingReviews.length > 0) {
      // Assume 10% of high-rating reviews indicate value satisfaction
      satisfaction.value.count = Math.max(1, Math.floor(highRatingReviews.length * 0.1));
      console.log(`📊 Added estimated value satisfaction: ${satisfaction.value.count} (from ${highRatingReviews.length} high-rating reviews)`);
    }
    
    if (satisfaction.overall.count === 0 && highRatingReviews.length > 0) {
      // Assume 15% of high-rating reviews indicate overall satisfaction
      satisfaction.overall.count = Math.max(1, Math.floor(highRatingReviews.length * 0.15));
      console.log(`📊 Added estimated overall satisfaction: ${satisfaction.overall.count} (from ${highRatingReviews.length} high-rating reviews)`);
    }
  }
  
  if (totalMatches === 0 && reviews.length > 0) {
    console.log('⚠️ No positive keywords matched, using sentiment-based estimation...');
    
    // Count positive sentiment reviews for each category
    const positiveReviews = reviews.filter(r => {
      const sentiment = r.sentiment || r.Sentiment || '';
      const rating = r.rating || r.Rating || 0;
      return sentiment === 'Positive' || sentiment === 'positive' || rating >= 4;
    });
    
    console.log(`Found ${positiveReviews.length} positive reviews out of ${reviews.length} total`);
    
    if (positiveReviews.length > 0) {
      // Distribute positive reviews across categories based on weights
      const totalWeight = Object.values(POSITIVE_PATTERNS).reduce((sum, p) => sum + p.weight, 0);
      
      Object.keys(POSITIVE_PATTERNS).forEach(category => {
        const categoryShare = Math.floor((POSITIVE_PATTERNS[category].weight / totalWeight) * positiveReviews.length);
        // Ensure minimum count of 1 for each category if there are positive reviews
        satisfaction[category].count = Math.max(categoryShare, 1);
        
        // Add some example positive reviews
        const examples = positiveReviews.slice(0, 3).map(review => ({
          text: (review.text || review.content || review['Review Text'] || review.Body || '').substring(0, 200),
          rating: review.rating || review.Rating,
          date: review.date || review.Date,
          matchedKeywords: ['positive sentiment']
        }));
        
        satisfaction[category].examples = examples;
        console.log(`  - ${category}: estimated count=${categoryShare} based on sentiment`);
      });
    }
  }
  
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

// Helper function to normalize painPoints structure
function normalizePainPoints(painPoints) {
  // If painPoints is already in the correct format, return it
  if (painPoints && typeof painPoints === 'object' && !painPoints.categories) {
    // Check if it has the expected structure (category keys with count property)
    const firstKey = Object.keys(painPoints)[0];
    if (firstKey && painPoints[firstKey] && typeof painPoints[firstKey].count === 'number') {
      return painPoints;
    }
  }
  
  // If painPoints has a categories property, use that
  if (painPoints && painPoints.categories) {
    // Ensure each category has the required structure
    const normalized = {};
    Object.keys(COMPLAINT_PATTERNS).forEach(category => {
      if (painPoints.categories[category]) {
        // Initialize subcategories with proper structure
        const subcategories = {};
        Object.keys(COMPLAINT_PATTERNS[category].subcategories).forEach(subcat => {
          subcategories[subcat] = {
            count: 0,
            examples: []
          };
        });
        
        // Merge with existing subcategories if they exist
        if (painPoints.categories[category].subcategories) {
          Object.entries(painPoints.categories[category].subcategories).forEach(([subcat, data]) => {
            if (subcategories[subcat]) {
              subcategories[subcat] = {
                count: data.count || 0,
                examples: data.examples || []
              };
            }
          });
        }
        
        normalized[category] = {
          count: painPoints.categories[category].count || 0,
          subcategories: subcategories,
          examples: painPoints.categories[category].examples || []
        };
      } else {
        // Initialize empty category if not present
        const subcategories = {};
        Object.keys(COMPLAINT_PATTERNS[category].subcategories).forEach(subcat => {
          subcategories[subcat] = {
            count: 0,
            examples: []
          };
        });
        
        normalized[category] = {
          count: 0,
          subcategories: subcategories,
          examples: []
        };
      }
    });
    return normalized;
  }
  
  // If painPoints is invalid, return empty structure
  const emptyPainPoints = {};
  Object.keys(COMPLAINT_PATTERNS).forEach(category => {
    const subcategories = {};
    Object.keys(COMPLAINT_PATTERNS[category].subcategories).forEach(subcat => {
      subcategories[subcat] = {
        count: 0,
        examples: []
      };
    });
    
    emptyPainPoints[category] = {
      count: 0,
      subcategories: subcategories,
      examples: []
    };
  });
  return emptyPainPoints;
}

// Helper function to normalize satisfaction structure
function normalizeSatisfaction(satisfaction, reviews = []) {
  console.log('=== normalizeSatisfaction Debug ===');
  console.log('Input satisfaction:', JSON.stringify(satisfaction, null, 2));
  console.log('Input type:', typeof satisfaction);
  console.log('Has categories property:', satisfaction?.categories ? 'yes' : 'no');
  console.log('Review count for context:', reviews?.length || 0);
  
  // If satisfaction is already in the correct format, return it
  if (satisfaction && typeof satisfaction === 'object' && !satisfaction.categories) {
    const firstKey = Object.keys(satisfaction)[0];
    if (firstKey && satisfaction[firstKey] && typeof satisfaction[firstKey].count === 'number') {
      console.log('✅ Satisfaction already normalized, returning as-is');
      // Log the counts for debugging
      Object.entries(satisfaction).forEach(([cat, data]) => {
        console.log(`  - ${cat}: count=${data.count}`);
      });
      return satisfaction;
    }
  }
  
  // If satisfaction has a categories property (from Gemini AI), use that
  if (satisfaction && satisfaction.categories) {
    console.log('📊 Satisfaction has categories property (AI format), normalizing...');
    const normalized = {};
    
    // Handle both positiveAspects.categories and satisfaction.categories
    const categories = satisfaction.categories;
    
    Object.keys(POSITIVE_PATTERNS).forEach(category => {
      if (categories[category]) {
        // AI format may have 'mentions' instead of 'count'
        const count = categories[category].count || 
                     categories[category].mentions || 
                     0;
        
        normalized[category] = {
          count: count,
          weight: POSITIVE_PATTERNS[category].weight,
          examples: categories[category].examples || []
        };
        console.log(`  - ${category}: count=${count} (from AI)`);
      } else {
        normalized[category] = {
          count: 0,
          weight: POSITIVE_PATTERNS[category].weight,
          examples: []
        };
        console.log(`  - ${category}: count=0 (not in AI response)`);
      }
    });
    console.log('✅ Normalized satisfaction from AI categories');
    return normalized;
  }
  
  // If we have reviews but no satisfaction data, analyze them
  if (!satisfaction && reviews && reviews.length > 0) {
    console.log('🔍 No satisfaction data provided, analyzing reviews...');
    const analyzed = analyzeSatisfactionAreas(reviews);
    console.log('✅ Analyzed satisfaction from reviews:', analyzed);
    return analyzed;
  }
  
  // If satisfaction exists but all counts are 0, try to analyze from reviews
  if (satisfaction && reviews && reviews.length > 0) {
    const totalCount = Object.values(satisfaction).reduce((sum, cat) => sum + (cat.count || 0), 0);
    if (totalCount === 0) {
      console.log('⚠️ Satisfaction data has 0 counts, re-analyzing from reviews...');
      const analyzed = analyzeSatisfactionAreas(reviews);
      console.log('✅ Re-analyzed satisfaction from reviews:', analyzed);
      return analyzed;
    }
  }
  
  // If satisfaction is invalid, return empty structure
  console.log('⚠️ Invalid satisfaction structure, returning empty');
  const emptySatisfaction = {};
  Object.keys(POSITIVE_PATTERNS).forEach(category => {
    emptySatisfaction[category] = {
      count: 0,
      weight: POSITIVE_PATTERNS[category].weight,
      examples: []
    };
  });
  return emptySatisfaction;
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
    console.log('=== Processing User Satisfaction ===');
    console.log('Has Gemini analysis:', !!userGeminiAnalysis);
    
    // Debug what Gemini returned
    if (userGeminiAnalysis) {
      console.log('Gemini analysis keys:', Object.keys(userGeminiAnalysis));
      console.log('Has positiveAspects:', !!userGeminiAnalysis.positiveAspects);
      console.log('Has satisfaction:', !!userGeminiAnalysis.satisfaction);
      console.log('Has satisfactionAreas:', !!userGeminiAnalysis.satisfactionAreas);
      
      if (userGeminiAnalysis.positiveAspects) {
        console.log('positiveAspects structure:', JSON.stringify(userGeminiAnalysis.positiveAspects, null, 2).substring(0, 500));
      }
    }
    
    // Check multiple possible locations for satisfaction data from Gemini
    const userSatisfactionRaw = userGeminiAnalysis?.positiveAspects || 
                               userGeminiAnalysis?.satisfaction || 
                               userGeminiAnalysis?.satisfactionAreas ||
                               null;
    
    console.log('Raw satisfaction data source:', 
      userGeminiAnalysis?.positiveAspects ? 'positiveAspects' :
      userGeminiAnalysis?.satisfaction ? 'satisfaction' :
      userGeminiAnalysis?.satisfactionAreas ? 'satisfactionAreas' :
      'will analyze from reviews'
    );
    
    // Pass reviews to normalizeSatisfaction in case it needs to analyze them
    const userSatisfactionNormalized = normalizeSatisfaction(userSatisfactionRaw, userReviews);
    
    console.log('User satisfaction final result:', {
      hasData: !!userSatisfactionNormalized,
      categories: Object.keys(userSatisfactionNormalized || {}),
      totalCount: Object.values(userSatisfactionNormalized || {}).reduce((sum, cat) => sum + (cat.count || 0), 0)
    });
    
    const userAnalysis = {
      totalReviews: userReviews?.length || 0,
      technicalIssues: userGeminiAnalysis?.technicalIssues || extractTechnicalIssues(userReviews || []),
      featureRequests: userGeminiAnalysis?.featureRequests || extractFeatureRequests(userReviews || []),
      painPoints: normalizePainPoints(userGeminiAnalysis?.painPoints || analyzePainPoints(userReviews || [])),
      satisfaction: userSatisfactionNormalized,
      aiInsights: userGeminiAnalysis
    };
    
    // Production debugging
    if (typeof window !== 'undefined' && window.location.hostname.includes('render.com')) {
      console.log('[PRODUCTION DEBUG] Normalized user painPoints structure:', {
        keys: Object.keys(userAnalysis.painPoints || {}),
        technical: userAnalysis.painPoints?.technical ? {
          hasCount: 'count' in userAnalysis.painPoints.technical,
          count: userAnalysis.painPoints.technical.count,
          hasSubcategories: 'subcategories' in userAnalysis.painPoints.technical,
          subcatKeys: Object.keys(userAnalysis.painPoints.technical.subcategories || {})
        } : 'missing'
      });
    }
    
    // Check multiple possible locations for satisfaction data from Gemini
    console.log('\n=== Processing Competitor Satisfaction ===');
    console.log('Has Gemini analysis:', !!competitorGeminiAnalysis);
    
    const competitorSatisfactionRaw = competitorGeminiAnalysis?.positiveAspects || 
                                      competitorGeminiAnalysis?.satisfaction || 
                                      competitorGeminiAnalysis?.satisfactionAreas ||
                                      null;
    
    console.log('Raw satisfaction data source:', 
      competitorGeminiAnalysis?.positiveAspects ? 'positiveAspects' :
      competitorGeminiAnalysis?.satisfaction ? 'satisfaction' :
      competitorGeminiAnalysis?.satisfactionAreas ? 'satisfactionAreas' :
      'will analyze from reviews'
    );
    
    // Pass reviews to normalizeSatisfaction in case it needs to analyze them
    const competitorSatisfactionNormalized = normalizeSatisfaction(competitorSatisfactionRaw, competitorReviews);
    
    console.log('Competitor satisfaction final result:', {
      hasData: !!competitorSatisfactionNormalized,
      categories: Object.keys(competitorSatisfactionNormalized || {}),
      totalCount: Object.values(competitorSatisfactionNormalized || {}).reduce((sum, cat) => sum + (cat.count || 0), 0)
    });
    
    const competitorAnalysis = {
      totalReviews: competitorReviews?.length || 0,
      technicalIssues: competitorGeminiAnalysis?.technicalIssues || extractTechnicalIssues(competitorReviews || []),
      featureRequests: competitorGeminiAnalysis?.featureRequests || extractFeatureRequests(competitorReviews || []),
      painPoints: normalizePainPoints(competitorGeminiAnalysis?.painPoints || analyzePainPoints(competitorReviews || [])),
      satisfaction: competitorSatisfactionNormalized,
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
    
    // Final validation of data structure
    console.log('=== FINAL ANALYSIS VALIDATION ===');
    console.log('User pain points summary:', {
      hasData: !!userAnalysis.painPoints,
      categories: Object.keys(userAnalysis.painPoints || {}),
      totalCount: Object.values(userAnalysis.painPoints || {}).reduce((sum, cat) => sum + (cat?.count || 0), 0)
    });
    console.log('User satisfaction summary:', {
      hasData: !!userAnalysis.satisfaction,
      categories: Object.keys(userAnalysis.satisfaction || {}),
      totalCount: Object.values(userAnalysis.satisfaction || {}).reduce((sum, cat) => sum + (cat?.count || 0), 0)
    });
    
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
  generateRecommendations,
  POSITIVE_PATTERNS,
  COMPLAINT_PATTERNS
};