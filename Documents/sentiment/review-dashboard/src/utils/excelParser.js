import * as XLSX from 'xlsx';
import Sentiment from 'sentiment';

const sentiment = new Sentiment();

export const parseExcelFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Process and enhance the data
        const processedData = processReviewData(jsonData);
        
        resolve(processedData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

const processReviewData = (rawData) => {
  console.log('Processing review data...', rawData.length, 'rows');
  
  if (rawData[0]) {
    const columns = Object.keys(rawData[0]);
    console.log('Detected columns:', columns);
    
    // Check for sentiment column
    const sentimentColumn = columns.find(col => 
      col.toLowerCase().includes('sentiment') || 
      col.toLowerCase() === 'sentiment'
    );
    
    if (sentimentColumn) {
      console.log('✅ Found existing sentiment column:', sentimentColumn);
      console.log('Sample sentiment values:', rawData.slice(0, 5).map(row => row[sentimentColumn]));
    } else {
      console.log('ℹ️ No sentiment column found - will perform sentiment analysis');
    }
    
    // Log device and OS columns for debugging
    const deviceColumns = columns.filter(col => 
      col.toLowerCase().includes('device') || 
      col.toLowerCase().includes('model') ||
      col.toLowerCase().includes('hardware')
    );
    
    const osColumns = columns.filter(col => 
      col.toLowerCase().includes('os') || 
      col.toLowerCase().includes('operating') ||
      col.toLowerCase().includes('system') ||
      col.toLowerCase() === 'os'
    );
    
    console.log('Device-related columns found:', deviceColumns);
    console.log('OS-related columns found:', osColumns);
  }
  
  return rawData.map((row, index) => {
    // Enhanced column mapping for App Store and Google Play exports
    const review = {
      id: index,
      // Rating variations: Apple uses "Rating", Google might use "Star Rating"
      rating: parseInt(
        row.Rating || 
        row['Star Rating'] || 
        row.Star || 
        row.Stars || 
        row.Score || 
        row['App Store Rating'] ||
        row['User Rating'] ||
        0
      ),
      // Title variations
      title: row.Title || 
             row['Review Title'] || 
             row['App Store Review Title'] ||
             row.Subject ||
             '',
      // Content variations - priority order for different export formats
      content: row.Body || 
               row.Review || 
               row['Review Text'] || 
               row.Content || 
               row.Text || 
               row['App Store Review'] ||
               row['Review Content'] ||
               row.Message ||
               '',
      body: row.Body || row['Review Text'] || '', // Explicitly capture Body column
      // Author variations
      author: row.Author || 
              row.User || 
              row['User Name'] || 
              row.Reviewer || 
              row['Review Author'] ||
              row.Username ||
              'Anonymous',
      // Date variations
      date: parseDate(
        row.Date || 
        row['Review Date'] || 
        row['Submitted Date'] ||
        row.Created || 
        row.Timestamp ||
        row['App Store Date'] ||
        row['Review Submitted'] ||
        new Date()
      ),
      // Version variations  
      version: row.Version || 
               row['App Version'] || 
               row['Application Version'] ||
               row['App Store Version'] ||
               '',
      // Device variations - enhanced extraction
      device: extractDevice(row) || 
              row.Device || 
              row['Device Model'] || 
              row['Device Type'] ||
              row.Hardware ||
              row['Device Name'] ||
              row['User Device'] ||
              row['Review Device'] ||
              '',
      // Platform detection enhanced
      platform: row.Platform || 
                 row.Store ||
                 row.Source ||
                 detectPlatform(row),
      // OS variations - enhanced extraction
      os: extractOS(row) || 
          row.OS || 
          row['Operating System'] || 
          row['OS Version'] ||
          row['System Version'] ||
          row['iOS Version'] ||
          row['Android Version'] ||
          row['System'] ||
          '',
      // Developer response variations
      response: row.Response || 
                row['Developer Response'] || 
                row['App Store Response'] ||
                row.Reply ||
                '',
      // Location variations
      country: row.Country || 
               row.Territory || 
               row.Region ||
               row.Location ||
               'Unknown',
      // Language variations
      language: row.Language || 
                row.Locale ||
                row['Review Language'] ||
                'English',
      // App name variations
      appName: row['App Name'] || 
               row.App || 
               row.Application ||
               row['Application Name'] ||
               row['Product Name'] ||
               row.Product ||
               row['App Title'] ||
               row['App'] ||
               '',
      ...row // Include all original fields for debugging
    };
    
    // Handle sentiment data - prioritize existing sentiment column
    const existingSentiment = row.Sentiment || 
                              row.sentiment || 
                              row['Sentiment'] ||
                              row['Review Sentiment'] ||
                              row['App Store Sentiment'] ||
                              null;
    
    if (existingSentiment) {
      // Normalize sentiment values from the Excel file
      const normalizedSentiment = normalizeSentimentValue(existingSentiment);
      review.sentiment = normalizedSentiment;
      
      // Assign sentiment scores based on the provided sentiment
      review.sentimentScore = getSentimentScore(normalizedSentiment);
      review.positiveWords = [];
      review.negativeWords = [];
      
      // Debug logging for existing sentiment
      if (index < 5) {
        console.log(`Using existing sentiment for review ${index}:`, {
          originalSentiment: existingSentiment,
          normalizedSentiment: normalizedSentiment,
          sentimentScore: review.sentimentScore,
          content: (review.content || '').substring(0, 100)
        });
      }
    } else {
      // Perform sentiment analysis if not provided
      const content = review.content || review.body || '';
      if (content.trim().length > 0) {
        const sentimentResult = sentiment.analyze(content);
        review.sentimentScore = sentimentResult.score;
        review.sentiment = categorizeSentiment(sentimentResult.score, review.rating);
        review.positiveWords = sentimentResult.positive || [];
        review.negativeWords = sentimentResult.negative || [];
        
        // Debug logging for sentiment analysis
        if (index < 5) {
          console.log(`Analyzed sentiment for review ${index}:`, {
            content: content.substring(0, 100),
            rating: review.rating,
            sentimentScore: review.sentimentScore,
            sentiment: review.sentiment,
            positiveWords: review.positiveWords,
            negativeWords: review.negativeWords
          });
        }
      } else {
        // Fallback to rating-based sentiment if no content
        review.sentimentScore = 0;
        review.sentiment = categorizeSentiment(0, review.rating);
        review.positiveWords = [];
        review.negativeWords = [];
      }
    }
    
    // Extract keywords and categories from available content
    const textContent = review.content || review.body || review.title || '';
    review.keywords = extractKeywords(textContent);
    review.category = categorizeReview(textContent);
    
    // Debug logging for first few reviews to check device/OS extraction
    if (index < 3) {
      console.log(`Review ${index + 1} device/OS info:`, {
        device: review.device,
        os: review.os,
        platform: review.platform,
        originalDevice: row.Device || row['Device Model'] || row['Device Type'],
        originalOS: row.OS || row['Operating System'] || row['OS Version']
      });
    }
    
    return review;
  });
};

const parseDate = (dateValue) => {
  if (!dateValue) return new Date();
  
  // Handle Excel serial date
  if (typeof dateValue === 'number') {
    return new Date((dateValue - 25569) * 86400 * 1000);
  }
  
  // Try to parse string date
  const parsed = new Date(dateValue);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

// Extract device information from various fields
const extractDevice = (row) => {
  // Check direct device fields - include all variations
  const directDevice = row.Device || 
                      row['Device Model'] || 
                      row['Device Type'] || 
                      row['Device Name'] || 
                      row.Model || 
                      row.Hardware || 
                      '';
  if (directDevice && directDevice.trim()) return directDevice.trim();
  
  // Try to extract from user agent or other fields
  const userAgent = row['User Agent'] || row.UserAgent || row['Browser Info'] || '';
  if (userAgent) {
    // Extract device from user agent
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('iPod')) return 'iPod';
    
    // Android devices
    const androidMatch = userAgent.match(/\((.*?)\)/);
    if (androidMatch && userAgent.includes('Android')) {
      const deviceInfo = androidMatch[1];
      const deviceParts = deviceInfo.split(';');
      for (let part of deviceParts) {
        const trimmed = part.trim();
        if (trimmed && !trimmed.includes('Android') && !trimmed.includes('Build')) {
          return trimmed;
        }
      }
    }
  }
  
  // Check metadata fields
  const metadata = row.Metadata || row['Review Metadata'] || '';
  if (metadata && typeof metadata === 'string') {
    const deviceMatch = metadata.match(/device[:\s]+([^,;\n]+)/i);
    if (deviceMatch) return deviceMatch[1].trim();
  }
  
  // Platform-based inference
  const platform = row.Platform || row.Store || '';
  if (platform.toLowerCase().includes('ios') || platform.toLowerCase().includes('apple')) {
    // Try to get specific iOS device from other fields
    const content = (row.Body || row.Review || row['Review Text'] || '').toLowerCase();
    if (content.includes('ipad')) return 'iPad';
    if (content.includes('iphone')) return 'iPhone';
    return 'iOS Device';
  }
  
  if (platform.toLowerCase().includes('android') || platform.toLowerCase().includes('google')) {
    return 'Android Device';
  }
  
  return '';
};

// Extract OS information from various fields
const extractOS = (row) => {
  // Check direct OS fields - include all variations
  const directOS = row.OS || 
                  row['Operating System'] || 
                  row['OS Version'] || 
                  row['System Version'] || 
                  row.Os || 
                  row.os || 
                  row.System || 
                  '';
  if (directOS && directOS.trim()) return directOS.trim();
  
  // Try to extract from user agent
  const userAgent = row['User Agent'] || row.UserAgent || row['Browser Info'] || '';
  if (userAgent) {
    // iOS version extraction
    const iosMatch = userAgent.match(/OS (\d+_\d+(?:_\d+)?)/);
    if (iosMatch) {
      return 'iOS ' + iosMatch[1].replace(/_/g, '.');
    }
    
    // Android version extraction
    const androidMatch = userAgent.match(/Android\s+(\d+\.?\d*)/);
    if (androidMatch) {
      return 'Android ' + androidMatch[1];
    }
  }
  
  // Check metadata fields
  const metadata = row.Metadata || row['Review Metadata'] || '';
  if (metadata && typeof metadata === 'string') {
    const osMatch = metadata.match(/os[:\s]+([^,;\n]+)/i);
    if (osMatch) return osMatch[1].trim();
    
    const versionMatch = metadata.match(/version[:\s]+([^,;\n]+)/i);
    if (versionMatch && !versionMatch[1].includes('.')) {
      return versionMatch[1].trim();
    }
  }
  
  // Platform-based inference
  const platform = row.Platform || row.Store || detectPlatform(row);
  const device = extractDevice(row);
  
  if (platform === 'iOS' || device.includes('iPhone') || device.includes('iPad')) {
    // Try to extract iOS version from review content
    const content = (row.Body || row.Review || row['Review Text'] || '').toLowerCase();
    const iosVersionMatch = content.match(/ios\s*(\d+(?:\.\d+)?)/);
    if (iosVersionMatch) {
      return 'iOS ' + iosVersionMatch[1];
    }
    return 'iOS';
  }
  
  if (platform === 'Android' || device.includes('Android')) {
    const content = (row.Body || row.Review || row['Review Text'] || '').toLowerCase();
    const androidVersionMatch = content.match(/android\s*(\d+(?:\.\d+)?)/);
    if (androidVersionMatch) {
      return 'Android ' + androidVersionMatch[1];
    }
    return 'Android';
  }
  
  return '';
};

const detectPlatform = (row) => {
  // Try to detect platform from various fields
  const rowStr = JSON.stringify(row).toLowerCase();
  
  // Check for explicit platform indicators
  if (rowStr.includes('app store') || rowStr.includes('ios') || 
      rowStr.includes('iphone') || rowStr.includes('ipad') || 
      rowStr.includes('apple') || rowStr.includes('itunes')) {
    return 'iOS';
  } 
  
  if (rowStr.includes('google play') || rowStr.includes('android') || 
      rowStr.includes('google') || rowStr.includes('play store')) {
    return 'Android';
  }
  
  // Check device model indicators
  const deviceStr = (row.Device || row['Device Model'] || '').toLowerCase();
  if (deviceStr.includes('iphone') || deviceStr.includes('ipad') || 
      deviceStr.includes('ipod')) {
    return 'iOS';
  }
  
  if (deviceStr.includes('samsung') || deviceStr.includes('pixel') || 
      deviceStr.includes('lg') || deviceStr.includes('huawei') || 
      deviceStr.includes('oneplus') || deviceStr.includes('motorola')) {
    return 'Android';
  }
  
  // Check OS field
  const osStr = (row.OS || row['Operating System'] || '').toLowerCase();
  if (osStr.includes('ios') || (osStr.match(/^\d+\.\d+$/) && parseFloat(osStr) >= 13)) {
    return 'iOS';
  }
  
  if (osStr.includes('android') || (osStr.match(/^\d+\.\d+$/) && parseFloat(osStr) >= 10 && parseFloat(osStr) <= 15)) {
    return 'Android';
  }
  
  return 'Unknown';
};

const normalizeSentimentValue = (sentimentValue) => {
  if (!sentimentValue) return 'Neutral';
  
  const sentiment = sentimentValue.toString().toLowerCase().trim();
  
  // Handle various sentiment formats from different data sources
  if (sentiment.includes('positive') || sentiment.includes('pos') || 
      sentiment === 'good' || sentiment === 'happy' || sentiment === '1' ||
      sentiment.includes('favorable') || sentiment.includes('like')) {
    return 'Positive';
  }
  
  if (sentiment.includes('negative') || sentiment.includes('neg') || 
      sentiment === 'bad' || sentiment === 'angry' || sentiment === '-1' ||
      sentiment.includes('unfavorable') || sentiment.includes('dislike')) {
    return 'Negative';
  }
  
  if (sentiment.includes('neutral') || sentiment.includes('mixed') || 
      sentiment === 'okay' || sentiment === '0' || sentiment.includes('moderate')) {
    return 'Neutral';
  }
  
  // Default to neutral for unrecognized values
  console.warn('Unrecognized sentiment value:', sentimentValue, '- defaulting to Neutral');
  return 'Neutral';
};

const getSentimentScore = (normalizedSentiment) => {
  switch (normalizedSentiment) {
    case 'Positive': return 2;
    case 'Negative': return -2;
    case 'Neutral': return 0;
    default: return 0;
  }
};

const categorizeSentiment = (score, rating = null) => {
  // Use rating as fallback if sentiment score is 0 or very close to 0
  if (Math.abs(score) < 0.5 && rating !== null) {
    if (rating >= 4) return 'Positive';
    if (rating <= 2) return 'Negative';
    return 'Neutral';
  }
  
  // More nuanced sentiment thresholds
  if (score >= 1) return 'Positive';
  if (score <= -1) return 'Negative';
  if (score > 0) return 'Positive';
  if (score < 0) return 'Negative';
  return 'Neutral';
};

const extractKeywords = (text) => {
  if (!text || text.trim().length === 0) return [];
  
  // Enhanced keyword extraction - include shorter words for app reviews
  const commonStopWords = new Set([
    'the', 'and', 'but', 'for', 'are', 'was', 'were', 'been', 'have', 'has', 'had',
    'will', 'would', 'could', 'should', 'this', 'that', 'with', 'from', 'they',
    'them', 'their', 'what', 'when', 'where', 'why', 'how', 'all', 'any', 'both',
    'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 'can', 'don', 'now', 'did', 'get', 'may', 'new',
    'one', 'way', 'use', 'man', 'day', 'get', 'see', 'him', 'two', 'who', 'its',
    'said', 'each', 'make', 'most', 'over', 'said', 'some', 'time', 'very', 'when',
    'much', 'take', 'want', 'know', 'year', 'come', 'just', 'like', 'long', 'make',
    'take', 'than', 'well', 'were'
  ]);
  
  // Extract words (including 3+ character words for app reviews)
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3 && !commonStopWords.has(word))
    .filter(word => !/^\d+$/.test(word)); // Remove pure numbers
  
  // Count word frequency
  const wordFreq = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });
  
  // Return top keywords, but at least return something if we have any words
  const sortedWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
    
  return sortedWords.length > 0 ? sortedWords : ['general'];
};

