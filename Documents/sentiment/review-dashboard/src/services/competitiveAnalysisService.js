import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiApiKey } from './geminiAIAnalysis';
import { automotiveOEMs } from '../data/automotiveOEMs';
import { performDeepOEMAnalysis, generateCompetitiveMetrics } from './geminiOEMAnalysis';

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Initialize Gemini AI
let genAI = null;

const initializeGemini = () => {
  if (!genAI) {
    const apiKey = getGeminiApiKey();
    if (apiKey) {
      genAI = new GoogleGenerativeAI(apiKey);
    }
  }
  return genAI;
};

// Analyze competitors using AI
export const analyzeCompetitors = async (currentApp, competitorData) => {
  const ai = initializeGemini();
  if (!ai) {
    throw new Error('Gemini API key not configured');
  }

  const model = ai.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `
    Analyze the competitive landscape for the automotive app "${currentApp}" compared to these competitors:
    
    ${Object.entries(competitorData).map(([id, data]) => `
      ${data.name}:
      - App Rating: ${data.metrics.appRating.toFixed(1)}/5
      - Review Count: ${data.metrics.reviewCount.toLocaleString()}
      - Sentiment Score: ${(data.metrics.sentimentScore * 100).toFixed(0)}%
      - Reddit Mentions: ${data.metrics.redditMentions}
      - Market Share: ${data.metrics.marketShare.toFixed(1)}%
      - Key Strengths: ${data.strengths.join(', ')}
    `).join('\n')}

    Provide:
    1. Market Position Analysis (2-3 sentences)
    2. Key Competitive Advantages (3-4 bullet points)
    3. Areas for Improvement (3-4 bullet points)
    4. Strategic Recommendations (2-3 sentences)
    
    Format as JSON with keys: marketPosition, advantages (array), improvements (array), recommendations
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback parsing if JSON extraction fails
    return {
      marketPosition: "Unable to analyze market position",
      advantages: ["Data analysis in progress"],
      improvements: ["Data analysis in progress"],
      recommendations: "Please try again later"
    };
  } catch (error) {
    console.error('Error analyzing competitors:', error);
    throw error;
  }
};

// Get competitor app review data from backend
export const getCompetitorReviewData = async (oemId) => {
  const oem = automotiveOEMs.find(o => o.id === oemId);
  if (!oem || !oem.appStoreId) return null;
  
  try {
    // Fetch comprehensive competitor analysis
    const response = await fetch('http://localhost:3001/api/competitors/analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appId: oem.appStoreId,
        options: {
          countries: ['us'],
          reviewLimit: 100,
          redditTimeFilter: 'month',
          includeReviews: true,
          includeReddit: true
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch competitor data');
    }

    const data = await response.json();
    const analysis = data.analysis;
    
    // Transform the data to match expected format
    const sentimentBreakdown = analysis.reviews?.reviews ? 
      calculateSentimentFromReviews(analysis.reviews.reviews) : 
      { positive: 50, neutral: 30, negative: 20 };
    
    const complaints = analysis.reviews?.reviews ? 
      extractTopIssues(analysis.reviews.reviews, 'negative') : 
      ["No complaint data available"];
      
    const praises = analysis.reviews?.reviews ? 
      extractTopIssues(analysis.reviews.reviews, 'positive') : 
      ["No praise data available"];
    
    return {
      appRating: analysis.appInfo.rating.overall || 0,
      totalReviews: analysis.appInfo.rating.overallCount || 0,
      recentReviews: analysis.reviews?.totalCount || 0,
      sentimentBreakdown,
      topComplaints: complaints.slice(0, 5),
      topPraises: praises.slice(0, 5),
      lastUpdated: analysis.appInfo.lastUpdated,
      redditMentions: analysis.metrics.redditMentions || 0,
      redditSentiment: analysis.metrics.redditSentiment || 0
    };
  } catch (error) {
    console.error('Error fetching competitor review data:', error);
    // Return fallback data
    return {
      appRating: 0,
      totalReviews: 0,
      recentReviews: 0,
      sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
      topComplaints: ["Unable to fetch data"],
      topPraises: ["Unable to fetch data"],
      error: error.message
    };
  }
};

// Helper function to calculate sentiment from reviews
const calculateSentimentFromReviews = (reviews) => {
  if (!reviews || reviews.length === 0) {
    return { positive: 0, neutral: 0, negative: 0 };
  }
  
  let positive = 0, neutral = 0, negative = 0;
  
  reviews.forEach(review => {
    const rating = review.Rating || review.rating;
    if (rating >= 4) positive++;
    else if (rating === 3) neutral++;
    else negative++;
  });
  
  const total = reviews.length;
  return {
    positive: Math.round((positive / total) * 100),
    neutral: Math.round((neutral / total) * 100),
    negative: Math.round((negative / total) * 100)
  };
};

// Helper function to extract top issues from reviews
const extractTopIssues = (reviews, sentiment) => {
  if (!reviews || reviews.length === 0) return [];
  
  const targetRatings = sentiment === 'positive' ? [4, 5] : [1, 2];
  const relevantReviews = reviews.filter(r => {
    const rating = r.Rating || r.rating;
    return targetRatings.includes(rating);
  });
  
  // Extract common themes (simplified version)
  const themes = new Map();
  const commonPhrases = sentiment === 'positive' ? 
    ['great', 'love', 'excellent', 'works well', 'easy', 'helpful', 'best', 'perfect'] :
    ['crash', 'slow', 'bug', 'issue', 'problem', 'fail', 'broken', 'terrible'];
  
  relevantReviews.forEach(review => {
    const text = (review['Review Text'] || review.content || '').toLowerCase();
    commonPhrases.forEach(phrase => {
      if (text.includes(phrase)) {
        themes.set(phrase, (themes.get(phrase) || 0) + 1);
      }
    });
  });
  
  // Return top themes
  return Array.from(themes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme]) => `${theme.charAt(0).toUpperCase() + theme.slice(1)} mentioned frequently`);
};

// Get Reddit sentiment for competitors
export const getCompetitorRedditSentiment = async (oemName) => {
  try {
    const response = await fetch('http://localhost:3001/api/competitors/reddit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appName: oemName,
        timeFilter: 'month',
        limit: 100,
        subreddit: 'all'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Reddit data');
    }

    const data = await response.json();
    
    // Extract trending topics from posts
    const trendingTopics = extractTrendingTopics(data.posts || []);
    
    return {
      totalMentions: data.totalMentions || 0,
      sentimentScore: data.sentiment?.score || 0,
      trendingTopics: trendingTopics.slice(0, 4),
      recentPosts: data.posts?.length || 0,
      sentimentBreakdown: data.sentiment || { positive: 0, neutral: 0, negative: 0 },
      topPosts: data.posts?.slice(0, 3).map(post => ({
        title: post.title,
        score: post.score,
        url: post.permalink,
        created: post.created
      })) || []
    };
  } catch (error) {
    console.error('Error fetching Reddit sentiment:', error);
    // Return fallback data
    return {
      totalMentions: 0,
      sentimentScore: 0,
      trendingTopics: [],
      recentPosts: 0,
      error: error.message
    };
  }
};

// Helper function to extract trending topics from Reddit posts
const extractTrendingTopics = (posts) => {
  if (!posts || posts.length === 0) return [];
  
  const topicCounts = new Map();
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
  
  posts.forEach(post => {
    const words = `${post.title} ${post.selftext || ''}`.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3 && !commonWords.has(word));
    
    words.forEach(word => {
      topicCounts.set(word, (topicCounts.get(word) || 0) + 1);
    });
  });
  
  return Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic]) => topic);
};

// Fetch multiple competitor info for comparison
export const fetchCompetitorInfo = async (appIds) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/competitors/info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appIds,
        country: 'us'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch competitor info');
    }

    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error fetching competitor info:', error);
    return {};
  }
};

// Compare specific features across competitors
export const compareFeatures = async (currentApp, competitors) => {
  const ai = initializeGemini();
  if (!ai) {
    throw new Error('Gemini API key not configured');
  }

  const model = ai.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `
    Compare key automotive app features for ${currentApp} against these competitors: ${competitors.join(', ')}.
    
    Focus on:
    1. Remote vehicle control (start, lock/unlock, climate)
    2. Vehicle status monitoring (fuel/charge, location, diagnostics)
    3. Navigation and trip planning
    4. Maintenance scheduling and alerts
    5. Connected services (WiFi hotspot, emergency services)
    6. EV-specific features (charging status, station finder)
    7. User experience and app performance
    
    Provide a feature comparison matrix and identify unique features for each competitor.
    
    Format as JSON with keys: 
    - featureMatrix (object with features as keys and competitors as sub-keys with boolean values)
    - uniqueFeatures (object with competitor names as keys and array of unique features as values)
    - recommendations (array of features currentApp should consider adding)
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return null;
  } catch (error) {
    console.error('Error comparing features:', error);
    throw error;
  }
};

