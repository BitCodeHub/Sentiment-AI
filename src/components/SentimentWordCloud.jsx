import React from 'react';
import './SentimentWordCloud.css';

const SentimentWordCloud = ({ wordData, onWordClick }) => {
  if (!wordData || wordData.length === 0) return null;

  // Calculate size based on frequency
  const maxCount = Math.max(...wordData.map(w => w.count));
  const minCount = Math.min(...wordData.map(w => w.count));
  
  const getSize = (count, index) => {
    const normalized = (count - minCount) / (maxCount - minCount || 1);
    
    // Size distribution matching new reference with more dramatic hierarchy
    if (index === 0) {
      // Largest word - very prominent
      return 90 + normalized * 20; // 90-110px
    } else if (index < 3) {
      // Top 3 words - very large
      return 65 + normalized * 20; // 65-85px
    } else if (index < 8) {
      // Large words
      return 45 + normalized * 15; // 45-60px
    } else if (index < 15) {
      // Medium-large words
      return 32 + normalized * 12; // 32-44px
    } else if (index < 30) {
      // Medium words
      return 22 + normalized * 8; // 22-30px
    } else if (index < 60) {
      // Small words
      return 16 + normalized * 5; // 16-21px
    } else {
      // Tiny words
      return 13 + normalized * 3; // 13-16px
    }
  };

  const getSentimentColor = (sentimentPercentages, index) => {
    const { positive, negative, neutral } = sentimentPercentages;
    
    // Vibrant color palette matching new reference
    const colors = [
      '#22c55e', // green
      '#f97316', // orange
      '#ef4444', // red
      '#3b82f6', // blue
      '#fbbf24', // yellow
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#10b981', // emerald
      '#f59e0b', // amber
      '#84cc16', // lime
      '#14b8a6', // teal
    ];
    
    // Assign colors based on sentiment and distribute evenly
    if (positive >= 70) {
      // Strong positive - greens and blues
      const positiveColors = ['#22c55e', '#10b981', '#14b8a6', '#3b82f6', '#06b6d4'];
      return positiveColors[index % positiveColors.length];
    } else if (negative >= 70) {
      // Strong negative - reds and oranges
      const negativeColors = ['#ef4444', '#f97316', '#dc2626', '#ea580c', '#f87171'];
      return negativeColors[index % negativeColors.length];
    } else {
      // Mixed/neutral - use all colors for variety
      return colors[index % colors.length];
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
    
    // Process words in order of importance (already sorted by frequency)
    sortedWords.forEach((word, index) => {
      let attempts = 0;
      let position = null;
      const fontSize = getSize(word.count, index);
      
      // Accurate width calculation based on actual font metrics
      const avgCharWidth = fontSize * 0.6; // Average character width
      const wordWidth = word.word.length * avgCharWidth * 0.65; // Width in percentage
      const wordHeight = fontSize * 0.15; // Height in percentage
      
      // Try to find a good position
      while (attempts < 1000 && !position) {
        let x, y;
        
        if (index === 0) {
          // First word - center area
          x = 40 + Math.random() * 20;
          y = 40 + Math.random() * 20;
        } else if (index < 5) {
          // Top words - strategic positions
          const positions = [
            { x: 70, y: 35 }, // right
            { x: 25, y: 50 }, // left
            { x: 50, y: 70 }, // bottom
            { x: 30, y: 25 }, // top-left
          ];
          const pos = positions[index - 1];
          x = pos.x + (Math.random() - 0.5) * 15;
          y = pos.y + (Math.random() - 0.5) * 15;
        } else {
          // All other words - true random distribution
          x = 10 + Math.random() * 80;
          y = 10 + Math.random() * 80;
        }
        
        // Keep within bounds with dynamic margins
        const xMargin = Math.max(5, wordWidth / 2);
        const yMargin = Math.max(5, wordHeight / 2);
        x = Math.max(xMargin, Math.min(100 - xMargin, x));
        y = Math.max(yMargin, Math.min(100 - yMargin, y));
        
        // Improved collision detection
        const tooClose = placed.some(p => {
          const dx = Math.abs(x - p.x);
          const dy = Math.abs(y - p.y);
          
          // Calculate actual overlap
          const xOverlap = dx < (wordWidth + p.width) / 2 + 3; // 3% minimum spacing
          const yOverlap = dy < (wordHeight + p.height) / 2 + 2; // 2% minimum spacing
          
          return xOverlap && yOverlap;
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
      
      // Fallback placement
      if (!position) {
        // Find the largest empty area
        let bestX = 50, bestY = 50;
        let maxMinDist = 0;
        
        // Grid search for empty space
        for (let gx = 10; gx <= 90; gx += 10) {
          for (let gy = 10; gy <= 90; gy += 10) {
            let minDist = Infinity;
            
            placed.forEach(p => {
              const dist = Math.sqrt(Math.pow(gx - p.x, 2) + Math.pow(gy - p.y, 2));
              minDist = Math.min(minDist, dist);
            });
            
            if (minDist > maxMinDist) {
              maxMinDist = minDist;
              bestX = gx;
              bestY = gy;
            }
          }
        }
        
        position = { x: bestX, y: bestY };
        placed.push({ 
          x: bestX, 
          y: bestY, 
          width: wordWidth,
          height: wordHeight,
          size: fontSize
        });
      }
      
      // Very minimal rotation - reference has almost all horizontal
      let rotation = 0;
      if (index > 20 && Math.random() < 0.02) { // Only 2% chance for small words
        rotation = -90; // Only vertical, no angles
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
              position: 'absolute',
              left: `${word.x}%`,
              top: `${word.y}%`,
              transform: `translate(-50%, -50%) rotate(${word.rotation || 0}deg)`,
              fontWeight: index < 5 ? 800 : index < 15 ? 700 : index < 30 ? 600 : 500
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