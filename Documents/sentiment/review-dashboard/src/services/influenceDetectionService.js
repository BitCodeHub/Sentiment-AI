import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini with API key
const apiKey = import.meta.env?.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Reddit RSS endpoints
const REDDIT_ENDPOINTS = {
  search: (keywords, timeframe = 'week') => 
    `https://www.reddit.com/search.rss?q=${encodeURIComponent(keywords)}&sort=new&t=${timeframe}`,
  subredditSearch: (sub, query) => 
    `https://www.reddit.com/r/${sub}/search.rss?q=${encodeURIComponent(query)}&restrict_sr=on&sort=new`,
  subredditFeed: (sub) => 
    `https://www.reddit.com/r/${sub}/.rss`
};

// HackerNews API endpoints
const HN_ENDPOINTS = {
  search: (query) => 
    `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=20`,
  searchByDate: (query) => 
    `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=20`
};

// Cosine similarity threshold for phrase matching
const SIMILARITY_THRESHOLD = 0.78;

// Timing windows for influence detection (in hours)
const TIMING_WINDOWS = {
  min: 2,
  max: 72,
  optimal_min: 6,
  optimal_max: 36
};

// Parse RSS feed data
async function parseRSSFeed(url) {
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    // Parse RSS XML
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');
    
    const items = [];
    const entries = doc.querySelectorAll('item, entry');
    
    entries.forEach(entry => {
      const title = entry.querySelector('title')?.textContent || '';
      const link = entry.querySelector('link')?.textContent || '';
      const description = entry.querySelector('description, content')?.textContent || '';
      const pubDate = entry.querySelector('pubDate, published')?.textContent || '';
      
      items.push({
        title,
        link,
        description: stripHtml(description),
        publishedAt: new Date(pubDate),
        source: 'reddit'
      });
    });
    
    return items;
  } catch (error) {
    console.error('Error parsing RSS feed:', error);
    return [];
  }
}

// Fetch HackerNews posts
async function fetchHackerNewsPosts(query) {
  try {
    const response = await fetch(HN_ENDPOINTS.searchByDate(query));
    const data = await response.json();
    
    return data.hits.map(hit => ({
      title: hit.title,
      link: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      description: hit.title, // HN doesn't provide descriptions in search
      publishedAt: new Date(hit.created_at),
      source: 'hackernews',
      points: hit.points,
      num_comments: hit.num_comments
    }));
  } catch (error) {
    console.error('Error fetching HackerNews posts:', error);
    return [];
  }
}

// Strip HTML tags from content
function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// Calculate cosine similarity between two text embeddings
async function calculateSimilarity(text1, text2) {
  if (!genAI) return 0;
  
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'models/text-embedding-004'
    });
    
    // Get embeddings for both texts
    const [embedding1, embedding2] = await Promise.all([
      model.embedContent(text1),
      model.embedContent(text2)
    ]);
    
    // Calculate cosine similarity
    const vec1 = embedding1.embedding.values;
    const vec2 = embedding2.embedding.values;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  } catch (error) {
    console.error('Error calculating similarity:', error);
    return 0;
  }
}

// Extract n-grams from text
function extractNGrams(text, n = 3) {
  const words = text.toLowerCase().split(/\s+/);
  const ngrams = [];
  
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '));
  }
  
  return ngrams;
}

// Find rare term overlaps
function findRareTermOverlap(text1, text2, reviewCorpus) {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  // Build term frequency map from corpus
  const termFreq = {};
  reviewCorpus.forEach(review => {
    const words = (review.content || review.Review || '').toLowerCase().split(/\s+/);
    words.forEach(word => {
      termFreq[word] = (termFreq[word] || 0) + 1;
    });
  });
  
  // Find rare overlapping terms
  const rareOverlaps = [];
  const overlap = [...words1].filter(word => words2.has(word));
  
  overlap.forEach(word => {
    const freq = termFreq[word] || 0;
    if (freq < 5 && word.length > 3) { // Rare term threshold
      rareOverlaps.push({ term: word, frequency: freq });
    }
  });
  
  return rareOverlaps;
}

