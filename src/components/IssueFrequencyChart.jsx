import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, Treemap
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertTriangle, Bug, DollarSign, Users, HeartHandshake, Settings } from 'lucide-react';

const CATEGORY_COLORS = {
  technical: '#ef4444',
  usability: '#f97316',
  pricing: '#f59e0b',
  features: '#10b981',
  support: '#3b82f6',
  other: '#8b5cf6'
};

const CATEGORY_ICONS = {
  technical: Bug,
  usability: Settings,
  pricing: DollarSign,
  features: HeartHandshake,
  support: Users,
  other: AlertTriangle
};

const IssueFrequencyChart = ({ userAnalysis, competitorAnalysis, userAppName, competitorAppName }) => {
  // Prepare data for issue frequency comparison
  const issueFrequencyData = useMemo(() => {
    if (!userAnalysis || !competitorAnalysis) return [];
    
    const categories = Object.keys(userAnalysis.painPoints);
    
    return categories.map(category => {
      const userCount = userAnalysis.painPoints[category].count;
      const competitorCount = competitorAnalysis.painPoints[category].count;
      const userRate = (userCount / userAnalysis.totalReviews) * 100;
      const competitorRate = (competitorCount / competitorAnalysis.totalReviews) * 100;
      
      return {
        category: category.charAt(0).toUpperCase() + category.slice(1),
        categoryKey: category,
        [userAppName]: userRate,
        [competitorAppName]: competitorRate,
        userCount,
        competitorCount,
        difference: userRate - competitorRate
      };
    }).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
  }, [userAnalysis, competitorAnalysis, userAppName, competitorAppName]);

  // Prepare treemap data for issue distribution
  const treemapData = useMemo(() => {
    if (!userAnalysis) return [];
    
    return Object.entries(userAnalysis.painPoints).map(([category, data]) => {
      const subcategories = Object.entries(data.subcategories).map(([subcat, subcatData]) => ({
        name: subcat,
        size: subcatData.count,
        category,
        percentage: ((subcatData.count / userAnalysis.totalReviews) * 100).toFixed(1)
      }));
      
      return {
        name: category,
        children: subcategories,
        color: CATEGORY_COLORS[category]
      };
    });
  }, [userAnalysis]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="issue-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="tooltip-entry">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span>{entry.value.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const TreemapContent = ({ x, y, width, height, name, percentage }) => {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: '#f8fafc',
            stroke: '#e2e8f0',
            strokeWidth: 2
          }}
        />
        <text
          x={x + width / 2}
          y={y + height / 2 - 8}
          textAnchor="middle"
          fill="#1e293b"
          fontSize="12"
          fontWeight="600"
        >
          {name}
        </text>
        <text
          x={x + width / 2}
          y={y + height / 2 + 8}
          textAnchor="middle"
          fill="#64748b"
          fontSize="11"
        >
          {percentage}%
        </text>
      </g>
    );
  };

  return (
    <div className="issue-frequency-analysis">
      {/* Main Comparison Chart */}
      <Card className="issue-chart-card">
        <CardHeader>
          <CardTitle>Issue Category Frequency Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={issueFrequencyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis label={{ value: 'Percentage of Reviews (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey={userAppName} fill="#3b82f6" />
              <Bar dataKey={competitorAppName} fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Issue Distribution Grid */}
      <div className="issue-distribution-grid">
        {issueFrequencyData.map(({ category, categoryKey, difference, userCount, competitorCount }) => {
          const Icon = CATEGORY_ICONS[categoryKey] || AlertTriangle;
          const isWorse = difference > 2;
          const isBetter = difference < -2;
          
          return (
            <Card key={categoryKey} className={`issue-stat-card ${isWorse ? 'worse' : isBetter ? 'better' : ''}`}>
              <CardHeader>
                <CardTitle className="issue-stat-title">
                  <Icon size={20} />
                  {category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="issue-stats">
                  <div className="stat-row">
                    <span className="stat-label">Your App</span>
                    <span className="stat-value">{userCount} issues</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Competitor</span>
                    <span className="stat-value">{competitorCount} issues</span>
                  </div>
                  <div className="stat-difference">
                    {isWorse ? (
                      <span className="worse-indicator">↑ {Math.abs(difference).toFixed(1)}% worse</span>
                    ) : isBetter ? (
                      <span className="better-indicator">↓ {Math.abs(difference).toFixed(1)}% better</span>
                    ) : (
                      <span className="neutral-indicator">≈ Similar</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Issue Distribution Treemap */}
      <Card className="treemap-card">
        <CardHeader>
          <CardTitle>Your App's Issue Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <Treemap
              data={treemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#e2e8f0"
              content={<TreemapContent />}
            >
              {treemapData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Treemap>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default IssueFrequencyChart;