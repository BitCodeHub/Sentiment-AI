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

  // Create cloud-shaped positioning using spiral pattern
  const cloudWords = sortedWords.map((word, index) => {
    const totalWords = sortedWords.length;
    const normalizedIndex = index / totalWords;
    
    // Use spiral pattern for word placement
    const spiralTurns = 3;
    const angle = normalizedIndex * Math.PI * 2 * spiralTurns;
    const maxRadius = 40;
    
    // Vary radius based on position for cloud shape
    let radius = normalizedIndex * maxRadius;
    
    // Create cloud bulges at different angles
    const bulgeAngles = [0, Math.PI * 0.6, Math.PI * 1.3, Math.PI * 1.8];
    bulgeAngles.forEach(bulgeAngle => {
      const angleDiff = Math.abs(angle % (Math.PI * 2) - bulgeAngle);
      const bulgeEffect = Math.max(0, 1 - angleDiff / Math.PI) * 0.3;
      radius *= (1 + bulgeEffect);
    });
    
    // Calculate position with cloud-like distribution
    let x = 50 + radius * Math.cos(angle) * 1.5;
    let y = 50 + radius * Math.sin(angle) * 0.8;
    
    // Add organic randomness
    const jitter = Math.max(3, 10 - index * 0.05);
    x += (Math.random() - 0.5) * jitter;
    y += (Math.random() - 0.5) * jitter;
    
    // Cluster important words near center
    if (index < 20) {
      x = x * 0.6 + 20;
      y = y * 0.6 + 20;
    }
    
    return {
      ...word,
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(15, Math.min(85, y))
    };
  });

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