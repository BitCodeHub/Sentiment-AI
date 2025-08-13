import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign, Zap, Database, TrendingUp, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import aiCache from '../services/aiCache';
import './AIUsageStats.css';

const AIUsageStats = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState({
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    requests: 0,
    averageTokensPerRequest: 0,
    cacheHitRate: 0
  });
  const [cacheInfo, setCacheInfo] = useState({
    totalEntries: 0,
    totalSizeKB: 0,
    entries: [],
    oldestEntry: { age: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadStats();
      const interval = setInterval(loadStats, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadStats = () => {
    try {
      if (typeof aiCache?.getTokenUsageStats === 'function') {
        const tokenStats = aiCache.getTokenUsageStats();
        setStats(tokenStats || {
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalCost: 0,
          requests: 0,
          averageTokensPerRequest: 0,
          cacheHitRate: 0
        });
      }
      
      if (typeof aiCache?.getCacheInfo === 'function') {
        const cache = aiCache.getCacheInfo();
        setCacheInfo(cache || {
          totalEntries: 0,
          totalSizeKB: 0,
          entries: [],
          oldestEntry: { age: 0 }
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        requests: 0,
        averageTokensPerRequest: 0,
        cacheHitRate: 0
      });
      setCacheInfo({
        totalEntries: 0,
        totalSizeKB: 0,
        entries: [],
        oldestEntry: { age: 0 }
      });
      setLoading(false);
    }
  };

  const handleClearCache = (type = null) => {
    if (window.confirm(type ? `Clear ${type} cache?` : 'Clear all cache? This will force fresh API calls.')) {
      try {
        if (typeof aiCache?.clearCache === 'function') {
          aiCache.clearCache(type);
        }
        loadStats();
      } catch (error) {
        console.error('Error clearing cache:', error);
      }
    }
  };

  const handleResetUsage = () => {
    if (window.confirm('Reset token usage statistics? This cannot be undone.')) {
      try {
        if (typeof aiCache?.resetTokenUsage === 'function') {
          aiCache.resetTokenUsage();
        }
        loadStats();
      } catch (error) {
        console.error('Error resetting usage:', error);
      }
    }
  };

  if (!isOpen) return null;

  const costBreakdown = [
    { name: 'Input Tokens', value: (stats?.totalInputTokens || 0) / 1000 * 0.0015, color: '#3b82f6' },
    { name: 'Output Tokens', value: (stats?.totalOutputTokens || 0) / 1000 * 0.002, color: '#10b981' }
  ];

  const cacheEfficiency = stats?.cacheHitRate || 0;
  const estimatedSavings = stats?.totalCost ? (stats.totalCost * (cacheEfficiency / 100)).toFixed(2) : 0;

  if (loading) {
    return (
      <div className="ai-usage-modal-backdrop" onClick={onClose}>
        <div className="ai-usage-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>AI Usage & Cache Statistics</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="modal-content">
            <p>Loading stats...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-usage-modal-backdrop" onClick={onClose}>
      <div className="ai-usage-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>AI Usage & Cache Statistics</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {/* Token Usage Overview */}
          <div className="stats-grid">
            <Card className="stat-card">
              <CardHeader className="stat-header">
                <CardTitle className="stat-title">
                  <Zap className="stat-icon" style={{ color: '#f59e0b' }} />
                  Total Tokens Used
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="stat-value">
                  {((stats?.totalInputTokens || 0) + (stats?.totalOutputTokens || 0)).toLocaleString()}
                </div>
                <div className="stat-detail">
                  <span className="stat-label">Input:</span> {(stats?.totalInputTokens || 0).toLocaleString()}
                  <br />
                  <span className="stat-label">Output:</span> {(stats?.totalOutputTokens || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card">
              <CardHeader className="stat-header">
                <CardTitle className="stat-title">
                  <DollarSign className="stat-icon" style={{ color: '#10b981' }} />
                  Total Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="stat-value">${stats?.totalCost?.toFixed(4) || '0.0000'}</div>
                <div className="stat-detail">
                  <span className="stat-label">Avg per request:</span> ${
                    stats?.requests ? (stats.totalCost / stats.requests).toFixed(4) : '0.0000'
                  }
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card">
              <CardHeader className="stat-header">
                <CardTitle className="stat-title">
                  <Database className="stat-icon" style={{ color: '#3b82f6' }} />
                  Cache Hit Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="stat-value">{cacheEfficiency}%</div>
                <div className="stat-detail">
                  <span className="stat-label">Estimated savings:</span> ${estimatedSavings}
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card">
              <CardHeader className="stat-header">
                <CardTitle className="stat-title">
                  <TrendingUp className="stat-icon" style={{ color: '#8b5cf6' }} />
                  API Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="stat-value">{stats?.requests || 0}</div>
                <div className="stat-detail">
                  <span className="stat-label">Avg tokens:</span> {stats?.averageTokensPerRequest || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cost Breakdown Chart */}
          <Card className="chart-card">
            <CardHeader>
              <CardTitle>Cost Breakdown by Token Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={costBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: $${value.toFixed(4)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {costBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cache Information */}
          <Card className="cache-info-card">
            <CardHeader>
              <CardTitle>Cache Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="cache-stats">
                <div className="cache-stat">
                  <span className="cache-label">Total Entries:</span>
                  <span className="cache-value">{cacheInfo?.totalEntries || 0}</span>
                </div>
                <div className="cache-stat">
                  <span className="cache-label">Cache Size:</span>
                  <span className="cache-value">{cacheInfo?.totalSizeKB || 0} KB</span>
                </div>
                <div className="cache-stat">
                  <span className="cache-label">Oldest Entry:</span>
                  <span className="cache-value">
                    {cacheInfo?.oldestEntry?.age ? 
                      `${Math.round(cacheInfo.oldestEntry.age / (1000 * 60 * 60))}h ago` : 
                      'N/A'
                    }
                  </span>
                </div>
              </div>

              <Alert className="cache-alert">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Cache helps reduce API costs by storing previous analysis results. 
                  Clear cache if you need fresh analysis with updated AI models.
                </AlertDescription>
              </Alert>

              <div className="cache-actions">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleClearCache('reviewAnalysis')}
                  className="cache-action-btn"
                >
                  <Trash2 size={14} />
                  Clear Review Analysis
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleClearCache('insights')}
                  className="cache-action-btn"
                >
                  <Trash2 size={14} />
                  Clear Insights
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleClearCache()}
                  className="cache-action-btn danger"
                >
                  <Trash2 size={14} />
                  Clear All Cache
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Top Cached Items */}
          {cacheInfo?.entries?.length > 0 && (
            <Card className="cached-items-card">
              <CardHeader>
                <CardTitle>Most Used Cache Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="cached-items-list">
                  {cacheInfo.entries.slice(0, 5).map((entry, idx) => (
                    <div key={idx} className="cached-item">
                      <div className="cached-item-info">
                        <span className="cached-item-key">{entry.key.substring(0, 30)}...</span>
                        <span className="cached-item-stats">
                          {entry.hits} hits • {(entry.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <span className="cached-item-age">
                        {Math.round(entry.age / (1000 * 60))}m ago
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <Button 
              variant="outline"
              onClick={handleResetUsage}
              className="reset-btn"
            >
              <RefreshCw size={14} />
              Reset Usage Stats
            </Button>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIUsageStats;