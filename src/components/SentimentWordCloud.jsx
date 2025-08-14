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
    
    // Rich color palette matching reference
    if (positive >= 70) {
      // Strong positive - greens
      const greens = ['#10b981', '#059669', '#16a34a', '#22c55e', '#4ade80'];
      return greens[index % greens.length];
    } else if (positive > 50) {
      // Positive - blues and teals
      const blues = ['#3b82f6', '#2563eb', '#06b6d4', '#0891b2', '#0ea5e9'];
      return blues[index % blues.length];
    } else if (negative >= 70) {
      // Strong negative - reds
      const reds = ['#ef4444', '#dc2626', '#e11d48', '#be123c', '#f43f5e'];
      return reds[index % reds.length];
    } else if (negative > 50) {
      // Negative - oranges and warm colors
      const oranges = ['#f97316', '#fb923c', '#f59e0b', '#fbbf24', '#ea580c'];
      return oranges[index % oranges.length];
    } else if (neutral > 50) {
      // Neutral - grays and muted colors
      const neutrals = ['#6b7280', '#71717a', '#737373', '#64748b', '#94a3b8'];
      return neutrals[index % neutrals.length];
    } else {
      // Mixed - purples and varied colors
      const mixed = ['#a855f7', '#9333ea', '#7c3aed', '#ec4899', '#6366f1'];
      return mixed[index % mixed.length];
    }
  };

  // Sort words by frequency for better visual distribution
  const sortedWords = [...wordData]
    .sort((a, b) => b.count - a.count)
    .slice(0, 85); // Optimal count for balanced cloud

  // Create distributed positioning across full canvas
  const cloudWords = (() => {
    const positions = [];
    const placed = [];
    
    // Grid-based placement for better space utilization
    const gridCells = 10; // 10x10 grid
    const cellSize = 100 / gridCells;
    const usedCells = new Set();
    
    // Process words in order of importance (already sorted by frequency)
    sortedWords.forEach((word, index) => {
      let attempts = 0;
      let position = null;
      const fontSize = getSize(word.count, index);
      
      // Better width calculation
      const charWidth = fontSize < 30 ? 0.5 : fontSize < 50 ? 0.6 : 0.7;
      const wordWidth = word.word.length * charWidth + 10; // Add extra padding
      const wordHeight = fontSize * 1.5; // More height padding
      
      // Try to find a good position with more attempts
      while (attempts < 300 && !position) {
        let x, y;
        
        if (index === 0) {
          // First word - center
          x = 50;
          y = 50;
        } else if (index < 5) {
          // Top words - distributed around center
          const angle = (index - 1) * (Math.PI * 2 / 4) + Math.PI / 4;
          const radius = 25;
          x = 50 + radius * Math.cos(angle);
          y = 50 + radius * Math.sin(angle);
        } else if (index < 20) {
          // Important words - use grid with some randomness
          const gridX = Math.floor(Math.random() * gridCells);
          const gridY = Math.floor(Math.random() * gridCells);
          const cellKey = `${gridX},${gridY}`;
          
          if (!usedCells.has(cellKey)) {
            x = (gridX + 0.5) * cellSize + (Math.random() - 0.5) * cellSize * 0.6;
            y = (gridY + 0.5) * cellSize + (Math.random() - 0.5) * cellSize * 0.6;
            usedCells.add(cellKey);
          } else {
            // Random placement if grid cell is used
            x = 10 + Math.random() * 80;
            y = 10 + Math.random() * 80;
          }
        } else {
          // Smaller words - fill gaps
          x = 10 + Math.random() * 80;
          y = 10 + Math.random() * 80;
        }
        
        // Keep within bounds with margins based on word size
        const xMargin = Math.max(8, wordWidth / 2);
        const yMargin = Math.max(8, wordHeight / 2);
        x = Math.max(xMargin, Math.min(100 - xMargin, x));
        y = Math.max(yMargin, Math.min(100 - yMargin, y));
        
        // Improved collision detection
        const tooClose = placed.some(p => {
          // Calculate actual boundaries
          const thisLeft = x - wordWidth / 2;
          const thisRight = x + wordWidth / 2;
          const thisTop = y - wordHeight / 2;
          const thisBottom = y + wordHeight / 2;
          
          const otherLeft = p.x - p.width / 2;
          const otherRight = p.x + p.width / 2;
          const otherTop = p.y - p.height / 2;
          const otherBottom = p.y + p.height / 2;
          
          // Add extra spacing
          const spacingX = 15; // Minimum horizontal spacing
          const spacingY = 10; // Minimum vertical spacing
          
          // Check if rectangles overlap with spacing
          const overlapX = thisRight + spacingX > otherLeft && thisLeft - spacingX < otherRight;
          const overlapY = thisBottom + spacingY > otherTop && thisTop - spacingY < otherBottom;
          
          return overlapX && overlapY;
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
      
      // Force placement if no good position found
      if (!position) {
        // Find the emptiest area
        let bestX = 50, bestY = 50;
        let maxDistance = 0;
        
        // Sample grid points
        for (let gx = 1; gx < gridCells; gx++) {
          for (let gy = 1; gy < gridCells; gy++) {
            const testX = (gx / gridCells) * 100;
            const testY = (gy / gridCells) * 100;
            
            // Calculate minimum distance to existing words
            let minDist = Infinity;
            placed.forEach(p => {
              const dist = Math.sqrt(Math.pow(testX - p.x, 2) + Math.pow(testY - p.y, 2));
              minDist = Math.min(minDist, dist);
            });
            
            if (minDist > maxDistance) {
              maxDistance = minDist;
              bestX = testX;
              bestY = testY;
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
      
      // Add rotation for variety
      let rotation = 0;
      if (index > 4) {
        const rotationChance = Math.random();
        if (rotationChance < 0.2 && fontSize < 30) {
          rotation = -90; // Vertical for smaller words
        } else if (rotationChance < 0.1) {
          rotation = (Math.random() - 0.5) * 20; // Slight angle
        }
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