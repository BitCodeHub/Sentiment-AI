// Test script for Executive Analysis
import { performExecutiveAnalysis } from './src/services/executiveAnalysis.js';

// Sample review data that reflects real app issues
const testReviews = [
  {
    id: 1,
    rating: 1,
    date: '2024-01-15',
    content: "App crashes every time I try to open it. Completely unusable since the last update. This is unacceptable for a paid service!",
    sentiment: 'negative'
  },
  {
    id: 2,
    rating: 2,
    date: '2024-01-14',
    content: "Remote start only works about 50% of the time. The other half I'm standing in the cold repeatedly hitting the button. Tesla's app never fails.",
    sentiment: 'negative'
  },
  {
    id: 3,
    rating: 1,
    date: '2024-01-13',
    content: "Have to log in EVERY. SINGLE. DAY. And half the time it doesn't accept my password that I know is correct. Switching to Ford.",
    sentiment: 'negative'
  },
  {
    id: 4,
    rating: 3,
    date: '2024-01-12',
    content: "No Apple Watch app in 2024? Even my garage door has one. This is embarrassing for Hyundai. The features that do work are okay.",
    sentiment: 'neutral'
  },
  {
    id: 5,
    rating: 4,
    date: '2024-01-11',
    content: "When it works, it's fantastic. Love being able to start my car from inside on cold mornings. Just wish it was more reliable.",
    sentiment: 'positive'
  },
  {
    id: 6,
    rating: 1,
    date: '2024-01-10',
    content: "iOS app crashes on launch. Tried reinstalling 5 times. Nothing works. How did this pass testing? My BMW app works perfectly.",
    sentiment: 'negative'
  },
  {
    id: 7,
    rating: 2,
    date: '2024-01-09',
    content: "Connection to vehicle failed is all I ever see. My car is in my driveway with full cellular signal. Mercedes app connects instantly.",
    sentiment: 'negative'
  },
  {
    id: 8,
    rating: 1,
    date: '2024-01-08',
    content: "Got logged out while driving and trying to use navigation. Super dangerous and frustrating. Need offline mode desperately.",
    sentiment: 'negative'
  },
  {
    id: 9,
    rating: 2,
    date: '2024-01-07',
    content: "Can't add widgets, no Siri shortcuts, missing so many basic features that every other car app has. Tesla is miles ahead.",
    sentiment: 'negative'
  },
  {
    id: 10,
    rating: 5,
    date: '2024-01-06',
    content: "Blue Link safety features give me peace of mind. The automatic crash notification is worth the subscription alone.",
    sentiment: 'positive'
  }
];

// Aggregated data that would come from the dashboard
const testAggregatedData = {
  summary: {
    avgRating: 2.1,
    totalReviews: 10,
    distribution: {
      1: 4,
      2: 3,
      3: 1,
      4: 1,
      5: 1
    }
  },
  sentimentBreakdown: {
    positive: 2,
    negative: 7,
    neutral: 1
  }
};

// Test the executive analysis
async function testExecutiveAnalysis() {
  console.log('Testing Executive Analysis with sample data...\n');
  
  try {
    const analysis = await performExecutiveAnalysis(testReviews, testAggregatedData);
    
    console.log('✅ Analysis completed successfully!\n');
    
    // Display key insights
    console.log('📊 Executive Summary:');
    console.log('- Overview:', analysis.executiveSummary.overview);
    console.log('\n- Key Findings:');
    analysis.executiveSummary.keyFindings.forEach(finding => {
      console.log(`  • ${finding}`);
    });
    
    if (analysis.revenueAnalysis) {
      console.log('\n💰 Revenue Impact:');
      console.log('- Estimated Annual Loss:', `$${analysis.revenueAnalysis.current.annualRevenueLoss?.toLocaleString() || 'N/A'}`);
      console.log('- Users at Risk:', analysis.revenueAnalysis.current.estimatedChurn?.toLocaleString() || 'N/A');
    }
    
    if (analysis.competitiveAnalysis?.analysis?.competitorMentions) {
      console.log('\n🏆 Competitor Mentions:');
      Object.entries(analysis.competitiveAnalysis.analysis.competitorMentions).forEach(([competitor, data]) => {
        console.log(`- ${competitor}: ${data.mentions} mentions`);
      });
    }
    
    if (analysis.productStrategy?.featurePriorities?.topRequests) {
      console.log('\n🚀 Top Feature Requests:');
      analysis.productStrategy.featurePriorities.topRequests.slice(0, 3).forEach(feature => {
        console.log(`- ${feature.feature}: ${feature.frequency} mentions`);
      });
    }
    
    console.log('\n📈 Analysis Confidence:', analysis.analysisMetadata?.confidenceLevel || 'Unknown');
    console.log('Analysis Type:', analysis.analysisMetadata?.analysisType || 'Unknown');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    console.error('\nFull error:', error);
  }
}

// Run the test
testExecutiveAnalysis();