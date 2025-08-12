import React from 'react';

const KeywordCloud = ({ keywords }) => {
  if (!keywords || keywords.length === 0) return null;

  // Calculate size based on frequency
  const maxCount = Math.max(...keywords.map(k => k.count));
  const minCount = Math.min(...keywords.map(k => k.count));
  
  const getSize = (count) => {
    const normalized = (count - minCount) / (maxCount - minCount || 1);
    return 14 + normalized * 24; // Size between 14px and 38px
  };

  const getColor = (count) => {
    const normalized = (count - minCount) / (maxCount - minCount || 1);
    const hue = 200 + normalized * 20; // Blue to purple range
    const lightness = 50 - normalized * 15; // Darker for more frequent
    return `hsl(${hue}, 70%, ${lightness}%)`;
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