import React from 'react';
import './SentimentWordCloud.css';

const SentimentWordCloud = ({ wordData, onWordClick }) => {
  if (!wordData || wordData.length === 0) return null;

  // Calculate size based on frequency
  const maxCount = Math.max(...wordData.map(w => w.count));
  const minCount = Math.min(...wordData.map(w => w.count));
  
  const getSize = (count) => {
    const normalized = (count - minCount) / (maxCount - minCount || 1);
    return 16 + normalized * 32; // Size between 16px and 48px
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
    .slice(0, 100); // Limit to top 100 words

  // Shuffle for better visual distribution (keeping size/importance)
  const shuffledWords = sortedWords.sort(() => Math.random() - 0.5);

  return (
    <div className="sentiment-word-cloud">
      {shuffledWords.map((word, index) => {
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
              animationDelay: `${index * 0.02}s`
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