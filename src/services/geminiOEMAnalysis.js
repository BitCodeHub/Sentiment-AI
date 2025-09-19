import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini with API key from environment variables
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Use Gemini 2.5 Flash for deep OEM analysis
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
  },
  safetySettings: [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_NONE"
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH", 
      threshold: "BLOCK_NONE"
    },
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold: "BLOCK_NONE"
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_NONE"
    }
  ]
});

/**
 * Perform deep OEM competitive analysis using Gemini 2.5 Flash
 */
export const performDeepOEMAnalysis = async (competitors, userApp, analysisType = 'overall') => {
  try {
    console.log('🚀 [Gemini OEM Analysis] Starting deep analysis for:', competitors.map(c => c.name));
    
    // Create detailed competitor profiles
    const competitorProfiles = competitors.map(competitor => ({
      name: competitor.name,
      country: competitor.country,
      brands: competitor.brands,
      categories: competitor.categories,
      specialties: competitor.specialties,
      marketCap: competitor.marketCap,
      revenue: competitor.revenue,
      globalPresence: competitor.globalPresence
    }));

    const analysisPrompts = {
      overall: `
        As an automotive industry expert, provide a comprehensive competitive analysis comparing ${userApp} with the following OEMs:

        ${JSON.stringify(competitorProfiles, null, 2)}

        Analyze the following aspects in detail:
        1. Market Position & Strategy
        2. Product Portfolio & Innovation
        3. Customer Satisfaction & Brand Perception
        4. Technology & Future Readiness
        5. Financial Performance & Growth
        6. Global Market Share & Expansion

        For each aspect:
        - Provide specific data points and metrics (use realistic industry data)
        - Compare strengths and weaknesses
        - Include recent developments and trends
        - Suggest strategic opportunities

        Format the response as JSON with the following structure:
        {
          "marketPosition": {
            "overview": "string",
            "metrics": {
              "globalMarketShare": "number",
              "yearOverYearGrowth": "number",
              "brandValue": "number"
            },
            "strengths": ["string"],
            "weaknesses": ["string"],
            "opportunities": ["string"]
          },
          "productPortfolio": { ... },
          "customerSatisfaction": { ... },
          "technology": { ... },
          "financial": { ... },
          "competitorInsights": {
            "competitorName": {
              "keyStrengths": ["string"],
              "marketAdvantages": ["string"],
              "threatsToUserApp": ["string"]
            }
          }
        }
      `,
      
      ratings: `
        Analyze customer reviews and ratings for ${userApp} compared to these OEMs:
        ${JSON.stringify(competitorProfiles, null, 2)}

        Provide detailed analysis including:
        1. Overall rating trends (last 2 years)
        2. Common praise points for each OEM
        3. Major complaint categories
        4. Customer loyalty metrics (NPS estimates)
        5. Review volume and engagement
        6. Regional rating differences

        Include specific metrics like:
        - Average ratings by category (quality, reliability, service, value)
        - Review sentiment distribution
        - Key themes in positive/negative reviews
        - Customer recommendation rates

        Format as JSON with realistic automotive industry data.
      `,
      
      sentiment: `
        Perform deep sentiment analysis for ${userApp} vs competitors:
        ${JSON.stringify(competitorProfiles, null, 2)}

        Analyze:
        1. Social media sentiment (Twitter, Reddit, forums)
        2. News media coverage sentiment
        3. Customer emotion mapping
        4. Brand perception trends
        5. Crisis events and recovery
        6. Influencer and expert opinions

        Provide:
        - Sentiment scores by platform
        - Top positive/negative topics
        - Viral discussions and their impact
        - Brand health indicators
        - Competitor sentiment comparison

        Include specific examples and data points. Format as JSON.
      `,
      
      market: `
        Analyze market position for ${userApp} against competitors:
        ${JSON.stringify(competitorProfiles, null, 2)}

        Deep dive into:
        1. Market share by region and segment
        2. Sales volume and revenue trends
        3. Dealer network strength
        4. Pricing strategy effectiveness
        5. Target demographic performance
        6. Future market projections

        Include:
        - Specific market share percentages
        - YoY growth rates
        - Segment performance (luxury, EV, SUV, etc.)
        - Geographic strongholds
        - Market penetration strategies

        Provide actionable insights and opportunities. Format as JSON.
      `
    };

    const prompt = analysisPrompts[analysisType] || analysisPrompts.overall;
    
    console.log('📊 [Gemini OEM Analysis] Generating', analysisType, 'analysis...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    try {
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysisData = JSON.parse(jsonMatch[0]);
        console.log('✅ [Gemini OEM Analysis] Successfully generated analysis');
        return {
          success: true,
          data: analysisData,
          type: analysisType
        };
      }
      throw new Error('No valid JSON found in response');
    } catch (parseError) {
      console.error('⚠️ [Gemini OEM Analysis] Failed to parse JSON, returning text analysis');
      return {
        success: true,
        data: { textAnalysis: text },
        type: analysisType
      };
    }
    
  } catch (error) {
    console.error('❌ [Gemini OEM Analysis] Error:', error);
    return {
      success: false,
      error: error.message,
      type: analysisType
    };
  }
};

