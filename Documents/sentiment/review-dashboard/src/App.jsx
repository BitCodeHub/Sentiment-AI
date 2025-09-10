import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import UploadPage from './components/UploadPage';
import Dashboard from './components/Dashboard';
import EnhancedDashboard from './components/EnhancedDashboard';
import TopicDetailView from './components/TopicDetailView';
import ChatPage from './components/ChatPage';
import ErrorBoundary from './components/ErrorBoundary';
import RateLimitNotification from './components/RateLimitNotification';
import { parseExcelFile, aggregateData, parseAndTransformData } from './utils/excelParser';
import { downloadSampleExcel } from './utils/sampleDataGenerator';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

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

  const handleAppleImport = async (reviews) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Processing Apple reviews:', reviews?.length, 'reviews');
      
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
          <Route path="/" element={
            !data ? (
              <UploadPage 
                onFileUpload={handleFileUpload}
                onAppleImport={handleAppleImport}
                isLoading={isLoading}
                error={error}
              />
            ) : (
              <ErrorBoundary>
                <EnhancedDashboard data={data} />
              </ErrorBoundary>
            )
          } />
          
          <Route path="/topic/:topicName" element={
            data ? <TopicDetailView data={data} /> : <Navigate to="/" />
          } />
          
          <Route path="/chat" element={
            data ? <ChatPage reviewData={data.reviews || []} /> : <Navigate to="/" />
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
