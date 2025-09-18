import React from 'react';
import { 
  Star, 
  TrendingUp, 
  MessageSquare, 
  Calendar,
  Smartphone,
  BarChart3
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import ReviewListWithReplies from './ReviewListWithReplies';
import KeywordCloud from './KeywordCloud';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = ({ data }) => {
  if (!data) return null;

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: {
            size: 12
          }
        }
      }
    }
  };

  // Prepare chart data
  const ratingChartData = {
    labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'],
    datasets: [{
      label: 'Number of Reviews',
      data: Object.values(data.ratingDistribution),
      backgroundColor: [
        '#ef4444',
        '#f97316',
        '#eab308',
        '#84cc16',
        '#22c55e'
      ],
      borderWidth: 0
    }]
  };

  const sentimentChartData = {
    labels: Object.keys(data.sentimentDistribution),
    datasets: [{
      data: Object.values(data.sentimentDistribution),
      backgroundColor: [
        '#22c55e',
        '#6b7280',
        '#ef4444'
      ],
      borderWidth: 0
    }]
  };

  const timeSeriesChartData = {
    labels: data.timeSeriesData.map(d => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Number of Reviews',
        data: data.timeSeriesData.map(d => d.count),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Average Rating',
        data: data.timeSeriesData.map(d => d.avgRating),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y1'
      }
    ]
  };

  const timeSeriesOptions = {
    ...chartOptions,
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Number of Reviews'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        min: 0,
        max: 5,
        title: {
          display: true,
          text: 'Average Rating'
        },
        grid: {
          drawOnChartArea: false
        }
      }
    }
  };

  const categoryChartData = {
    labels: Object.keys(data.categoryDistribution),
    datasets: [{
      label: 'Reviews by Category',
      data: Object.values(data.categoryDistribution),
      backgroundColor: [
        '#8b5cf6',
        '#ec4899',
        '#f59e0b',
        '#10b981',
        '#3b82f6',
        '#ef4444'
      ]
    }]
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>MyHyundai App Review Analytics</h1>
        <p className="subtitle">Real-time insights from app store reviews</p>
        <p className="last-updated">Last updated: {new Date(data.summary.lastUpdated).toLocaleString()}</p>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card summary-card">
          <div className="card-icon">
            <MessageSquare size={24} />
          </div>
          <div className="card-content">
            <h3>{data.summary.totalReviews}</h3>
            <p>Total Reviews</p>
          </div>
        </div>

        <div className="card summary-card">
          <div className="card-icon">
            <Star size={24} />
          </div>
          <div className="card-content">
            <h3>{data.summary.avgRating}</h3>
            <p>Average Rating</p>
          </div>
        </div>

        <div className="card summary-card">
          <div className="card-icon">
            <TrendingUp size={24} />
          </div>
          <div className="card-content">
            <h3>{data.sentimentDistribution.Positive || 0}</h3>
            <p>Positive Reviews</p>
          </div>
        </div>

        <div className="card summary-card">
          <div className="card-icon">
            <BarChart3 size={24} />
          </div>
          <div className="card-content">
            <h3>{Object.keys(data.categoryDistribution).length}</h3>
            <p>Categories</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Time Series Chart */}
        <div className="card chart-card full-width">
          <h2>Review Trends Over Time</h2>
          <div className="chart-container" style={{ height: '300px' }}>
            <Line data={timeSeriesChartData} options={timeSeriesOptions} />
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="card chart-card">
          <h2>Rating Distribution</h2>
          <div className="chart-container" style={{ height: '250px' }}>
            <Bar data={ratingChartData} options={chartOptions} />
          </div>
        </div>

        {/* Sentiment Analysis */}
        <div className="card chart-card">
          <h2>Sentiment Analysis</h2>
          <div className="chart-container" style={{ height: '250px' }}>
            <Doughnut data={sentimentChartData} options={chartOptions} />
          </div>
        </div>

        {/* Category Distribution */}
        <div className="card chart-card">
          <h2>Review Categories</h2>
          <div className="chart-container" style={{ height: '250px' }}>
            <Pie data={categoryChartData} options={chartOptions} />
          </div>
        </div>

        {/* Platform Distribution */}
        {data.platformDistribution && Object.keys(data.platformDistribution).length > 1 && (
          <div className="card chart-card">
            <h2>Platform Distribution</h2>
            <div className="chart-container" style={{ height: '250px' }}>
              <Doughnut 
                data={{
                  labels: Object.keys(data.platformDistribution),
                  datasets: [{
                    data: Object.values(data.platformDistribution),
                    backgroundColor: ['#3b82f6', '#10b981', '#6b7280']
                  }]
                }} 
                options={chartOptions} 
              />
            </div>
          </div>
        )}
      </div>

      {/* Keywords Section */}
      <div className="card keywords-card">
        <h2>Top Keywords</h2>
        <KeywordCloud keywords={data.topKeywords} />
      </div>

      {/* Recent Reviews */}
      <div className="card reviews-card">
        <h2>Recent Reviews</h2>
        <ReviewListWithReplies reviews={data.reviews.slice(0, 10)} />
      </div>
    </div>
  );
};

export default Dashboard;