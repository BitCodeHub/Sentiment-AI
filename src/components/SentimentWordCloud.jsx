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
        
        // Strategic placement based on word importance
        if (index === 0) {
          // First word - slightly off-center for natural look
          x = 45 + Math.random() * 10;
          y = 45 + Math.random() * 10;
        } else if (index < 4) {
          // Top 4 words - key positions around center
          const positions = [
            { x: 30, y: 35 }, // left
            { x: 70, y: 40 }, // right
            { x: 50, y: 25 }, // top
            { x: 50, y: 65 }  // bottom
          ];
          const pos = positions[index - 1];
          x = pos.x + (Math.random() - 0.5) * 10;
          y = pos.y + (Math.random() - 0.5) * 10;
        } else if (index < 15) {
          // Important words - inner circle
          const angle = (index - 4) * (Math.PI * 2 / 11) + Math.random() * 0.5;
          const radius = 15 + Math.random() * 10;
          x = 50 + radius * Math.cos(angle);
          y = 50 + radius * Math.sin(angle);
        } else if (index < 40) {
          // Medium words - middle zone
          const angle = index * 0.618 * Math.PI * 2; // Golden angle
          const radius = 20 + (index - 15) * 0.8;
          x = 50 + radius * Math.cos(angle);
          y = 50 + radius * Math.sin(angle);
        } else {
          // Smaller words - outer areas
          // Use Halton sequence for better distribution
          const phi = (1 + Math.sqrt(5)) / 2;
          const theta = 2 * Math.PI * index / phi;
          const radius = 30 + Math.sqrt(index - 40) * 3;
          x = 50 + radius * Math.cos(theta) * 0.8;
          y = 50 + radius * Math.sin(theta) * 0.8;
        }
        
        // Keep within bounds with fixed margins
        const margin = 15; // 15% margin from all edges
        x = Math.max(margin, Math.min(100 - margin, x));
        y = Math.max(margin, Math.min(100 - margin, y));
        
        // Check collisions with more spacing
        const tooClose = placed.some(p => {
          const dx = Math.abs(x - p.x);
          const dy = Math.abs(y - p.y);
          
          // Dynamic spacing based on word size and position
          const basePadding = 8;
          // Larger words need more space
          const sizeFactor = Math.max(fontSize, p.size) / 20;
          const padding = basePadding + sizeFactor * 2;
          
          const minXDistance = (wordWidth + p.width) / 2 + padding;
          const minYDistance = (wordHeight + p.height) / 2 + padding * 0.8;
          
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
      
      // Add rotation for variety - more vertical words
      let rotation = 0;
      if (index > 3) {
        const rotationChance = Math.random();
        if (rotationChance < 0.25 && index < 40) {
          rotation = -90; // Vertical - 25% chance for medium words
        } else if (rotationChance < 0.15) {
          rotation = (Math.random() - 0.5) * 15; // Slight angle
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