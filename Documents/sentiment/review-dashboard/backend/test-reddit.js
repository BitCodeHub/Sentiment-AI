require('dotenv').config();
const redditService = require('./services/redditService');

async function testRedditService() {
  console.log('Testing Reddit Service...\n');
  
  // Test app name - change this to your actual app name
  const appName = 'Hyundai BlueLink';
  
  try {
    console.log('1. Testing searchPosts...');
    const posts = await redditService.searchPosts(appName, {
      limit: 5,
      timeFilter: 'month'
    });
    console.log(`Found ${posts.length} posts mentioning "${appName}"`);
    if (posts.length > 0) {
      console.log('\nFirst post:');
      console.log(`- Title: ${posts[0].title}`);
      console.log(`- Subreddit: r/${posts[0].subreddit}`);
      console.log(`- Score: ${posts[0].score}`);
      console.log(`- Comments: ${posts[0].numComments}`);
      console.log(`- Engagement Score: ${posts[0].engagementScore}`);
    }
    
    console.log('\n2. Testing analyzeMentionTrends...');
    const trends = await redditService.analyzeMentionTrends(appName, {
      timeframes: ['day', 'week', 'month']
    });
    console.log('Mention trends:');
    Object.entries(trends).forEach(([timeframe, data]) => {
      if (!data.error) {
        console.log(`- ${timeframe}: ${data.totalMentions} mentions, ${data.averageEngagement} avg engagement`);
      }
    });
    
    console.log('\n3. Testing detectInfluenceSpikes...');
    const spikes = await redditService.detectInfluenceSpikes(appName, {
      lookbackDays: 30,
      spikeThreshold: 1.5
    });
    console.log(`Found ${spikes.spikes.length} influence spikes`);
    console.log(`Recommendation: ${spikes.recommendation.status} - ${spikes.recommendation.message}`);
    
    console.log('\n4. Testing findRelevantSubreddits...');
    const subreddits = await redditService.findRelevantSubreddits(appName, 'technology');
    console.log(`Found ${subreddits.length} relevant subreddits:`);
    subreddits.slice(0, 3).forEach(sub => {
      console.log(`- r/${sub.name}: ${sub.subscribers} subscribers`);
    });
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Check if required environment variables are set
if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
  console.error('❌ Missing Reddit credentials!');
  console.error('Please set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in your .env file');
  console.error('\nExample:');
  console.error('REDDIT_CLIENT_ID=your-client-id');
  console.error('REDDIT_CLIENT_SECRET=your-client-secret');
  process.exit(1);
}

testRedditService();