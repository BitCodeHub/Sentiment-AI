// Test Enhanced TTS Service
// Run this in the browser console to test the enhanced TTS

import enhancedTTS from './src/services/enhancedTTSService.js';

// Test function
async function testEnhancedTTS() {
  console.log('=== Testing Enhanced TTS Service ===');
  
  // Check capabilities
  const capabilities = enhancedTTS.checkCapabilities();
  console.log('TTS Capabilities:', capabilities);
  
  // Preload and list voices
  try {
    await enhancedTTS.preloadVoices();
    const voices = enhancedTTS.getAvailableVoices();
    
    console.log(`Total voices available: ${voices.length}`);
    console.log('Voice quality breakdown:');
    console.log('- Premium:', voices.filter(v => v.quality === 'premium').length);
    console.log('- Enhanced:', voices.filter(v => v.quality === 'enhanced').length);
    console.log('- Standard:', voices.filter(v => v.quality === 'standard').length);
    
    // Show top 5 voices
    console.log('\nTop 5 voices:');
    voices.slice(0, 5).forEach((voice, i) => {
      console.log(`${i + 1}. ${voice.name} (${voice.lang}) - ${voice.quality}`);
    });
  } catch (error) {
    console.error('Failed to load voices:', error);
  }
  
  // Test speech with different texts
  const testTexts = [
    {
      text: "Hello! I'm Rivue, your AI-powered review analysis assistant. I'm using enhanced text-to-speech technology to sound more natural and expressive.",
      options: { gender: 'female' }
    },
    {
      text: "I can analyze your app reviews to identify trends, sentiment patterns, and customer feedback. Would you like me to show you the latest insights?",
      options: { gender: 'female', rate: 0.9 }
    },
    {
      text: "With my enhanced voice capabilities, I can speak with better clarity, natural pauses, and improved pronunciation. This makes our conversations feel more human-like.",
      options: { gender: 'male', pitch: 0.95 }
    }
  ];
  
  console.log('\n=== Speech Tests ===');
  console.log('Click the buttons below to test different voices:\n');
  
  // Create test buttons
  testTexts.forEach((test, index) => {
    const button = document.createElement('button');
    button.textContent = `Test ${index + 1}: ${test.options.gender || 'default'} voice`;
    button.style.cssText = `
      margin: 5px;
      padding: 10px 20px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
    `;
    
    button.onclick = async () => {
      console.log(`Speaking test ${index + 1}...`);
      try {
        const result = await enhancedTTS.enhancedSpeak(test.text, test.options);
        console.log('Speech result:', result);
      } catch (error) {
        console.error('Speech error:', error);
      }
    };
    
    document.body.appendChild(button);
  });
  
  // Add stop button
  const stopButton = document.createElement('button');
  stopButton.textContent = 'Stop Speaking';
  stopButton.style.cssText = `
    margin: 5px;
    padding: 10px 20px;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
  `;
  
  stopButton.onclick = () => {
    enhancedTTS.stopSpeech();
    console.log('Speech stopped');
  };
  
  document.body.appendChild(stopButton);
  
  console.log('\nTest buttons added to the page. Click them to test the enhanced TTS!');
}

// Run test
testEnhancedTTS();