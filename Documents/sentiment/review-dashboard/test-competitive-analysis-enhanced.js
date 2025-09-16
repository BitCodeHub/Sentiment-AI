// Test script for enhanced competitive analysis with Gemini 2.5 Flash

import { performDeepOEMAnalysis, generateCompetitiveMetrics, answerOEMQuestion } from './src/services/geminiOEMAnalysis.js';

// Test competitors
const testCompetitors = [
  {
    id: 'toyota',
    name: 'Toyota',
    country: 'Japan',
    brands: ['Toyota', 'Lexus'],
    categories: ['Mass Market', 'Luxury'],
    specialties: ['Hybrid Technology', 'Reliability']
  },
  {
    id: 'tesla',
    name: 'Tesla',
    country: 'USA',
    brands: ['Tesla'],
    categories: ['Pure EV', 'Technology'],
    specialties: ['Electric Vehicles', 'Autonomous Driving']
  },
  {
    id: 'volkswagen',
    name: 'Volkswagen Group',
    country: 'Germany',
    brands: ['VW', 'Audi', 'Porsche'],
    categories: ['Mass Market', 'Luxury', 'Performance'],
    specialties: ['Engineering', 'Performance']
  }
];

const userApp = 'Ford Motor Company';

// Test 1: Deep OEM Analysis
console.log('🔍 Testing Deep OEM Analysis...\n');

async function testDeepAnalysis() {
  try {
    console.log('Testing Overall Analysis:');
    const overallAnalysis = await performDeepOEMAnalysis(testCompetitors, userApp, 'overall');
    console.log('✅ Overall Analysis:', JSON.stringify(overallAnalysis, null, 2).substring(0, 500) + '...\n');

    console.log('Testing Ratings Analysis:');
    const ratingsAnalysis = await performDeepOEMAnalysis(testCompetitors, userApp, 'ratings');
    console.log('✅ Ratings Analysis:', JSON.stringify(ratingsAnalysis, null, 2).substring(0, 500) + '...\n');

    console.log('Testing Sentiment Analysis:');
    const sentimentAnalysis = await performDeepOEMAnalysis(testCompetitors, userApp, 'sentiment');
    console.log('✅ Sentiment Analysis:', JSON.stringify(sentimentAnalysis, null, 2).substring(0, 500) + '...\n');

    console.log('Testing Market Position Analysis:');
    const marketAnalysis = await performDeepOEMAnalysis(testCompetitors, userApp, 'market');
    console.log('✅ Market Analysis:', JSON.stringify(marketAnalysis, null, 2).substring(0, 500) + '...\n');

  } catch (error) {
    console.error('❌ Deep Analysis Error:', error);
  }
}

// Test 2: Generate Competitive Metrics
async function testMetricsGeneration() {
  console.log('\n📊 Testing Metrics Generation...\n');
  
  try {
    console.log('Generating ratings metrics:');
    const ratingsMetrics = await generateCompetitiveMetrics(testCompetitors, 'ratings');
    console.log('✅ Ratings Metrics:', JSON.stringify(ratingsMetrics, null, 2).substring(0, 400) + '...\n');

    console.log('Generating sentiment metrics:');
    const sentimentMetrics = await generateCompetitiveMetrics(testCompetitors, 'sentiment');
    console.log('✅ Sentiment Metrics:', JSON.stringify(sentimentMetrics, null, 2).substring(0, 400) + '...\n');

    console.log('Generating market share metrics:');
    const marketMetrics = await generateCompetitiveMetrics(testCompetitors, 'market');
    console.log('✅ Market Metrics:', JSON.stringify(marketMetrics, null, 2).substring(0, 400) + '...\n');

  } catch (error) {
    console.error('❌ Metrics Generation Error:', error);
  }
}

// Test 3: Answer OEM Questions
async function testChatbot() {
  console.log('\n💬 Testing Rivue Chatbot...\n');
  
  const questions = [
    "How does Ford compare to Tesla in electric vehicle technology?",
    "What are the main customer complaints about Toyota apps?",
    "Which OEM has the best customer satisfaction scores and why?",
    "What market opportunities exist for Ford based on competitor weaknesses?",
    "How are these automotive brands performing in terms of digital services?"
  ];

  try {
    for (const question of questions) {
      console.log(`Q: ${question}`);
      const answer = await answerOEMQuestion(question, testCompetitors, {
        userApp: userApp,
        analysisType: 'general'
      });
      console.log(`A: ${answer.answer?.substring(0, 300)}...\n`);
    }
  } catch (error) {
    console.error('❌ Chatbot Error:', error);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Enhanced Competitive Analysis Tests\n');
  console.log('============================================\n');
  
  await testDeepAnalysis();
  await testMetricsGeneration();
  await testChatbot();
  
  console.log('\n✅ All tests completed!');
}

// Execute tests
runAllTests().catch(console.error);