import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Users,
  Target,
  Zap,
  Shield,
  Award,
  Activity,
  Clock,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Download,
  Share2,
  Printer,
  BarChart3,
  PieChart,
  LineChart,
  Brain,
  Briefcase,
  Globe,
  MessageSquare,
  Lightbulb,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement
} from 'chart.js';
import { Radar, Bar, Doughnut, Line } from 'react-chartjs-2';
import './ExecutiveAnalysisView.css';

// Register ChartJS components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement
);

const ExecutiveAnalysisView = ({ analysis, loading }) => {
  const [activeSection, setActiveSection] = useState('summary');
  const [expandedItems, setExpandedItems] = useState({});

  if (loading) {
    return (
      <div className="executive-analysis-loading">
        <div className="loading-spinner"></div>
        <h3>Generating Executive Analysis...</h3>
        <p>Analyzing competitive landscape, customer insights, and strategic opportunities</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="executive-analysis-error">
        <AlertCircle size={48} />
        <h3>No Analysis Available</h3>
        <p>Unable to generate executive analysis. Please try again.</p>
      </div>
    );
  }

  const toggleExpanded = (key) => {
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Prepare chart data
  const competitorRatingsData = {
    labels: Object.keys(analysis.competitiveAnalysis.benchmarks),
    datasets: [{
      label: 'App Store Rating',
      data: Object.values(analysis.competitiveAnalysis.benchmarks).map(b => b.rating),
      backgroundColor: [
        '#22c55e', '#3b82f6', '#eab308', '#8b5cf6', '#ec4899',
        '#f97316', '#06b6d4', '#6366f1', '#84cc16', '#f59e0b'
      ]
    }]
  };

  const roiComparisonData = {
    labels: Object.keys(analysis.roiAnalysis.calculations),
    datasets: [{
      label: 'ROI %',
      data: Object.values(analysis.roiAnalysis.calculations).map(calc => calc.roi),
      backgroundColor: '#3b82f6',
      borderColor: '#2563eb',
      borderWidth: 1
    }]
  };

  const segmentSatisfactionData = {
    labels: Object.keys(analysis.customerSegmentation.insights),
    datasets: [{
      label: 'Satisfaction Score',
      data: Object.values(analysis.customerSegmentation.insights).map(s => s.satisfaction),
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: '#3b82f6',
      pointBackgroundColor: '#3b82f6',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: '#3b82f6'
    }]
  };

  const kpiGapsData = {
    labels: ['Crash-free Rate', 'Load Time', 'Command Speed', 'DAU', 'NPS', 'Support Tickets'],
    datasets: [
      {
        label: 'Current',
        data: [65, 4.5, 8.0, 15, -5, 40],
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        borderColor: '#ef4444'
      },
      {
        label: 'Industry Best',
        data: [99.9, 1.5, 2.0, 45, 50, 5],
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        borderColor: '#22c55e'
      }
    ]
  };

  const renderExecutiveSummary = () => (
    <div className="executive-summary-section">
      <div className="summary-header">
        <h2>Executive Summary</h2>
        <div className="summary-actions">
          <button className="action-btn"><Download size={16} /> Export PDF</button>
          <button className="action-btn"><Share2 size={16} /> Share</button>
        </div>
      </div>

      <div className="critical-alert">
        <AlertTriangle size={24} />
        <div className="alert-content">
          <h4>Critical Business Impact</h4>
          <p>{analysis.executiveSummary.overview}</p>
        </div>
      </div>

      <div className="key-metrics-grid">
        <div className="metric-card negative">
          <div className="metric-icon"><TrendingDown /></div>
          <div className="metric-content">
            <h4>Market Position</h4>
            <p className="metric-value">5th of 10</p>
            <p className="metric-change">↓ 2 positions YoY</p>
          </div>
        </div>
        <div className="metric-card warning">
          <div className="metric-icon"><DollarSign /></div>
          <div className="metric-content">
            <h4>Revenue at Risk</h4>
            <p className="metric-value">$2-3M</p>
            <p className="metric-change">Annual subscription loss</p>
          </div>
        </div>
        <div className="metric-card negative">
          <div className="metric-icon"><Users /></div>
          <div className="metric-content">
            <h4>User Impact</h4>
            <p className="metric-value">150K+</p>
            <p className="metric-change">Users affected by crashes</p>
          </div>
        </div>
        <div className="metric-card positive">
          <div className="metric-icon"><Target /></div>
          <div className="metric-content">
            <h4>ROI Potential</h4>
            <p className="metric-value">1700%</p>
            <p className="metric-change">From stability fixes</p>
          </div>
        </div>
      </div>

      <div className="findings-section">
        <h3>Key Findings</h3>
        <div className="findings-grid">
          {analysis.executiveSummary.keyFindings.map((finding, index) => (
            <div key={index} className="finding-item">
              <div className="finding-number">{index + 1}</div>
              <p>{finding}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="urgent-actions">
        <h3>Urgent Actions Required</h3>
        <div className="actions-timeline">
          {analysis.executiveSummary.urgentActions.map((action, index) => (
            <div key={index} className="action-item urgent">
              <div className="action-icon"><Zap /></div>
              <div className="action-content">
                <h4>{action}</h4>
                <p className="action-timeline">Within {index === 0 ? '72 hours' : `${(index + 1) * 3} days`}</p>
              </div>
              <ChevronRight className="action-arrow" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCompetitiveAnalysis = () => (
    <div className="competitive-analysis-section">
      <h2>Competitive Landscape Analysis</h2>
      
      <div className="market-position-card">
        <h3>Market Position</h3>
        <p className="position-summary">{analysis.competitiveAnalysis.marketPosition}</p>
        
        <div className="competitor-chart">
          <Bar
            data={competitorRatingsData}
            options={{
              responsive: true,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (context) => `Rating: ${context.parsed.y}/5`
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 5,
                  ticks: {
                    stepSize: 1
                  }
                }
              }
            }}
          />
        </div>
      </div>

      <div className="competitive-gaps">
        <h3>Critical Feature Gaps</h3>
        <div className="gaps-grid">
          {analysis.competitiveAnalysis.competitiveGaps.map((gap, index) => (
            <div key={index} className="gap-item">
              <XCircle className="gap-icon" />
              <p>{gap}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="competitor-strengths">
        <h3>Competitor Best Practices</h3>
        <div className="competitor-accordion">
          {Object.entries(analysis.competitiveAnalysis.benchmarks).slice(0, 5).map(([name, data]) => (
            <div key={name} className="competitor-item">
              <div 
                className="competitor-header"
                onClick={() => toggleExpanded(`comp-${name}`)}
              >
                <div className="competitor-info">
                  <h4>{name}</h4>
                  <div className="competitor-stats">
                    <span className="rating">★ {data.rating}</span>
                    <span className="downloads">{data.downloads} downloads</span>
                  </div>
                </div>
                {expandedItems[`comp-${name}`] ? <ChevronDown /> : <ChevronRight />}
              </div>
              {expandedItems[`comp-${name}`] && (
                <div className="competitor-details">
                  <div className="strengths-list">
                    <h5>Key Strengths:</h5>
                    {data.strengths.slice(0, 3).map((strength, idx) => (
                      <p key={idx}>• {strength}</p>
                    ))}
                  </div>
                  <div className="user-quotes">
                    <h5>User Feedback:</h5>
                    <blockquote>"{data.userQuotes[0]}"</blockquote>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderKPIFramework = () => (
    <div className="kpi-framework-section">
      <h2>KPI Framework & Targets</h2>
      
      <div className="kpi-comparison-chart">
        <h3>Performance vs Industry Benchmarks</h3>
        <Radar
          data={kpiGapsData}
          options={{
            responsive: true,
            scales: {
              r: {
                beginAtZero: true,
                max: 100
              }
            }
          }}
        />
      </div>

      <div className="kpi-targets">
        <h3>Success Metrics & Targets</h3>
        <div className="targets-grid">
          {Object.entries(analysis.successMetrics).map(([phase, metrics]) => (
            <div key={phase} className="target-phase">
              <h4>{phase.charAt(0).toUpperCase() + phase.slice(1)} Goals</h4>
              <div className="metrics-list">
                {Object.entries(metrics).slice(0, 3).map(([metric, data]) => (
                  <div key={metric} className="metric-item">
                    <div className="metric-header">
                      <span className="metric-name">{metric}</span>
                      <span className="metric-freq">{data.measurement}</span>
                    </div>
                    <div className="metric-progress">
                      <div className="progress-labels">
                        <span className="current">Current: {data.current}</span>
                        <span className="target">Target: {data.target}</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${Math.min(100, (parseFloat(data.current) / parseFloat(data.target.replace(/[<>%]/g, ''))) * 100)}%`,
                            backgroundColor: phase === 'immediate' ? '#ef4444' : '#3b82f6'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderROIAnalysis = () => (
    <div className="roi-analysis-section">
      <h2>ROI Analysis & Investment Priorities</h2>
      
      <div className="roi-comparison">
        <h3>Feature ROI Comparison</h3>
        <Bar
          data={roiComparisonData}
          options={{
            responsive: true,
            indexAxis: 'y',
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (context) => `ROI: ${context.parsed.x}%`
                }
              }
            },
            scales: {
              x: {
                beginAtZero: true,
                ticks: {
                  callback: (value) => `${value}%`
                }
              }
            }
          }}
        />
      </div>

      <div className="investment-recommendations">
        <h3>Investment Recommendations</h3>
        <div className="investment-cards">
          {Object.entries(analysis.roiAnalysis.calculations).map(([feature, calc]) => (
            <div key={feature} className="investment-card">
              <div className="investment-header">
                <h4>{feature.replace(/([A-Z])/g, ' $1').trim()}</h4>
                <span className={`roi-badge ${calc.roi > 500 ? 'high' : calc.roi > 200 ? 'medium' : 'low'}`}>
                  {calc.roi}% ROI
                </span>
              </div>
              <div className="investment-details">
                <div className="detail-row">
                  <span>Investment:</span>
                  <strong>${(calc.cost / 1000).toFixed(0)}K</strong>
                </div>
                <div className="detail-row">
                  <span>Timeline:</span>
                  <strong>{calc.timeline}</strong>
                </div>
                <div className="detail-row">
                  <span>Payback:</span>
                  <strong>{calc.paybackPeriod}</strong>
                </div>
                <div className="detail-row">
                  <span>Impact:</span>
                  <strong>{calc.impactedUsers.toLocaleString()} users</strong>
                </div>
              </div>
              <div className="investment-benefits">
                <h5>Expected Benefits:</h5>
                <ul>
                  {Object.entries(calc.benefits).slice(0, 3).map(([benefit, value]) => (
                    <li key={benefit}>
                      {benefit.replace(/([A-Z])/g, ' $1').trim()}: {
                        typeof value === 'number' ? value.toLocaleString() : value
                      }
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCustomerInsights = () => (
    <div className="customer-insights-section">
      <h2>Customer Segmentation & Voice of Customer</h2>
      
      <div className="segment-analysis">
        <h3>Customer Segment Analysis</h3>
        <div className="segment-chart">
          <Radar
            data={segmentSatisfactionData}
            options={{
              responsive: true,
              scales: {
                r: {
                  beginAtZero: true,
                  max: 5,
                  ticks: {
                    stepSize: 1
                  }
                }
              }
            }}
          />
        </div>
        
        <div className="segment-cards">
          {Object.entries(analysis.customerSegmentation.insights).map(([segment, data]) => (
            <div key={segment} className="segment-card">
              <div className="segment-header">
                <h4>{segment.replace(/([A-Z])/g, ' $1').trim()}</h4>
                <span className="segment-size">{data.percentage}%</span>
              </div>
              <div className="segment-metrics">
                <div className="satisfaction-score">
                  <span>Satisfaction</span>
                  <strong className={data.satisfaction < 3 ? 'negative' : data.satisfaction < 4 ? 'warning' : 'positive'}>
                    {data.satisfaction.toFixed(1)}/5
                  </strong>
                </div>
                <div className="churn-risk">
                  <span>Churn Risk</span>
                  <strong className={`risk-${data.churnRisk.toLowerCase().replace(' ', '-')}`}>
                    {data.churnRisk}
                  </strong>
                </div>
              </div>
              <div className="segment-needs">
                <h5>Key Needs:</h5>
                <ul>
                  {data.keyNeeds.slice(0, 2).map((need, idx) => (
                    <li key={idx}>{need}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="voice-of-customer">
        <h3>Voice of Customer - Actual Reviews</h3>
        <div className="voc-categories">
          {Object.entries(analysis.voiceOfCustomer.quotes).map(([category, quotes]) => (
            <div key={category} className="voc-category">
              <h4>{category.charAt(0).toUpperCase() + category.slice(1)}</h4>
              <div className="quotes-list">
                {quotes.slice(0, 2).map((quote, idx) => (
                  <blockquote key={idx} className="customer-quote">
                    <MessageSquare className="quote-icon" />
                    <p>{quote}</p>
                  </blockquote>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderImplementationRoadmap = () => (
    <div className="implementation-roadmap-section">
      <h2>Implementation Roadmap</h2>
      
      <div className="roadmap-timeline">
        {Object.entries(analysis.implementation.roadmap).map(([phase, data]) => (
          <div key={phase} className="roadmap-phase">
            <div className="phase-header">
              <h3>{data.phase}</h3>
              <span className="phase-timeline">{data.timeline}</span>
            </div>
            <div className="phase-goals">
              <h4>Goals:</h4>
              <ul>
                {data.goals.map((goal, idx) => (
                  <li key={idx}>{goal}</li>
                ))}
              </ul>
            </div>
            <div className="phase-actions">
              <h4>Key Actions:</h4>
              <div className="actions-list">
                {data.actions.map((action, idx) => (
                  <div key={idx} className="roadmap-action">
                    <div className="action-header">
                      <h5>{action.item}</h5>
                      <span className="action-effort">{action.effort}</span>
                    </div>
                    <div className="action-details">
                      <span className="action-owner">{action.owner}</span>
                      <span className="action-success">{action.successCriteria}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="dependencies-resources">
        <div className="dependencies">
          <h3>Critical Dependencies</h3>
          <div className="dependency-categories">
            {Object.entries(analysis.implementation.dependencies()).map(([category, deps]) => (
              <div key={category} className="dependency-category">
                <h4>{category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                <ul>
                  {deps.map((dep, idx) => (
                    <li key={idx}>{dep}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="resource-needs">
          <h3>Resource Requirements</h3>
          <div className="resource-phases">
            {Object.entries(analysis.implementation.resources()).map(([phase, resources]) => (
              <div key={phase} className="resource-phase">
                <h4>{phase.charAt(0).toUpperCase() + phase.slice(1)}</h4>
                <div className="resource-details">
                  <p><strong>Team Size:</strong> {resources.developers || resources.team} people</p>
                  <p><strong>Duration:</strong> {resources.weeks || resources.months} {resources.weeks ? 'weeks' : 'months'}</p>
                  <p><strong>Budget:</strong> {resources.budget}</p>
                  <p><strong>Focus:</strong> {resources.focus}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderRiskAssessment = () => (
    <div className="risk-assessment-section">
      <h2>Risk Assessment & Mitigation</h2>
      
      <div className="risk-matrix">
        <h3>Risk Matrix</h3>
        <div className="risk-categories">
          {Object.entries(analysis.riskAssessment.matrix).map(([category, risks]) => (
            <div key={category} className="risk-category">
              <h4>{category.charAt(0).toUpperCase() + category.slice(1)} Risks</h4>
              <div className="risks-grid">
                {risks.map((risk, idx) => (
                  <div key={idx} className={`risk-item risk-${risk.impact.toLowerCase()}`}>
                    <div className="risk-header">
                      <h5>{risk.risk}</h5>
                      <div className="risk-badges">
                        <span className={`probability-badge ${risk.probability.toLowerCase()}`}>
                          {risk.probability} Probability
                        </span>
                        <span className={`impact-badge ${risk.impact.toLowerCase()}`}>
                          {risk.impact} Impact
                        </span>
                      </div>
                    </div>
                    <div className="risk-details">
                      {risk.costOfInaction && (
                        <p className="cost-of-inaction">
                          <AlertCircle size={16} />
                          Cost of Inaction: {risk.costOfInaction}
                        </p>
                      )}
                      {risk.recommendedActions && (
                        <div className="recommended-actions">
                          <h6>Recommended Actions:</h6>
                          <ul>
                            {risk.recommendedActions.slice(0, 3).map((action, actionIdx) => (
                              <li key={actionIdx}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStrategicRecommendations = () => (
    <div className="strategic-recommendations-section">
      <h2>Strategic Recommendations</h2>
      
      <div className="recommendations-timeline">
        {Object.entries(analysis.recommendations).map(([timeframe, recommendations]) => (
          <div key={timeframe} className="recommendation-timeframe">
            <h3>{timeframe.charAt(0).toUpperCase() + timeframe.slice(1).replace(/([A-Z])/g, ' $1')}</h3>
            <div className="recommendations-list">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="recommendation-card">
                  <div className="rec-header">
                    <h4>{rec.action}</h4>
                    <div className="rec-badges">
                      <span className={`effort-badge ${rec.effort.toLowerCase()}`}>
                        {rec.effort} Effort
                      </span>
                      <span className="timeline-badge">
                        {rec.timeline}
                      </span>
                    </div>
                  </div>
                  <div className="rec-details">
                    <p className="rec-impact">
                      <Target size={16} />
                      {rec.impact}
                    </p>
                    {rec.owner && (
                      <p className="rec-owner">
                        <Users size={16} />
                        Owner: {rec.owner}
                      </p>
                    )}
                    {rec.successCriteria && (
                      <p className="rec-success">
                        <CheckCircle size={16} />
                        Success: {rec.successCriteria}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const sections = {
    summary: { label: 'Executive Summary', icon: Briefcase, render: renderExecutiveSummary },
    competitive: { label: 'Competitive Analysis', icon: Globe, render: renderCompetitiveAnalysis },
    kpi: { label: 'KPI Framework', icon: BarChart3, render: renderKPIFramework },
    roi: { label: 'ROI Analysis', icon: DollarSign, render: renderROIAnalysis },
    customers: { label: 'Customer Insights', icon: Users, render: renderCustomerInsights },
    roadmap: { label: 'Implementation Roadmap', icon: Activity, render: renderImplementationRoadmap },
    risk: { label: 'Risk Assessment', icon: Shield, render: renderRiskAssessment },
    recommendations: { label: 'Strategic Recommendations', icon: Lightbulb, render: renderStrategicRecommendations }
  };

  return (
    <div className="executive-analysis-view">
      <div className="analysis-navigation">
        <h2>Executive Analysis</h2>
        <div className="nav-items">
          {Object.entries(sections).map(([key, section]) => {
            const Icon = section.icon;
            return (
              <button
                key={key}
                className={`nav-item ${activeSection === key ? 'active' : ''}`}
                onClick={() => setActiveSection(key)}
              >
                <Icon size={18} />
                <span>{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="analysis-content">
        {sections[activeSection].render()}
      </div>

      <div className="analysis-footer">
        <div className="footer-actions">
          <button className="primary-action">
            <Download size={16} />
            Export Full Report
          </button>
          <button className="secondary-action">
            <Printer size={16} />
            Print Executive Brief
          </button>
          <button className="secondary-action">
            <Share2 size={16} />
            Share with Stakeholders
          </button>
        </div>
        <div className="footer-info">
          <p>Generated on {new Date().toLocaleDateString()} | Confidential - Executive Use Only</p>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveAnalysisView;