import { GoogleGenerativeAI } from '@google/generative-ai';
import { aiAnalysisCache } from './cacheService';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyCgpECc-whrISaCwlwxXiZV_YppN4dTQT4';
const genAI = new GoogleGenerativeAI(apiKey);

// Helper function to clean JSON response from Gemini
const cleanJsonResponse = (text) => {
  // Remove markdown code blocks if present
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  // Trim whitespace
  text = text.trim();
  return text;
};

// Generate a unique cache key for a review
const generateCacheKey = (review) => {
  const key = {
    content: review.content || review.text || '',
    rating: review.rating,
    sentiment: review.sentiment,
    source: review.source || 'unknown'
  };
  return `draft_reply_${JSON.stringify(key)}`;
};

// Main function to generate draft replies
export const generateDraftReply = async (review) => {
  try {
    // Check cache first
    const cacheKey = generateCacheKey(review);
    const cachedReply = aiAnalysisCache.get(cacheKey);
    if (cachedReply) {
      console.log('Using cached draft reply');
      return cachedReply;
    }

    // Prepare review context
    const reviewContent = review.content || review.text || '';
    const rating = review.rating || 0;
    const sentiment = review.sentiment || 'Unknown';
    const issueCategories = review.issueCategories || [];
    const source = review.source || 'App Store';
    
    // Determine review type for better context
    const isVagueNegative = rating <= 2 && (
      reviewContent.length < 50 ||
      /^(nothing works|app sucks|doesn't work|bad|terrible|worst|hate it|useless|garbage)$/i.test(reviewContent.trim())
    );
    
    const prompt = `You are a professional customer service representative responding to app reviews. Generate a concise, empathetic reply to this review.

Review Details:
- Content: "${reviewContent}"
- Rating: ${rating}/5
- Detected Sentiment: ${sentiment}
- Issue Categories: ${issueCategories.join(', ') || 'None detected'}
- Platform: ${source}

Guidelines:
1. Keep replies 2-3 sentences maximum
2. Be professional, empathetic, and solution-oriented
3. For vague negative reviews (${isVagueNegative ? 'THIS IS ONE' : 'not applicable'}):
   - Acknowledge their frustration
   - Ask for specific details about what's not working
   - Offer direct support channel
4. For specific issues:
   - Acknowledge the specific problem mentioned
   - Express empathy
   - Offer to help resolve it
5. For positive reviews:
   - Thank them genuinely
   - Highlight what they appreciated
   - Keep it brief and authentic
6. Never be defensive or dismissive
7. Don't make promises you can't keep
8. Use active voice and personal tone ("I" or "We")

Provide your response in JSON format:
{
  "reply": "Your draft reply text here",
  "tone": "empathetic|grateful|apologetic|supportive",
  "suggestedAction": "investigate|escalate|thank|request_details",
  "priority": "high|medium|low"
}

IMPORTANT: Return only valid JSON without any markdown formatting or additional text.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    
    const responseText = result.response.text();
    const cleanedResponse = cleanJsonResponse(responseText);
    const draftReply = JSON.parse(cleanedResponse);
    
    // Validate the response
    if (!draftReply.reply || typeof draftReply.reply !== 'string') {
      throw new Error('Invalid response format from Gemini');
    }
    
    // Ensure reply meets length constraints
    const sentences = draftReply.reply.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 3) {
      // Trim to first 3 sentences
      draftReply.reply = sentences.slice(0, 3).join('. ') + '.';
    }
    
    // Add metadata
    const enrichedReply = {
      ...draftReply,
      generatedAt: new Date().toISOString(),
      reviewRating: rating,
      reviewSentiment: sentiment,
      isVagueNegative
    };
    
    // Cache the successful result (cache for 24 hours)
    aiAnalysisCache.set(cacheKey, enrichedReply, 86400000);
    
    return enrichedReply;
  } catch (error) {
    console.error('Draft reply generation error:', error);
    
    // Provide fallback responses based on rating
    const fallbackReply = getFallbackReply(review);
    
    if (error.message?.includes('API key')) {
      throw new Error('Invalid Gemini API key. Please check your configuration.');
    } else if (error.message?.includes('quota')) {
      throw new Error('API quota exceeded. Falling back to template response.');
    }
    
    // Return fallback reply for other errors
    return fallbackReply;
  }
};

// Fallback reply templates when API fails
const getFallbackReply = (review) => {
  const rating = review.rating || 0;
  const content = review.content || review.text || '';
  
  let reply, tone, action, priority;
  
  if (rating >= 4) {
    // Positive review
    reply = "Thank you for your wonderful feedback! We're thrilled to hear you're enjoying the app. Your support means everything to us.";
    tone = 'grateful';
    action = 'thank';
    priority = 'low';
  } else if (rating <= 2) {
    if (content.length < 50 || /^(nothing works|app sucks|doesn't work|bad|terrible|worst|hate it|useless|garbage)$/i.test(content.trim())) {
      // Vague negative
      reply = "I'm sorry to hear you're having trouble with the app. Could you please share more details about what's not working? We'd love to help resolve this for you.";
      tone = 'empathetic';
      action = 'request_details';
      priority = 'high';
    } else {
      // Specific negative
      reply = "Thank you for bringing this to our attention. I understand your frustration, and I'd like to help resolve this issue. Please contact our support team for immediate assistance.";
      tone = 'apologetic';
      action = 'escalate';
      priority = 'high';
    }
  } else {
    // Neutral review
    reply = "Thank you for your feedback. We appreciate you taking the time to share your experience. If there's anything specific we can improve, please let us know.";
    tone = 'supportive';
    action = 'investigate';
    priority = 'medium';
  }
  
  return {
    reply,
    tone,
    suggestedAction: action,
    priority,
    generatedAt: new Date().toISOString(),
    reviewRating: rating,
    reviewSentiment: review.sentiment || 'Unknown',
    isVagueNegative: rating <= 2 && content.length < 50,
    isFallback: true
  };
};

// Batch generate draft replies for multiple reviews
export const generateBatchDraftReplies = async (reviews, options = {}) => {
  const { 
    maxConcurrent = 5, 
    prioritizeNegative = true,
    skipCached = false 
  } = options;
  
  try {
    // Sort reviews by priority if requested
    let sortedReviews = [...reviews];
    if (prioritizeNegative) {
      sortedReviews.sort((a, b) => (a.rating || 5) - (b.rating || 5));
    }
    
    const results = [];
    const errors = [];
    
    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < sortedReviews.length; i += maxConcurrent) {
      const batch = sortedReviews.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (review, index) => {
        try {
          // Check if we should skip cached results
          if (!skipCached) {
            const cacheKey = generateCacheKey(review);
            const cached = aiAnalysisCache.get(cacheKey);
            if (cached) {
              return { review, reply: cached, index: i + index };
            }
          }
          
          const reply = await generateDraftReply(review);
          return { review, reply, index: i + index };
        } catch (error) {
          errors.push({ review, error: error.message, index: i + index });
          return { review, reply: getFallbackReply(review), index: i + index, error: true };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add a small delay between batches to avoid rate limiting
      if (i + maxConcurrent < sortedReviews.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Sort results back to original order
    results.sort((a, b) => a.index - b.index);
    
    return {
      replies: results.map(r => ({ review: r.review, reply: r.reply })),
      errors,
      summary: {
        total: reviews.length,
        successful: results.filter(r => !r.error).length,
        failed: errors.length,
        cached: results.filter(r => r.reply.isCached).length
      }
    };
  } catch (error) {
    console.error('Batch draft reply generation error:', error);
    throw error;
  }
};

// Clear cache for draft replies
export const clearDraftReplyCache = () => {
  try {
    // Clear all draft reply entries from cache
    const cacheKeys = Array.from(aiAnalysisCache.cache.keys());
    let cleared = 0;
    
    cacheKeys.forEach(key => {
      if (key.startsWith('draft_reply_')) {
        aiAnalysisCache.cache.delete(key);
        cleared++;
      }
    });
    
    console.log(`Cleared ${cleared} draft reply cache entries`);
    return cleared;
  } catch (error) {
    console.error('Error clearing draft reply cache:', error);
    return 0;
  }
};