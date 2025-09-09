import React, { useState, useRef } from 'react';
import { 
  Upload, Download, Shield, Zap, Database, 
  ChevronRight, Sparkles, Globe, Lock, FileText,
  BarChart3, Brain, TrendingUp, MessageSquare,
  Users, Target, Layers, Activity
} from 'lucide-react';
import FileUpload from './FileUpload';
import AppleImport from './AppleImport';
import './UploadPage.css';

const features = [
  {
    icon: <Brain className="feature-icon" />,
    title: "AI-Powered Insights",
    description: "Advanced sentiment analysis with Gemini AI"
  },
  {
    icon: <Globe className="feature-icon" />,
    title: "Real-Time Web Search",
    description: "Monitor Reddit, HackerNews for viral posts"
  },
  {
    icon: <BarChart3 className="feature-icon" />,
    title: "Interactive Analytics",
    description: "Beautiful visualizations and trends"
  },
  {
    icon: <Shield className="feature-icon" />,
    title: "Secure & Private",
    description: "Your data stays protected"
  }
];

const stats = [
  { number: "10K+", label: "Reviews Analyzed" },
  { number: "95%", label: "Accuracy Rate" },
  { number: "2.5s", label: "Avg. Processing" },
  { number: "24/7", label: "Monitoring" }
];

const UploadPage = ({ onFileUpload, onAppleImport, isLoading, error }) => {
  const [activeTab, setActiveTab] = useState('excel');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDownloadSample = () => {
    // Import the existing download function
    import('../utils/sampleDataGenerator').then(({ downloadSampleExcel }) => {
      downloadSampleExcel();
    });
  };

  return (
    <div className="upload-page">
      {/* Background Effects */}
      <div className="background-effects">
        <div className="gradient-orb orb-1" />
        <div className="gradient-orb orb-2" />
        <div className="gradient-orb orb-3" />
        <div className="grid-pattern" />
      </div>

      {/* Hero Section */}
      <div className="upload-hero">
        <div className="hero-badge">
          <Sparkles size={16} />
          <span>Powered by Gemini AI</span>
        </div>
        
        <h1 className="hero-title">
          Transform Your App Reviews Into
          <span className="gradient-text"> Actionable Intelligence</span>
        </h1>
        
        <p className="hero-subtitle">
          Upload your review data and unlock powerful AI-driven insights, sentiment analysis, 
          and real-time influence detection from social media.
        </p>

        {/* Stats Bar */}
        <div className="stats-bar">
          {stats.map((stat, index) => (
            <div key={index} className="stat-item">
              <div className="stat-number">{stat.number}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Upload Section */}
      <div className="upload-container">
        <div className="upload-card">
          {/* Tab Navigation */}
          <div className="upload-tabs">
            <button 
              className={`tab-button ${activeTab === 'excel' ? 'active' : ''}`}
              onClick={() => setActiveTab('excel')}
            >
              <FileText size={18} />
              Upload Excel
            </button>
            <button 
              className={`tab-button ${activeTab === 'apple' ? 'active' : ''}`}
              onClick={() => setActiveTab('apple')}
            >
              <Database size={18} />
              Import from App Store
            </button>
          </div>

          {/* Upload Content */}
          <div className="upload-content">
            {activeTab === 'excel' ? (
              <div className="excel-upload-section">
                <div 
                  className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
                  onDragEnter={() => setIsDragging(true)}
                  onDragLeave={() => setIsDragging(false)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) onFileUpload(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) onFileUpload(file);
                    }}
                    style={{ display: 'none' }}
                  />
                  
                  <div className="dropzone-content">
                    <div className="upload-icon-wrapper">
                      <Upload size={48} />
                    </div>
                    <h3>Drop your Excel file here</h3>
                    <p>or click to browse from your computer</p>
                    <div className="file-formats">
                      <span className="format-badge">.xlsx</span>
                      <span className="format-badge">.xls</span>
                      <span className="format-badge">.csv</span>
                    </div>
                  </div>
                </div>

                <button 
                  className="sample-download-btn"
                  onClick={handleDownloadSample}
                >
                  <Download size={18} />
                  Download Sample Format
                </button>
              </div>
            ) : (
              <div className="apple-import-section">
                <AppleImport 
                  onImport={onAppleImport}
                  className="styled-apple-import"
                />
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="upload-loading">
                <div className="loading-spinner">
                  <Activity className="spinner-icon" />
                </div>
                <p>Processing your review data...</p>
                <div className="loading-progress">
                  <div className="progress-bar" />
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="upload-error">
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="features-section">
          <h2 className="features-title">What you'll get</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon-wrapper">
                  {feature.icon}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="trust-section">
        <div className="trust-badge">
          <Lock size={16} />
          <span>Enterprise-grade security</span>
        </div>
        <div className="trust-badge">
          <Zap size={16} />
          <span>Lightning fast processing</span>
        </div>
        <div className="trust-badge">
          <Shield size={16} />
          <span>GDPR compliant</span>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;