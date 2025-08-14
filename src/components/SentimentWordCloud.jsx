import React from 'react';
import './SentimentWordCloud.css';

const SentimentWordCloud = ({ wordData, onWordClick }) => {
  if (!wordData || wordData.length === 0) return null;

  // Calculate size based on frequency
  const maxCount = Math.max(...wordData.map(w => w.count));
  const minCount = Math.min(...wordData.map(w => w.count));
  
  const getSize = (count) => {
    const normalized = (count - minCount) / (maxCount - minCount || 1);
    // Use logarithmic scale for better size distribution
    const logScale = Math.log(count + 1) / Math.log(maxCount + 1);
    return 12 + logScale * 28; // Size between 12px and 40px for better contrast
  };

  const getSentimentColor = (sentimentPercentages) => {
    const { positive, negative, neutral } = sentimentPercentages;
    
    // Determine dominant sentiment with clearer colors
    if (positive >= 60) {
      // Strong positive - green
      return '#22c55e';
    } else if (positive > negative && positive > neutral) {
      // Positive dominant - lighter green
      return '#4ade80';
    } else if (negative >= 60) {
      // Strong negative - red
      return '#ef4444';
    } else if (negative > positive && negative > neutral) {
      // Negative dominant - lighter red
      return '#f87171';
    } else if (neutral > 50) {
      // Neutral dominant - gray
      return '#6b7280';
    } else {
      // Mixed sentiment - orange/amber
      return '#f59e0b';
    }
  };

  // Sort words by frequency for better visual distribution
  const sortedWords = [...wordData]
    .sort((a, b) => b.count - a.count)
    .slice(0, 60); // Further reduce for better spacing

  // Create cloud-shaped positioning with better distribution
  const cloudWords = (() => {
    const positions = [];
    const placed = [];
    
    // Define cloud shape with better distribution
    const cloudCenters = [
      { x: 50, y: 50, rx: 35, ry: 25 },    // Main center - larger
      { x: 20, y: 45, rx: 22, ry: 18 },    // Left bulge
      { x: 80, y: 45, rx: 22, ry: 18 },    // Right bulge
      { x: 35, y: 70, rx: 20, ry: 15 },    // Bottom left
      { x: 65, y: 70, rx: 20, ry: 15 },    // Bottom right
      { x: 50, y: 25, rx: 28, ry: 18 },    // Top
      { x: 15, y: 60, rx: 15, ry: 12 },    // Far left
      { x: 85, y: 60, rx: 15, ry: 12 },    // Far right
    ];
    
    // Process words in order of importance (already sorted by frequency)
    sortedWords.forEach((word, index) => {
      let attempts = 0;
      let position = null;
      
      // Try to find a good position
      while (attempts < 50 && !position) {
        // Pick a cloud center based on word importance
        let centerIndex;
        if (index < 10) {
          // Most important words in the main center
          centerIndex = 0;
        } else if (index < 25) {
          // Important words in main areas
          centerIndex = Math.floor(Math.random() * 3);
        } else {
          // Other words distributed throughout
          centerIndex = Math.floor(Math.random() * cloudCenters.length);
        }
        const center = cloudCenters[centerIndex];
        
        // Generate position within ellipse with better distribution
        const angle = (Math.random() + index * 0.618) * Math.PI * 2; // Golden ratio for spread
        const radiusScale = 0.2 + Math.random() * 0.8; // Avoid center clustering
        
        const x = center.x + (radiusScale * center.rx * Math.cos(angle));
        const y = center.y + (radiusScale * center.ry * Math.sin(angle));
        
        // Check if position is valid (not too close to others)
        const fontSize = getSize(word.count);
        const wordWidth = word.word.length * fontSize * 0.65; // Better width estimation
        const wordHeight = fontSize * 1.2;
        const minDistance = Math.max(fontSize * 1.5, 20); // Increased minimum spacing
        
        const tooClose = placed.some(p => {
          const dx = Math.abs(x - p.x);
          const dy = Math.abs(y - p.y);
          
          // Improved collision detection with padding
          const xOverlap = dx < (wordWidth/2 + p.width/2 + 8); // 8px horizontal padding
          const yOverlap = dy < (wordHeight/2 + p.height/2 + 6); // 6px vertical padding
          
          return xOverlap && yOverlap;
        });
        
        if (!tooClose) {
          position = { x, y };
          placed.push({ 
            x, 
            y, 
            size: fontSize, 
            width: wordWidth,
            height: wordHeight,
            minDistance: minDistance 
          });
        }
        
        attempts++;
      }
      
      // Fallback position if no good spot found
      if (!position) {
        const angle = (index / sortedWords.length) * Math.PI * 2;
        const radius = 25 + (index / sortedWords.length) * 20;
        position = {
          x: 50 + radius * Math.cos(angle),
          y: 50 + radius * Math.sin(angle) * 0.7
        };
      }
      
      positions.push({
        ...word,
        x: Math.max(8, Math.min(92, position.x)),
        y: Math.max(12, Math.min(88, position.y)),
        rotation: index > 20 && Math.random() > 0.8 ? (Math.random() - 0.5) * 20 : 0
      });
    });
    
    return positions;
  })();

  return (
    <div className="sentiment-word-cloud cloud-shape">
      {cloudWords.map((word, index) => {
        const sentimentClass = 
          word.sentimentPercentages.positive > 60 ? 'positive' :
          word.sentimentPercentages.negative > 60 ? 'negative' :
          word.sentimentPercentages.neutral > 60 ? 'neutral' : 'mixed';

        return (
          <button
            key={`${word.word}-${index}`}
            className={`cloud-word ${sentimentClass}`}
            style={{
              fontSize: `${getSize(word.count)}px`,
              color: getSentimentColor(word.sentimentPercentages),
              animationDelay: `${index * 0.01}s`,
              position: 'absolute',
              left: `${word.x}%`,
              top: `${word.y}%`,
              transform: `translate(-50%, -50%) rotate(${word.rotation || 0}deg)`
            }}
            onClick={() => onWordClick && onWordClick(word.word)}
            title={`${word.word}: ${word.count} mentions (${Math.round(word.sentimentPercentages.positive)}% positive, ${Math.round(word.sentimentPercentages.negative)}% negative)`}
          >
            {word.word}
          </button>
        );
      })}
    </div>
  );
};

export default SentimentWordCloud;