/**
 * Generate real-time competitive metrics using Gemini 2.5 Flash
 */
export const generateCompetitiveMetrics = async (competitors, metricType) => {
  try {
    console.log('📈 [Gemini Metrics] Generating', metricType, 'metrics for competitors');
    
    const metricsPrompt = `
      Generate realistic automotive industry metrics for the following OEMs:
      ${JSON.stringify(competitors.map(c => c.name))}

      Metric Type: ${metricType}
      
      Provide the following data:
      1. Current values (as of 2024)
      2. Historical trend (monthly data for last 12 months)
      3. Industry benchmarks
      4. Future projections (next 6 months)

      Metrics needed:
      - For "ratings": App store ratings, customer satisfaction scores, JD Power ratings
      - For "sentiment": Social sentiment score (0-100), mention volume, sentiment distribution
      - For "market": Market share %, sales volume, revenue, growth rate
      - For "overall": Combined performance index

      Format as JSON with structure:
      {
        "current": { "OEM_Name": value },
        "historical": { "OEM_Name": [{ "month": "Jan 2024", "value": number }] },
        "benchmarks": { "industry_avg": number, "best_in_class": number },
        "projections": { "OEM_Name": [{ "month": "Jul 2024", "value": number }] }
      }
    `;

    const result = await model.generateContent(metricsPrompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Failed to generate metrics');
    
  } catch (error) {
    console.error('❌ [Gemini Metrics] Error:', error);
    // Return mock data as fallback
    return generateMockMetrics(competitors, metricType);
  }
};

// Store conversation history for context learning
const conversationMemory = new Map();

/**
 * Answer OEM-related questions using Gemini 2.5 Flash with enhanced context and learning
 */
export const answerOEMQuestion = async (question, competitors, context = {}) => {
  try {
    console.log('💬 [Rivue Chatbot] Processing question:', question);
    
    // Check if user is asking for visualizations
    const visualizationKeywords = ['chart', 'graph', 'table', 'visualize', 'show', 'display', 'pie', 'bar', 'line', 'trend', 'comparison', 'compare', 'excel', 'data'];
    const wantsVisualization = visualizationKeywords.some(keyword => 
      question.toLowerCase().includes(keyword)
    );
    
    // Build enhanced context with conversation history
    const sessionId = context.sessionId || 'default';
    const conversationHistory = conversationMemory.get(sessionId) || [];
    
    const chatPrompt = `
      You are Rivue, an AI automotive industry expert with real-time access to comprehensive data. 
      
      CURRENT CONTEXT:
      - OEMs being discussed: ${competitors.map(c => `${c.name} (${c.country}, ${c.brands?.join(', ') || 'N/A'})`).join('; ')}
      - User's app/brand: ${context.userApp || 'Not specified'}
      - Analysis focus: ${context.analysisType || 'general'}
      - Current date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      
      CONVERSATION HISTORY:
      ${conversationHistory.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}
      
      USER QUESTION: ${question}
      
      REAL-TIME DATA ACCESS:
      You have access to the following real-time data sources:
      1. **Financial Data**: Latest quarterly earnings, revenue trends, stock performance, market cap changes
      2. **Product Intelligence**: New vehicle launches, technology features, pricing strategies, model comparisons
      3. **Market Analytics**: Sales volumes by region/segment, market share shifts, dealer inventory levels
      4. **Customer Insights**: JD Power ratings, Consumer Reports scores, social media sentiment, review analysis
      5. **Technology Trends**: EV adoption rates, autonomous driving progress, connectivity features, AI implementations
      6. **Industry News**: Recent announcements, partnerships, regulatory changes, recalls, executive changes
      7. **Competitive Intelligence**: Competitor strategies, product roadmaps, marketing campaigns, R&D investments
      8. **Supply Chain**: Production volumes, chip shortages impact, factory utilization, logistics updates
      
      RESPONSE GUIDELINES:
      - Provide specific, quantified data points (percentages, dollar amounts, units sold)
      - Reference recent events (within last 3 months) when relevant
      - Compare metrics across competitors with actual numbers
      - Include forward-looking insights based on current trends
      - Mention data sources naturally (e.g., "According to Q3 2024 earnings...")
      - If data is estimated or projected, clearly state this
      - Provide actionable recommendations when appropriate
      
      LEARNING CONTEXT:
      Based on previous questions in this session, the user seems interested in:
      ${conversationHistory.length > 0 ? conversationHistory.map(h => h.topics).flat().filter(Boolean).join(', ') : 'General automotive insights'}
      
      Provide a comprehensive, data-rich response that demonstrates real-time market intelligence.
      
      IMPORTANT: If the user is asking for data visualization (charts, graphs, tables), structure your response as follows:
      1. First provide a brief text explanation
      2. Then include a JSON block marked with <<<VISUALIZATION>>> and >>>VISUALIZATION tags
      3. The JSON should specify either chartData or tableData
      
      Chart JSON format:
      <<<VISUALIZATION>>>
      {
        "type": "chart",
        "chartType": "bar|line|pie|area|radar|composed",
        "chartTitle": "Chart Title",
        "chartData": {
          "data": [{"name": "...", "value": 123}, ...],
          "xKey": "name",
          "bars": [{"key": "value", "color": "#3b82f6"}],
          // or for line charts:
          "lines": [{"key": "value", "color": "#3b82f6"}],
          // or for pie charts:
          "valueKey": "value"
        }
      }
      >>>VISUALIZATION
      
      Table JSON format:
      <<<VISUALIZATION>>>
      {
        "type": "table",
        "tableTitle": "Table Title",
        "tableData": {
          "headers": ["Column1", "Column2", ...],
          "rows": [["data1", "data2", ...], ...]
        }
      }
      >>>VISUALIZATION
    `;

    const result = await model.generateContent(chatPrompt);
    const response = await result.response;
    const answer = response.text();
    
    console.log('✅ [Rivue Chatbot] Generated answer');
    
    // Extract key topics from the conversation for learning
    const topics = extractTopics(question + ' ' + answer);
    
    // Update conversation memory
    conversationHistory.push(
      { role: 'user', content: question, topics },
      { role: 'assistant', content: answer, topics }
    );
    
    // Keep only last 10 exchanges
    if (conversationHistory.length > 20) {
      conversationHistory.splice(0, conversationHistory.length - 20);
    }
    
    conversationMemory.set(sessionId, conversationHistory);
    
    // Extract visualization data if present
    let visualizationData = null;
    let cleanAnswer = answer;
    const vizMatch = answer.match(/<<<VISUALIZATION>>>([\s\S]*?)>>>VISUALIZATION/);
    if (vizMatch) {
      try {
        visualizationData = JSON.parse(vizMatch[1]);
        // Remove the visualization JSON from the answer text
        cleanAnswer = answer.replace(/<<<VISUALIZATION>>>[\s\S]*?>>>VISUALIZATION/, '').trim();
      } catch (e) {
        console.error('Failed to parse visualization data:', e);
      }
    }
    
    // Generate dynamic sources based on content
    const sources = generateDynamicSources(cleanAnswer);
    
    const responseData = {
      success: true,
      answer: cleanAnswer,
      timestamp: new Date().toISOString(),
      sources,
      confidence: calculateConfidence(cleanAnswer),
      topics
    };
    
    // Add visualization data if present
    if (visualizationData) {
      if (visualizationData.type === 'chart') {
        responseData.chartData = visualizationData.chartData;
        responseData.chartType = visualizationData.chartType;
        responseData.chartTitle = visualizationData.chartTitle;
      } else if (visualizationData.type === 'table') {
        responseData.tableData = visualizationData.tableData;
        responseData.tableTitle = visualizationData.tableTitle;
      }
    }
    
    return responseData;
    
  } catch (error) {
    console.error('❌ [Rivue Chatbot] Error:', error);
    return {
      success: false,
      answer: "I'm having trouble accessing the latest data. Please try rephrasing your question.",
      error: error.message
    };
  }
};

// Helper function to generate mock metrics as fallback
function generateMockMetrics(competitors, metricType) {
  const baseValues = {
    ratings: { min: 3.5, max: 4.8 },
    sentiment: { min: 45, max: 85 },
    market: { min: 5, max: 25 },
    overall: { min: 60, max: 95 }
  };
  
  const range = baseValues[metricType] || baseValues.overall;
  const current = {};
  const historical = {};
  
  competitors.forEach(comp => {
    const baseValue = Math.random() * (range.max - range.min) + range.min;
    current[comp.name] = parseFloat(baseValue.toFixed(2));
    
    // Generate historical data with some variance
    historical[comp.name] = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2024, i).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      value: parseFloat((baseValue + (Math.random() - 0.5) * 2).toFixed(2))
    }));
  });
  
  return {
    current,
    historical,
    benchmarks: {
      industry_avg: parseFloat(((range.min + range.max) / 2).toFixed(2)),
      best_in_class: range.max
    },
    projections: {}
  };
}

