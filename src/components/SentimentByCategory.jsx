import React, { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  TrendingUp, TrendingDown, Smile, Frown, Meh,
  ThumbsUp, ThumbsDown, Star, Activity
} from 'lucide-react';

const SENTIMENT_COLORS = {
  positive: '#10b981',
  neutral: '#f59e0b',
  negative: '#ef4444'
};

const CATEGORY_COLORS = {
  technical: '#3b82f6',
  usability: '#8b5cf6',
  pricing: '#ec4899',
  features: '#06b6d4',
  support: '#f97316'
};

const SentimentByCategory = ({ userAnalysis, competitorAnalysis, userAppName, competitorAppName }) => {
  // Calculate sentiment distribution by category
  const sentimentByCategoryData = useMemo(() => {
    if (!userAnalysis || !competitorAnalysis || !userAnalysis.painPoints || !competitorAnalysis.painPoints) return [];
    
    const categories = Object.keys(userAnalysis.painPoints);
    
    return categories.map(category => {
      // For each category, calculate sentiment breakdown
      const userPainPoint = userAnalysis.painPoints[category] || { count: 0 };
      const competitorPainPoint = competitorAnalysis.painPoints[category] || { count: 0 };
      
      // Estimate sentiment distribution (in real app, this would come from actual analysis)
      const userNegativeRate = (userPainPoint.count / userAnalysis.totalReviews) * 100;
      const competitorNegativeRate = (competitorPainPoint.count / competitorAnalysis.totalReviews) * 100;
      
      // Calculate positive rate based on satisfaction data
      const userSatisfaction = userAnalysis.satisfaction[category] || { count: 0 };
      const competitorSatisfaction = competitorAnalysis.satisfaction[category] || { count: 0 };
      
      const userPositiveRate = (userSatisfaction.count / userAnalysis.totalReviews) * 100;
      const competitorPositiveRate = (competitorSatisfaction.count / competitorAnalysis.totalReviews) * 100;
      
      // Neutral is the remainder
      const userNeutralRate = 100 - userNegativeRate - userPositiveRate;
      const competitorNeutralRate = 100 - competitorNegativeRate - competitorPositiveRate;
      
      return {
        category: category.charAt(0).toUpperCase() + category.slice(1),
        userPositive: userPositiveRate,
        userNeutral: userNeutralRate,
        userNegative: userNegativeRate,
        competitorPositive: competitorPositiveRate,
        competitorNeutral: competitorNeutralRate,
        competitorNegative: competitorNegativeRate,
        sentimentScore: userPositiveRate - userNegativeRate,
        competitorScore: competitorPositiveRate - competitorNegativeRate
      };
    });
  }, [userAnalysis, competitorAnalysis]);

  // Prepare stacked bar chart data
  const stackedData = useMemo(() => {
    return sentimentByCategoryData.flatMap(item => [
      {
        category: item.category,
        app: userAppName,
        Positive: item.userPositive,
        Neutral: item.userNeutral,
        Negative: item.userNegative
      },
      {
        category: item.category,
        app: competitorAppName,
        Positive: item.competitorPositive,
        Neutral: item.competitorNeutral,
        Negative: item.competitorNegative
      }
    ]);
  }, [sentimentByCategoryData, userAppName, competitorAppName]);

  // Calculate sentiment score comparison
  const sentimentScoreData = useMemo(() => {
    return sentimentByCategoryData.map(item => ({
      category: item.category,
      [userAppName]: item.sentimentScore,
      [competitorAppName]: item.competitorScore,
      difference: item.sentimentScore - item.competitorScore
    }));
  }, [sentimentByCategoryData, userAppName, competitorAppName]);

  // Prepare radial chart data for overall sentiment
  const radialData = useMemo(() => {
    const avgUserPositive = sentimentByCategoryData.reduce((sum, item) => sum + item.userPositive, 0) / sentimentByCategoryData.length;
    const avgCompetitorPositive = sentimentByCategoryData.reduce((sum, item) => sum + item.competitorPositive, 0) / sentimentByCategoryData.length;
    
    return [
      {
        name: userAppName,
        value: avgUserPositive,
        fill: '#3b82f6'
      },
      {
        name: competitorAppName,
        value: avgCompetitorPositive,
        fill: '#f97316'
      }
    ];
  }, [sentimentByCategoryData, userAppName, competitorAppName]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="sentiment-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="tooltip-item" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="sentiment-by-category">
      {/* Sentiment Score Comparison */}
      <Card className="sentiment-card">
        <CardHeader>
          <CardTitle>
            <Activity size={20} />
            Sentiment Score by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sentimentScoreData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis label={{ value: 'Sentiment Score', angle: -90, position: 'insideLeft' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey={userAppName} fill="#3b82f6" />
              <Bar dataKey={competitorAppName} fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sentiment Distribution Grid */}
      <div className="sentiment-grid">
        {sentimentByCategoryData.map(item => {
          const scoreDiff = item.sentimentScore - item.competitorScore;
          const isWinning = scoreDiff > 5;
          const isLosing = scoreDiff < -5;
          
          return (
            <Card key={item.category} className={`category-sentiment-card ${isWinning ? 'winning' : isLosing ? 'losing' : ''}`}>
              <CardHeader>
                <CardTitle className="category-title">
                  {item.category}
                  {isWinning && <ThumbsUp size={18} className="winning-icon" />}
                  {isLosing && <ThumbsDown size={18} className="losing-icon" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="sentiment-bars">
                  <div className="app-sentiment">
                    <h4>{userAppName}</h4>
                    <div className="sentiment-bar">
                      <div 
                        className="sentiment-segment positive" 
                        style={{ width: `${item.userPositive}%` }}
                        title={`Positive: ${item.userPositive.toFixed(1)}%`}
                      />
                      <div 
                        className="sentiment-segment neutral" 
                        style={{ width: `${item.userNeutral}%` }}
                        title={`Neutral: ${item.userNeutral.toFixed(1)}%`}
                      />
                      <div 
                        className="sentiment-segment negative" 
                        style={{ width: `${item.userNegative}%` }}
                        title={`Negative: ${item.userNegative.toFixed(1)}%`}
                      />
                    </div>
                    <div className="sentiment-stats">
                      <span className="positive-stat">
                        <Smile size={14} />
                        {item.userPositive.toFixed(0)}%
                      </span>
                      <span className="neutral-stat">
                        <Meh size={14} />
                        {item.userNeutral.toFixed(0)}%
                      </span>
                      <span className="negative-stat">
                        <Frown size={14} />
                        {item.userNegative.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="app-sentiment">
                    <h4>{competitorAppName}</h4>
                    <div className="sentiment-bar">
                      <div 
                        className="sentiment-segment positive" 
                        style={{ width: `${item.competitorPositive}%` }}
                        title={`Positive: ${item.competitorPositive.toFixed(1)}%`}
                      />
                      <div 
                        className="sentiment-segment neutral" 
                        style={{ width: `${item.competitorNeutral}%` }}
                        title={`Neutral: ${item.competitorNeutral.toFixed(1)}%`}
                      />
                      <div 
                        className="sentiment-segment negative" 
                        style={{ width: `${item.competitorNegative}%` }}
                        title={`Negative: ${item.competitorNegative.toFixed(1)}%`}
                      />
                    </div>
                    <div className="sentiment-stats">
                      <span className="positive-stat">
                        <Smile size={14} />
                        {item.competitorPositive.toFixed(0)}%
                      </span>
                      <span className="neutral-stat">
                        <Meh size={14} />
                        {item.competitorNeutral.toFixed(0)}%
                      </span>
                      <span className="negative-stat">
                        <Frown size={14} />
                        {item.competitorNegative.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="score-comparison">
                  <span className="score-label">Sentiment Score Difference:</span>
                  <span className={`score-value ${scoreDiff > 0 ? 'positive' : scoreDiff < 0 ? 'negative' : ''}`}>
                    {scoreDiff > 0 ? '+' : ''}{scoreDiff.toFixed(1)}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Overall Positive Sentiment Comparison */}
      <Card className="radial-card">
        <CardHeader>
          <CardTitle>
            <Star size={20} />
            Overall Positive Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="40%" outerRadius="90%" data={radialData}>
              <RadialBar dataKey="value" cornerRadius={10} fill="#82ca9d" />
              <Legend />
              <Tooltip />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="radial-stats">
            {radialData.map(item => (
              <div key={item.name} className="radial-stat">
                <span className="app-name" style={{ color: item.fill }}>{item.name}</span>
                <span className="value">{item.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SentimentByCategory;