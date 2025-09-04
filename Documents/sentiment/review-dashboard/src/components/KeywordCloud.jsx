import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import './KeywordCloud.css';

const KeywordCloud = ({ keywords, reviews }) => {
  const [hoveredWord, setHoveredWord] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [displayKeywords, setDisplayKeywords] = useState([]);
  const [isRandomizing, setIsRandomizing] = useState(false);

  // Initialize keywords with random properties
  const initializeKeywords = useCallback((words) => {
    // Sort by count to place most important words in center
    const sortedWords = [...words].sort((a, b) => b.count - a.count);
    
    return sortedWords.slice(0, 80).map((keyword, index) => {
      // Create a more center-focused distribution
      const angle = Math.random() * Math.PI * 2;
      const radiusMultiplier = index < 10 ? 0.3 : index < 30 ? 0.5 + Math.random() * 0.3 : 0.7 + Math.random() * 0.3;
      const radius = radiusMultiplier * 40; // Max 40% from center
      
      return {
        ...keyword,
        id: `${keyword.word}-${index}`,
        rotation: 0, // No rotation for cleaner look
        x: 50 + radius * Math.cos(angle), // Center at 50%
        y: 50 + radius * Math.sin(angle), // Center at 50%
      };
    });
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
        const content = review.content || review.body || review.review || 
                       review['Review Text'] || review.Body || '';
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
    // Professional size scaling for Tableau style
    if (normalized > 0.8) return 36 + Math.random() * 4; // Large
    if (normalized > 0.6) return 28 + Math.random() * 3; // Medium-large
    if (normalized > 0.4) return 20 + Math.random() * 3; // Medium
    if (normalized > 0.2) return 16 + Math.random() * 2; // Small-medium
    return 12 + Math.random() * 2; // Small
  }, [maxCount, minCount]);

  const getColor = useCallback((count, word, index) => {
    const normalized = (count - minCount) / (maxCount - minCount || 1);
    
    // Tableau color palette
    const tableauColors = [
      '#1f77b4', // Blue
      '#ff7f0e', // Orange
      '#2ca02c', // Green
      '#d62728', // Red
      '#9467bd', // Purple
      '#8c564b', // Brown
      '#e377c2', // Pink
      '#7f7f7f', // Gray
      '#bcbd22', // Olive
      '#17becf', // Cyan
    ];
    
    // Distribute colors based on frequency and index for variety
    if (normalized > 0.7) {
      // Most frequent words get prominent colors
      return tableauColors[index % 4]; // Blue, Orange, Green, Red
    } else if (normalized > 0.4) {
      // Medium frequency gets full palette
      return tableauColors[index % tableauColors.length];
    } else {
      // Low frequency gets muted colors
      const mutedColors = ['#7f7f7f', '#8c564b', '#9467bd', '#bcbd22'];
      return mutedColors[index % mutedColors.length];
    }
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
                color: getColor(keyword.count, keyword.word, displayKeywords.indexOf(keyword)),
                transform: `translate(-50%, -50%)`, // Center the word on its position
                position: 'absolute',
                left: `${keyword.x}%`,
                top: `${keyword.y}%`,
                fontWeight: keyword.count > (maxCount * 0.5) ? '500' : '400',
                fontFamily: '"Benton Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
                      const content = review.content || review.body || review.review || 
                                    review['Review Text'] || review.Body || '';
                      // Highlight the keyword in the review
                      const lowerContent = content.toLowerCase();
                      const lowerWord = hoveredWord.toLowerCase();
                      const index = lowerContent.indexOf(lowerWord);
                      
                      if (index !== -1) {
                        const start = Math.max(0, index - 60);
                        const end = Math.min(content.length, index + lowerWord.length + 60);
                        const excerpt = content.substring(start, end);
                        const highlightIndex = excerpt.toLowerCase().indexOf(lowerWord);
                        
                        if (highlightIndex !== -1) {
                          return (
                            <>
                              {start > 0 && '...'}
                              {excerpt.substring(0, highlightIndex)}
                              <span className="highlight">{excerpt.substring(highlightIndex, highlightIndex + lowerWord.length)}</span>
                              {excerpt.substring(highlightIndex + lowerWord.length)}
                              {end < content.length && '...'}
                            </>
                          );
                        }
                      }
                      
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