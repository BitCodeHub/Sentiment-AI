// Reply Service - Manages developer replies to reviews
// In production, this would connect to Apple App Store Connect API

const REPLIES_STORAGE_KEY = 'developer_replies';

/**
 * Get all replies from storage
 */
export const getAllReplies = () => {
  try {
    const replies = localStorage.getItem(REPLIES_STORAGE_KEY);
    return replies ? JSON.parse(replies) : {};
  } catch (error) {
    console.error('Error getting replies:', error);
    return {};
  }
};

/**
 * Get reply for a specific review
 */
export const getReplyForReview = (reviewId) => {
  const replies = getAllReplies();
  return replies[reviewId] || null;
};

/**
 * Save a new reply
 */
export const saveReply = (reviewId, replyData) => {
  try {
    const replies = getAllReplies();
    const newReply = {
      id: `reply_${Date.now()}`,
      reviewId,
      content: replyData.content,
      author: replyData.author,
      authorEmail: replyData.authorEmail,
      timestamp: new Date().toISOString(),
      edited: false,
      editHistory: []
    };

    replies[reviewId] = newReply;
    localStorage.setItem(REPLIES_STORAGE_KEY, JSON.stringify(replies));
    
    // In production, would also send to Apple App Store Connect
    // await submitToAppStoreConnect(reviewId, replyData);
    
    return newReply;
  } catch (error) {
    console.error('Error saving reply:', error);
    throw error;
  }
};

/**
 * Update an existing reply
 */
export const updateReply = (reviewId, content) => {
  try {
    const replies = getAllReplies();
    const existingReply = replies[reviewId];
    
    if (!existingReply) {
      throw new Error('Reply not found');
    }

    // Keep edit history
    existingReply.editHistory.push({
      content: existingReply.content,
      editedAt: existingReply.timestamp
    });

    existingReply.content = content;
    existingReply.timestamp = new Date().toISOString();
    existingReply.edited = true;

    replies[reviewId] = existingReply;
    localStorage.setItem(REPLIES_STORAGE_KEY, JSON.stringify(replies));
    
    return existingReply;
  } catch (error) {
    console.error('Error updating reply:', error);
    throw error;
  }
};

/**
 * Delete a reply
 */
export const deleteReply = (reviewId) => {
  try {
    const replies = getAllReplies();
    delete replies[reviewId];
    localStorage.setItem(REPLIES_STORAGE_KEY, JSON.stringify(replies));
    return true;
  } catch (error) {
    console.error('Error deleting reply:', error);
    return false;
  }
};

/**
 * Check if developer can reply to a review
 * In production, would check against Apple's rules
 */
export const canReplyToReview = (review) => {
  // Apple allows only one developer response per review
  const existingReply = getReplyForReview(review.id);
  
  // Can't reply if:
  // 1. Already has a developer response from Apple
  // 2. Already has a local reply
  // 3. Review is too old (Apple has time limits)
  
  if (review.response || review['Developer Response']) {
    return { canReply: false, reason: 'This review already has a developer response' };
  }
  
  if (existingReply) {
    return { canReply: false, reason: 'You have already replied to this review' };
  }

  // Check if review is too old (Apple typically allows replies within 1 year)
  const reviewDate = new Date(review.date);
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  if (reviewDate < oneYearAgo) {
    return { canReply: false, reason: 'This review is too old to reply to' };
  }

  return { canReply: true, reason: null };
};

/**
 * Get reply statistics
 */
export const getReplyStats = () => {
  const replies = getAllReplies();
  const replyCount = Object.keys(replies).length;
  
  const stats = {
    totalReplies: replyCount,
    repliesThisWeek: 0,
    repliesThisMonth: 0,
    averageResponseTime: 0
  };

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  Object.values(replies).forEach(reply => {
    const replyDate = new Date(reply.timestamp);
    
    if (replyDate > oneWeekAgo) {
      stats.repliesThisWeek++;
    }
    if (replyDate > oneMonthAgo) {
      stats.repliesThisMonth++;
    }
  });

  return stats;
};

/**
 * Mock function to simulate Apple App Store Connect submission
 * In production, this would use Apple's API
 */
const submitToAppStoreConnect = async (reviewId, replyData) => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Reply submitted to App Store Connect:', reviewId, replyData);
      resolve({ success: true });
    }, 1000);
  });
};

export default {
  getAllReplies,
  getReplyForReview,
  saveReply,
  updateReply,
  deleteReply,
  canReplyToReview,
  getReplyStats
};