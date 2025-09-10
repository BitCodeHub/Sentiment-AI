# Audio Response Feature Guide

## Overview
The Rivue chatbot now includes text-to-speech capability using the Web Speech API. Users can enable audio responses to have Rivue's messages read aloud.

## Features Added

### 1. Audio Toggle Button
- Located in the header next to the reset button
- Shows speaker icon (Volume2) when enabled, muted icon (VolumeX) when disabled
- Visual feedback when audio is playing (animated sound waves)

### 2. Speech Synthesis
- Automatically speaks Rivue's responses when audio is enabled
- Removes markdown formatting for cleaner speech
- Uses natural-sounding voices when available
- Configurable speech rate (0.9x for better clarity)

### 3. Individual Message Playback
- Each assistant message shows a speaker icon when audio is enabled
- Click the icon to replay any specific message
- Useful for hearing messages again

### 4. Visual Feedback
- Speaking indicator with animated sound waves
- Speaker icon vibrates subtly while speaking
- Button changes color when audio is active

### 5. Controls
- Toggle audio on/off at any time
- Automatically stops current speech when toggling off
- Interrupts previous speech when new message starts

## Browser Compatibility
- Works in modern browsers that support Web Speech API
- Chrome, Edge, Safari, Firefox (limited support)
- Gracefully degrades if not supported (audio button hidden)

## Usage Instructions

1. **Enable Audio**: Click the speaker icon in the header
2. **Automatic Playback**: New responses will be spoken automatically
3. **Replay Messages**: Click the speaker icon next to any message
4. **Stop Audio**: Click the active speaker icon or toggle audio off

## Technical Implementation

### State Management
```javascript
const [audioEnabled, setAudioEnabled] = useState(false);
const [isSpeaking, setIsSpeaking] = useState(false);
const [currentUtterance, setCurrentUtterance] = useState(null);
```

### Speech Function
- Cleans markdown formatting
- Selects natural voice when available
- Handles speech events (start, end, error)

### Mobile Optimization
- Simplified animations on mobile devices
- Touch-friendly button sizes
- Responsive layout maintained

## Testing Recommendations

1. Test with different browsers
2. Try various voice settings in system preferences
3. Test interruption scenarios
4. Verify mobile responsiveness
5. Check accessibility with screen readers