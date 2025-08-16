// Test function for satisfaction analysis
import { analyzeSatisfactionAreas } from '../services/deepContentAnalysis';

export function testSatisfactionAnalysis() {
  console.log('=== Testing Satisfaction Analysis ===');
  
  // Sample reviews with positive keywords
  const testReviews = [
    {
      text: "This app is amazing! It's fast and responsive. The interface is beautiful and easy to use.",
      rating: 5,
      date: new Date()
    },
    {
      content: "Love this app! Works great and has all the features I need. Highly recommend it.",
      rating: 5,
      date: new Date()
    },
    {
      'Review Text': "Simple and intuitive design. Great value for the price. Perfect for my needs.",
      Rating: 4,
      Date: new Date()
    },
    {
      Body: "The app performs well with no lag. Clean interface and excellent functionality.",
      rating: 5,
      date: new Date()
    },
    {
      text: "Worth every penny! Outstanding app with superb features. Must have!",
      rating: 5,
      date: new Date()
    }
  ];
  
  // Run the analysis
  const result = analyzeSatisfactionAreas(testReviews);
  
  console.log('Test reviews count:', testReviews.length);
  console.log('Analysis result:', result);
  
  // Check each category
  Object.entries(result).forEach(([category, data]) => {
    console.log(`Category: ${category}`);
    console.log(`  - Count: ${data.count}`);
    console.log(`  - Weight: ${data.weight}`);
    console.log(`  - Examples: ${data.examples.length}`);
  });
  
  return result;
}

// Run the test when imported
if (typeof window !== 'undefined') {
  window.testSatisfactionAnalysis = testSatisfactionAnalysis;
}