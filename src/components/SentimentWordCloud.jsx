import React from 'react';
import './SentimentWordCloud.css';

const SentimentWordCloud = ({ wordData, onWordClick }) => {
  if (!wordData || wordData.length === 0) return null;

  // Calculate size based on frequency
  const maxCount = Math.max(...wordData.map(w => w.count));
  const minCount = Math.min(...wordData.map(w => w.count));
  
  const getSize = (count, index) => {
    const normalized = (count - minCount) / (maxCount - minCount || 1);
    
    // More dramatic size differences
    if (index < 3) {
      // Top 3 words - very large
      return 56 + normalized * 24; // 56-80px
    } else if (index < 10) {
      // Next 7 words - large
      return 32 + normalized * 16; // 32-48px
    } else if (index < 25) {
      // Medium words
      return 20 + normalized * 10; // 20-30px
    } else if (index < 50) {
      // Smaller words
      return 14 + normalized * 6; // 14-20px
    } else {
      // Smallest words
      return 12 + normalized * 4; // 12-16px
    }
  };

  const getSentimentColor = (sentimentPercentages, index) => {
    const { positive, negative, neutral } = sentimentPercentages;
    
    // More varied color palette based on sentiment and importance
    if (positive >= 70) {
      // Strong positive - various greens
      const greens = ['#10b981', '#22c55e', '#16a34a', '#15803d'];
      return greens[index % greens.length];
    } else if (positive > 50) {
      // Positive - teal/cyan shades
      const teals = ['#14b8a6', '#06b6d4', '#0891b2', '#0e7490'];
      return teals[index % teals.length];
    } else if (negative >= 70) {
      // Strong negative - reds
      const reds = ['#ef4444', '#dc2626', '#b91c1c', '#991b1b'];
      return reds[index % reds.length];
    } else if (negative > 50) {
      // Negative - orange/amber
      const oranges = ['#f97316', '#ea580c', '#f59e0b', '#d97706'];
      return oranges[index % oranges.length];
    } else if (neutral > 50) {
      // Neutral - grays and blues
      const neutrals = ['#6b7280', '#4b5563', '#64748b', '#475569'];
      return neutrals[index % neutrals.length];
    } else {
      // Mixed - purple/indigo
      const mixed = ['#8b5cf6', '#7c3aed', '#6366f1', '#4f46e5'];
      return mixed[index % mixed.length];
    }
  };

  // Sort words by frequency for better visual distribution
  const sortedWords = [...wordData]
    .sort((a, b) => b.count - a.count)
    .slice(0, 80); // Increase to 80 words to fill space better

  // Create distributed positioning across full canvas
  const cloudWords = (() => {
    const positions = [];
    const placed = [];
    
    // Use spiral pattern for better distribution
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // Golden angle in radians
    
    // Process words in order of importance (already sorted by frequency)
    sortedWords.forEach((word, index) => {
      let attempts = 0;
      let position = null;
      const fontSize = getSize(word.count, index);
      // More accurate width calculation considering font weight
      const charWidth = index < 10 ? 0.7 : 0.6; // Bolder fonts are wider
      const wordWidth = word.word.length * fontSize * charWidth;
      const wordHeight = fontSize * 1.2;
      
      // Try to find a good position
      while (attempts < 100 && !position) {
        let x, y;
        
        if (index < 3) {
          // Top 3 words - dead center
          x = 45 + Math.random() * 10;
          y = 45 + Math.random() * 10;
        } else if (index < 10) {
          // Next important words - close to center
          const angle = (index - 3) * (Math.PI * 2 / 7);
          const radius = 8 + Math.random() * 8;
          x = 50 + radius * Math.cos(angle);
          y = 50 + radius * Math.sin(angle);
        } else if (index < 25) {
          // Medium importance - middle ring
          const angle = index * goldenAngle;
          const radius = 15 + Math.random() * 15;
          x = 50 + radius * Math.cos(angle);
          y = 50 + radius * Math.sin(angle);
        } else {
          // Other words - outer areas with spiral
          const angle = index * goldenAngle;
          const radius = 25 + Math.sqrt(index - 25) * 4;
          x = 50 + radius * Math.cos(angle) + (Math.random() - 0.5) * 8;
          y = 50 + radius * Math.sin(angle) + (Math.random() - 0.5) * 8;
        }
        
        // Keep within bounds with more margin to prevent cutoff
        const xMargin = wordWidth / 1000 + 15; // Dynamic margin based on word width
        const yMargin = wordHeight / 100 + 8;
        x = Math.max(xMargin, Math.min(100 - xMargin, x));
        y = Math.max(yMargin, Math.min(100 - yMargin, y));
        
        // Check collisions with more spacing
        const tooClose = placed.some(p => {
          const dx = Math.abs(x - p.x);
          const dy = Math.abs(y - p.y);
          
          // Adjusted spacing - less for center words, more for edges
          const spacingFactor = index < 10 ? 0.4 : index < 25 ? 0.45 : 0.5;
          const minXDistance = (wordWidth + p.width) / 100 * spacingFactor * 100 + 3;
          const minYDistance = (wordHeight + p.height) / 100 * spacingFactor * 100 + 2;
          
          return dx < minXDistance && dy < minYDistance;
        });
        
        if (!tooClose) {
          position = { x, y };
          placed.push({ 
            x, 
            y, 
            width: wordWidth,
            height: wordHeight
          });
        }
        
        attempts++;
      }
      
      // Fallback with spiral
      if (!position) {
        const angle = index * goldenAngle;
        const radius = 20 + Math.sqrt(index) * 5;
        position = {
          x: 50 + radius * Math.cos(angle),
          y: 50 + radius * Math.sin(angle)
        };
      }
      
      // Add rotation for variety - but not for very large words
      let rotation = 0;
      if (index > 5 && index < 50) {
        const rotationChance = Math.random();
        if (rotationChance < 0.15) {
          rotation = -90; // Vertical
        } else if (rotationChance < 0.25) {
          rotation = (Math.random() - 0.5) * 25; // Slight angle
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