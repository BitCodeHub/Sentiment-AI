import { useMemo, useCallback } from 'react';

// Pre-process reviews for faster filtering
export const usePreprocessedReviews = (reviews) => {
  return useMemo(() => {
    if (!reviews?.length) return [];
    
    const seen = new Map();
    const processed = [];
    
    for (const review of reviews) {
      // Create deduplication key
      const author = (review.author || review.Author || 'Anonymous').toLowerCase().trim();
      const dateStr = review.date || review.Date || review['Review Date'] || '';
      const rating = review.rating || review.Rating || 0;
      const content = (review.content || review['Review Text'] || review.Body || '').toLowerCase().trim();
      
      const key = `${author}_${dateStr}_${rating}_${content.substring(0, 200)}`;
      
      if (!seen.has(key)) {
        seen.set(key, true);
        
        // Pre-parse date for performance
        const parsedDate = new Date(dateStr);
        const timestamp = parsedDate.getTime();
        
        // Pre-compute searchable text
        const searchableText = (
          (review.content || '') + ' ' +
          (review['Review Text'] || '') + ' ' +
          (review.Body || '') + ' ' +
          (review.title || review.Title || '') + ' ' +
          (review.author || review.Author || '')
        ).toLowerCase();
        
        processed.push({
          ...review,
          _parsedDate: isNaN(timestamp) ? null : parsedDate,
          _timestamp: isNaN(timestamp) ? 0 : timestamp,
          _searchableText: searchableText,
          _rating: rating,
          _sentiment: (review.sentiment || review.Sentiment || 'neutral').toLowerCase()
        });
      }
    }
    
    return processed;
  }, [reviews]);
};

// Optimized filtering function
export const useOptimizedFiltering = (
  preprocessedReviews,
  searchTerm,
  selectedFilter,
  selectedTimeRange,
  selectedDateRange,
  metadataFilters
) => {
  return useMemo(() => {
    if (!preprocessedReviews?.length) return [];
    
    // Quick return for no filters
    const hasFilters = searchTerm || 
      selectedFilter !== 'all' || 
      selectedTimeRange !== 'all' || 
      selectedDateRange?.start || 
      selectedDateRange?.end ||
      Object.values(metadataFilters).some(f => f !== 'all');
    
    if (!hasFilters) return preprocessedReviews;
    
    // Pre-calculate date range bounds once
    let startTimestamp = null;
    let endTimestamp = null;
    
    if (selectedDateRange?.start || selectedDateRange?.end) {
      if (selectedDateRange.start) {
        const start = new Date(selectedDateRange.start);
        start.setHours(0, 0, 0, 0);
        startTimestamp = start.getTime();
      }
      
      if (selectedDateRange.end) {
        const end = new Date(selectedDateRange.end);
        end.setHours(23, 59, 59, 999);
        endTimestamp = end.getTime();
      }
    } else if (selectedTimeRange !== 'all') {
      const now = Date.now();
      switch (selectedTimeRange) {
        case '7days':
          startTimestamp = now - 7 * 24 * 60 * 60 * 1000;
          break;
        case '30days':
          startTimestamp = now - 30 * 24 * 60 * 60 * 1000;
          break;
        case '90days':
          startTimestamp = now - 90 * 24 * 60 * 60 * 1000;
          break;
        case '1year':
          startTimestamp = now - 365 * 24 * 60 * 60 * 1000;
          break;
      }
    }
    
    // Optimized search term
    const searchLower = searchTerm?.toLowerCase() || '';
    
    return preprocessedReviews.filter(review => {
      // Search filter - use pre-computed searchable text
      if (searchLower && !review._searchableText.includes(searchLower)) {
        return false;
      }
      
      // Rating/Sentiment filter
      if (selectedFilter !== 'all') {
        const filterNum = parseInt(selectedFilter);
        if (!isNaN(filterNum)) {
          if (review._rating !== filterNum) return false;
        } else if (selectedFilter === 'positive' || selectedFilter === 'negative' || selectedFilter === 'neutral') {
          if (review._sentiment !== selectedFilter) return false;
        }
      }
      
      // Date filter - use pre-computed timestamp
      if (startTimestamp !== null || endTimestamp !== null) {
        if (!review._timestamp) return false;
        if (startTimestamp !== null && review._timestamp < startTimestamp) return false;
        if (endTimestamp !== null && review._timestamp > endTimestamp) return false;
      }
      
      // Metadata filters
      if (metadataFilters.appName !== 'all' && review.appName !== metadataFilters.appName) return false;
      if (metadataFilters.device !== 'all' && review.device !== metadataFilters.device) return false;
      if (metadataFilters.version !== 'all' && review.version !== metadataFilters.version && review['App Version'] !== metadataFilters.version) return false;
      if (metadataFilters.os !== 'all' && review.osVersion !== metadataFilters.os) return false;
      if (metadataFilters.platform !== 'all' && review.source !== metadataFilters.platform) return false;
      
      return true;
    });
  }, [preprocessedReviews, searchTerm, selectedFilter, selectedTimeRange, selectedDateRange, metadataFilters]);
};

// Quick stats calculator
export const useQuickStats = (filteredReviews) => {
  return useMemo(() => {
    if (!filteredReviews?.length) {
      return {
        totalCount: 0,
        avgRating: 0,
        sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
        ratingDistribution: [
          { rating: 5, count: 0 },
          { rating: 4, count: 0 },
          { rating: 3, count: 0 },
          { rating: 2, count: 0 },
          { rating: 1, count: 0 }
        ]
      };
    }
    
    let totalRating = 0;
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    for (const review of filteredReviews) {
      totalRating += review._rating || 0;
      sentimentCounts[review._sentiment] = (sentimentCounts[review._sentiment] || 0) + 1;
      if (review._rating >= 1 && review._rating <= 5) {
        ratingCounts[review._rating]++;
      }
    }
    
    return {
      totalCount: filteredReviews.length,
      avgRating: filteredReviews.length > 0 ? (totalRating / filteredReviews.length).toFixed(1) : 0,
      sentimentBreakdown: sentimentCounts,
      ratingDistribution: [5, 4, 3, 2, 1].map(rating => ({
        rating,
        count: ratingCounts[rating] || 0
      }))
    };
  }, [filteredReviews]);
};