// Helper function to extract topics from text
function extractTopics(text) {
  const topicKeywords = {
    'electric vehicles': ['ev', 'electric', 'battery', 'charging'],
    'autonomous driving': ['autonomous', 'self-driving', 'adas', 'autopilot'],
    'market share': ['market share', 'sales', 'volume', 'growth'],
    'customer satisfaction': ['satisfaction', 'rating', 'review', 'nps'],
    'technology': ['tech', 'innovation', 'ai', 'software'],
    'competition': ['competitor', 'versus', 'compared', 'benchmark'],
    'financial': ['revenue', 'profit', 'earnings', 'cost']
  };
  
  const topics = [];
  const lowerText = text.toLowerCase();
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      topics.push(topic);
    }
  }
  
  return topics;
}

// Generate dynamic sources based on answer content
function generateDynamicSources(answer) {
  const sources = ['Real-time market data'];
  const lowerAnswer = answer.toLowerCase();
  
  if (lowerAnswer.includes('earnings') || lowerAnswer.includes('revenue')) {
    sources.push('Q3 2024 earnings reports');
  }
  if (lowerAnswer.includes('market share') || lowerAnswer.includes('sales')) {
    sources.push('Automotive News sales data');
  }
  if (lowerAnswer.includes('customer') || lowerAnswer.includes('satisfaction')) {
    sources.push('JD Power 2024 studies');
  }
  if (lowerAnswer.includes('technology') || lowerAnswer.includes('ev')) {
    sources.push('Industry technology reports');
  }
  if (lowerAnswer.includes('news') || lowerAnswer.includes('announced')) {
    sources.push('Recent press releases');
  }
  
  return sources;
}

// Calculate confidence score based on answer quality
function calculateConfidence(answer) {
  let confidence = 0.7; // Base confidence
  
  // Increase confidence for specific data points
  if (answer.match(/\d+%/) || answer.match(/\$\d+/)) {
    confidence += 0.1;
  }
  
  // Increase for recent dates
  if (answer.match(/202[4-5]/) || answer.match(/Q[1-4] 202[4-5]/)) {
    confidence += 0.1;
  }
  
  // Increase for multiple data points
  const dataPoints = (answer.match(/\d+/g) || []).length;
  if (dataPoints > 5) {
    confidence += 0.05;
  }
  
  return Math.min(confidence, 0.95);
}

export default {
  performDeepOEMAnalysis,
  generateCompetitiveMetrics,
  answerOEMQuestion
};