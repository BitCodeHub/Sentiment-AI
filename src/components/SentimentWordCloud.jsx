import React from 'react';
import './SentimentWordCloud.css';

const SentimentWordCloud = ({ wordData, onWordClick }) => {
  if (!wordData || wordData.length === 0) return null;

  // Calculate size based on frequency
  const maxCount = Math.max(...wordData.map(w => w.count));
  const minCount = Math.min(...wordData.map(w => w.count));
  
  const getSize = (count) => {
    const normalized = (count - minCount) / (maxCount - minCount || 1);
    return 14 + normalized * 28; // Size between 14px and 42px for more words
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
    .slice(0, 200); // Show more words

  // Create cloud-shaped positioning with better distribution
  const cloudWords = (() => {
    const positions = [];
    const placed = [];
    
    // Define cloud shape using multiple ellipses
    const cloudCenters = [
      { x: 50, y: 50, rx: 35, ry: 25 },    // Main center
      { x: 30, y: 45, rx: 25, ry: 20 },    // Left bulge
      { x: 70, y: 45, rx: 25, ry: 20 },    // Right bulge
      { x: 40, y: 60, rx: 20, ry: 15 },    // Bottom left
      { x: 60, y: 60, rx: 20, ry: 15 },    // Bottom right
      { x: 50, y: 35, rx: 30, ry: 18 },    // Top
    ];
    
    sortedWords.forEach((word, index) => {
      let attempts = 0;
      let position = null;
      
      // Try to find a good position
      while (attempts < 50 && !position) {
        // Pick a random cloud center, favor main centers for important words
        const centerIndex = index < 30 
          ? Math.floor(Math.random() * 3) // Important words in main areas
          : Math.floor(Math.random() * cloudCenters.length);
        const center = cloudCenters[centerIndex];
        
        // Generate position within ellipse
        const angle = Math.random() * Math.PI * 2;
        const radiusScale = Math.sqrt(Math.random()); // Square root for better distribution
        
        const x = center.x + (radiusScale * center.rx * Math.cos(angle));
        const y = center.y + (radiusScale * center.ry * Math.sin(angle));
        
        // Check if position is valid (not too close to others)
        const fontSize = getSize(word.count);
        const minDistance = fontSize * 0.8;
        
        const tooClose = placed.some(p => {
          const dx = x - p.x;
          const dy = y - p.y;
          return Math.sqrt(dx * dx + dy * dy) < minDistance;
        });
        
        if (!tooClose) {
          position = { x, y };
          placed.push({ x, y, size: fontSize });
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
        x: Math.max(5, Math.min(95, position.x)),
        y: Math.max(10, Math.min(90, position.y))
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
              transform: 'translate(-50%, -50%)'
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