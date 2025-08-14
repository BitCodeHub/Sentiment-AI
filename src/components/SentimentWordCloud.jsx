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
    return 14 + logScale * 22; // Size between 14px and 36px - smaller range
  };

  const getSentimentColor = (sentimentPercentages) => {
    const { positive, negative, neutral } = sentimentPercentages;
    
    // Determine dominant sentiment
    if (positive > negative && positive > neutral) {
      // Positive dominant - green shades
      const intensity = positive / 100;
      return `hsl(142, ${50 + intensity * 30}%, ${45 - intensity * 15}%)`;
    } else if (negative > positive && negative > neutral) {
      // Negative dominant - red shades
      const intensity = negative / 100;
      return `hsl(0, ${50 + intensity * 30}%, ${45 - intensity * 15}%)`;
    } else if (neutral > positive && neutral > negative) {
      // Neutral dominant - gray shades
      return `hsl(0, 0%, 50%)`;
    } else {
      // Mixed sentiment - amber/orange
      return `hsl(30, 60%, 50%)`;
    }
  };

  // Sort words by frequency for better visual distribution
  const sortedWords = [...wordData]
    .sort((a, b) => b.count - a.count)
    .slice(0, 80); // Limit to prevent overcrowding

  // Create cloud-shaped positioning with better distribution
  const cloudWords = (() => {
    const positions = [];
    const placed = [];
    
    // Define cloud shape using multiple ellipses with better spacing
    const cloudCenters = [
      { x: 50, y: 50, rx: 30, ry: 20 },    // Main center
      { x: 25, y: 45, rx: 20, ry: 15 },    // Left bulge
      { x: 75, y: 45, rx: 20, ry: 15 },    // Right bulge
      { x: 35, y: 65, rx: 18, ry: 12 },    // Bottom left
      { x: 65, y: 65, rx: 18, ry: 12 },    // Bottom right
      { x: 50, y: 30, rx: 25, ry: 15 },    // Top
    ];
    
    // Process words in order of importance (already sorted by frequency)
    sortedWords.forEach((word, index) => {
      let attempts = 0;
      let position = null;
      
      // Try to find a good position
      while (attempts < 30 && !position) {
        // Pick a random cloud center, favor main centers for important words
        const centerIndex = index < 20 
          ? Math.floor(Math.random() * 2) // Very important words in main areas only
          : index < 40
          ? Math.floor(Math.random() * 4) // Important words in main and side areas
          : Math.floor(Math.random() * cloudCenters.length); // Others anywhere
        const center = cloudCenters[centerIndex];
        
        // Generate position within ellipse
        const angle = Math.random() * Math.PI * 2;
        const radiusScale = Math.sqrt(Math.random()); // Square root for better distribution
        
        const x = center.x + (radiusScale * center.rx * Math.cos(angle));
        const y = center.y + (radiusScale * center.ry * Math.sin(angle));
        
        // Check if position is valid (not too close to others)
        const fontSize = getSize(word.count);
        const wordWidth = word.word.length * fontSize * 0.6; // Estimate word width
        const minDistance = Math.max(fontSize * 1.2, wordWidth * 0.5); // Better spacing
        
        const tooClose = placed.some(p => {
          const dx = Math.abs(x - p.x);
          const dy = Math.abs(y - p.y);
          // Check both circular distance and rectangular bounds
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDist = (minDistance + p.minDistance) / 2;
          return distance < minDist || (dx < wordWidth/2 + p.width/2 && dy < fontSize/2 + p.size/2);
        });
        
        if (!tooClose) {
          position = { x, y };
          placed.push({ 
            x, 
            y, 
            size: fontSize, 
            width: wordWidth,
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
        rotation: index > 30 && Math.random() > 0.7 ? (Math.random() - 0.5) * 30 : 0
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