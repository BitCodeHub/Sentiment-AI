const appleRSSService = require('./services/appleRSSService');

// Test RSS feed fetching
async function testRSSFeed() {
  console.log('=== Testing Apple RSS Feed Service ===\n');
  
  // Test with Hyundai Motor America app ID
  const appId = '416839124'; // Hyundai Blue Link
  
  try {
    console.log(`Testing single country (US) for app ${appId}...`);
    const usReviews = await appleRSSService.fetchRecentReviewsFromRSS(appId, 'us', 10);
    console.log(`Found ${usReviews.length} reviews from US RSS feed`);
    
    if (usReviews.length > 0) {
      console.log('\nMost recent US review:');
      console.log(`- Date: ${usReviews[0].updated}`);
      console.log(`- Rating: ${usReviews[0].rating}/5`);
      console.log(`- Author: ${usReviews[0].author}`);
      console.log(`- Title: ${usReviews[0].title}`);
      console.log(`- Content: ${usReviews[0].content.substring(0, 100)}...`);
      
      const mostRecentDate = new Date(usReviews[0].updated);
      const daysAgo = Math.floor((Date.now() - mostRecentDate) / (1000 * 60 * 60 * 24));
      console.log(`\nMost recent review is ${daysAgo} days old`);
    }
    
    console.log('\n---\n');
    console.log('Testing multiple countries...');
    const multiCountryResult = await appleRSSService.fetchMultiCountryReviews(
      appId, 
      ['us', 'gb', 'ca', 'au'], 
      5
    );
    
    console.log(`\nTotal reviews from all countries: ${multiCountryResult.totalCount}`);
    console.log('Country breakdown:');
    Object.entries(multiCountryResult.countryResults).forEach(([country, result]) => {
      console.log(`- ${country}: ${result.success ? result.count + ' reviews' : 'Failed - ' + result.error}`);
      if (result.success && result.mostRecent) {
        const date = new Date(result.mostRecent);
        const daysAgo = Math.floor((Date.now() - date) / (1000 * 60 * 60 * 24));
        console.log(`  Most recent: ${daysAgo} days ago`);
      }
    });
    
    // Check date range of all reviews
    if (multiCountryResult.reviews.length > 0) {
      const dates = multiCountryResult.reviews.map(r => new Date(r.Date));
      const newestDate = new Date(Math.max(...dates));
      const oldestDate = new Date(Math.min(...dates));
      const newestDaysAgo = Math.floor((Date.now() - newestDate) / (1000 * 60 * 60 * 24));
      const oldestDaysAgo = Math.floor((Date.now() - oldestDate) / (1000 * 60 * 60 * 24));
      
      console.log(`\nDate range: ${newestDaysAgo} to ${oldestDaysAgo} days ago`);
      console.log(`Newest review: ${newestDate.toLocaleDateString()}`);
      console.log(`Oldest review: ${oldestDate.toLocaleDateString()}`);
    }
    
  } catch (error) {
    console.error('Error testing RSS feed:', error);
  }
}

// Run the test
testRSSFeed();