// Get trending topics across competitors
export const getCompetitorTrendingTopics = async (appNames) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/competitors/trending`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appNames,
        options: {
          timeFilter: 'month',
          limit: 200
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch trending topics');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching trending topics:', error);
    return { topics: [], totalPosts: 0 };
  }
};

// Compare multiple competitors
export const compareCompetitors = async (appIds) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/competitors/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appIds,
        options: {
          countries: ['us'],
          reviewLimit: 50,
          redditTimeFilter: 'month',
          includeReviews: true,
          includeReddit: true
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to compare competitors');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error comparing competitors:', error);
    return { comparisons: {}, rankings: {}, errors: {} };
  }
};

// Generate competitive intelligence report
export const generateCompetitiveReport = async (currentApp, competitorData, timeRange = '6months') => {
  const ai = initializeGemini();
  if (!ai) {
    throw new Error('Gemini API key not configured');
  }

  const model = ai.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `
    Generate an executive competitive intelligence report for ${currentApp} in the automotive app market.
    
    Competitors analyzed: ${Object.values(competitorData).map(d => d.name).join(', ')}
    Time period: ${timeRange}
    
    Include:
    1. Executive Summary
    2. Market Overview and Trends
    3. Competitive Positioning
    4. SWOT Analysis
    5. Key Performance Metrics Comparison
    6. Customer Sentiment Analysis
    7. Feature Gap Analysis
    8. Strategic Recommendations
    9. Action Items with Priority Levels
    
    Make it concise but comprehensive, suitable for executive presentation.
    
    Format as structured JSON with clear sections.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return null;
  } catch (error) {
    console.error('Error generating competitive report:', error);
    throw error;
  }
};

