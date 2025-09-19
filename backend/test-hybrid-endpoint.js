const axios = require('axios');

async function testHybridEndpoint() {
  console.log('Testing Apple Reviews Hybrid Endpoint...\n');
  
  const backendURL = process.env.BACKEND_URL || 'http://localhost:3001';
  const endpoint = `${backendURL}/api/apple-reviews/hybrid`;
  
  // Test app ID (you can change this to your actual app ID)
  const testAppId = '6450534064'; // Example: Hyundai app
  
  try {
    console.log(`Testing with App ID: ${testAppId}`);
    console.log(`Endpoint: ${endpoint}\n`);
    
    // Create form data
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('appId', testAppId);
    formData.append('useServerCredentials', 'true');
    formData.append('countries', JSON.stringify(['us', 'gb', 'ca', 'au', 'de', 'fr', 'jp', 'it', 'es', 'nl']));
    
    console.log('Sending request...');
    const startTime = Date.now();
    
    const response = await axios.post(endpoint, formData, {
      headers: formData.getHeaders(),
      timeout: 60000 // 60 second timeout
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`\nResponse received in ${responseTime}ms`);
    
    if (response.data.success) {
      const { reviews, sources, dateRange } = response.data;
      
      console.log('\n=== RESULTS ===');
      console.log(`Total unique reviews: ${reviews.length}`);
      console.log('\nSources:');
      console.log(`- RSS: ${sources.rss.count} reviews (${sources.rss.success ? 'Success' : 'Failed'})`);
      console.log(`- API: ${sources.api.count} reviews (${sources.api.success ? 'Success' : 'Failed'})`);
      
      if (dateRange) {
        const newestDate = new Date(dateRange.newest);
        const oldestDate = new Date(dateRange.oldest);
        const newestDaysAgo = Math.floor((Date.now() - newestDate) / (1000 * 60 * 60 * 24));
        const oldestDaysAgo = Math.floor((Date.now() - oldestDate) / (1000 * 60 * 60 * 24));
        
        console.log('\nDate Range:');
        console.log(`- Most recent review: ${newestDate.toLocaleDateString()} (${newestDaysAgo} days ago)`);
        console.log(`- Oldest review: ${oldestDate.toLocaleDateString()} (${oldestDaysAgo} days ago)`);
        
        // Show the 5 most recent reviews
        console.log('\n=== 5 MOST RECENT REVIEWS ===');
        const recentReviews = reviews.slice(0, 5);
        recentReviews.forEach((review, index) => {
          const reviewDate = new Date(review.Date);
          const daysAgo = Math.floor((Date.now() - reviewDate) / (1000 * 60 * 60 * 24));
          console.log(`\n${index + 1}. ${review.Author} - ${review.Rating}★ - ${reviewDate.toLocaleDateString()} (${daysAgo} days ago)`);
          console.log(`   Title: ${review['Review Title'] || 'No title'}`);
          console.log(`   Source: ${review.Source || 'API'}`);
          console.log(`   Country: ${review.Country}`);
        });
        
        // Check if we have any reviews from the last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentReviewsCount = reviews.filter(r => new Date(r.Date) > sevenDaysAgo).length;
        console.log(`\n=== RECENCY CHECK ===`);
        console.log(`Reviews from the last 7 days: ${recentReviewsCount}`);
        
        if (newestDaysAgo > 5) {
          console.log('\n⚠️  WARNING: Most recent review is more than 5 days old!');
          console.log('This might indicate an issue with data fetching.');
        } else {
          console.log('\n✅ SUCCESS: We have recent reviews!');
        }
      }
      
    } else {
      console.error('Request failed:', response.data.error);
    }
    
  } catch (error) {
    console.error('\nError testing hybrid endpoint:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
  }
}

// Run the test
testHybridEndpoint();