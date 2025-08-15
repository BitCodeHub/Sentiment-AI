import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import FileUpload from './components/FileUpload';
import AppleImport from './components/AppleImport';
import BenchmarkFileUpload from './components/BenchmarkFileUpload';
import Dashboard from './components/Dashboard';
import EnhancedDashboard from './components/EnhancedDashboard';
import BenchmarkDashboard from './components/BenchmarkDashboard';
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
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [mode, setMode] = useState('single'); // 'single' or 'benchmark'
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

  const handleBenchmarkFilesUpload = async ({ userFile, competitorFile }) => {
    setIsLoading(true);
    setError(null);
    setMode('benchmark');
    
    try {
      console.log('Processing benchmark files...');
      
      // Process user file
      const userReviews = await parseExcelFile(userFile);
      const userAggregatedData = aggregateData(userReviews);
      
      // Process competitor file
      const competitorReviews = await parseExcelFile(competitorFile);
      const competitorAggregatedData = aggregateData(competitorReviews);
      
      // Ensure proper structure for both
      [userAggregatedData, competitorAggregatedData].forEach(aggregatedData => {
        if (!aggregatedData.summary || !aggregatedData.summary.distribution) {
          aggregatedData.summary.distribution = aggregatedData.ratingDistribution || {};
        }
        if (!aggregatedData.sentimentBreakdown) {
          aggregatedData.sentimentBreakdown = aggregatedData.sentimentDistribution || {};
        }
      });
      
      // Extract app names from the data or use filename as fallback
      const userAppName = userAggregatedData.reviews?.[0]?.appName || 
                         userFile.name.replace(/\.(xlsx|xls)$/i, '').replace(/_/g, ' ');
      const competitorAppName = competitorAggregatedData.reviews?.[0]?.appName || 
                               competitorFile.name.replace(/\.(xlsx|xls)$/i, '').replace(/_/g, ' ');
      
      setBenchmarkData({
        user: {
          ...userAggregatedData,
          fileName: userFile.name,
          appName: userAppName
        },
        competitor: {
          ...competitorAggregatedData,
          fileName: competitorFile.name,
          appName: competitorAppName
        }
      });
      
      console.log('Benchmark data processed successfully');
    } catch (err) {
      console.error('Error processing benchmark files:', err);
      setError('Error processing benchmark files. Please make sure both files are valid Excel files with review data.');
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
            !data && !benchmarkData ? (
              <div className="upload-section">
                <div className="app-header">
                  <h1>App Review Analytics Dashboard</h1>
                  <p>Upload your Excel file or import directly from App Store to analyze app reviews</p>
                </div>
                
                <div className="mode-selector">
                  <button 
                    className={`mode-button ${mode === 'single' ? 'active' : ''}`}
                    onClick={() => setMode('single')}
                  >
                    Single App Analysis
                  </button>
                  <button 
                    className={`mode-button ${mode === 'benchmark' ? 'active' : ''}`}
                    onClick={() => setMode('benchmark')}
                  >
                    Benchmark Analysis
                  </button>
                </div>
                
                {mode === 'single' ? (
                  <>
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
                  </>
                ) : (
                  <BenchmarkFileUpload onFilesUpload={handleBenchmarkFilesUpload} />
                )}
                
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
            ) : mode === 'benchmark' && benchmarkData ? (
              <ErrorBoundary>
                <BenchmarkDashboard benchmarkData={benchmarkData} />
              </ErrorBoundary>
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
