import React, { useMemo } from 'react';
import {
  Sankey, Treemap, AreaChart, Area, ComposedChart, 
  Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  TrendingUp, TrendingDown, Target, Zap, AlertCircle,
  CheckCircle, Info, ArrowRight, Star, Activity
} from 'lucide-react';
import './CompetitiveInsightsVisualizer.css';

const COLORS = {
  primary: '#3b82f6',
  secondary: '#f97316',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  gradient: ['#3b82f6', '#8b5cf6', '#ec4899']
};

const CompetitiveInsightsVisualizer = ({ analysis, userAppName, competitorAppName }) => {
  // Prepare Sankey diagram data for feature flow
  const sankeyData = useMemo(() => {
    if (!analysis || !analysis.comparison) return { nodes: [], links: [] };
    
    const nodes = [
      { name: `${userAppName} Strengths` },
      { name: `${competitorAppName} Strengths` },
      { name: 'Market Opportunities' },
      { name: 'Common Challenges' },
      { name: 'Action Items' }
    ];
    
    const links = [
      {
        source: 0,
        target: 2,
        value: analysis.comparison.userStrengths?.length || 0
      },
      {
        source: 1,
        target: 3,
        value: analysis.comparison.competitorStrengths?.length || 0
      },
      {
        source: 2,
        target: 4,
        value: analysis.comparison.opportunities?.length || 0
      },
      {
        source: 3,
        target: 4,
        value: analysis.comparison.commonIssues?.length || 0
      }
    ];
    
    return { nodes, links };
  }, [analysis, userAppName, competitorAppName]);

  // Prepare competitive positioning matrix
  const positioningData = useMemo(() => {
    if (!analysis) return [];
    
    const categories = ['Performance', 'Features', 'Usability', 'Support', 'Value'];
    return categories.map(category => {
      const userScore = Math.random() * 40 + 60; // Simulated scores
      const competitorScore = Math.random() * 40 + 60;
      
      return {
        category,
        [userAppName]: userScore,
        [competitorAppName]: competitorScore,
        gap: userScore - competitorScore
      };
    });
  }, [analysis, userAppName, competitorAppName]);

  // Prepare opportunity impact matrix
  const opportunityMatrix = useMemo(() => {
    if (!analysis || !analysis.comparison) return [];
    
    return (analysis.comparison.opportunities || []).map((opp, index) => ({
      id: index,
      name: opp.category || `Opportunity ${index + 1}`,
      impact: Math.random() * 50 + 50,
      effort: Math.random() * 50 + 50,
      value: Math.random() * 100,
      description: opp.description
    }));
  }, [analysis]);

  // Custom tooltip for rich information
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-rich-tooltip">
          <p className="tooltip-title">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="tooltip-entry">
              <span className="tooltip-dot" style={{ backgroundColor: entry.color }} />
              <span className="tooltip-name">{entry.name}:</span>
              <span className="tooltip-value">{entry.value.toFixed(1)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Render opportunity bubble
  const renderOpportunityBubble = (props) => {
    const { cx, cy, payload } = props;
    const size = payload.value / 2;
    
    return (
      <g>
        <circle 
          cx={cx} 
          cy={cy} 
          r={size} 
          fill={COLORS.success}
          fillOpacity={0.6}
          stroke={COLORS.success}
          strokeWidth={2}
        />
        <text 
          x={cx} 
          y={cy} 
          textAnchor="middle" 
          fill="#fff" 
          fontSize="12"
          fontWeight="600"
        >
          {payload.name}
        </text>
      </g>
    );
  };

  return (
    <div className="competitive-insights-visualizer">
      {/* Competitive Positioning Matrix */}
      <Card className="visualization-card">
        <CardHeader>
          <CardTitle className="viz-title">
            <Target size={20} />
            Competitive Positioning Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={positioningData}>
              <defs>
                <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="competitorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey={userAppName} 
                fill="url(#userGradient)" 
                stroke={COLORS.primary}
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey={competitorAppName} 
                fill="url(#competitorGradient)" 
                stroke={COLORS.secondary}
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="gap" 
                stroke={COLORS.purple}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: COLORS.purple, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          
          {/* Position Summary */}
          <div className="position-summary">
            <div className="position-stat">
              <CheckCircle size={16} />
              <span>Leading in {positioningData.filter(d => d.gap > 0).length} categories</span>
            </div>
            <div className="position-stat">
              <AlertCircle size={16} />
              <span>Behind in {positioningData.filter(d => d.gap < 0).length} categories</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opportunity Impact Matrix */}
      <Card className="visualization-card">
        <CardHeader>
          <CardTitle className="viz-title">
            <Zap size={20} />
            Opportunity Impact vs Effort Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="matrix-container">
            <div className="matrix-grid">
              <div className="matrix-quadrant q1">
                <h4>Quick Wins</h4>
                <p>High Impact, Low Effort</p>
              </div>
              <div className="matrix-quadrant q2">
                <h4>Major Projects</h4>
                <p>High Impact, High Effort</p>
              </div>
              <div className="matrix-quadrant q3">
                <h4>Fill Ins</h4>
                <p>Low Impact, Low Effort</p>
              </div>
              <div className="matrix-quadrant q4">
                <h4>Questionable</h4>
                <p>Low Impact, High Effort</p>
              </div>
              
              {/* Plot opportunities */}
              {opportunityMatrix.map((opp, index) => (
                <div
                  key={opp.id}
                  className="opportunity-dot"
                  style={{
                    left: `${opp.effort}%`,
                    bottom: `${opp.impact}%`,
                    backgroundColor: COLORS.gradient[index % 3],
                  }}
                  title={opp.description}
                >
                  <span>{index + 1}</span>
                </div>
              ))}
            </div>
            
            {/* Matrix axes */}
            <div className="matrix-axis-x">
              <span>Low Effort</span>
              <ArrowRight size={20} />
              <span>High Effort</span>
            </div>
            <div className="matrix-axis-y">
              <span>High Impact</span>
              <TrendingUp size={20} />
              <span>Low Impact</span>
            </div>
          </div>
          
          {/* Opportunity Legend */}
          <div className="opportunity-legend">
            {opportunityMatrix.slice(0, 5).map((opp, index) => (
              <div key={opp.id} className="legend-item">
                <span 
                  className="legend-dot" 
                  style={{ backgroundColor: COLORS.gradient[index % 3] }}
                >
                  {index + 1}
                </span>
                <span className="legend-text">{opp.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Trend Visualization */}
      <Card className="visualization-card full-width">
        <CardHeader>
          <CardTitle className="viz-title">
            <Activity size={20} />
            Performance Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={generateTrendData()}>
              <defs>
                <linearGradient id="colorUser" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCompetitor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="user" 
                stroke={COLORS.primary} 
                fillOpacity={1} 
                fill="url(#colorUser)"
                strokeWidth={2}
                name={userAppName}
              />
              <Area 
                type="monotone" 
                dataKey="competitor" 
                stroke={COLORS.secondary} 
                fillOpacity={1} 
                fill="url(#colorCompetitor)"
                strokeWidth={2}
                name={competitorAppName}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Action Priority Treemap */}
      <Card className="visualization-card">
        <CardHeader>
          <CardTitle className="viz-title">
            <Star size={20} />
            Action Priority Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <Treemap
              data={generateTreemapData()}
              dataKey="size"
              aspectRatio={4/3}
              stroke="#fff"
              fill="#8884d8"
            >
              {generateTreemapData().map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS.gradient[index % 3]} />
              ))}
            </Treemap>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper function to generate trend data
function generateTrendData() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map(month => ({
    month,
    user: Math.random() * 30 + 70,
    competitor: Math.random() * 30 + 65
  }));
}

// Helper function to generate treemap data
function generateTreemapData() {
  return [
    {
      name: 'Fix Critical Bugs',
      size: 3000,
      priority: 'high'
    },
    {
      name: 'Improve UI/UX',
      size: 2500,
      priority: 'high'
    },
    {
      name: 'Add Requested Features',
      size: 2000,
      priority: 'medium'
    },
    {
      name: 'Optimize Performance',
      size: 1500,
      priority: 'medium'
    },
    {
      name: 'Enhance Documentation',
      size: 1000,
      priority: 'low'
    }
  ];
}

export default CompetitiveInsightsVisualizer;