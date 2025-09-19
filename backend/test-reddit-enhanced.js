require('dotenv').config();
const redditService = require('./services/redditService');

async function testEnhancedRedditSearch() {
  console.log('Testing Enhanced Reddit Search...\n');
  
  const testApps = [
    'MyHyundai with Bluelink',
    'Genesis Intelligent Assistant',
    'Tesla',
    'Ford Pass'
  ];
  
  for (const appName of testApps) {
    console.log(`\n=== Testing: ${appName} ===`);
    
    try {
      // Test search
      console.log('1. Testing search...');
      const searchResults = await redditService.searchPosts(appName, {
        limit: 5,
        timeFilter: 'month'
      });
      console.log(`Found ${searchResults.length} posts`);
      
      if (searchResults.length > 0) {
        console.log('\nTop post:');
        console.log(`- Title: ${searchResults[0].title}`);
        console.log(`- Subreddit: r/${searchResults[0].subreddit}`);
        console.log(`- Score: ${searchResults[0].score}`);
        console.log(`- Engagement: ${searchResults[0].engagementScore}`);
      }
      
      // Test subreddit discovery
      console.log('\n2. Testing relevant subreddits...');
      const subreddits = await redditService.findRelevantSubreddits(appName);
      console.log(`Found ${subreddits.length} relevant subreddits:`);
      subreddits.slice(0, 3).forEach(sub => {
        console.log(`- r/${sub.name}: ${sub.subscribers} subscribers`);
      });
      
    } catch (error) {
      console.error(`Error testing ${appName}:`, error.message);
    }
  }
  
  console.log('\n✅ Enhanced Reddit search test complete!');
}

// Check credentials first
if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
  console.error('❌ Missing Reddit credentials!');
  console.error('Please set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in your .env file');
  process.exit(1);
}

testEnhancedRedditSearch();