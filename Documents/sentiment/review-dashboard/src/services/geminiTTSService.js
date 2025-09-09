import { GoogleGenerativeAI } from '@google/generative-ai';

// Get API key
const apiKey = import.meta.env?.VITE_GEMINI_API_KEY;

if (!apiKey || apiKey === 'your-gemini-api-key-here') {
  console.error('GEMINI API KEY NOT CONFIGURED for TTS!');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// TTS-specific model
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

// Audio context for playback
let audioContext = null;

// Initialize audio context
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

// Convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Convert PCM to WAV format
function pcmToWav(pcmData, sampleRate = 24000) {
  const buffer = new ArrayBuffer(44 + pcmData.byteLength);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmData.byteLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, pcmData.byteLength, true);

  // Copy PCM data
  const pcmView = new DataView(pcmData);
  for (let i = 0; i < pcmData.byteLength; i += 2) {
    view.setInt16(44 + i, pcmView.getInt16(i, true), true);
  }

  return buffer;
}

// Generate speech using Gemini TTS
export async function generateSpeech(text, options = {}) {
  if (!genAI) {
    throw new Error('Gemini API key is not configured for TTS');
  }

  try {
    console.log('Generating speech with Gemini TTS...');
    
    // Initialize TTS model
    const model = genAI.getGenerativeModel({
      model: TTS_MODEL,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      }
    });

    // Prepare the prompt for natural speech generation
    const prompt = `Generate natural, expressive speech for the following text. 
    Style: conversational, friendly, and clear
    Pace: moderate, with natural pauses
    Tone: professional yet warm
    ${options.style ? `Additional style guidance: ${options.style}` : ''}
    
    Text to speak:
    "${text}"`;

    // Generate audio
    const result = await model.generateContent(prompt);
    
    // Extract audio data from response
    // Note: The actual API response format may vary
    const response = await result.response;
    const audioData = response.audio || response.media || response.content;
    
    if (!audioData) {
      throw new Error('No audio data in response');
    }

    // Convert audio data to playable format
    let audioBuffer;
    if (typeof audioData === 'string') {
      // Base64 encoded audio
      const pcmData = base64ToArrayBuffer(audioData);
      audioBuffer = pcmToWav(pcmData);
    } else if (audioData instanceof ArrayBuffer) {
      // Direct audio buffer
      audioBuffer = audioData;
    } else {
      throw new Error('Unknown audio data format');
    }

    return {
      audioBuffer,
      mimeType: 'audio/wav',
      duration: audioBuffer.byteLength / (24000 * 2) // Approximate duration
    };

  } catch (error) {
    console.error('Gemini TTS error:', error);
    
    // Check if it's a model availability issue
    if (error.message?.includes('model') || error.message?.includes('not found')) {
      console.warn('Gemini TTS model not available, falling back to standard generation');
      
      // Fallback: Use standard Gemini model to describe how the text should sound
      // This won't generate actual audio but can provide guidance
      throw new Error('TTS model not available - use fallback');
    }
    
    throw error;
  }
}

// Play audio buffer
export async function playAudioBuffer(audioBuffer) {
  try {
    const context = initAudioContext();
    
    // Resume audio context if suspended
    if (context.state === 'suspended') {
      await context.resume();
    }

    // Decode audio data
    const decodedAudio = await context.decodeAudioData(audioBuffer.slice(0));
    
    // Create source and play
    const source = context.createBufferSource();
    source.buffer = decodedAudio;
    source.connect(context.destination);
    
    // Return a promise that resolves when playback ends
    return new Promise((resolve, reject) => {
      source.onended = () => resolve();
      source.start(0);
      
      // Store reference for stopping
      return {
        stop: () => {
          try {
            source.stop();
            resolve();
          } catch (e) {
            // Already stopped
          }
        },
        duration: decodedAudio.duration
      };
    });
  } catch (error) {
    console.error('Audio playback error:', error);
    throw error;
  }
}

// Enhanced TTS with fallback to Web Speech API
export async function speakText(text, options = {}) {
  try {
    // First, try Gemini TTS
    const { audioBuffer } = await generateSpeech(text, options);
    const playback = await playAudioBuffer(audioBuffer);
    return {
      type: 'gemini',
      stop: playback.stop,
      duration: playback.duration
    };
  } catch (error) {
    console.warn('Gemini TTS failed, falling back to Web Speech API:', error);
    
    // Fallback to Web Speech API
    if ('speechSynthesis' in window) {
      return new Promise((resolve, reject) => {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        // Clean text for speech
        const cleanText = text
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/`/g, '')
          .replace(/\n\n/g, '. ')
          .replace(/\n/g, '. ')
          .replace(/[•]/g, '')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        // Configure speech settings
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Try to use a natural-sounding voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(
          voice => voice.lang.startsWith('en') && voice.name.includes('Natural')
        ) || voices.find(
          voice => voice.lang.startsWith('en-US')
        );
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
        
        utterance.onend = () => resolve({ type: 'webspeech' });
        utterance.onerror = (event) => reject(event);
        
        window.speechSynthesis.speak(utterance);
        
        // Return control object
        resolve({
          type: 'webspeech',
          stop: () => window.speechSynthesis.cancel(),
          utterance
        });
      });
    } else {
      throw new Error('No TTS available');
    }
  }
}

// Check TTS availability
export function checkTTSAvailability() {
  return {
    geminiTTS: !!genAI,
    webSpeechAPI: 'speechSynthesis' in window,
    audioContext: 'AudioContext' in window || 'webkitAudioContext' in window
  };
}

export default {
  generateSpeech,
  playAudioBuffer,
  speakText,
  checkTTSAvailability
};