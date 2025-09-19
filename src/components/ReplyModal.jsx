import React, { useState } from 'react';
import { X, Send, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';
import './ReplyModal.css';

const ReplyModal = ({ isOpen, onClose, review, onSubmit, developerInfo, existingReply }) => {
  const [replyText, setReplyText] = useState(existingReply?.content || review?.draftReply || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(existingReply?.content?.length || review?.draftReply?.length || 0);
  const maxChars = 1000; // Apple's limit for developer responses
  const [showDraftIndicator, setShowDraftIndicator] = useState(!!review?.draftReply && !existingReply);

  React.useEffect(() => {
    if (existingReply) {
      setReplyText(existingReply.content);
      setCharCount(existingReply.content.length);
      setShowDraftIndicator(false);
    } else if (review?.draftReply) {
      setReplyText(review.draftReply);
      setCharCount(review.draftReply.length);
      setShowDraftIndicator(true);
    } else {
      setReplyText('');
      setCharCount(0);
      setShowDraftIndicator(false);
    }
  }, [existingReply, review?.draftReply]);

  if (!isOpen) return null;

  const handleTextChange = (e) => {
    const text = e.target.value;
    if (text.length <= maxChars) {
      setReplyText(text);
      setCharCount(text.length);
      // Hide draft indicator when user starts editing
      if (showDraftIndicator && text !== review?.draftReply) {
        setShowDraftIndicator(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(review.id, replyText.trim());
      setReplyText('');
      setCharCount(0);
      onClose();
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const templates = [
    {
      label: 'Thank you',
      text: "Thank you for your feedback! We appreciate you taking the time to share your experience with us."
    },
    {
      label: 'Issue acknowledged',
      text: "We apologize for the inconvenience. Our team is working on addressing this issue in the next update."
    },
    {
      label: 'Feature request',
      text: "Thank you for your suggestion! We've shared it with our product team for consideration in future updates."
    }
  ];

  return (
    <div className="reply-modal">
      <div className="reply-modal-overlay" onClick={onClose}></div>
      <div className="reply-modal-container">
        <div className="reply-modal-header">
          <h2>{existingReply ? 'Edit Reply' : 'Reply to Review'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="reply-modal-content">
          {/* Review Context */}
          <div className="review-context">
            <div className="review-context-header">
              <span className="review-author">{review?.author || review?.Author || 'Anonymous'}</span>
              <div className="review-rating">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={i < (review?.rating || review?.Rating || 0) ? 'star filled' : 'star'}>★</span>
                ))}
              </div>
            </div>
            <p className="review-content">{review?.content || review?.['Review Text'] || review?.Body || ''}</p>
          </div>

          {/* Reply Templates */}
          <div className="reply-templates">
            <h4>Quick Templates:</h4>
            <div className="template-buttons">
              {templates.map((template, index) => (
                <button
                  key={index}
                  className="template-btn"
                  onClick={() => handleTextChange({ target: { value: template.text } })}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reply Form */}
          <form onSubmit={handleSubmit} className="reply-form">
            <div className="form-group">
              <label htmlFor="reply">
                Your Response
                {showDraftIndicator && (
                  <span className="ai-draft-indicator">
                    <Sparkles size={14} />
                    AI Draft
                  </span>
                )}
              </label>
              <textarea
                id="reply"
                className="reply-textarea"
                placeholder="Write a thoughtful response to this review..."
                value={replyText}
                onChange={handleTextChange}
                rows={6}
                required
              />
              <div className="char-counter">
                <span className={charCount > maxChars * 0.9 ? 'warning' : ''}>
                  {charCount}/{maxChars}
                </span>
              </div>
            </div>

            {/* Guidelines */}
            <div className="reply-guidelines">
              <AlertCircle size={16} />
              <div>
                <h5>Response Guidelines:</h5>
                <ul>
                  <li>Be professional and courteous</li>
                  <li>Address specific concerns raised</li>
                  <li>Don't share personal information</li>
                  <li>Keep responses under 1000 characters</li>
                </ul>
              </div>
            </div>

            <div className="reply-actions">
              <button type="button" className="cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button 
                type="submit" 
                className="submit-btn"
                disabled={!replyText.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>Submitting...</>
                ) : (
                  <>
                    <Send size={16} />
                    Submit Reply
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReplyModal;