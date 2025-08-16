// Test utility for satisfaction analysis
import { analyzeSatisfactionAreas, POSITIVE_PATTERNS } from '../services/deepContentAnalysis';

// Sample positive reviews for testing
export const samplePositiveReviews = [
  {
    text: "This app is amazing! Works perfectly and the performance is really fast. Love it!",
    rating: 5,
    date: "2024-01-15"
  },
  {
    text: "Very easy to use and intuitive interface. Great value for money. Highly recommend!",
    rating: 5,
    date: "2024-01-14"
  },
  {
    text: "Excellent app with useful features. Simple and clean design. Works great!",
    rating: 4,
    date: "2024-01-13"
  },
  {
    text: "Best app I've used. Fast, reliable, and worth every penny. Outstanding performance!",
    rating: 5,
    date: "2024-01-12"
  },
  {
    content: "Love the design! So user-friendly and intuitive. Great functionality and features.",
    rating: 5,
    date: "2024-01-11"
  }
];

// Test the satisfaction analysis
export function testSatisfactionAnalysis() {
  console.log('Testing satisfaction analysis with sample reviews...');
  console.log('Sample reviews:', samplePositiveReviews);
  console.log('Positive patterns:', POSITIVE_PATTERNS);
  
  const result = analyzeSatisfactionAreas(samplePositiveReviews);
  
  console.log('Test result:', result);
  console.log('Summary:');
  Object.entries(result).forEach(([category, data]) => {
    console.log(`- ${category}: ${data.count} matches (${(data.count / samplePositiveReviews.length * 100).toFixed(0)}%)`);
  });
  
  return result;
}

// Function to check if reviews contain positive keywords
export function checkReviewsForPositiveKeywords(reviews) {
  const summary = {
    totalReviews: reviews.length,
    reviewsWithPositiveKeywords: 0,
    keywordFrequency: {},
    fieldNames: new Set()
  };
  
  reviews.forEach((review, index) => {
    // Track field names
    Object.keys(review).forEach(key => summary.fieldNames.add(key));
    
    const text = (review.text || review.content || review['Review Text'] || review.Body || '').toLowerCase();
    let hasPositiveKeyword = false;
    
    Object.entries(POSITIVE_PATTERNS).forEach(([category, pattern]) => {
      pattern.keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          hasPositiveKeyword = true;
          if (!summary.keywordFrequency[keyword]) {
            summary.keywordFrequency[keyword] = 0;
          }
          summary.keywordFrequency[keyword]++;
        }
      });
    });
    
    if (hasPositiveKeyword) {
      summary.reviewsWithPositiveKeywords++;
    }
    
    // Log first few reviews for debugging
    if (index < 3) {
      console.log(`Review ${index}:`, {
        text: text.substring(0, 100) + '...',
        hasPositiveKeyword,
        rating: review.rating || review.Rating
      });
    }
  });
  
  console.log('Review analysis summary:', {
    ...summary,
    fieldNames: Array.from(summary.fieldNames),
    percentageWithPositiveKeywords: (summary.reviewsWithPositiveKeywords / summary.totalReviews * 100).toFixed(1) + '%'
  });
  
  // Show top keywords
  const topKeywords = Object.entries(summary.keywordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  console.log('Top 10 positive keywords found:', topKeywords);
  
  return summary;
}