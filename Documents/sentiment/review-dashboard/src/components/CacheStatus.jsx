import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, Trash2, Clock, HardDrive, Check, X } from 'lucide-react';
import { reviewCache } from '../services/cacheService';
import appleAppStoreBrowserService from '../services/appleAppStoreBrowser';
import './CacheStatus.css';

const CacheStatus = ({ appId, onRefresh }) => {
  const [cacheStatus, setCacheStatus] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cachedApps, setCachedApps] = useState([]);

  useEffect(() => {
    loadCacheStatus();
    loadCachedApps();
  }, [appId]);

  const loadCacheStatus = async () => {
    if (!appId) return;
    
    try {
      setLoading(true);
      const status = await appleAppStoreBrowserService.getCacheStatus(appId);
      setCacheStatus(status);
      
      const storage = await reviewCache.getStorageInfo();
      setStorageInfo(storage);
    } catch (error) {
      console.error('Error loading cache status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCachedApps = async () => {
    try {
      const apps = await reviewCache.getCachedApps();
      setCachedApps(apps);
    } catch (error) {
      console.error('Error loading cached apps:', error);
    }
  };

  const handleClearCache = async (targetAppId) => {
    if (!targetAppId) return;
    
    try {
      setClearing(true);
      await appleAppStoreBrowserService.clearCache(targetAppId);
      await loadCacheStatus();
      await loadCachedApps();
      
      if (targetAppId === appId && onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    } finally {
      setClearing(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatTimeSince = (date) => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
      }
    }
    
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="cache-status loading">
        <RefreshCw className="spinner" size={20} />
        <span>Loading cache status...</span>
      </div>
    );
  }

  return (
    <div className="cache-status-container">
      <div className="cache-header">
        <Database size={20} />
        <h3>Cache Status</h3>
      </div>

      {/* Current App Cache Status */}
      {cacheStatus && (
        <div className="cache-info">
          <div className="cache-row">
            <span className="cache-label">Status:</span>
            <span className={`cache-value ${cacheStatus.hasCache ? 'cached' : 'not-cached'}`}>
              {cacheStatus.hasCache ? <Check size={16} /> : <X size={16} />}
              {cacheStatus.hasCache ? 'Cached' : 'Not Cached'}
            </span>
          </div>

          {cacheStatus.metadata && (
            <>
              <div className="cache-row">
                <span className="cache-label">Last Updated:</span>
                <span className="cache-value">
                  <Clock size={14} />
                  {formatTimeSince(cacheStatus.metadata.lastUpdated)}
                </span>
              </div>
              <div className="cache-row">
                <span className="cache-label">Review Count:</span>
                <span className="cache-value">{cacheStatus.metadata.reviewCount}</span>
              </div>
              <div className="cache-row">
                <span className="cache-label">Date Range:</span>
                <span className="cache-value date-range">
                  {cacheStatus.metadata.oldestReview} to {cacheStatus.metadata.newestReview}
                </span>
              </div>
            </>
          )}

          {cacheStatus.hasCache && appId && (
            <button
              className="clear-cache-btn"
              onClick={() => handleClearCache(appId)}
              disabled={clearing}
            >
              <Trash2 size={14} />
              {clearing ? 'Clearing...' : 'Clear Cache'}
            </button>
          )}
        </div>
      )}

      {/* Storage Info */}
      {storageInfo && !storageInfo.error && (
        <div className="storage-info">
          <div className="storage-header">
            <HardDrive size={16} />
            <span>Storage Usage</span>
          </div>
          <div className="storage-bar">
            <div 
              className="storage-used" 
              style={{ width: `${storageInfo.percentage}%` }}
            />
          </div>
          <div className="storage-text">
            {formatBytes(storageInfo.usage)} / {formatBytes(storageInfo.quota)}
            <span className="storage-percent">({storageInfo.percentage.toFixed(1)}%)</span>
          </div>
        </div>
      )}

      {/* Cached Apps List */}
      {cachedApps.length > 0 && (
        <div className="cached-apps">
          <h4>Cached Apps</h4>
          <div className="cached-apps-list">
            {cachedApps.map(app => (
              <div key={app.appId} className="cached-app-item">
                <div className="app-info">
                  <span className="app-id">App {app.appId}</span>
                  <span className="app-meta">
                    {app.reviewCount} reviews • {formatTimeSince(app.lastUpdated)}
                  </span>
                </div>
                <button
                  className="clear-app-btn"
                  onClick={() => handleClearCache(app.appId)}
                  disabled={clearing}
                  title="Clear cache for this app"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cache Options */}
      <div className="cache-options">
        <button
          className="cache-action-btn refresh"
          onClick={() => {
            loadCacheStatus();
            loadCachedApps();
          }}
          disabled={loading}
        >
          <RefreshCw size={14} />
          Refresh Status
        </button>
        
        {cachedApps.length > 0 && (
          <button
            className="cache-action-btn cleanup"
            onClick={async () => {
              await reviewCache.cleanup(30);
              await loadCachedApps();
            }}
          >
            Clean Old Data (30+ days)
          </button>
        )}
      </div>
    </div>
  );
};

export default CacheStatus;