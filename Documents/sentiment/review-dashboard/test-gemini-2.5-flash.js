// Test script for Gemini 2.5 Flash model
import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini with API key
const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);

// Use Gemini 2.5 Flash model
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
  }
});

async function testGemini25Flash() {
  console.log('🚀 Testing Gemini 2.5 Flash model...\n');
  
  try {
    // Test 1: Simple OEM comparison
    console.log('Test 1: Basic OEM Comparison');
    const prompt1 = "Compare Ford and Tesla in terms of electric vehicle technology in 2 sentences.";
    const result1 = await model.generateContent(prompt1);
    const response1 = await result1.response;
    console.log('Response:', response1.text());
    console.log('✅ Test 1 passed\n');
    
    // Test 2: Competitive metrics generation
    console.log('Test 2: Generate Competitive Metrics');
    const prompt2 = `Generate a JSON object with market share percentages for these automotive companies:
    - Ford: ?
    - Tesla: ?
    - Toyota: ?
    
    Format: { "Ford": number, "Tesla": number, "Toyota": number }`;
    
    const result2 = await model.generateContent(prompt2);
    const response2 = await result2.response;
    console.log('Response:', response2.text());
    console.log('✅ Test 2 passed\n');
    
    // Test 3: Deep analysis capability
    console.log('Test 3: Deep OEM Analysis');
    const prompt3 = "What are the top 3 strengths of Mercedes-Benz in the luxury automotive market? Be specific and brief.";
    const result3 = await model.generateContent(prompt3);
    const response3 = await result3.response;
    console.log('Response:', response3.text());
    console.log('✅ Test 3 passed\n');
    
    console.log('✨ All tests passed! Gemini 2.5 Flash is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
  }
}

// Run the test
testGemini25Flash();