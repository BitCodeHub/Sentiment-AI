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

// Extract key topics from review content for better context
const extractKeyTopics = (content) => {
  if (!content) return [];
  
  const topics = [];
  const lowerContent = content.toLowerCase();
  
  // Technical issues
  if (/crash|freeze|hang|stuck|slow|lag/i.test(content)) topics.push('performance issues');
  if (/login|sign in|password|authenticate|account/i.test(content)) topics.push('authentication');
  if (/connect|sync|network|offline|wifi|bluetooth/i.test(content)) topics.push('connectivity');
  if (/bug|error|broken|fix|issue|problem/i.test(content)) topics.push('technical problems');
  
  // Feature-related
  if (/feature|add|want|need|should|could|wish/i.test(content)) topics.push('feature request');
  if (/ui|ux|design|interface|layout|button|screen/i.test(content)) topics.push('UI/UX');
  if (/pay|charge|subscription|billing|price|cost/i.test(content)) topics.push('payment/billing');
  
  // Service-related
  if (/support|help|contact|response|customer service/i.test(content)) topics.push('customer service');
  if (/update|version|latest|new|change/i.test(content)) topics.push('app updates');
  
  // Positive indicators
  if (/love|great|excellent|perfect|amazing|awesome|best/i.test(content)) topics.push('positive experience');
  if (/easy|simple|intuitive|fast|quick|smooth/i.test(content)) topics.push('ease of use');
  
  return [...new Set(topics)]; // Remove duplicates
};

