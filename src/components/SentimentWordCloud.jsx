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
    if (index < 5) {
      // Top 5 words - very large
      return 48 + normalized * 32; // 48-80px
    } else if (index < 15) {
      // Next 10 words - large
      return 28 + normalized * 20; // 28-48px
    } else if (index < 30) {
      // Medium words
      return 18 + normalized * 12; // 18-30px
    } else {
      // Smaller words
      return 14 + normalized * 8; // 14-22px
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
    .slice(0, 50); // Limit to 50 for better spacing

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
      const wordWidth = word.word.length * fontSize * 0.6;
      const wordHeight = fontSize * 1.1;
      
      // Try to find a good position
      while (attempts < 100 && !position) {
        let x, y;
        
        if (index < 5) {
          // Top 5 words - center area with some randomness
          x = 30 + Math.random() * 40;
          y = 35 + Math.random() * 30;
        } else if (index < 15) {
          // Important words - inner ring
          const angle = Math.random() * Math.PI * 2;
          const radius = 20 + Math.random() * 15;
          x = 50 + radius * Math.cos(angle);
          y = 50 + radius * Math.sin(angle);
        } else {
          // Other words - spiral pattern
          const angle = index * goldenAngle;
          const radius = 15 + Math.sqrt(index) * 6;
          x = 50 + radius * Math.cos(angle) + (Math.random() - 0.5) * 10;
          y = 50 + radius * Math.sin(angle) + (Math.random() - 0.5) * 10;
        }
        
        // Keep within bounds
        x = Math.max(10, Math.min(90, x));
        y = Math.max(10, Math.min(90, y));
        
        // Check collisions with more spacing
        const tooClose = placed.some(p => {
          const dx = Math.abs(x - p.x);
          const dy = Math.abs(y - p.y);
          
          // Generous spacing based on word size
          const minXDistance = (wordWidth + p.width) / 100 * 50 + 5;
          const minYDistance = (wordHeight + p.height) / 100 * 50 + 3;
          
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
      
      // Add rotation for variety
      let rotation = 0;
      if (index > 8) {
        const rotationChance = Math.random();
        if (rotationChance < 0.2) {
          rotation = -90; // Vertical
        } else if (rotationChance < 0.35) {
          rotation = (Math.random() - 0.5) * 30; // Slight angle
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