// Check timing window for influence
function checkTimingWindow(reviewDate, threadDate) {
  const hoursDiff = (reviewDate - threadDate) / (1000 * 60 * 60);
  
  if (hoursDiff < TIMING_WINDOWS.min || hoursDiff > TIMING_WINDOWS.max) {
    return { inWindow: false, weight: 0 };
  }
  
  // Higher weight for optimal timing window
  const weight = (hoursDiff >= TIMING_WINDOWS.optimal_min && hoursDiff <= TIMING_WINDOWS.optimal_max)
    ? 1.0
    : 0.7;
    
  return { inWindow: true, weight, hoursDiff };
}

// Perform counterfactual analysis
function performCounterfactualAnalysis(reviewData, theme, eventDate) {
  // Define control period (14 days before event)
  const controlStart = new Date(eventDate);
  controlStart.setDate(controlStart.getDate() - 14);
  const controlEnd = new Date(eventDate);
  controlEnd.setDate(controlEnd.getDate() - 1);
  
  // Define event period (3 days after event)
  const eventStart = new Date(eventDate);
  const eventEnd = new Date(eventDate);
  eventEnd.setDate(eventEnd.getDate() + 3);
  
  // Count theme occurrences in each period
  let controlCount = 0;
  let eventCount = 0;
  
  reviewData.forEach(review => {
    const reviewDate = new Date(review.date || review.Date || review['Review Date']);
    const content = (review.content || review.Review || '').toLowerCase();
    
    if (content.includes(theme.toLowerCase())) {
      if (reviewDate >= controlStart && reviewDate <= controlEnd) {
        controlCount++;
      } else if (reviewDate >= eventStart && reviewDate <= eventEnd) {
        eventCount++;
      }
    }
  });
  
  // Calculate spike factor
  const avgControlDaily = controlCount / 14;
  const avgEventDaily = eventCount / 3;
  const spikeFactor = avgControlDaily > 0 ? avgEventDaily / avgControlDaily : eventCount;
  
  return {
    controlCount,
    eventCount,
    avgControlDaily,
    avgEventDaily,
    spikeFactor,
    isSignificant: spikeFactor >= 3
  };
}

// Main influence detection function
export async function detectInfluence(reviewData, keywords, appName) {
  const influences = {
    reddit: [],
    hackernews: [],
    summary: {},
    timeline: []
  };
  
  try {
    // Search Reddit and HackerNews
    const searchQuery = `${keywords} ${appName}`.trim();
    
    const [redditPosts, hnPosts] = await Promise.all([
      parseRSSFeed(REDDIT_ENDPOINTS.search(searchQuery)),
      fetchHackerNewsPosts(searchQuery)
    ]);
    
    // Analyze each review for influence
    for (const review of reviewData) {
      const reviewContent = review.content || review.Review || '';
      const reviewDate = new Date(review.date || review.Date || review['Review Date']);
      
      if (!reviewContent || isNaN(reviewDate.getTime())) continue;
      
      // Check Reddit posts
      for (const post of redditPosts) {
        const influenceScore = await analyzeInfluence(
          review, 
          post, 
          reviewData,
          'reddit'
        );
        
        if (influenceScore.total > 0.6) {
          influences.reddit.push({
            review,
            post,
            score: influenceScore,
            timestamp: reviewDate
          });
        }
      }
      
      // Check HackerNews posts
      for (const post of hnPosts) {
        const influenceScore = await analyzeInfluence(
          review, 
          post, 
          reviewData,
          'hackernews'
        );
        
        if (influenceScore.total > 0.6) {
          influences.hackernews.push({
            review,
            post,
            score: influenceScore,
            timestamp: reviewDate
          });
        }
      }
    }
    
    // Build timeline of influences
    const allInfluences = [...influences.reddit, ...influences.hackernews];
    influences.timeline = allInfluences
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(inf => ({
        date: inf.timestamp.toISOString(),
        source: inf.post.source,
        postTitle: inf.post.title,
        postUrl: inf.post.link,
        reviewExcerpt: inf.review.content.substring(0, 100) + '...',
        influenceScore: inf.score.total,
        factors: inf.score
      }));
    
    // Generate summary
    influences.summary = {
      totalInfluencedReviews: allInfluences.length,
      redditInfluences: influences.reddit.length,
      hackerNewsInfluences: influences.hackernews.length,
      strongestInfluence: allInfluences.reduce((max, inf) => 
        inf.score.total > (max?.score.total || 0) ? inf : max, 
        null
      ),
      timelineSpan: allInfluences.length > 0 ? {
        start: new Date(Math.min(...allInfluences.map(inf => inf.timestamp))),
        end: new Date(Math.max(...allInfluences.map(inf => inf.timestamp)))
      } : null
    };
    
  } catch (error) {
    console.error('Error detecting influence:', error);
  }
  
  return influences;
}

