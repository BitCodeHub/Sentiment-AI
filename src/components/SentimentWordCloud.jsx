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
    .slice(0, 50); // Reduce to 50 words for better spacing

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
      
      // Try to find a good position with more attempts
      while (attempts < 200 && !position) {
        let x, y;
        
        // Random placement with bias towards center
        if (index === 0) {
          // First word - center
          x = 48 + Math.random() * 4;
          y = 48 + Math.random() * 4;
        } else if (index < 5) {
          // Top words - near center
          const angle = Math.random() * Math.PI * 2;
          const radius = 5 + Math.random() * 10;
          x = 50 + radius * Math.cos(angle);
          y = 50 + radius * Math.sin(angle);
        } else {
          // All other words - random placement with slight center bias
          const angle = Math.random() * Math.PI * 2;
          const maxRadius = 35;
          // Use sqrt for better distribution
          const radius = Math.sqrt(Math.random()) * maxRadius;
          x = 50 + radius * Math.cos(angle);
          y = 50 + radius * Math.sin(angle);
          
          // Add some randomness
          x += (Math.random() - 0.5) * 10;
          y += (Math.random() - 0.5) * 10;
        }
        
        // Keep within bounds with fixed margins
        const margin = 15; // 15% margin from all edges
        x = Math.max(margin, Math.min(100 - margin, x));
        y = Math.max(margin, Math.min(100 - margin, y));
        
        // Check collisions with more spacing
        const tooClose = placed.some(p => {
          const dx = Math.abs(x - p.x);
          const dy = Math.abs(y - p.y);
          
          // Much more generous spacing to prevent overlaps
          const padding = 15; // Minimum 15px padding between words
          const minXDistance = (wordWidth + p.width) / 2 + padding;
          const minYDistance = (wordHeight + p.height) / 2 + padding;
          
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
      
      // Fallback with spiral - ensure it's within bounds
      if (!position) {
        // Place remaining words in a spiral pattern
        const angle = index * goldenAngle;
        const radius = 20 + (index / sortedWords.length) * 20;
        let fallbackX = 50 + radius * Math.cos(angle);
        let fallbackY = 50 + radius * Math.sin(angle);
        
        // Apply margin constraints
        const margin = 15;
        fallbackX = Math.max(margin, Math.min(100 - margin, fallbackX));
        fallbackY = Math.max(margin, Math.min(100 - margin, fallbackY));
        
        position = { x: fallbackX, y: fallbackY };
      }
      
      // Add rotation for variety
      let rotation = 0;
      if (index > 5) {
        const rotationChance = Math.random();
        if (rotationChance < 0.1) {
          rotation = -90; // Vertical
        } else if (rotationChance < 0.2) {
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