import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';

const KeywordCloud = ({ keywords, reviews }) => {
  const [hoveredWord, setHoveredWord] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [displayKeywords, setDisplayKeywords] = useState([]);
  const [isRandomizing, setIsRandomizing] = useState(false);

  // Initialize keywords with random properties
  const initializeKeywords = useCallback((words) => {
    return words.slice(0, 50).map((keyword, index) => ({
      ...keyword,
      id: `${keyword.word}-${index}`,
      rotation: Math.random() * 60 - 30, // -30 to 30 degrees
      x: Math.random() * 80 + 10, // 10% to 90%
      y: Math.random() * 80 + 10, // 10% to 90%
    }));
  }, []);

  useEffect(() => {
    if (keywords && keywords.length > 0) {
      setDisplayKeywords(initializeKeywords(keywords));
    }
  }, [keywords, initializeKeywords]);

  // Find reviews containing the word
  const getReviewsForWord = useCallback((word) => {
    if (!reviews) return [];
    const lowerWord = word.toLowerCase();
    return reviews
      .filter(review => {
        // Check multiple possible content fields
        const content = review.content || review.body || review.review || '';
        return content.toLowerCase().includes(lowerWord);
      })
      .slice(0, 3); // Show max 3 reviews in tooltip
  }, [reviews]);

  // Calculate size and color based on frequency
  const maxCount = useMemo(() => 
    Math.max(...(displayKeywords.map(k => k.count) || [1])), 
    [displayKeywords]
  );
  const minCount = useMemo(() => 
    Math.min(...(displayKeywords.map(k => k.count) || [1])), 
    [displayKeywords]
  );
  
  const getSize = useCallback((count) => {
    const normalized = (count - minCount) / (maxCount - minCount || 1);
    return 14 + normalized * 36; // Size between 14px and 50px
  }, [maxCount, minCount]);

  const getColor = useCallback((count) => {
    const normalized = (count - minCount) / (maxCount - minCount || 1);
    // Mix of colors like in the image - red, black, gray
    const colors = [
      '#6b7280', // Gray for low
      '#374151', // Dark gray
      '#111827', // Almost black
      '#dc2626', // Red for medium-high
      '#991b1b', // Dark red for high
    ];
    const index = Math.floor(normalized * (colors.length - 1));
    return colors[index];
  }, [maxCount, minCount]);

  const handleRandomize = () => {
    setIsRandomizing(true);
    setTimeout(() => {
      setDisplayKeywords(initializeKeywords(keywords));
      setIsRandomizing(false);
    }, 300);
  };

  const handleMouseMove = (e) => {
    setTooltipPosition({
      x: e.clientX + 10,
      y: e.clientY - 10
    });
  };

  if (!keywords || keywords.length === 0) return null;

  return (
    <div className="enhanced-keyword-cloud">
      <div className="cloud-header">
        <h3 className="cloud-title">Word Cloud</h3>
        <button
          className={`randomize-btn ${isRandomizing ? 'spinning' : ''}`}
          onClick={handleRandomize}
          title="Randomize word positions"
        >
          <RefreshCw size={18} />
        </button>
      </div>
      
      <div className="cloud-container">
        {displayKeywords.map((keyword) => {
          const relatedReviews = getReviewsForWord(keyword.word);
          return (
            <span
              key={keyword.id}
              className={`cloud-word ${hoveredWord === keyword.word ? 'hovered' : ''}`}
              style={{
                fontSize: `${getSize(keyword.count)}px`,
                color: getColor(keyword.count),
                transform: `rotate(${keyword.rotation}deg)`,
                position: 'absolute',
                left: `${keyword.x}%`,
                top: `${keyword.y}%`,
                fontWeight: keyword.count > (maxCount * 0.7) ? '700' : '600',
              }}
              onMouseEnter={(e) => {
                setHoveredWord(keyword.word);
                handleMouseMove(e);
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredWord(null)}
            >
              {keyword.word}
            </span>
          );
        })}
      </div>

      {/* Tooltip */}
      {hoveredWord && (
        <div 
          className="word-cloud-tooltip"
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            zIndex: 1000
          }}
        >
          <div className="tooltip-header">
            <strong>"{hoveredWord}"</strong>
            <span className="tooltip-count">
              {displayKeywords.find(k => k.word === hoveredWord)?.count || 0} mentions
            </span>
          </div>
          
          {getReviewsForWord(hoveredWord).length > 0 ? (
            <div className="tooltip-reviews">
              {getReviewsForWord(hoveredWord).map((review, idx) => (
                <div key={idx} className="tooltip-review">
                  <div className="review-rating">{'★'.repeat(review.rating)}</div>
                  <div className="review-text">
                    {(() => {
                      const content = review.content || review.body || review.review || '';
                      return content.length > 150 
                        ? content.substring(0, 150) + '...' 
                        : content;
                    })()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="tooltip-no-reviews">No reviews found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default KeywordCloud;