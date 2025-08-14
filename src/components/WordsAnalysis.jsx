import React, { useMemo, useState } from 'react';
import { Info, TrendingUp, TrendingDown, Sparkles, Star, AlertCircle, Clock, Filter, Cloud } from 'lucide-react';
import SentimentWordCloud from './SentimentWordCloud';
import './WordsAnalysis.css';

// Common stop words to exclude - minimal list to allow more words through
const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for',
  'on', 'with', 'he', 'as', 'at', 'this', 'but', 'his', 'by', 'from',
  'they', 'we', 'her', 'she', 'or', 'an', 'my', 'one', 'all',
  'there', 'their', 'what', 'so', 'up', 'out', 'if', 'who', 'which',
  'me', 'him', 'into', 'your', 'some', 'them',
  'than', 'then', 'its', 'our', 'these',
  'us', 'is', 'was', 'are', 'been', 'has', 'had', 'were', 'did'
]);

const WordsAnalysis = ({ reviews, onWordClick }) => {
  const [activeTab, setActiveTab] = useState('interesting');
  const [showAllWords, setShowAllWords] = useState(false);
  const [showWordCloud, setShowWordCloud] = useState(false);

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
      
      // Extract words (2+ characters for more coverage, alphanumeric)
      const words = content.toLowerCase()
        .replace(/[^\w\s'-]/g, ' ') // Keep hyphens and apostrophes
        .split(/\s+/)
        .filter(word => {
          // More inclusive filtering
          if (word.length < 2) return false;
          if (STOP_WORDS.has(word)) return false;
          if (/^\d+$/.test(word)) return false; // Skip pure numbers
          return true;
        });

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

    // For cloud view, include more words but still filter out very rare ones
    if (showWordCloud) {
      // Get words that appear at least twice, up to 60 words for cleaner cloud
      filtered = wordAnalysis.filter(w => w.count >= 2).slice(0, 60);
    }

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

    return showAllWords || showWordCloud ? filtered : filtered.slice(0, 10);
  }, [wordAnalysis, activeTab, showAllWords, showWordCloud]);

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
      
      <div className="words-view-toggle">
        <button 
          className={`view-toggle-btn ${!showWordCloud ? 'active' : ''}`}
          onClick={() => setShowWordCloud(false)}
        >
          <Filter size={16} />
          Table View
        </button>
        <button 
          className={`view-toggle-btn ${showWordCloud ? 'active' : ''}`}
          onClick={() => setShowWordCloud(true)}
        >
          <Cloud size={16} />
          Word Cloud
        </button>
      </div>

      {!showWordCloud && (
        <div className="words-scan-info">
          <span>Scanned {reviews.length} reviews for words</span>
          <Info size={16} className="info-icon" />
        </div>
      )}

      {showWordCloud ? (
        <>
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
          
          <div className="word-cloud-header">
            <h3>Word Cloud of {activeTab === 'interesting' ? 'Interesting' : activeTab === 'popular' ? 'Popular' : activeTab === 'critical' ? 'Critical' : activeTab === 'trending-up' ? 'Trending Up' : activeTab === 'trending-down' ? 'Trending Down' : 'New'} Words</h3>
            <p className="word-cloud-subtitle">
              Size represents frequency, color represents sentiment. Click any word to see reviews.
            </p>
          </div>
          <SentimentWordCloud 
            wordData={filteredWords} 
            onWordClick={onWordClick}
          />
        </>
      ) : (
        <>
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
              <button 
                className="word-text clickable-word"
                onClick={() => onWordClick && onWordClick(wordData.word)}
                title={`Click to see reviews containing "${wordData.word}"`}
              >
                "{wordData.word}"
              </button>
              
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
        </>
      )}
    </div>
  );
};

export default WordsAnalysis;