import React from 'react';
import './SentimentWordCloud.css';

const SentimentWordCloud = ({ wordData, onWordClick }) => {
  if (!wordData || wordData.length === 0) return null;

  // Calculate size based on frequency
  const maxCount = Math.max(...wordData.map(w => w.count));
  const minCount = Math.min(...wordData.map(w => w.count));
  
  const getSize = (count, index) => {
    const normalized = (count - minCount) / (maxCount - minCount || 1);
    
    // Size distribution matching reference
    if (index === 0) {
      // Largest word
      return 70 + normalized * 15; // 70-85px
    } else if (index < 4) {
      // Top 4 words - very large
      return 50 + normalized * 20; // 50-70px
    } else if (index < 10) {
      // Large words
      return 35 + normalized * 15; // 35-50px
    } else if (index < 20) {
      // Medium-large words
      return 24 + normalized * 12; // 24-36px
    } else if (index < 40) {
      // Medium words
      return 16 + normalized * 8; // 16-24px
    } else if (index < 60) {
      // Small words
      return 13 + normalized * 5; // 13-18px
    } else {
      // Tiny words
      return 11 + normalized * 3; // 11-14px
    }
  };

  const getSentimentColor = (sentimentPercentages, index) => {
    const { positive, negative, neutral } = sentimentPercentages;
    
    // Warm color palette matching reference
    if (positive >= 70) {
      // Strong positive - oranges and warm yellows
      const warmPositive = ['#f97316', '#fb923c', '#f59e0b', '#fbbf24', '#facc15'];
      return warmPositive[index % warmPositive.length];
    } else if (positive > 50) {
      // Positive - lighter oranges and corals
      const lightWarm = ['#fb923c', '#fdba74', '#fed7aa', '#ea580c', '#f87171'];
      return lightWarm[index % lightWarm.length];
    } else if (negative >= 70) {
      // Strong negative - deep reds
      const reds = ['#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#ef4444'];
      return reds[index % reds.length];
    } else if (negative > 50) {
      // Negative - muted reds and browns
      const mutedReds = ['#dc2626', '#f87171', '#fca5a5', '#a8a29e', '#78716c'];
      return mutedReds[index % mutedReds.length];
    } else if (neutral > 50) {
      // Neutral - warm grays and tans
      const neutrals = ['#78716c', '#57534e', '#a8a29e', '#d6d3d1', '#a1a1aa'];
      return neutrals[index % neutrals.length];
    } else {
      // Mixed - varied warm colors
      const mixed = ['#f59e0b', '#dc2626', '#78716c', '#ea580c', '#facc15'];
      return mixed[index % mixed.length];
    }
  };

  // Sort words by frequency for better visual distribution
  const sortedWords = [...wordData]
    .sort((a, b) => b.count - a.count)
    .slice(0, 120); // More words to match reference density

  // Create distributed positioning across full canvas
  const cloudWords = (() => {
    const positions = [];
    const placed = [];
    
    // Organic placement zones for natural distribution
    const zones = [
      { x: 50, y: 50, radius: 15 }, // center
      { x: 30, y: 30, radius: 20 }, // top-left
      { x: 70, y: 30, radius: 20 }, // top-right
      { x: 30, y: 70, radius: 20 }, // bottom-left
      { x: 70, y: 70, radius: 20 }, // bottom-right
      { x: 50, y: 25, radius: 15 }, // top
      { x: 50, y: 75, radius: 15 }, // bottom
      { x: 25, y: 50, radius: 15 }, // left
      { x: 75, y: 50, radius: 15 }, // right
    ];
    
    // Process words in order of importance (already sorted by frequency)
    sortedWords.forEach((word, index) => {
      let attempts = 0;
      let position = null;
      const fontSize = getSize(word.count, index);
      
      // Accurate width calculation
      const charWidth = fontSize * 0.6; // pixels per character
      const wordWidth = word.word.length * charWidth * 0.6; // actual width in percentage
      const wordHeight = fontSize * 0.12; // height in percentage
      
      // Try to find a good position
      while (attempts < 500 && !position) {
        let x, y;
        
        if (index === 0) {
          // First word - slightly off center
          x = 45 + Math.random() * 10;
          y = 45 + Math.random() * 10;
        } else if (index < 3) {
          // Next biggest words - key positions
          if (index === 1) {
            x = 25 + Math.random() * 10;
            y = 50 + Math.random() * 10;
          } else {
            x = 65 + Math.random() * 10;
            y = 50 + Math.random() * 10;
          }
        } else if (index < 10) {
          // Large words - around zones
          const zone = zones[index % zones.length];
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * zone.radius;
          x = zone.x + r * Math.cos(angle);
          y = zone.y + r * Math.sin(angle);
        } else if (index < 40) {
          // Medium words - organic scatter
          const zone = zones[Math.floor(Math.random() * zones.length)];
          const angle = Math.random() * Math.PI * 2;
          const r = zone.radius + Math.random() * 15;
          x = zone.x + r * Math.cos(angle);
          y = zone.y + r * Math.sin(angle);
        } else {
          // Small words - fill gaps everywhere
          x = 5 + Math.random() * 90;
          y = 5 + Math.random() * 90;
        }
        
        // Keep within bounds
        const margin = 5;
        x = Math.max(margin, Math.min(100 - margin, x));
        y = Math.max(margin, Math.min(100 - margin, y));
        
        // Check collisions with realistic spacing
        const tooClose = placed.some(p => {
          const dx = Math.abs(x - p.x);
          const dy = Math.abs(y - p.y);
          
          // Calculate minimum required distance
          const minXDist = (wordWidth + p.width) / 2 + 2; // 2% padding
          const minYDist = (wordHeight + p.height) / 2 + 1; // 1% padding
          
          return dx < minXDist && dy < minYDist;
        });
        
        if (!tooClose) {
          position = { x, y };
          placed.push({ 
            x, 
            y, 
            width: wordWidth,
            height: wordHeight,
            size: fontSize
          });
        }
        
        attempts++;
      }
      
      // Force placement in empty area if needed
      if (!position) {
        let bestX = 50, bestY = 50;
        let maxMinDist = 0;
        
        // Sample many points to find empty space
        for (let i = 0; i < 50; i++) {
          const testX = 10 + Math.random() * 80;
          const testY = 10 + Math.random() * 80;
          
          let minDist = Infinity;
          placed.forEach(p => {
            const dist = Math.sqrt(Math.pow(testX - p.x, 2) + Math.pow(testY - p.y, 2));
            minDist = Math.min(minDist, dist);
          });
          
          if (minDist > maxMinDist) {
            maxMinDist = minDist;
            bestX = testX;
            bestY = testY;
          }
        }
        
        position = { x: bestX, y: bestY };
      }
      
      // Minimal rotation - mostly horizontal like reference
      let rotation = 0;
      if (index > 10 && Math.random() < 0.05) { // Only 5% chance of rotation
        rotation = Math.random() < 0.5 ? -90 : 0; // Either vertical or horizontal
      }
      
      positions.push({
        ...word,
        x: position.x,
        y: position.y,
        fontSize: fontSize,
        rotation: rotation
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
              fontSize: `${word.fontSize}px`,
              color: getSentimentColor(word.sentimentPercentages, index),
              animationDelay: `${index * 0.02}s`,
              position: 'absolute',
              left: `${word.x}%`,
              top: `${word.y}%`,
              transform: `translate(-50%, -50%) rotate(${word.rotation || 0}deg)`,
              fontWeight: index < 10 ? 700 : index < 20 ? 600 : 500
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