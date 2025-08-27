import React from 'react';

const KeywordCloud = ({ keywords }) => {
  if (!keywords || keywords.length === 0) return null;

  // Calculate size based on frequency
  const maxCount = Math.max(...keywords.map(k => k.count));
  const minCount = Math.min(...keywords.map(k => k.count));
  
  const getSize = (count) => {
    const normalized = (count - minCount) / (maxCount - minCount || 1);
    return 16 + normalized * 32; // Size between 16px and 48px for better visibility
  };

  const getColor = (count) => {
    const normalized = (count - minCount) / (maxCount - minCount || 1);
    // Create a gradient from light to dark based on frequency
    const colors = [
      '#94a3b8', // Light gray for low frequency
      '#64748b', // Medium gray
      '#475569', // Dark gray
      '#334155', // Darker
      '#1e293b', // Very dark
      '#0f172a'  // Nearly black for highest frequency
    ];
    const index = Math.floor(normalized * (colors.length - 1));
    return colors[index];
  };

  return (
    <div className="keyword-cloud">
      {keywords.map((keyword, index) => (
        <span
          key={index}
          className="keyword"
          style={{
            fontSize: `${getSize(keyword.count)}px`,
            color: getColor(keyword.count)
          }}
          title={`${keyword.word}: ${keyword.count} occurrences`}
        >
          {keyword.word}
        </span>
      ))}
    </div>
  );
};

export default KeywordCloud;