// Analyze influence between review and post
async function analyzeInfluence(review, post, reviewCorpus, source) {
  const reviewContent = review.content || review.Review || '';
  const postContent = `${post.title} ${post.description}`;
  const reviewDate = new Date(review.date || review.Date || review['Review Date']);
  
  const scores = {
    urlAttribution: 0,
    phraseSimilarity: 0,
    ngramOverlap: 0,
    rareTerms: 0,
    timingWindow: 0,
    counterfactual: 0,
    total: 0
  };
  
  // 1. URL/link attribution
  if (reviewContent.includes(post.link) || reviewContent.includes(source)) {
    scores.urlAttribution = 1.0;
  }
  
  // 2. Phrase similarity
  const similarity = await calculateSimilarity(reviewContent, postContent);
  if (similarity > SIMILARITY_THRESHOLD) {
    scores.phraseSimilarity = similarity;
  }
  
  // 3. N-gram overlap
  const reviewNGrams = new Set(extractNGrams(reviewContent));
  const postNGrams = new Set(extractNGrams(postContent));
  const ngramOverlap = [...reviewNGrams].filter(ng => postNGrams.has(ng)).length;
  scores.ngramOverlap = Math.min(ngramOverlap / 10, 1.0); // Normalize
  
  // 4. Rare term overlap
  const rareTerms = findRareTermOverlap(reviewContent, postContent, reviewCorpus);
  scores.rareTerms = Math.min(rareTerms.length * 0.3, 1.0); // Weight rare terms
  
  // 5. Timing window
  const timing = checkTimingWindow(reviewDate, post.publishedAt);
  if (timing.inWindow) {
    scores.timingWindow = timing.weight;
  }
  
  // 6. Counterfactual check
  const mainTheme = extractMainTheme(postContent);
  const counterfactual = performCounterfactualAnalysis(
    reviewCorpus, 
    mainTheme, 
    post.publishedAt
  );
  if (counterfactual.isSignificant) {
    scores.counterfactual = Math.min(counterfactual.spikeFactor / 5, 1.0);
  }
  
  // Calculate total score (weighted average)
  const weights = {
    urlAttribution: 2.0,
    phraseSimilarity: 1.5,
    ngramOverlap: 1.0,
    rareTerms: 1.5,
    timingWindow: 1.0,
    counterfactual: 1.2
  };
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  Object.entries(scores).forEach(([key, value]) => {
    if (key !== 'total' && weights[key]) {
      weightedSum += value * weights[key];
      totalWeight += weights[key];
    }
  });
  
  scores.total = weightedSum / totalWeight;
  
  return scores;
}

// Extract main theme from text
function extractMainTheme(text) {
  // Simple keyword extraction - could be enhanced with NLP
  const words = text.toLowerCase().split(/\s+/)
    .filter(word => word.length > 4)
    .filter(word => !['about', 'their', 'there', 'where', 'which'].includes(word));
  
  // Count word frequencies
  const freq = {};
  words.forEach(word => {
    freq[word] = (freq[word] || 0) + 1;
  });
  
  // Return most frequent meaningful word
  return Object.entries(freq)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || '';
}

