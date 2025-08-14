import React, { useMemo, useState } from 'react';
import { Info, TrendingUp, TrendingDown, Sparkles, Star, AlertCircle, Clock, Filter } from 'lucide-react';
import './WordsAnalysis.css';

// Common stop words to exclude
const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not',
  'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from',
  'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would',
  'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which',
  'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
  'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see',
  'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think',
  'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well',
  'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most',
  'us', 'is', 'was', 'are', 'been', 'has', 'had', 'were', 'said', 'did', 'getting',
  'made', 'find', 'where', 'much', 'too', 'very', 'still', 'being', 'going', 'why',
  'before', 'never', 'here', 'more', 'app', 'apps', 'application', 'it\'s', 'i\'m',
  'don\'t', 'can\'t', 'won\'t', 'doesn\'t', 'isn\'t', 'aren\'t', 'wasn\'t', 'weren\'t',
  'that\'s', 'there\'s', 'i\'ve', 'you\'ve', 'we\'ve', 'they\'ve', 'i\'d', 'you\'d',
  'he\'d', 'she\'d', 'we\'d', 'they\'d', 'i\'ll', 'you\'ll', 'he\'ll', 'she\'ll',
  'we\'ll', 'they\'ll', 'let\'s', 'that\'s', 'who\'s', 'what\'s', 'here\'s', 'there\'s'
]);