// Answer competitive questions using AI
export const answerCompetitiveQuestion = async (question, context) => {
  const ai = initializeGemini();
  if (!ai) {
    throw new Error('Gemini API key not configured');
  }

  const model = ai.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `
    You are an automotive industry analyst specializing in digital services and mobile applications.
    
    Context:
    - Analyzing automotive OEM mobile applications
    - Competitors being compared: ${context.competitors}
    - Available data includes app ratings, review counts, sentiment scores, and market positioning
    
    User Question: ${question}
    
    Provide a detailed, data-driven answer focusing on:
    1. Specific insights about the automotive app market
    2. Competitive advantages and disadvantages
    3. Industry trends and best practices
    4. Actionable recommendations
    
    Keep the response professional but conversational, suitable for product managers and executives.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error answering competitive question:', error);
    throw error;
  }
};

// Get comprehensive competitive data for all tabs using Gemini 2.0 Flash
export const getComprehensiveCompetitiveData = async (selectedCompetitors, userApp, analysisType) => {
  try {
    console.log('🔍 Fetching comprehensive competitive data for:', analysisType);
    
    // Get deep OEM analysis from Gemini 2.0 Flash
    const deepAnalysis = await performDeepOEMAnalysis(selectedCompetitors, userApp, analysisType);
    
    if (deepAnalysis.success && deepAnalysis.data) {
      return {
        success: true,
        data: deepAnalysis.data,
        type: analysisType
      };
    }
    
    // Fallback to generating metrics if deep analysis fails
    const metrics = await generateCompetitiveMetrics(selectedCompetitors, analysisType);
    return {
      success: true,
      data: metrics,
      type: analysisType
    };
    
  } catch (error) {
    console.error('Error getting comprehensive competitive data:', error);
    return {
      success: false,
      error: error.message,
      type: analysisType
    };
  }
};

// Fetch real-time competitive metrics for charts
export const fetchRealTimeMetrics = async (selectedCompetitors, metricType) => {
  try {
    console.log('📊 Fetching real-time metrics for:', metricType);
    
    // Use Gemini 2.0 Flash to generate realistic competitive metrics
    const metrics = await generateCompetitiveMetrics(
      selectedCompetitors.map(c => ({ name: c.name })), 
      metricType
    );
    
    return {
      success: true,
      data: metrics,
      type: metricType
    };
    
  } catch (error) {
    console.error('Error fetching real-time metrics:', error);
    return {
      success: false,
      error: error.message,
      type: metricType
    };
  }
};