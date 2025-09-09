// Enhanced Text-to-Speech Service with multiple voice options
// This service provides natural-sounding speech synthesis using the best available option

// Voice quality rankings (best to worst)
const VOICE_QUALITY_KEYWORDS = [
  'Natural', 'Premium', 'Enhanced', 'Neural', 'WaveNet', 'Studio',
  'HD', 'Plus', 'Pro', 'High', 'Standard'
];

// Preferred languages in order
const PREFERRED_LANGUAGES = ['en-US', 'en-GB', 'en-AU', 'en'];

// Voice gender preferences
const VOICE_GENDERS = {
  FEMALE: ['female', 'woman', 'girl'],
  MALE: ['male', 'man', 'boy'],
  NEUTRAL: ['neutral', 'unspecified']
};

// Audio context for advanced audio processing
let audioContext = null;
let audioWorklet = null;

// Initialize audio context with effects
async function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Try to load audio worklet for better processing
    try {
      await audioContext.audioWorklet.addModule('/audio-processor.js');
      audioWorklet = new AudioWorkletNode(audioContext, 'audio-processor');
    } catch (e) {
      console.log('Audio worklet not available, using standard processing');
    }
  }
  return audioContext;
}

// Enhanced voice selection algorithm
function selectBestVoice(voices, options = {}) {
  if (!voices || voices.length === 0) return null;

  // Score each voice based on quality indicators
  const scoredVoices = voices.map(voice => {
    let score = 0;
    
    // Language matching
    const langIndex = PREFERRED_LANGUAGES.findIndex(lang => 
      voice.lang.toLowerCase().startsWith(lang.toLowerCase())
    );
    if (langIndex !== -1) {
      score += (PREFERRED_LANGUAGES.length - langIndex) * 10;
    }
    
    // Quality keyword matching
    const voiceName = voice.name.toLowerCase();
    VOICE_QUALITY_KEYWORDS.forEach((keyword, index) => {
      if (voiceName.includes(keyword.toLowerCase())) {
        score += (VOICE_QUALITY_KEYWORDS.length - index) * 5;
      }
    });
    
    // Local voices often sound better
    if (!voice.localService) {
      score += 3;
    }
    
    // Gender preference
    if (options.gender) {
      const genderKeywords = VOICE_GENDERS[options.gender.toUpperCase()] || [];
      if (genderKeywords.some(keyword => voiceName.includes(keyword))) {
        score += 5;
      }
    }
    
    // Specific voice name preference
    if (options.voiceName && voiceName.includes(options.voiceName.toLowerCase())) {
      score += 20;
    }
    
    // Check for online/neural indicators
    if (voiceName.includes('online') || voiceName.includes('neural')) {
      score += 8;
    }
    
    return { voice, score };
  });
  
  // Sort by score and return best voice
  scoredVoices.sort((a, b) => b.score - a.score);
  
  console.log('Voice selection:', {
    available: scoredVoices.length,
    selected: scoredVoices[0].voice.name,
    score: scoredVoices[0].score
  });
  
  return scoredVoices[0].voice;
}

// Clean text for better speech synthesis
function cleanTextForSpeech(text) {
  return text
    // Remove markdown formatting
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1') // Italic
    .replace(/`([^`]+)`/g, '$1') // Code
    .replace(/```[^`]*```/g, '') // Code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    // Replace special characters
    .replace(/[•·▪▫◦‣⁃]/g, ', ')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/…/g, '...')
    // Improve sentence flow
    .replace(/\n\n+/g, '. ')
    .replace(/\n/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/\.\s*\./g, '.')
    .replace(/,\s*,/g, ',')
    .replace(/\s+([,.!?])/g, '$1')
    .trim();
}

// Apply audio effects for more natural sound
async function applyAudioEffects(audioBuffer, effects = {}) {
  const context = await initAudioContext();
  
  // Create nodes
  const source = context.createBufferSource();
  const gainNode = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const filter = context.createBiquadFilter();
  
  // Configure effects
  source.buffer = audioBuffer;
  
  // Gain (volume)
  gainNode.gain.value = effects.volume || 1.0;
  
  // Compression for more consistent volume
  compressor.threshold.value = -24;
  compressor.knee.value = 30;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;
  
  // High-shelf filter to enhance clarity
  filter.type = 'highshelf';
  filter.frequency.value = 3000;
  filter.gain.value = effects.clarity || 2;
  
  // Connect nodes
  source.connect(filter);
  filter.connect(compressor);
  compressor.connect(gainNode);
  
  if (audioWorklet) {
    gainNode.connect(audioWorklet);
    audioWorklet.connect(context.destination);
  } else {
    gainNode.connect(context.destination);
  }
  
  return { source, gainNode, context };
}

