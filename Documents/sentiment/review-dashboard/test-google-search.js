import { GoogleGenerativeAI } from '@google/generative-ai';

// Test Google Search Grounding
async function testGoogleSearch() {
  const apiKey = process.env.VITE_GEMINI_API_KEY || 'your-api-key-here';
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    // Create model with Google Search Grounding enabled
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      tools: [{
        googleSearchGrounding: {
          enable: true,
          fallback: true
        }
      }]
    });
    
    // Test query that should trigger web search
    const prompt = `What are people saying about review bombing on Reddit today? Find recent discussions.`;
    
    console.log('Testing Google Search Grounding...');
    console.log('Prompt:', prompt);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('\nResponse:', text);
    console.log('\nGoogle Search Grounding test complete!');
    
  } catch (error) {
    console.error('Error testing Google Search:', error);
    console.error('Make sure your API key supports Google Search Grounding');
  }
}

// Run test
testGoogleSearch();