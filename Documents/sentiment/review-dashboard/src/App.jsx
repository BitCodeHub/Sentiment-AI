import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import UploadPage from './components/UploadPage';
import Dashboard from './components/Dashboard';
import EnhancedDashboard from './components/EnhancedDashboard';
import TopicDetailView from './components/TopicDetailView';
import ChatPage from './components/ChatPage';
import RivueChat from './pages/RivueChat';
import ErrorBoundary from './components/ErrorBoundary';
import RateLimitNotification from './components/RateLimitNotification';
import Login from './components/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { parseExcelFile, aggregateData, parseAndTransformData } from './utils/excelParser';
import { downloadSampleExcel } from './utils/sampleDataGenerator';
import './App.css';

// Protected route wrapper component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function AppContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  const handleFileUpload = async (file) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Starting file upload process...');
      const reviews = await parseExcelFile(file);
      console.log('Parsed reviews:', reviews?.length, 'reviews');
      const aggregatedData = aggregateData(reviews);
      console.log('Aggregated data:', aggregatedData);
      
      // Ensure we have the proper structure
      if (!aggregatedData.summary || !aggregatedData.summary.distribution) {
        aggregatedData.summary.distribution = aggregatedData.ratingDistribution || {};
      }
      if (!aggregatedData.sentimentBreakdown) {
        aggregatedData.sentimentBreakdown = aggregatedData.sentimentDistribution || {};
      }
      
      setData(aggregatedData);
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Error processing file. Please make sure it\'s a valid Excel file with review data.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter reviews by date range
  const filterReviewsByDateRange = (reviews, dateRange) => {
    if (!reviews || reviews.length === 0) return [];
    if (!dateRange.start && !dateRange.end) return reviews;
    
    return reviews.filter(review => {
      const reviewDate = new Date(review.date || review.Date || review['Review Date']);
      if (isNaN(reviewDate.getTime())) return true; // Include reviews with invalid dates
      
      const startDate = dateRange.start ? new Date(dateRange.start) : null;
      const endDate = dateRange.end ? new Date(dateRange.end) : null;
      
      if (startDate && endDate) {
        return reviewDate >= startDate && reviewDate <= endDate;
      } else if (startDate) {
        return reviewDate >= startDate;
      } else if (endDate) {
        return reviewDate <= endDate;
      }
      
      return true;
    });
  };

  const handleAppleImport = async (reviews) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Processing Apple reviews:', reviews?.length, 'reviews');
      
      // Get app name from session storage
      let appName = '';
      const configStr = sessionStorage.getItem('appleAppConfig');
      if (configStr) {
        try {
          const config = JSON.parse(configStr);
          appName = config.appName || '';
          console.log('[App.jsx] Extracted app name from config:', {
            fullConfig: config,
            extractedAppName: appName,
            appId: config.appId
          });
        } catch (e) {
          console.error('Error parsing Apple config:', e);
        }
      }
      
      // Handle empty reviews array (entering dashboard without data)
      if (!reviews || reviews.length === 0) {
        console.log('Entering dashboard with no initial data');
        const emptyData = {
          summary: { 
            totalReviews: 0, 
            avgRating: 0, 
            distribution: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            lastUpdated: new Date().toISOString()
          },
          reviews: [],
          sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
          ratingDistribution: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
          sentimentDistribution: { Positive: 0, Neutral: 0, Negative: 0 },
          categoryDistribution: {},
          platformDistribution: { iOS: 0 },
          timeSeriesData: [],
          topKeywords: [],
          responseRate: 0,
          appName: appName, // Add appName for Reddit component
          isAppleData: true, // Flag to indicate this is Apple data mode
          isEmpty: true // Flag to show data needs to be loaded
        };
        setData(emptyData);
        setIsLoading(false);
        return;
      }
      
      console.log('First review sample:', reviews?.[0]);
      
      // Transform Apple reviews through parseAndTransformData first
      const transformedReviews = parseAndTransformData(reviews);
      console.log('Transformed reviews:', transformedReviews.length);
      
      const aggregatedData = aggregateData(transformedReviews);
      console.log('Aggregated data:', aggregatedData);
      
      // Ensure we have the proper structure
      if (!aggregatedData.summary || !aggregatedData.summary.distribution) {
        aggregatedData.summary.distribution = aggregatedData.ratingDistribution || {};
      }
      if (!aggregatedData.sentimentBreakdown) {
        aggregatedData.sentimentBreakdown = aggregatedData.sentimentDistribution || {};
      }
      
      aggregatedData.isAppleData = true; // Flag to indicate this is Apple data
      aggregatedData.isEmpty = false;
      aggregatedData.appName = appName; // Add appName for Reddit component
      
      console.log('[App.jsx] Final aggregated data with appName:', {
        appName: aggregatedData.appName,
        reviewCount: aggregatedData.reviews?.length || 0
      });
      
      setData(aggregatedData);
    } catch (err) {
      console.error('Error processing Apple reviews:', err);
      console.error('Stack trace:', err.stack);
      setError('Error processing Apple reviews. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Router>
      <div className="app">
        <RateLimitNotification />
        <Routes>
          {/* Login Route */}
          <Route path="/login" element={
            <Login onSuccess={() => window.location.href = '/'} />
          } />
          
          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              {!data ? (
                <UploadPage 
                  onFileUpload={handleFileUpload}
                  onAppleImport={handleAppleImport}
                  isLoading={isLoading}
                  error={error}
                />
              ) : (
                <ErrorBoundary>
                  <EnhancedDashboard 
                    data={data} 
                    onUpdateData={setData}
                    onFetchReviews={handleAppleImport}
                    onDateRangeChange={setDateRange}
                  />
                </ErrorBoundary>
              )}
            </ProtectedRoute>
          } />
          
          <Route path="/topic/:topicName" element={
            <ProtectedRoute>
              {data ? <TopicDetailView data={data} /> : <Navigate to="/" />}
            </ProtectedRoute>
          } />
          
          <Route path="/chat" element={
            <ProtectedRoute>
              {data ? <ChatPage reviewData={filterReviewsByDateRange(data.reviews || [], dateRange)} /> : <Navigate to="/" />}
            </ProtectedRoute>
          } />
          
          <Route path="/rivue-chat" element={
            <ProtectedRoute>
              <RivueChat />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

// Main App component with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
