import React, { useState, useEffect } from 'react';
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
  ChevronUp,
  Reply,
  Shield,
  Edit,
  Trash2
} from 'lucide-react';
import DeveloperAuth from './DeveloperAuth';
import ReplyModal from './ReplyModal';
import { 
  getAllReplies, 
  getReplyForReview, 
  saveReply, 
  updateReply,
  deleteReply,
  canReplyToReview 
} from '../services/replyService';
import './ReviewListWithReplies.css';

const ReviewListWithReplies = ({ reviews }) => {
  const [expandedKeywords, setExpandedKeywords] = useState(new Set());
  const [developerInfo, setDeveloperInfo] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [localReplies, setLocalReplies] = useState({});
  const [editingReply, setEditingReply] = useState(null);

  // Load replies on component mount
  useEffect(() => {
    const replies = getAllReplies();
    setLocalReplies(replies);
  }, []);

  const handleAuthChange = (authData) => {
    setDeveloperInfo(authData);
  };

  const handleReplyClick = (review) => {
    if (!developerInfo) {
      setShowAuthModal(true);
      return;
    }

    const replyCheck = canReplyToReview(review);
    if (!replyCheck.canReply) {
      alert(replyCheck.reason);
      return;
    }

    setSelectedReview(review);
    setShowReplyModal(true);
  };

  const handleReplySubmit = async (reviewId, content) => {
    try {
      let result;
      
      if (editingReply) {
        // Update existing reply
        result = await updateReply(reviewId, content);
      } else {
        // Create new reply
        const replyData = {
          content,
          author: developerInfo.name,
          authorEmail: developerInfo.email
        };
        result = await saveReply(reviewId, replyData);
      }
      
      // Update local state
      setLocalReplies(prev => ({
        ...prev,
        [reviewId]: result
      }));

      setShowReplyModal(false);
      setSelectedReview(null);
      setEditingReply(null);
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('Failed to submit reply. Please try again.');
    }
  };

  const handleEditReply = (review) => {
    setSelectedReview(review);
    setEditingReply(localReplies[review.id]);
    setShowReplyModal(true);
  };

  const handleDeleteReply = async (reviewId) => {
    if (confirm('Are you sure you want to delete this reply?')) {
      const success = await deleteReply(reviewId);
      if (success) {
        setLocalReplies(prev => {
          const updated = { ...prev };
          delete updated[reviewId];
          return updated;
        });
      }
    }
  };

  return (
    <>
      <div className="review-list-with-replies">
        {reviews.map((review) => {
          const rating = parseInt(review.rating) || parseInt(review.Rating) || 0;
          const localReply = localReplies[review.id];
          const hasAnyReply = review.response || localReply;
          
          // Process OS info (same as original)
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
                
                <div className="review-actions">
                  {/* Sentiment Indicator */}
                  <div className={`review-sentiment-indicator ${(review.sentiment || 'neutral').toLowerCase()}`}>
                    {review.sentiment === 'Positive' && <CheckCircle size={16} />}
                    {review.sentiment === 'Negative' && <XCircle size={16} />}
                    {review.sentiment === 'Neutral' && <MinusCircle size={16} />}
                    <span>{review.sentiment || 'Neutral'}</span>
                  </div>
                  
                  {/* Reply Button */}
                  {!hasAnyReply && (
                    <button 
                      className="reply-button"
                      onClick={() => handleReplyClick(review)}
                      title="Reply to this review"
                    >
                      <Reply size={14} />
                      <span>Reply</span>
                    </button>
                  )}
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
              
              {/* Developer Response - Apple's official response */}
              {review.response && (
                <div className="review-developer-response official">
                  <div className="response-header">
                    <MessageSquare size={14} />
                    <span>Developer Response</span>
                    <span className="response-badge">Official</span>
                  </div>
                  <p className="response-content">{review.response}</p>
                </div>
              )}
              
              {/* Local Developer Reply */}
              {localReply && (
                <div className="review-developer-response local">
                  <div className="response-header">
                    <MessageSquare size={14} />
                    <span>Developer Response</span>
                    <span className="response-badge local-badge">
                      <Shield size={12} />
                      Draft
                    </span>
                    {developerInfo && localReply.authorEmail === developerInfo.email && (
                      <div className="response-actions">
                        <button 
                          className="response-action-btn"
                          onClick={() => handleEditReply(review)}
                          title="Edit reply"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          className="response-action-btn delete"
                          onClick={() => handleDeleteReply(review.id)}
                          title="Delete reply"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="response-content">{localReply.content}</p>
                  <div className="response-meta">
                    <span>By {localReply.author}</span>
                    <span>•</span>
                    <span>{new Date(localReply.timestamp).toLocaleDateString()}</span>
                    {localReply.edited && <span className="edited-badge">Edited</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Developer Authentication Modal */}
      <DeveloperAuth 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthChange={handleAuthChange}
      />

      {/* Reply Modal */}
      {showReplyModal && selectedReview && (
        <ReplyModal
          isOpen={showReplyModal}
          onClose={() => {
            setShowReplyModal(false);
            setSelectedReview(null);
            setEditingReply(null);
          }}
          review={selectedReview}
          onSubmit={handleReplySubmit}
          developerInfo={developerInfo}
          existingReply={editingReply}
        />
      )}

      {/* Developer Auth Badge - shows when authenticated */}
      <DeveloperAuth 
        isOpen={false}
        onAuthChange={handleAuthChange}
      />
    </>
  );
};

export default ReviewListWithReplies;