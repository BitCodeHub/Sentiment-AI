import React, { useState } from 'react';
import { 
  Star, 
  Calendar, 
  Smartphone, 
  Package,
  Globe,
  Layers,
  CheckCircle,
  XCircle,
  MinusCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const ReviewList = ({ reviews }) => {
  const [expandedKeywords, setExpandedKeywords] = useState(new Set());
  return (
    <div className="review-list">
      {reviews.map((review) => {
        const rating = parseInt(review.rating) || parseInt(review.Rating) || 0;
        
        // Process OS info
        const osInfo = (() => {
          const platform = review.platform || review.Platform || '';
          const os = review.os || review.OS || review['OS Version'] || review['Operating System'] || '';
          const cleanOS = os.replace(/[^\d.]/g, '');
          
          if (platform && cleanOS) {
            if (platform.toLowerCase() === 'ios') {
              return `iOS ${cleanOS}`;
            } else if (platform.toLowerCase() === 'android') {
              return `Android ${cleanOS}`;
            }
            return `${platform} ${cleanOS}`;
          } else if (cleanOS) {
            const versionNum = parseFloat(cleanOS);
            if (versionNum >= 13 && versionNum <= 18) {
              return `iOS ${cleanOS}`;
            } else if (versionNum >= 10 && versionNum <= 20) {
              return `Android ${cleanOS}`;
            }
            return cleanOS;
          }
          return null;
        })();
        
        return (
          <div key={review.id} className="review-card-redesigned">
            {/* Top Section with Avatar, Name, Rating and Date */}
            <div className="review-card-header">
              <div className="reviewer-section">
                <div className="reviewer-avatar">
                  {(review.author && typeof review.author === 'string') ? review.author.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="reviewer-info">
                  <h4 className="reviewer-name">
                    {(review.author && typeof review.author === 'string') ? review.author : 'Anonymous User'}
                  </h4>
                  <div className="review-meta-info">
                    <div className="review-rating-inline">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star
                          key={i}
                          size={14}
                          fill={i <= rating ? '#f59e0b' : 'transparent'}
                          stroke={i <= rating ? '#f59e0b' : '#e5e7eb'}
                        />
                      ))}
                    </div>
                    <span className="review-date-inline">
                      {review.date ? new Date(review.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }) : 'Unknown date'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Sentiment Indicator */}
              <div className={`review-sentiment-indicator ${(review.sentiment || 'neutral').toLowerCase()}`}>
                {review.sentiment === 'Positive' && <CheckCircle size={16} />}
                {review.sentiment === 'Negative' && <XCircle size={16} />}
                {review.sentiment === 'Neutral' && <MinusCircle size={16} />}
                <span>{review.sentiment || 'Neutral'}</span>
              </div>
            </div>
            
            {/* Review Title */}
            {review.title && (
              <h3 className="review-card-title">{review.title}</h3>
            )}
            
            {/* Review Content */}
            <div className="review-card-body">
              <p className="review-card-text">
                {review.content || review.body || ''}
              </p>
            </div>
            
            {/* Review Metadata - Inline */}
            <div className="review-card-metadata">
              <div className="metadata-items">
                {review.platform && (
                  <div className="metadata-item platform-item">
                    <Smartphone size={14} />
                    <span>{review.platform}</span>
                  </div>
                )}
                {osInfo && (
                  <div className="metadata-item">
                    <Layers size={14} />
                    <span>{osInfo}</span>
                  </div>
                )}
                {review.device && review.device !== 'Unknown' && review.device !== '' && (
                  <div className="metadata-item">
                    <Smartphone size={14} />
                    <span>{review.device}</span>
                  </div>
                )}
                {review.version && (
                  <div className="metadata-item">
                    <Package size={14} />
                    <span>App v{review.version}</span>
                  </div>
                )}
                {review.country && review.country !== 'Unknown' && (
                  <div className="metadata-item">
                    <Globe size={14} />
                    <span>{review.country}</span>
                  </div>
                )}
              </div>
              
              {/* Keywords Section */}
              {review.keywords && review.keywords.length > 0 && (
                <div className="review-keywords-section">
                  <span className="keywords-label">Keywords:</span>
                  <div className="review-keywords">
                    {expandedKeywords.has(review.id) ? (
                      // Show all keywords when expanded
                      <>
                        {review.keywords.map((keyword, idx) => (
                          <span key={idx} className="review-keyword-chip">{keyword}</span>
                        ))}
                        <button 
                          className="keywords-toggle"
                          onClick={() => setExpandedKeywords(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(review.id);
                            return newSet;
                          })}
                        >
                          <ChevronUp size={14} />
                          <span>Show less</span>
                        </button>
                      </>
                    ) : (
                      // Show limited keywords when collapsed
                      <>
                        {review.keywords.slice(0, 5).map((keyword, idx) => (
                          <span key={idx} className="review-keyword-chip">{keyword}</span>
                        ))}
                        {review.keywords.length > 5 && (
                          <button 
                            className="keywords-toggle"
                            onClick={() => setExpandedKeywords(prev => new Set([...prev, review.id]))}
                          >
                            <span>+{review.keywords.length - 5} more</span>
                            <ChevronDown size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Developer Response if exists */}
            {(review.response || review['Developer Response']) && (
              <div className="review-developer-response">
                <div className="response-header">
                  <MessageSquare size={14} />
                  <span>Developer Response</span>
                </div>
                <p className="response-content">{review.response || review['Developer Response']}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ReviewList;