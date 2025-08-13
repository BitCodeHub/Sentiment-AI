import React from 'react';
import { X, Calendar, Search, Star, TrendingUp, Package, Smartphone } from 'lucide-react';
import DateRangeCalendar from './DateRangeCalendar';

const FilterPanel = ({ filters, setFilters, data }) => {
  // Get unique values for filters
  const ratings = [5, 4, 3, 2, 1];
  const sentiments = ['Positive', 'Neutral', 'Negative'];
  const categories = [...new Set(data.reviews.map(r => r.category))].filter(Boolean);
  const platforms = [...new Set(data.reviews.map(r => r.platform))].filter(Boolean);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => {
      const currentValues = prev[filterType];
      if (currentValues.includes(value)) {
        return {
          ...prev,
          [filterType]: currentValues.filter(v => v !== value)
        };
      } else {
        return {
          ...prev,
          [filterType]: [...currentValues, value]
        };
      }
    });
  };

  const handleDateRangeChange = (dateRange) => {
    setFilters(prev => ({
      ...prev,
      dateRange: dateRange
    }));
  };

  const handleSearchChange = (e) => {
    setFilters(prev => ({
      ...prev,
      searchQuery: e.target.value
    }));
  };

  const clearFilters = () => {
    setFilters({
      rating: [],
      sentiment: [],
      category: [],
      platform: [],
      dateRange: { start: null, end: null },
      searchQuery: ''
    });
  };

  const activeFilterCount = Object.values(filters).reduce((count, filter) => {
    if (Array.isArray(filter)) return count + filter.length;
    if (filter && typeof filter === 'object') {
      return count + (filter.start ? 1 : 0) + (filter.end ? 1 : 0);
    }
    if (filter) return count + 1;
    return count;
  }, 0);

  return (
    <div className="filter-panel-content">
      <div className="filter-header">
        <h3>Filters</h3>
        {activeFilterCount > 0 && (
          <button className="clear-filters" onClick={clearFilters}>
            <X size={14} />
            <span>Clear All ({activeFilterCount})</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="filter-group search-group">
        <label>
          <Search size={14} />
          <span>Search Reviews</span>
        </label>
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search keywords, topics, or content..."
            value={filters.searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
          {filters.searchQuery && (
            <button 
              className="clear-search"
              onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Rating Filter */}
      <div className="filter-group">
        <label>
          <Star size={14} />
          <span>Rating</span>
          {filters.rating.length > 0 && (
            <span className="filter-count">{filters.rating.length}</span>
          )}
        </label>
        <div className="filter-options rating-options">
          {ratings.map(rating => (
            <button
              key={rating}
              className={`filter-option rating-filter ${filters.rating.includes(rating) ? 'active' : ''}`}
              onClick={() => handleFilterChange('rating', rating)}
              title={`${rating} star reviews`}
            >
              <span className="rating-stars">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={i < rating ? 'filled' : 'empty'}>★</span>
                ))}
              </span>
              <span className="rating-number">{rating}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sentiment Filter */}
      <div className="filter-group">
        <label>
          <TrendingUp size={14} />
          <span>Sentiment</span>
          {filters.sentiment.length > 0 && (
            <span className="filter-count">{filters.sentiment.length}</span>
          )}
        </label>
        <div className="filter-options sentiment-options">
          {sentiments.map(sentiment => {
            const sentimentEmoji = {
              'Positive': '😊',
              'Neutral': '😐',
              'Negative': '😞'
            };
            return (
              <button
                key={sentiment}
                className={`filter-option sentiment-filter ${filters.sentiment.includes(sentiment) ? 'active' : ''} ${sentiment.toLowerCase()}`}
                onClick={() => handleFilterChange('sentiment', sentiment)}
                title={`${sentiment} sentiment reviews`}
              >
                <span className="sentiment-emoji">{sentimentEmoji[sentiment]}</span>
                <span>{sentiment}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="filter-group">
          <label>
            <Package size={14} />
            <span>Category</span>
            {filters.category.length > 0 && (
              <span className="filter-count">{filters.category.length}</span>
            )}
          </label>
          <div className="filter-options category-options">
            {categories.map(category => (
              <button
                key={category}
                className={`filter-option category-filter ${filters.category.includes(category) ? 'active' : ''}`}
                onClick={() => handleFilterChange('category', category)}
                title={`Filter by ${category}`}
              >
                <span className="category-name">{category}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Platform Filter */}
      {platforms.length > 1 && (
        <div className="filter-group">
          <label>
            <Smartphone size={14} />
            <span>Platform</span>
            {filters.platform.length > 0 && (
              <span className="filter-count">{filters.platform.length}</span>
            )}
          </label>
          <div className="filter-options platform-options">
            {platforms.map(platform => {
              const platformIcons = {
                'iOS': '🍎',
                'Android': '🤖',
                'Web': '🌐'
              };
              return (
                <button
                  key={platform}
                  className={`filter-option platform-filter ${filters.platform.includes(platform) ? 'active' : ''}`}
                  onClick={() => handleFilterChange('platform', platform)}
                  title={`Filter by ${platform} platform`}
                >
                  <span className="platform-icon">{platformIcons[platform] || '📱'}</span>
                  <span>{platform}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Date Range */}
      <div className="filter-group date-range-filter-group">
        <label>
          <Calendar size={14} />
          <span>Date Range</span>
          {(filters.dateRange.start || filters.dateRange.end) && (
            <span className="filter-count">1</span>
          )}
        </label>
        <div className="date-range-content">
          <DateRangeCalendar
            reviews={data.reviews}
            onDateRangeChange={handleDateRangeChange}
            initialRange={filters.dateRange}
          />
        </div>
      </div>
      
      {/* Active Filters Summary */}
      {activeFilterCount > 0 && (
        <div className="active-filters-summary">
          <div className="active-filters-header">
            <span className="active-filters-title">Active Filters</span>
          </div>
          <div className="active-filter-chips">
            {filters.rating.map(rating => (
              <div key={`rating-${rating}`} className="filter-chip rating-chip">
                <Star size={12} />
                <span>{rating} stars</span>
                <button onClick={() => handleFilterChange('rating', rating)}>
                  <X size={12} />
                </button>
              </div>
            ))}
            {filters.sentiment.map(sentiment => (
              <div key={`sentiment-${sentiment}`} className={`filter-chip sentiment-chip ${sentiment.toLowerCase()}`}>
                <span>{sentiment}</span>
                <button onClick={() => handleFilterChange('sentiment', sentiment)}>
                  <X size={12} />
                </button>
              </div>
            ))}
            {filters.category.map(category => (
              <div key={`category-${category}`} className="filter-chip category-chip">
                <span>{category}</span>
                <button onClick={() => handleFilterChange('category', category)}>
                  <X size={12} />
                </button>
              </div>
            ))}
            {filters.platform.map(platform => (
              <div key={`platform-${platform}`} className="filter-chip platform-chip">
                <span>{platform}</span>
                <button onClick={() => handleFilterChange('platform', platform)}>
                  <X size={12} />
                </button>
              </div>
            ))}
            {(filters.dateRange.start || filters.dateRange.end) && (
              <div className="filter-chip date-chip">
                <Calendar size={12} />
                <span>Date range</span>
                <button onClick={() => handleDateRangeChange({ start: null, end: null })}>
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;