const categorizeReview = (text) => {
  if (!text) return 'General';
  
  const lowercaseText = text.toLowerCase();
  
  // Bug-related keywords
  const bugKeywords = ['bug', 'crash', 'error', 'broken', 'fix', 'issue', 'problem', 'not working', 'doesn\'t work', 'glitch'];
  if (bugKeywords.some(keyword => lowercaseText.includes(keyword))) {
    return 'Bug Report';
  }
  
  // Feature request keywords
  const featureKeywords = ['add', 'feature', 'request', 'please', 'would be nice', 'suggestion', 'improve', 'enhancement'];
  if (featureKeywords.some(keyword => lowercaseText.includes(keyword))) {
    return 'Feature Request';
  }
  
  // Performance keywords
  const performanceKeywords = ['slow', 'lag', 'performance', 'speed', 'fast', 'loading'];
  if (performanceKeywords.some(keyword => lowercaseText.includes(keyword))) {
    return 'Performance';
  }
  
  // UI/UX keywords
  const uiKeywords = ['design', 'ui', 'ux', 'interface', 'layout', 'button', 'screen'];
  if (uiKeywords.some(keyword => lowercaseText.includes(keyword))) {
    return 'UI/UX';
  }
  
  return 'General';
};

export const aggregateData = (reviews) => {
  if (!reviews || reviews.length === 0) {
    console.error('No reviews to aggregate');
    return {
      summary: { totalReviews: 0, avgRating: 0, distribution: {} },
      reviews: [],
      sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
      ratingDistribution: {},
      sentimentDistribution: {},
      categoryDistribution: {},
      platformDistribution: {},
      timeSeriesData: [],
      topKeywords: [],
      responseRate: 0
    };
  }
  
  const totalReviews = reviews.length;
  const validRatings = reviews.filter(r => r.rating && r.rating > 0);
  const avgRating = validRatings.length > 0 
    ? validRatings.reduce((sum, r) => sum + r.rating, 0) / validRatings.length 
    : 0;
  
  // Debug device and OS data distribution
  const deviceCount = reviews.filter(r => r.device && r.device.trim()).length;
  const osCount = reviews.filter(r => r.os && r.os.trim()).length;
  console.log('Device/OS data coverage:', {
    totalReviews,
    reviewsWithDevice: deviceCount,
    devicePercentage: ((deviceCount / totalReviews) * 100).toFixed(1) + '%',
    reviewsWithOS: osCount,
    osPercentage: ((osCount / totalReviews) * 100).toFixed(1) + '%'
  });
  
  // Rating distribution
  const ratingDist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
  reviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingDist[r.rating]++;
    }
  });
  
  // Sentiment distribution
  const sentimentDist = {Positive: 0, Neutral: 0, Negative: 0};
  reviews.forEach(r => {
    if (r.sentiment && sentimentDist[r.sentiment] !== undefined) {
      sentimentDist[r.sentiment]++;
    } else {
      // Fallback to neutral if sentiment is missing or invalid
      sentimentDist.Neutral++;
    }
  });
  
  // Debug logging for sentiment distribution
  console.log('Sentiment Distribution Summary:', {
    total: reviews.length,
    distribution: sentimentDist,
    percentages: {
      positive: ((sentimentDist.Positive / reviews.length) * 100).toFixed(1) + '%',
      neutral: ((sentimentDist.Neutral / reviews.length) * 100).toFixed(1) + '%',
      negative: ((sentimentDist.Negative / reviews.length) * 100).toFixed(1) + '%'
    },
    sampleReviews: reviews.slice(0, 5).map(r => ({
      rating: r.rating,
      sentiment: r.sentiment,
      sentimentScore: r.sentimentScore,
      hasContent: !!(r.content || r.body),
      contentPreview: (r.content || r.body || '').substring(0, 50) + (r.content?.length > 50 ? '...' : '')
    }))
  });
  
  // Category distribution
  const categoryDist = {};
  reviews.forEach(r => {
    categoryDist[r.category] = (categoryDist[r.category] || 0) + 1;
  });
  
  // Platform distribution
  const platformDist = {};
  reviews.forEach(r => {
    platformDist[r.platform] = (platformDist[r.platform] || 0) + 1;
  });
  
  // Time series data (reviews per day)
  const timeSeriesData = {};
  reviews.forEach(r => {
    try {
      const reviewDate = r.date instanceof Date ? r.date : new Date(r.date);
      const dateKey = reviewDate.toISOString().split('T')[0];
      if (!timeSeriesData[dateKey]) {
        timeSeriesData[dateKey] = {
          date: dateKey,
          count: 0,
          avgRating: 0,
          ratings: [],
          sentiments: { Positive: 0, Neutral: 0, Negative: 0 }
        };
      }
      timeSeriesData[dateKey].count++;
      timeSeriesData[dateKey].ratings.push(r.rating);
      
      // Track sentiments per day
      if (r.sentiment && timeSeriesData[dateKey].sentiments[r.sentiment] !== undefined) {
        timeSeriesData[dateKey].sentiments[r.sentiment]++;
      } else {
        timeSeriesData[dateKey].sentiments.Neutral++;
      }
    } catch (error) {
      console.error('Error processing review date for time series:', error, r);
    }
  });
  
  // Calculate average ratings per day
  Object.values(timeSeriesData).forEach(day => {
    day.avgRating = day.ratings.reduce((sum, r) => sum + r, 0) / day.ratings.length;
  });
  
  // Get all keywords
  const allKeywords = {};
  reviews.forEach(r => {
    r.keywords.forEach(keyword => {
      allKeywords[keyword] = (allKeywords[keyword] || 0) + 1;
    });
  });
  
  // Top keywords
  const topKeywords = Object.entries(allKeywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));
  
  return {
    summary: {
      totalReviews,
      avgRating: parseFloat(avgRating.toFixed(2)),
      distribution: ratingDist,  // Add distribution to summary
      lastUpdated: new Date().toISOString()
    },
    ratingDistribution: ratingDist,
    sentimentDistribution: sentimentDist,
    sentimentBreakdown: {  // Add sentimentBreakdown with different naming
      positive: sentimentDist.Positive || 0,
      neutral: sentimentDist.Neutral || 0,
      negative: sentimentDist.Negative || 0
    },
    categoryDistribution: categoryDist,
    platformDistribution: platformDist,
    timeSeriesData: Object.values(timeSeriesData).sort((a, b) => new Date(a.date) - new Date(b.date)),
    topKeywords,
    reviews: reviews.sort((a, b) => b.date - a.date),
    // Add response rate calculation
    responseRate: Math.round((reviews.filter(r => r.response && r.response.trim().length > 0).length / totalReviews) * 100)
  };
};