// Enhanced speech synthesis with Web Speech API
export async function enhancedSpeak(text, options = {}) {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }
    
    // Clean text
    const cleanText = cleanTextForSpeech(text);
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Get available voices
    let voices = window.speechSynthesis.getVoices();
    
    // If voices aren't loaded yet, wait for them
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        configureAndSpeak();
      };
      // Trigger voice loading
      window.speechSynthesis.getVoices();
    } else {
      configureAndSpeak();
    }
    
    function configureAndSpeak() {
      // Select best voice
      const selectedVoice = selectBestVoice(voices, options);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      // Configure speech parameters for more natural sound
      utterance.rate = options.rate || 0.95; // Slightly slower than default
      utterance.pitch = options.pitch || 1.05; // Slightly higher pitch
      utterance.volume = options.volume || 1.0;
      
      // Add pauses for more natural speech
      if (options.addPauses !== false) {
        utterance.text = utterance.text
          .replace(/\./g, '. ')
          .replace(/,/g, ', ')
          .replace(/;/g, '; ')
          .replace(/:/g, ': ');
      }
      
      // Event handlers
      let startTime = null;
      
      utterance.onstart = () => {
        startTime = Date.now();
        if (options.onStart) options.onStart();
      };
      
      utterance.onend = () => {
        const duration = startTime ? (Date.now() - startTime) / 1000 : null;
        resolve({
          type: 'enhanced-webspeech',
          voice: selectedVoice?.name,
          duration
        });
        if (options.onEnd) options.onEnd();
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        reject(event);
        if (options.onError) options.onError(event);
      };
      
      utterance.onpause = () => {
        if (options.onPause) options.onPause();
      };
      
      utterance.onresume = () => {
        if (options.onResume) options.onResume();
      };
      
      // Speak
      window.speechSynthesis.speak(utterance);
      
      // Store reference for control
      if (options.onUtterance) {
        options.onUtterance(utterance);
      }
    }
  });
}

// Speech control functions
export function pauseSpeech() {
  if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
    window.speechSynthesis.pause();
  }
}

export function resumeSpeech() {
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
}

export function stopSpeech() {
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
}

// Get speech status
export function getSpeechStatus() {
  return {
    speaking: window.speechSynthesis.speaking,
    paused: window.speechSynthesis.paused,
    pending: window.speechSynthesis.pending
  };
}

// List available voices with quality ratings
export function getAvailableVoices() {
  const voices = window.speechSynthesis.getVoices();
  
  return voices.map(voice => {
    // Calculate quality score
    let quality = 'standard';
    const name = voice.name.toLowerCase();
    
    if (VOICE_QUALITY_KEYWORDS.slice(0, 3).some(k => name.includes(k.toLowerCase()))) {
      quality = 'premium';
    } else if (VOICE_QUALITY_KEYWORDS.slice(3, 7).some(k => name.includes(k.toLowerCase()))) {
      quality = 'enhanced';
    }
    
    return {
      name: voice.name,
      lang: voice.lang,
      localService: voice.localService,
      default: voice.default,
      quality,
      voiceURI: voice.voiceURI
    };
  }).sort((a, b) => {
    // Sort by quality then by language
    const qualityOrder = { premium: 0, enhanced: 1, standard: 2 };
    if (qualityOrder[a.quality] !== qualityOrder[b.quality]) {
      return qualityOrder[a.quality] - qualityOrder[b.quality];
    }
    return a.lang.localeCompare(b.lang);
  });
}

// Preload voices
export function preloadVoices() {
  return new Promise(resolve => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        resolve(window.speechSynthesis.getVoices());
      };
    }
  });
}

// Check TTS capabilities
export function checkCapabilities() {
  const capabilities = {
    speechSynthesis: 'speechSynthesis' in window,
    audioContext: 'AudioContext' in window || 'webkitAudioContext' in window,
    audioWorklet: 'AudioWorklet' in window,
    webSpeechAPI: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  };
  
  // Check for high-quality voices
  if (capabilities.speechSynthesis) {
    const voices = window.speechSynthesis.getVoices();
    capabilities.hasEnhancedVoices = voices.some(v => 
      VOICE_QUALITY_KEYWORDS.slice(0, 5).some(k => 
        v.name.toLowerCase().includes(k.toLowerCase())
      )
    );
    capabilities.voiceCount = voices.length;
  }
  
  return capabilities;
}

export default {
  enhancedSpeak,
  pauseSpeech,
  resumeSpeech,
  stopSpeech,
  getSpeechStatus,
  getAvailableVoices,
  preloadVoices,
  checkCapabilities,
  cleanTextForSpeech
};