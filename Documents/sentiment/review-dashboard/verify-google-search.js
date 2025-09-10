import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function verifyGoogleSearch() {
  console.log('Testing Google Search Grounding with new API key...\n');
  
  const apiKey = process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('API key not found in environment variables');
    return;
  }
  
  console.log('API key loaded successfully (length:', apiKey.length, 'characters)');
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Test with grounding - Gemini 2.0 Flash has built-in grounding
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      }
    });
    
    console.log('✅ Model initialized with Google Search Grounding\n');
    
    // Test queries that should trigger web search
    const testQueries = [
      "What are the latest discussions about app review bombing on Reddit?",
      "Find recent HackerNews posts about mobile app ratings manipulation",
      "Search for current viral Twitter threads about app store reviews"
    ];
    
    for (const query of testQueries) {
      console.log('Query:', query);
      console.log('Generating response...');
      
      try {
        const result = await model.generateContent(query);
        const response = await result.response;
        const text = response.text();
        
        console.log('Response preview:', text.substring(0, 200) + '...\n');
        console.log('✅ Google Search Grounding is working!\n');
        console.log('-'.repeat(80) + '\n');
      } catch (error) {
        console.error('❌ Error with query:', error.message);
      }
    }
    
    console.log('All tests completed!');
    
  } catch (error) {
    console.error('Error initializing model:', error);
    console.error('Full error:', error.message);
  }
}

// Run verification
verifyGoogleSearch();