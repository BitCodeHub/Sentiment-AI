import React, { useState, useRef } from 'react';
import { 
  Upload, Download, Shield, Zap, Database, 
  ChevronRight, Sparkles, Globe, Lock, FileText,
  BarChart3, Brain, TrendingUp, MessageSquare,
  Users, Target, Layers, Activity, Star, CheckCircle2,
  Radar, AlertTriangle, Clock, ArrowRight
} from 'lucide-react';
import FileUpload from './FileUpload';
import AppleImport from './AppleImport';
import './UploadPage.css';

const features = [
  {
    icon: <Brain className="feature-icon" />,
    title: "AI-Powered Intelligence",
    subtitle: "Powered by Gemini AI",
    description: "Transform thousands of reviews into actionable insights with advanced sentiment analysis and trend detection. Get executive briefings in seconds.",
    benefits: ["Executive-ready reports", "Sentiment trends", "Issue prioritization"]
  },
  {
    icon: <MessageSquare className="feature-icon" />,
    title: "Reddit Monitoring",
    subtitle: "Social Media Intelligence",
    description: "Detect viral discussions about your app across Reddit communities. Catch issues before they explode and identify opportunities for growth.",
    benefits: ["Early issue detection", "Viral post monitoring", "Community sentiment"]
  },
  {
    icon: <BarChart3 className="feature-icon" />,
    title: "Interactive Analytics",
    subtitle: "Beautiful Dashboards",
    description: "Stunning visualizations that make complex data simple to understand. Filter by date, rating, platform, and more with lightning-fast performance.",
    benefits: ["Real-time filtering", "Custom date ranges", "Export capabilities"]
  },
  {
    icon: <Shield className="feature-icon" />,
    title: "Enterprise Security",
    subtitle: "Bank-level Protection",
    description: "Your data stays secure with enterprise-grade encryption and privacy controls. GDPR compliant with full audit trails.",
    benefits: ["End-to-end encryption", "GDPR compliant", "Audit trails"]
  }
];

const stats = [
  { number: "50K+", label: "Reviews Analyzed" },
  { number: "99.2%", label: "Accuracy Rate" },
  { number: "1.8s", label: "Avg. Processing" },
  { number: "24/7", label: "Reddit Monitoring" }
];

const socialProof = [
  {
    company: "TechCorp",
    logo: "🚀",
    testimonial: "This tool helped us identify critical issues 3 days before they hit social media. Game changer for our product team.",
    author: "Sarah Johnson",
    role: "VP of Product"
  },
  {
    company: "MobileFirst",
    logo: "📱",
    testimonial: "The Reddit monitoring feature caught a viral complaint before it exploded. Saved us thousands in potential churn.",
    author: "Mike Chen", 
    role: "Head of Customer Success"
  },
  {
    company: "ScaleUp",
    logo: "⚡",
    testimonial: "Beautiful analytics and executive briefings that actually help us make decisions. Worth every penny.",
    author: "Emily Rodriguez",
    role: "CEO"
  }
];

const trustedBy = [
  { name: "TechCorp", logo: "🚀" },
  { name: "MobileFirst", logo: "📱" },
  { name: "ScaleUp", logo: "⚡" },
  { name: "GrowthCo", logo: "📈" },
  { name: "InnovateTech", logo: "🔬" },
  { name: "DataDriven", logo: "📊" }
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
          <span>Now with Reddit Monitoring</span>
        </div>
        
        <h1 className="hero-title">
          Turn App Reviews Into
          <span className="gradient-text"> Strategic Intelligence</span>
        </h1>
        
        <p className="hero-subtitle">
          Stop drowning in review data. Our AI transforms customer feedback into executive-ready insights, 
          monitors Reddit for viral discussions, and alerts you to issues before they explode.
        </p>

        <div className="hero-benefits">
          <div className="benefit-item">
            <CheckCircle2 size={16} />
            <span>Executive briefings in 30 seconds</span>
          </div>
          <div className="benefit-item">
            <CheckCircle2 size={16} />
            <span>Reddit monitoring & viral detection</span>
          </div>
          <div className="benefit-item">
            <CheckCircle2 size={16} />
            <span>Sentiment trends & issue prioritization</span>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="stats-bar">
          {stats.map((stat, index) => (
            <div key={index} className="stat-item">
              <div className="stat-number">{stat.number}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Trusted By Section */}
        <div className="trusted-by-section">
          <p className="trusted-by-text">Trusted by product teams at</p>
          <div className="trusted-logos">
            {trustedBy.map((company, index) => (
              <div key={index} className="trusted-logo">
                <span className="logo-icon">{company.logo}</span>
                <span className="logo-name">{company.name}</span>
              </div>
            ))}
          </div>
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
              Apple App Store
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
          <div className="features-header">
            <h2 className="features-title">Everything you need to understand your customers</h2>
            <p className="features-subtitle">
              From raw review data to strategic insights in seconds. No more manual analysis or missed opportunities.
            </p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon-wrapper">
                  {feature.icon}
                </div>
                <div className="feature-content">
                  <div className="feature-header">
                    <h3>{feature.title}</h3>
                    <span className="feature-subtitle">{feature.subtitle}</span>
                  </div>
                  <p>{feature.description}</p>
                  <ul className="feature-benefits">
                    {feature.benefits.map((benefit, idx) => (
                      <li key={idx}>
                        <CheckCircle2 size={14} />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Social Proof Section */}
        <div className="social-proof-section">
          <h2 className="section-title">Loved by product teams everywhere</h2>
          <div className="testimonials-grid">
            {socialProof.map((testimonial, index) => (
              <div key={index} className="testimonial-card">
                <div className="testimonial-header">
                  <div className="company-logo">
                    <span>{testimonial.logo}</span>
                    <div className="company-info">
                      <span className="company-name">{testimonial.company}</span>
                    </div>
                  </div>
                  <div className="rating">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} fill="#fbbf24" color="#fbbf24" />
                    ))}
                  </div>
                </div>
                <p className="testimonial-text">"{testimonial.testimonial}"</p>
                <div className="testimonial-author">
                  <span className="author-name">{testimonial.author}</span>
                  <span className="author-role">{testimonial.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="final-cta-section">
        <div className="cta-content">
          <h2>Ready to transform your review data?</h2>
          <p>Join hundreds of product teams using AI-powered insights to make better decisions</p>
          <div className="cta-upload-hint">
            <ArrowRight size={20} />
            <span>Upload your first file above to get started in 30 seconds</span>
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
        <div className="trust-badge">
          <Clock size={16} />
          <span>24/7 Reddit monitoring</span>
        </div>
        <div className="trust-badge">
          <Target size={16} />
          <span>99.2% accuracy</span>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;