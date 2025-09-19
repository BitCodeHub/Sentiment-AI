require('dotenv').config();
const competitorService = require('./services/competitorService');

async function testCompetitorService() {
  console.log('=== Testing Competitor Service ===\n');

  try {
    // Test 1: Fetch single competitor info
    console.log('1. Testing single competitor info (Tesla)...');
    const teslaInfo = await competitorService.fetchCompetitorAppInfo('582594009', 'us');
    console.log('Tesla App Info:', {
      name: teslaInfo.name,
      rating: teslaInfo.rating.overall,
      reviewCount: teslaInfo.rating.overallCount,
      version: teslaInfo.version
    });
    console.log('✓ Single competitor info test passed\n');

    // Test 2: Fetch multiple competitors
    console.log('2. Testing multiple competitor info...');
    const competitorIds = [
      '1479552869', // MyHyundai
      '1095418609', // FordPass
      '579578017'   // Mercedes me
    ];
    const multipleInfo = await competitorService.fetchMultipleCompetitorInfo(competitorIds);
    console.log('Multiple competitors fetched:', Object.keys(multipleInfo.results).length);
    console.log('Errors:', Object.keys(multipleInfo.errors).length);
    console.log('✓ Multiple competitor info test passed\n');

    // Test 3: Fetch competitor reviews
    console.log('3. Testing competitor reviews (MyHyundai)...');
    const reviews = await competitorService.fetchCompetitorReviews('1479552869', ['us'], 10);
    console.log('Reviews fetched:', reviews.totalCount);
    if (reviews.reviews.length > 0) {
      console.log('Sample review:', {
        rating: reviews.reviews[0].Rating,
        date: reviews.reviews[0].Date,
        title: reviews.reviews[0]['Review Title']?.substring(0, 50) + '...'
      });
    }
    console.log('✓ Competitor reviews test passed\n');

    // Test 4: Reddit mentions (if Reddit is configured)
    if (process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET) {
      console.log('4. Testing Reddit mentions...');
      const redditData = await competitorService.fetchCompetitorRedditMentions('Tesla app', {
        timeFilter: 'week',
        limit: 10
      });
      console.log('Reddit mentions found:', redditData.totalMentions);
      console.log('Sentiment score:', redditData.sentiment.score);
      console.log('✓ Reddit mentions test passed\n');
    } else {
      console.log('4. Skipping Reddit test (not configured)\n');
    }

    // Test 5: Comprehensive analysis
    console.log('5. Testing comprehensive competitor analysis...');
    const analysis = await competitorService.getCompetitorAnalysis('1479552869', {
      countries: ['us'],
      reviewLimit: 20,
      redditTimeFilter: 'month',
      includeReviews: true,
      includeReddit: !!process.env.REDDIT_CLIENT_ID
    });
    console.log('Analysis complete:', {
      appName: analysis.appInfo.name,
      rating: analysis.metrics.appRating,
      reviewCount: analysis.metrics.reviewCount,
      hasReviews: !!analysis.reviews,
      hasReddit: !!analysis.reddit
    });
    console.log('✓ Comprehensive analysis test passed\n');

    // Test 6: Compare competitors
    console.log('6. Testing competitor comparison...');
    const comparison = await competitorService.compareCompetitors(
      ['1479552869', '1095418609', '579578017'],
      { includeReviews: true, includeReddit: false }
    );
    console.log('Comparison results:', {
      competitorsAnalyzed: Object.keys(comparison.comparisons).length,
      errors: Object.keys(comparison.errors).length,
      summary: comparison.summary
    });
    console.log('✓ Competitor comparison test passed\n');

    console.log('=== All tests passed! ===');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run tests
testCompetitorService();