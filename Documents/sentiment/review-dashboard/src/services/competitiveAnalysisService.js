import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiApiKey } from './geminiAIAnalysis';
import { automotiveOEMs } from '../data/automotiveOEMs';

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

// Get competitor app review data (simulated for now)
export const getCompetitorReviewData = async (oemId) => {
  // In a real implementation, this would fetch actual review data
  // from app stores and review aggregators
  
  const oem = automotiveOEMs.find(o => o.id === oemId);
  if (!oem) return null;
  
  // Simulate review data
  return {
    appRating: 3.5 + Math.random() * 1.5,
    totalReviews: Math.floor(10000 + Math.random() * 90000),
    recentReviews: Math.floor(100 + Math.random() * 900),
    sentimentBreakdown: {
      positive: Math.floor(40 + Math.random() * 30),
      neutral: Math.floor(20 + Math.random() * 20),
      negative: Math.floor(10 + Math.random() * 20)
    },
    topComplaints: [
      "App crashes frequently",
      "Login issues",
      "Slow performance",
      "Battery drain",
      "UI not intuitive"
    ].slice(0, Math.floor(2 + Math.random() * 3)),
    topPraises: [
      "Remote start works great",
      "Love the vehicle tracking",
      "Charging status is helpful",
      "Clean interface",
      "Regular updates"
    ].slice(0, Math.floor(2 + Math.random() * 3))
  };
};

// Get Reddit sentiment for competitors
export const getCompetitorRedditSentiment = async (oemName) => {
  // In a real implementation, this would fetch actual Reddit data
  // using the Reddit API through the backend
  
  return {
    totalMentions: Math.floor(50 + Math.random() * 450),
    sentimentScore: 0.3 + Math.random() * 0.6,
    trendingTopics: [
      `${oemName} app update`,
      `${oemName} connectivity issues`,
      `${oemName} vs competitors`,
      `${oemName} new features`
    ].slice(0, Math.floor(2 + Math.random() * 2)),
    recentPosts: Math.floor(5 + Math.random() * 20)
  };
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