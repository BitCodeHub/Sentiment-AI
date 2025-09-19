const axios = require('axios');

async function testReviewDeduplication() {
  console.log('Testing review deduplication issue...\n');
  
  // Test endpoint - adjust URL as needed
  const apiUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  
  try {
    // Make a request to get reviews
    const response = await axios.post(`${apiUrl}/api/apple-reviews/hybrid`, {
      appId: process.env.TEST_APP_ID || '310633997', // WhatsApp as example
      useServerCredentials: 'true',
      countries: JSON.stringify(['us']),
      daysToFetch: 90 // Last 90 days
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const { reviews, sources, totalCount } = response.data;
    
    console.log('Response Summary:');
    console.log('================');
    console.log(`Total reviews returned: ${totalCount}`);
    console.log(`RSS reviews: ${sources.rss.count}`);
    console.log(`API reviews: ${sources.api.count}`);
    console.log(`Expected total before dedup: ${sources.rss.count + sources.api.count}`);
    console.log(`Reviews removed by dedup: ${sources.rss.count + sources.api.count - totalCount}`);
    
    // Analyze duplicates
    console.log('\nAnalyzing potential duplicates...');
    console.log('=================================');
    
    // Create a map to track duplicates
    const reviewMap = new Map();
    const duplicates = [];
    
    reviews.forEach(review => {
      const key = `${review.Author}_${review.Date}_${review.Rating}`;
      if (reviewMap.has(key)) {
        duplicates.push({
          key,
          review1: reviewMap.get(key),
          review2: review
        });
      } else {
        reviewMap.set(key, review);
      }
    });
    
    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate keys in returned data:`);
      duplicates.forEach((dup, index) => {
        console.log(`\nDuplicate ${index + 1}:`);
        console.log(`  Key: ${dup.key}`);
        console.log(`  Review 1 Title: ${dup.review1['Review Title']}`);
        console.log(`  Review 2 Title: ${dup.review2['Review Title']}`);
      });
    } else {
      console.log('No duplicates found in returned data.');
    }
    
    // Check for reviews with same author on same date
    console.log('\nChecking for same author, same date reviews...');
    console.log('=============================================');
    
    const authorDateMap = new Map();
    reviews.forEach(review => {
      const authorDateKey = `${review.Author}_${review.Date}`;
      if (!authorDateMap.has(authorDateKey)) {
        authorDateMap.set(authorDateKey, []);
      }
      authorDateMap.get(authorDateKey).push(review);
    });
    
    let sameAuthorDateCount = 0;
    authorDateMap.forEach((reviewList, key) => {
      if (reviewList.length > 1) {
        sameAuthorDateCount++;
        console.log(`\nAuthor/Date: ${key}`);
        console.log(`  Found ${reviewList.length} reviews:`);
        reviewList.forEach((review, index) => {
          console.log(`    ${index + 1}. Rating: ${review.Rating}, Title: "${review['Review Title']}"`);
        });
      }
    });
    
    if (sameAuthorDateCount === 0) {
      console.log('No reviews found with same author on same date.');
    }
    
    // Date range analysis
    if (reviews.length > 0) {
      console.log('\nDate Range Analysis:');
      console.log('===================');
      const dates = reviews.map(r => new Date(r.Date)).sort((a, b) => b - a);
      console.log(`Newest review: ${dates[0].toISOString()}`);
      console.log(`Oldest review: ${dates[dates.length - 1].toISOString()}`);
      
      const now = new Date();
      const daysDiff = Math.floor((now - dates[dates.length - 1]) / (1000 * 60 * 60 * 24));
      console.log(`Date range spans: ${daysDiff} days`);
    }
    
  } catch (error) {
    console.error('Error testing reviews:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testReviewDeduplication();