// Generate a unique cache key for a review
const generateCacheKey = (review) => {
  const content = review.content || review.text || '';
  const contentHash = content.substring(0, 50); // Use first 50 chars for uniqueness
  const timestamp = review.date || review.Date || '';
  
  const key = {
    contentHash,
    rating: review.rating || review.Rating,
    sentiment: review.sentiment,
    timestamp,
    randomSeed: Math.floor(Date.now() / 300000) // Changes every 5 minutes
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
    
    // Extract key topics/issues from review content
    const extractedTopics = extractKeyTopics(reviewContent);
    const hasSpecificIssue = extractedTopics.length > 0;
    
    const prompt = `You are a skilled customer service representative crafting personalized, intelligent responses to app reviews. Generate a unique, contextual reply that directly addresses the reviewer's specific feedback.

Review Details:
- Content: "${reviewContent}"
- Rating: ${rating}/5
- Sentiment: ${sentiment}
- Key Topics: ${extractedTopics.join(', ') || 'general feedback'}
- Issue Categories: ${issueCategories.join(', ') || 'none'}
- Platform: ${source}
- Review Type: ${isVagueNegative ? 'VAGUE NEGATIVE' : hasSpecificIssue ? 'SPECIFIC ISSUE' : rating >= 4 ? 'POSITIVE' : 'NEUTRAL'}

CRITICAL INSTRUCTIONS:
1. Create a UNIQUE response - avoid generic templates
2. Reference specific details from their review
3. Match their communication style (formal/casual)
4. Keep it 2-3 sentences maximum
5. Be creative and vary your approach
6. ALWAYS use "we" instead of "I" - represent the team, not an individual

Response Strategies by Type:

FOR VAGUE NEGATIVE (like "${reviewContent}"):
- Start with empathy using varied phrases
- Ask for SPECIFIC details about their issue
- Suggest the most relevant support channel
- Examples of varied openings:
  • "We hear your frustration..."
  • "That sounds really frustrating, and we want to help..."
  • "We're truly sorry you're experiencing difficulties..."
  • "This isn't the experience we want for you..."

FOR SPECIFIC ISSUES:
- Acknowledge the EXACT problem they mentioned
- Show you understand the impact
- Offer a specific next step
- Reference their specific pain points
- Examples:
  • For login issues: "The login problems you're describing with [specific detail] shouldn't be happening, and we want to fix this..."
  • For crashes: "App crashes during [their mentioned action] are unacceptable, and we're taking this seriously..."
  • For connectivity: "Connection issues with [their device/network] can be incredibly frustrating - we understand..."

FOR POSITIVE REVIEWS:
- Thank them genuinely and specifically
- Reference what they loved
- Keep it authentic and varied
- Examples:
  • "Your kind words about [specific feature] made our day!"
  • "We're so glad [specific thing] is working well for you!"
  • "We're thrilled to hear [specific praise point]!"

TONE VARIATIONS:
- Use different emotional approaches
- Vary sentence structure and length
- Include relevant emojis occasionally (but sparingly)
- Match urgency to their frustration level
- Always speak as "we" representing the company/team

Provide your response in JSON format:
{
  "reply": "Your unique, contextual reply addressing their specific feedback",
  "tone": "empathetic|grateful|apologetic|supportive|encouraging|understanding",
  "suggestedAction": "investigate|escalate|thank|request_details|offer_help|celebrate",
  "priority": "critical|high|medium|low",
  "confidence": 0.0-1.0
}

IMPORTANT: Return only valid JSON. Make each response unique and directly relevant to THIS specific review. NEVER use "I" - always use "we" or rephrase to avoid first person singular.`;

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

// Varied fallback responses for different scenarios
const fallbackResponses = {
  positiveVariations: [
    "Your wonderful review made our day! We're so glad you're loving the app.",
    "Thank you for the amazing feedback! It's users like you who inspire us to keep improving.",
    "We're thrilled to hear about your positive experience! Your support motivates our entire team.",
    "Your kind words mean the world to us! We're delighted the app is working well for you.",
    "So happy to hear you're enjoying the app! Thank you for taking the time to share this."
  ],
  vagueNegativeVariations: [
    "We hear your frustration, and we'd really like to help. Could you tell us more about what specific issues you're facing?",
    "That sounds incredibly frustrating! To help resolve this quickly, could you share what exactly isn't working?",
    "We're truly sorry you're having this experience. What specific problems are you encountering so we can fix them?",
    "This isn't the experience we want for you. Could you provide more details about what's going wrong?",
    "We understand how disappointing this must be. What particular features or functions are giving you trouble?"
  ],
  specificNegativeVariations: [
    "We sincerely apologize for these issues you're experiencing. Let us connect you with our support team who can help resolve this right away.",
    "Thank you for detailing these problems - this helps us improve. We'll escalate this to our technical team immediately.",
    "We're really sorry about these difficulties. Our support team specializes in resolving exactly these types of issues - let us get you connected.",
    "These problems you've described shouldn't be happening. We'll make sure our team investigates this urgently.",
    "We understand how frustrating these issues must be. Let's get this resolved - our support team will reach out to help."
  ],
  neutralVariations: [
    "Thanks for sharing your thoughts! Your feedback helps us understand how to make the app even better.",
    "We appreciate your honest review. Is there anything specific we could improve to earn that 5-star experience?",
    "Thank you for the constructive feedback. We're always looking to improve - what would make this a better experience for you?",
    "Your insights are valuable to us. If you have any specific suggestions, we'd love to hear them!",
    "Thanks for taking the time to review. We'd love to know what would make the app perfect for your needs."
  ]
};

// Fallback reply generator with variations
const getFallbackReply = (review) => {
  const rating = review.rating || 0;
  const content = review.content || review.text || '';
  const topics = extractKeyTopics(content);
  
  let reply, tone, action, priority;
  
  // Use random selection for variety
  const randomIndex = (arr) => Math.floor(Math.random() * arr.length);
  
  if (rating >= 4) {
    // Positive review
    reply = fallbackResponses.positiveVariations[randomIndex(fallbackResponses.positiveVariations)];
    tone = 'grateful';
    action = 'thank';
    priority = 'low';
    
    // Add topic reference if available
    if (topics.includes('ease of use')) {
      reply = reply.replace('the app', 'how easy the app is to use');
    } else if (topics.includes('positive experience')) {
      reply = reply.replace('the app', 'your experience with the app');
    }
  } else if (rating <= 2) {
    if (content.length < 50 || /^(nothing works|app sucks|doesn't work|bad|terrible|worst|hate it|useless|garbage)$/i.test(content.trim())) {
      // Vague negative
      reply = fallbackResponses.vagueNegativeVariations[randomIndex(fallbackResponses.vagueNegativeVariations)];
      tone = 'empathetic';
      action = 'request_details';
      priority = 'high';
    } else {
      // Specific negative
      reply = fallbackResponses.specificNegativeVariations[randomIndex(fallbackResponses.specificNegativeVariations)];
      tone = 'apologetic';
      action = 'escalate';
      priority = 'high';
      
      // Customize based on detected topics
      if (topics.includes('authentication')) {
        reply = reply.replace('these issues', 'the login issues');
      } else if (topics.includes('performance issues')) {
        reply = reply.replace('these issues', 'the performance problems');
      } else if (topics.includes('connectivity')) {
        reply = reply.replace('these issues', 'the connection problems');
      }
    }
  } else {
    // Neutral review
    reply = fallbackResponses.neutralVariations[randomIndex(fallbackResponses.neutralVariations)];
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
    detectedTopics: topics,
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