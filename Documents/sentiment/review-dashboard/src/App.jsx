import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import FileUpload from './components/FileUpload';
import AppleImport from './components/AppleImport';
import Dashboard from './components/Dashboard';
import EnhancedDashboard from './components/EnhancedDashboard';
import TopicDetailView from './components/TopicDetailView';
import ErrorBoundary from './components/ErrorBoundary';
import RateLimitNotification from './components/RateLimitNotification';
import { parseExcelFile, aggregateData } from './utils/excelParser';
import { downloadSampleExcel } from './utils/sampleDataGenerator';
import { Loader, Download } from 'lucide-react';
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
      console.error('Error processing Apple reviews:', err);
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
              <div className="upload-section">
                <div className="app-header">
                  <h1>App Review Analytics Dashboard</h1>
                  <p>Upload your Excel file or import directly from App Store to analyze app reviews</p>
                </div>
                
                <div className="import-options">
                  <FileUpload onFileUpload={handleFileUpload} />
                  
                  <div className="divider">
                    <span>OR</span>
                  </div>
                  
                  <AppleImport onImport={handleAppleImport} />
                </div>
                
                <button 
                  className="sample-data-btn"
                  onClick={downloadSampleExcel}
                  title="Download sample Excel file to see expected format"
                >
                  <Download size={20} />
                  Download Sample Format
                </button>
                
                {isLoading && (
                  <div className="loading">
                    <Loader className="spinner" />
                    <p>Processing your review data...</p>
                  </div>
                )}
                
                {error && (
                  <div className="error">
                    <p>{error}</p>
                  </div>
                )}
              </div>
            ) : (
              <ErrorBoundary>
                <EnhancedDashboard data={data} />
              </ErrorBoundary>
            )
          } />
          
          <Route path="/topic/:topicName" element={
            data ? <TopicDetailView data={data} /> : <Navigate to="/" />
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