const WordsAnalysis = ({ reviews }) => {
  const [activeTab, setActiveTab] = useState('interesting');
  const [showAllWords, setShowAllWords] = useState(false);

  // Analyze words from reviews
  const wordAnalysis = useMemo(() => {
    if (!reviews || reviews.length === 0) return [];

    const wordMap = new Map();
    const wordSentiments = new Map();
    const wordTrends = new Map();
    const recentWords = new Map();

    // Process each review
    reviews.forEach((review, reviewIndex) => {
      const content = review.content || review.Content || review.Review || review['Review Text'] || '';
      const rating = review.rating || review.Rating || 3;
      const reviewDate = new Date(review.date || review.Date || review['Review Date'] || new Date());
      
      // Extract words (3+ characters, alphanumeric)
      const words = content.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length >= 3 && !STOP_WORDS.has(word));

      // Count words and track sentiment
      words.forEach(word => {
        // Update count
        wordMap.set(word, (wordMap.get(word) || 0) + 1);

        // Track sentiment distribution
        if (!wordSentiments.has(word)) {
          wordSentiments.set(word, { positive: 0, neutral: 0, negative: 0 });
        }
        const sentiment = wordSentiments.get(word);
        if (rating >= 4) sentiment.positive++;
        else if (rating === 3) sentiment.neutral++;
        else sentiment.negative++;

        // Track trend data (for sparkline)
        if (!wordTrends.has(word)) {
          wordTrends.set(word, []);
        }
        wordTrends.get(word).push({
          date: reviewDate,
          index: reviewIndex,
          rating: rating
        });

        // Track recency
        if (!recentWords.has(word) || reviewDate > recentWords.get(word)) {
          recentWords.set(word, reviewDate);
        }
      });
    });

    // Convert to array and calculate metrics
    const wordsArray = Array.from(wordMap.entries()).map(([word, count]) => {
      const sentiments = wordSentiments.get(word);
      const total = sentiments.positive + sentiments.neutral + sentiments.negative;
      const trends = wordTrends.get(word).sort((a, b) => a.index - b.index);
      
      // Calculate trend direction
      const recentTrends = trends.slice(-5);
      const avgRecentRating = recentTrends.reduce((sum, t) => sum + t.rating, 0) / recentTrends.length;
      const avgOverallRating = trends.reduce((sum, t) => sum + t.rating, 0) / trends.length;
      const trendDirection = avgRecentRating > avgOverallRating ? 'up' : avgRecentRating < avgOverallRating ? 'down' : 'stable';

      // Generate sparkline data (simplified)
      const sparklineData = [];
      const buckets = 10;
      const bucketSize = Math.ceil(trends.length / buckets);
      for (let i = 0; i < buckets; i++) {
        const bucketTrends = trends.slice(i * bucketSize, (i + 1) * bucketSize);
        if (bucketTrends.length > 0) {
          const avgRating = bucketTrends.reduce((sum, t) => sum + t.rating, 0) / bucketTrends.length;
          sparklineData.push(avgRating);
        }
      }

      // Calculate criticality score (based on negative sentiment ratio)
      const criticalityScore = sentiments.negative / total;

      // Check if word is new (appeared in last 20% of reviews)
      const isNew = trends.filter(t => t.index >= reviews.length * 0.8).length > trends.length * 0.5;

      return {
        word,
        count,
        percentage: (count / reviews.length) * 100,
        sentiments,
        sentimentPercentages: {
          positive: (sentiments.positive / total) * 100,
          neutral: (sentiments.neutral / total) * 100,
          negative: (sentiments.negative / total) * 100
        },
        sparklineData,
        trendDirection,
        criticalityScore,
        isNew,
        lastSeen: recentWords.get(word),
        interestingScore: count * (1 + Math.abs(avgRecentRating - 3)) // More mentions + extreme sentiment = more interesting
      };
    });

    // Sort by count (popularity) by default
    return wordsArray.sort((a, b) => b.count - a.count);
  }, [reviews]);

  // Filter words based on active tab
  const filteredWords = useMemo(() => {
    let filtered = [...wordAnalysis];

    switch (activeTab) {
      case 'interesting':
        filtered = filtered.sort((a, b) => b.interestingScore - a.interestingScore);
        break;
      case 'popular':
        filtered = filtered.sort((a, b) => b.count - a.count);
        break;
      case 'critical':
        filtered = filtered.filter(w => w.criticalityScore > 0.3)
          .sort((a, b) => b.criticalityScore - a.criticalityScore);
        break;
      case 'trending-up':
        filtered = filtered.filter(w => w.trendDirection === 'up')
          .sort((a, b) => b.count - a.count);
        break;
      case 'trending-down':
        filtered = filtered.filter(w => w.trendDirection === 'down')
          .sort((a, b) => b.count - a.count);
        break;
      case 'new':
        filtered = filtered.filter(w => w.isNew)
          .sort((a, b) => b.lastSeen - a.lastSeen);
        break;
      default:
        break;
    }

    return showAllWords ? filtered : filtered.slice(0, 10);
  }, [wordAnalysis, activeTab, showAllWords]);

  // Generate sparkline SVG path
  const generateSparkline = (data) => {
    if (data.length < 2) return '';
    
    const width = 60;
    const height = 20;
    const padding = 2;
    
    const xStep = (width - 2 * padding) / (data.length - 1);
    const yMin = Math.min(...data);
    const yMax = Math.max(...data);
    const yRange = yMax - yMin || 1;
    
    const points = data.map((value, index) => {
      const x = padding + index * xStep;
      const y = padding + (1 - (value - yMin) / yRange) * (height - 2 * padding);
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };

  const tabs = [
    { id: 'interesting', label: 'Interesting', icon: Sparkles },
    { id: 'popular', label: 'Popular', icon: Star },
    { id: 'critical', label: 'Critical', icon: AlertCircle },
    { id: 'trending-up', label: 'Trending Up', icon: TrendingUp },
    { id: 'trending-down', label: 'Trending Down', icon: TrendingDown },
    { id: 'new', label: 'New', icon: Clock }
  ];

  return (
    <div className="words-analysis-container">
      <div className="words-header">
        <h2>Words</h2>
        <p className="words-subtitle">
          We've clustered your reviews by the words they contain. 
          <button className="learn-more-btn">
            Learn more →
          </button>
        </p>
      </div>

      <div className="words-scan-info">
        <span>Scanned {reviews.length} reviews for words</span>
        <Info size={16} className="info-icon" />
      </div>

      <div className="words-tabs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`word-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="words-info-text">
        Words we think you might be interested in during this period excluding common and stop words.
      </div>

      <div className="words-table">
        <div className="words-table-header">
          <div className="word-col">WORD</div>
          <div className="sentiment-col">SENTIMENT</div>
          <div className="mentions-col">MENTIONS</div>
          <div className="reviews-col">OVERALL REVIEWS</div>
          <div className="trend-col">TREND</div>
        </div>

        <div className="words-table-body">
          {filteredWords.map((wordData, index) => (
            <div key={wordData.word} className="word-row">
              <div className="word-rank">{index + 1}</div>
              <div className="word-text">"{wordData.word}"</div>
              
              <div className="word-sentiment">
                <div className="sentiment-bar">
                  <div 
                    className="sentiment-segment positive" 
                    style={{ width: `${wordData.sentimentPercentages.positive}%` }}
                  />
                  <div 
                    className="sentiment-segment neutral" 
                    style={{ width: `${wordData.sentimentPercentages.neutral}%` }}
                  />
                  <div 
                    className="sentiment-segment negative" 
                    style={{ width: `${wordData.sentimentPercentages.negative}%` }}
                  />
                </div>
              </div>

              <div className="word-mentions">{wordData.count}</div>
              <div className="word-percentage">{wordData.percentage.toFixed(1)}%</div>
              
              <div className="word-trend">
                <svg width="60" height="20" className="sparkline">
                  <path 
                    d={generateSparkline(wordData.sparklineData)} 
                    fill="none" 
                    stroke="#3b82f6" 
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!showAllWords && wordAnalysis.length > 10 && (
        <button 
          className="show-more-words-btn"
          onClick={() => setShowAllWords(true)}
        >
          Show More Words
        </button>
      )}
    </div>
  );
};

export default WordsAnalysis;