// Search for web influence with Google grounding
export async function searchWebInfluence(query, reviewData) {
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }
  
  try {
    // Initialize model with grounding
    const model = genAI.getGenerativeModel({ 
      model: 'models/gemini-1.5-flash',
      tools: [{
        googleSearchRetrieval: {
          dynamicRetrievalConfig: {
            mode: "MODE_DYNAMIC",
            dynamicThreshold: 0.3
          }
        }
      }]
    });
    
    // Build context from recent reviews
    const recentReviews = reviewData
      .sort((a, b) => new Date(b.date || b.Date) - new Date(a.date || a.Date))
      .slice(0, 20)
      .map(r => ({
        date: r.date || r.Date,
        rating: r.rating || r.Rating,
        excerpt: (r.content || r.Review || '').substring(0, 150)
      }));
    
    const prompt = `
    Analyze the following customer review spike and search for related discussions on Reddit, HackerNews, Twitter, or tech forums:
    
    Query: ${query}
    
    Recent Reviews Context:
    ${JSON.stringify(recentReviews, null, 2)}
    
    Please:
    1. Search for relevant online discussions that might have influenced these reviews
    2. Look for viral posts, threads, or tweets about the issues mentioned
    3. Identify any major incidents or outages being discussed
    4. Find the original source and timing of any influence
    5. Provide direct links to the sources you find
    
    Format your response with clear citations and links to sources.
    `;
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    
    return {
      analysis: response.text(),
      sources: extractSourcesFromResponse(response.text())
    };
    
  } catch (error) {
    console.error('Error with Google grounding search:', error);
    throw error;
  }
}

// Extract sources from Gemini's grounded response
function extractSourcesFromResponse(responseText) {
  const sources = [];
  
  // Extract URLs using regex
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
  const urls = responseText.match(urlRegex) || [];
  
  // Extract Reddit/HN specific patterns
  const redditPattern = /reddit\.com\/r\/\w+\/comments\/\w+/g;
  const hnPattern = /news\.ycombinator\.com\/item\?id=\d+/g;
  
  urls.forEach(url => {
    let type = 'other';
    if (url.includes('reddit.com')) type = 'reddit';
    else if (url.includes('ycombinator.com')) type = 'hackernews';
    else if (url.includes('twitter.com') || url.includes('x.com')) type = 'twitter';
    
    sources.push({
      url,
      type,
      timestamp: new Date() // Would be parsed from actual content
    });
  });
  
  return sources;
}

// Monitor for real-time influence
export async function monitorRealTimeInfluence(appName, keywords, callback) {
  const checkInterval = 30 * 60 * 1000; // 30 minutes
  
  const monitor = async () => {
    try {
      // Search for recent mentions
      const searchQuery = `${appName} ${keywords.join(' ')}`;
      
      const [redditPosts, hnPosts] = await Promise.all([
        parseRSSFeed(REDDIT_ENDPOINTS.search(searchQuery, 'day')),
        fetchHackerNewsPosts(searchQuery)
      ]);
      
      // Filter for high-engagement posts
      const viralCandidates = [];
      
      hnPosts.forEach(post => {
        if (post.points > 100 || post.num_comments > 50) {
          viralCandidates.push({
            ...post,
            viralScore: post.points + (post.num_comments * 2)
          });
        }
      });
      
      // Reddit doesn't provide engagement in RSS, so check recency
      const recentReddit = redditPosts.filter(post => {
        const hoursSince = (Date.now() - post.publishedAt) / (1000 * 60 * 60);
        return hoursSince < 24;
      });
      
      if (viralCandidates.length > 0 || recentReddit.length > 0) {
        callback({
          timestamp: new Date(),
          viralPosts: viralCandidates,
          recentDiscussions: recentReddit,
          alert: viralCandidates.length > 0 ? 'VIRAL_CONTENT_DETECTED' : 'RECENT_DISCUSSIONS'
        });
      }
    } catch (error) {
      console.error('Error monitoring influence:', error);
    }
  };
  
  // Run immediately and then periodically
  monitor();
  const intervalId = setInterval(monitor, checkInterval);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
}