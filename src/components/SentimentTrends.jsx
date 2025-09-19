import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, TrendingDown, Activity, Calendar } from 'lucide-react';
import './SentimentTrends.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const SentimentTrends = ({ reviews }) => {
  const [timeRange, setTimeRange] = useState('30d');
  const [trendData, setTrendData] = useState(null);
  const [overallSentiment, setOverallSentiment] = useState({
    positivePercentage: 0,
    negativePercentage: 0,
    neutralPercentage: 0
  });

  useEffect(() => {
    if (reviews && reviews.length > 0) {
      analyzeTrends();
    }
  }, [reviews, timeRange]);

  const analyzeTrends = () => {
    // Calculate overall sentiment totals
    let totalPositive = 0;
    let totalNegative = 0;
    let totalNeutral = 0;
    
    // Group reviews by date and calculate sentiment percentages
    const reviewsByDate = {};
    
    reviews.forEach(review => {
      const date = new Date(review.date || review.Date || Date.now());
      const dateKey = date.toISOString().split('T')[0];
      
      if (!reviewsByDate[dateKey]) {
        reviewsByDate[dateKey] = {
          positive: 0,
          negative: 0,
          neutral: 0,
          total: 0
        };
      }
      
      const sentiment = (review.sentiment || review.Sentiment || 'Neutral').toLowerCase();
      reviewsByDate[dateKey][sentiment]++;
      reviewsByDate[dateKey].total++;
      
      // Count overall totals
      if (sentiment === 'positive') totalPositive++;
      else if (sentiment === 'negative') totalNegative++;
      else totalNeutral++;
    });

    // Sort dates and calculate rolling averages
    const sortedDates = Object.keys(reviewsByDate).sort();
    const windowSize = 7; // 7-day rolling average
    
    const trendData = sortedDates.map((date, index) => {
      // Calculate rolling average
      const startIdx = Math.max(0, index - windowSize + 1);
      const window = sortedDates.slice(startIdx, index + 1);
      
      let positiveSum = 0;
      let negativeSum = 0;
      let neutralSum = 0;
      let totalSum = 0;
      
      window.forEach(d => {
        positiveSum += reviewsByDate[d].positive;
        negativeSum += reviewsByDate[d].negative;
        neutralSum += reviewsByDate[d].neutral;
        totalSum += reviewsByDate[d].total;
      });
      
      return {
        date,
        positivePercentage: totalSum > 0 ? (positiveSum / totalSum) * 100 : 0,
        negativePercentage: totalSum > 0 ? (negativeSum / totalSum) * 100 : 0,
        neutralPercentage: totalSum > 0 ? (neutralSum / totalSum) * 100 : 0,
        volume: reviewsByDate[date].total
      };
    });

    // Filter based on time range
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeRange) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case 'all':
      default:
        cutoffDate.setFullYear(2000);
    }
    
    const filteredData = trendData.filter(d => new Date(d.date) >= cutoffDate);
    setTrendData(filteredData);
    
    // Calculate and set overall percentages
    const total = totalPositive + totalNegative + totalNeutral;
    if (total > 0) {
      setOverallSentiment({
        positivePercentage: (totalPositive / total) * 100,
        negativePercentage: (totalNegative / total) * 100,
        neutralPercentage: (totalNeutral / total) * 100
      });
    }
  };

  const chartData = {
    labels: trendData?.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }) || [],
    datasets: [
      {
        label: 'Positive',
        data: trendData?.map(d => d.positivePercentage) || [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        fill: true,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        tension: 0.4
      },
      {
        label: 'Negative',
        data: trendData?.map(d => d.negativePercentage) || [],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        fill: true,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        tension: 0.4
      },
      {
        label: 'Neutral',
        data: trendData?.map(d => d.neutralPercentage) || [],
        borderColor: '#6b7280',
        backgroundColor: 'rgba(107, 114, 128, 0.1)',
        fill: true,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#6b7280',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        tension: 0.4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 14,
            weight: '500'
          },
          color: '#374151'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleFont: {
          size: 14,
          weight: '600'
        },
        bodyFont: {
          size: 13
        },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          callback: (value) => `${value}%`,
          font: {
            size: 12,
            weight: '500'
          },
          color: '#6b7280'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.08)',
          drawBorder: false
        }
      },
      x: {
        ticks: {
          font: {
            size: 12,
            weight: '500'
          },
          color: '#6b7280',
          maxRotation: 0
        },
        grid: {
          display: false,
          drawBorder: false
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  const calculateTrendDirection = () => {
    if (!trendData || trendData.length < 2) return 'stable';
    
    const recent = trendData.slice(-7);
    const previous = trendData.slice(-14, -7);
    
    if (recent.length === 0 || previous.length === 0) return 'stable';
    
    const recentPositive = recent.reduce((sum, d) => sum + d.positivePercentage, 0) / recent.length;
    const previousPositive = previous.reduce((sum, d) => sum + d.positivePercentage, 0) / previous.length;
    
    const change = recentPositive - previousPositive;
    
    if (change > 5) return 'improving';
    if (change < -5) return 'declining';
    return 'stable';
  };

  const trend = calculateTrendDirection();

  return (
    <div className="sentiment-trends-container" style={{ 
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      padding: '24px',
      marginBottom: '24px',
      border: '1px solid #e5e7eb'
    }}>
      <div className="sentiment-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h3 style={{ 
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: 0
          }}>
            <Activity style={{ width: '20px', height: '20px', color: '#6366f1' }} />
            Sentiment Trends Analysis
          </h3>
          <p style={{ 
            fontSize: '14px',
            color: '#6b7280',
            marginTop: '4px',
            margin: '4px 0 0 0'
          }}>
            7-day rolling average of sentiment distribution
          </p>
        </div>
        
        <div className="sentiment-actions" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div className="trend-badge" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '500',
            backgroundColor: trend === 'improving' ? '#d1fae5' : 
                           trend === 'declining' ? '#fee2e2' : '#f3f4f6',
            color: trend === 'improving' ? '#065f46' : 
                   trend === 'declining' ? '#991b1b' : '#374151',
            border: `1px solid ${
              trend === 'improving' ? '#a7f3d0' : 
              trend === 'declining' ? '#fecaca' : '#e5e7eb'
            }`
          }}>
            {trend === 'improving' ? <TrendingUp style={{ width: '16px', height: '16px' }} /> :
             trend === 'declining' ? <TrendingDown style={{ width: '16px', height: '16px' }} /> :
             <Activity style={{ width: '16px', height: '16px' }} />}
            {trend === 'improving' ? 'Improving' :
             trend === 'declining' ? 'Declining' :
             'Stable'}
          </div>
          
          <div className="sentiment-filters" style={{ 
            display: 'flex',
            gap: '4px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            padding: '4px',
            border: '1px solid #e5e7eb'
          }}>
            {[
              { value: '7d', label: 'Last 7d' },
              { value: '30d', label: 'Last 30d' },
              { value: '90d', label: 'Last 90d' },
              { value: 'all', label: 'All Time' }
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTimeRange(value)}
                className="sentiment-filter-btn"
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: timeRange === value ? '#ffffff' : 'transparent',
                  color: timeRange === value ? '#111827' : '#6b7280',
                  boxShadow: timeRange === value ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (timeRange !== value) {
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.color = '#111827';
                  }
                }}
                onMouseLeave={(e) => {
                  if (timeRange !== value) {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#6b7280';
                  }
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="chart-container" style={{ 
        height: '320px',
        minHeight: '320px',
        position: 'relative',
        padding: '16px 0'
      }}>
        {trendData && trendData.length > 0 ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No trend data available</p>
              <p className="text-sm mt-1">Reviews will be analyzed as they load</p>
            </div>
          </div>
        )}
      </div>

      {/* Insights */}
      {trendData && trendData.length > 0 && (
        <div className="sentiment-insights-grid" style={{ 
          marginTop: '24px',
          display: 'grid',
          gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(4, 1fr)',
          gap: '16px'
        }}>
          <div style={{
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #bbf7d0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%' }}></div>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#065f46' }}>Positive</span>
            </div>
            <span className="sentiment-value" style={{ display: 'block', fontSize: '36px', fontWeight: '900', color: 'black', margin: '0', lineHeight: '1', fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.5px' }}>
              {overallSentiment.positivePercentage.toFixed(1)}%
            </span>
            <p style={{ fontSize: '12px', color: '#065f46', marginTop: '4px' }}>Overall positive sentiment</p>
          </div>

          <div style={{
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #fecaca'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%' }}></div>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#991b1b' }}>Negative</span>
            </div>
            <span className="sentiment-value" style={{ display: 'block', fontSize: '36px', fontWeight: '900', color: 'black', margin: '0', lineHeight: '1', fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.5px' }}>
              {overallSentiment.negativePercentage.toFixed(1)}%
            </span>
            <p style={{ fontSize: '12px', color: '#991b1b', marginTop: '4px' }}>Overall negative sentiment</p>
          </div>

          <div style={{
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #fde68a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '8px', height: '8px', backgroundColor: '#f59e0b', borderRadius: '50%' }}></div>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#92400e' }}>Neutral</span>
            </div>
            <span className="sentiment-value" style={{ display: 'block', fontSize: '36px', fontWeight: '900', color: 'black', margin: '0', lineHeight: '1', fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.5px' }}>
              {overallSentiment.neutralPercentage.toFixed(1)}%
            </span>
            <p style={{ fontSize: '12px', color: '#92400e', marginTop: '4px' }}>Overall neutral sentiment</p>
          </div>
          
          <div style={{
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Calendar style={{ width: '16px', height: '16px', color: '#6b7280' }} />
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Review Volume</span>
            </div>
            <span className="sentiment-value" style={{ display: 'block', fontSize: '36px', fontWeight: '900', color: 'black', margin: '0', lineHeight: '1', fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.5px' }}>
              {reviews.length}
            </span>
            <p style={{ fontSize: '12px', color: '#000000', marginTop: '4px' }}>Total reviews analyzed</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SentimentTrends;