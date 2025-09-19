# Enhanced Text-to-Speech (TTS) Implementation

## Overview
The app now uses an enhanced TTS service that provides more natural-sounding speech compared to the default browser implementation. The enhancement focuses on:

1. **Intelligent Voice Selection**: Automatically selects the highest quality voice available
2. **Optimized Speech Parameters**: Fine-tuned rate, pitch, and volume for natural sound
3. **Text Preprocessing**: Cleans and formats text for better speech flow
4. **Fallback Support**: Gracefully falls back to standard Web Speech API if needed

## Key Features

### Voice Quality Detection
The service categorizes available voices into three quality tiers:
- **Premium**: Natural, Neural, Enhanced, WaveNet voices
- **Enhanced**: HD, Plus, Pro voices
- **Standard**: Basic system voices

### Voice Selection Algorithm
The algorithm scores voices based on:
- Language match (prefers en-US, en-GB, en-AU)
- Quality indicators in voice name
- Online/cloud voices (usually better quality)
- Gender preference (if specified)
- Local vs. remote service

### Text Optimization
Before speech synthesis, text is processed to:
- Remove markdown formatting
- Replace special characters with speakable alternatives
- Add natural pauses at punctuation
- Clean up excessive whitespace
- Convert bullet points to commas

### Speech Parameters
Optimized settings for natural speech:
- **Rate**: 0.95 (slightly slower for clarity)
- **Pitch**: 1.05 (slightly higher for warmth)
- **Volume**: 1.0 (full volume)
- **Pauses**: Added automatically at punctuation

## Implementation Details

### Service Architecture
```javascript
// Main service file
src/services/enhancedTTSService.js

// Key functions:
- enhancedSpeak(text, options) // Main speech function
- selectBestVoice(voices, options) // Voice selection
- cleanTextForSpeech(text) // Text preprocessing
- checkCapabilities() // Feature detection
```

### Integration in ChatPage
```javascript
// Import the service
import enhancedTTS from '../services/enhancedTTSService';

// Use for speech
await enhancedTTS.enhancedSpeak(text, {
  gender: 'female',
  rate: 0.95,
  pitch: 1.05
});
```

## Testing

### Check Available Voices
Run in browser console:
```javascript
// List all voices with quality ratings
speechSynthesis.getVoices().forEach(v => 
  console.log(`${v.name} (${v.lang}) - Local: ${v.localService}`)
);
```

### Test Enhanced TTS
1. Navigate to the chat interface
2. Enable audio with the speaker icon
3. Send a message to Rivue
4. Listen to the response - it should sound more natural

### Voice Quality Tips
For best results:
1. Use Chrome or Edge browsers (best voice selection)
2. macOS users: System has high-quality voices like "Samantha", "Karen"
3. Windows users: Look for "Microsoft Natural" voices
4. Enable online voices if available in browser settings

## Troubleshooting

### No Enhanced Voices Found
- Check browser console for available voices
- Some browsers require user interaction before loading voices
- Try refreshing the page and clicking anywhere first

### Speech Not Working
- Ensure browser has microphone/speaker permissions
- Check that audio is not muted
- Some browsers block audio without user interaction

### Voice Sounds Robotic
- The service will use the best available voice
- If only basic voices are available, consider:
  - Updating your browser
  - Installing language packs
  - Using a different browser

## Future Enhancements

### Potential Improvements
1. **Cloud TTS Integration**: Connect to Google Cloud TTS for premium voices
2. **Voice Caching**: Cache selected voice preferences
3. **Multi-language Support**: Detect and use appropriate language voices
4. **Emotion Detection**: Adjust speech parameters based on content emotion
5. **SSML Support**: Use Speech Synthesis Markup Language for finer control

### Gemini 2.5 Flash TTS
When Gemini 2.5 Flash TTS becomes available via API:
1. Update `geminiTTSService.js` with proper endpoint
2. Implement audio streaming for real-time playback
3. Add model selection in settings
4. Provide quality comparison tools

## Performance Considerations

### Browser Compatibility
- Chrome/Edge: Best support, most voices
- Safari: Good support on macOS
- Firefox: Basic support, fewer voices
- Mobile: Limited but functional

### Resource Usage
- Voice loading: One-time cost at startup
- Speech synthesis: Low CPU usage
- Memory: Minimal (< 1MB for service)

## Conclusion
The enhanced TTS service significantly improves the audio quality of Rivue's responses, making interactions feel more natural and engaging. While it currently optimizes the Web Speech API, it's designed to easily integrate with cloud-based TTS services like Gemini 2.5 Flash TTS when they become available.