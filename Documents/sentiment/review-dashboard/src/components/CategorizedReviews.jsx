import React, { useState, useEffect } from 'react';
import { categorizeReview } from '../services/aiAnalysis';
import { 
  Zap, AlertCircle, Lightbulb, Palette, 
  Key, Wifi, Battery, Bug, CreditCard, 
  RefreshCw, Navigation, Radio, Bell, Headphones,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react';

const categoryIcons = {
  'Bug Report': Bug,
  'Feature Request': Lightbulb,
  'Performance Issue': Zap,
  'UI/UX Feedback': Palette,
  'Login Problems': Key,
  'Connectivity Issues': Wifi,
  'Battery Drain': Battery,
  'Crash Report': AlertCircle,
  'Payment Issue': CreditCard,
  'Data Sync Problem': RefreshCw,
  'Navigation Issue': Navigation,
  'Remote Features': Radio,
  'Vehicle Status': Radio,
  'Notifications': Bell,
  'Customer Service': Headphones
};

const priorityColors = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200'
};

const CategorizedReviews = ({ reviews, limit = 10 }) => {
  const [categorizedReviews, setCategorizedReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryStats, setCategoryStats] = useState({});

  useEffect(() => {
    if (reviews && reviews.length > 0) {
      categorizeAllReviews();
    }
  }, [reviews]);

  const categorizeAllReviews = async () => {
    setLoading(true);
    try {
      // Process reviews in batches to avoid overwhelming the API
      const reviewsToProcess = reviews.slice(0, limit);
      const categorized = [];
      const stats = {};

      for (const review of reviewsToProcess) {
        try {
          const result = await categorizeReview(
            review.content || review['Review Text'] || review.Body || ''
          );
          
          const categorizedReview = {
            ...review,
            categories: result.tags || ['General'],
            priority: result.priority || 'medium'
          };
          
          categorized.push(categorizedReview);
          
          // Update stats
          result.tags.forEach(tag => {
            stats[tag] = (stats[tag] || 0) + 1;
          });
        } catch (error) {
          console.error('Error categorizing review:', error);
          categorized.push({
            ...review,
            categories: ['General'],
            priority: 'medium'
          });
        }
      }

      setCategorizedReviews(categorized);
      setCategoryStats(stats);
    } catch (error) {
      console.error('Error in batch categorization:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReviews = selectedCategory
    ? categorizedReviews.filter(r => r.categories.includes(selectedCategory))
    : categorizedReviews;

  const getSentimentIcon = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          AI-Categorized Reviews
        </h3>
        {loading && (
          <div className="flex items-center text-sm text-gray-500">
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Categorizing reviews...
          </div>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            !selectedCategory
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({categorizedReviews.length})
        </button>
        {Object.entries(categoryStats)
          .sort(([, a], [, b]) => b - a)
          .map(([category, count]) => {
            const Icon = categoryIcons[category] || AlertCircle;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                  selectedCategory === category
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                {category} ({count})
              </button>
            );
          })}
      </div>

      {/* Categorized Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((review, index) => (
          <div
            key={index}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={`text-sm ${
                        i < (review.rating || review.Rating || 0)
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                {getSentimentIcon(review.sentiment || review.Sentiment)}
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                priorityColors[review.priority]
              }`}>
                {review.priority} priority
              </span>
            </div>

            <p className="text-sm text-gray-700 mb-3 line-clamp-3">
              {review.content || review['Review Text'] || review.Body}
            </p>

            <div className="flex flex-wrap gap-1">
              {review.categories.map((cat, idx) => {
                const Icon = categoryIcons[cat] || AlertCircle;
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                  >
                    <Icon className="w-3 h-3" />
                    {cat}
                  </span>
                );
              })}
            </div>

            <div className="mt-2 text-xs text-gray-500">
              {(() => {
                const dateValue = review.date || review.Date;
                if (!dateValue) return 'No date';
                if (dateValue instanceof Date) return dateValue.toLocaleDateString();
                if (typeof dateValue === 'string') return dateValue;
                return 'No date';
              })()} • 
              {review.author || review.Author || 'Anonymous'}
            </div>
          </div>
        ))}
      </div>

      {!loading && filteredReviews.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No reviews found for the selected category.
        </div>
      )}
    </div>
  );
};

export default CategorizedReviews;