import React, { useState, useEffect } from 'react';
import { Apple, Key, Hash, Upload, AlertCircle, CheckCircle, Loader, Info, Database, RefreshCw, Calendar } from 'lucide-react';
import appleAppStoreBrowserService from '../services/appleAppStoreBrowser';
import CacheStatus from './CacheStatus';
import DateRangeCalendar from './DateRangeCalendar';
import './AppleImport.css';

const AppleImport = ({ onImport }) => {
  const [appId, setAppId] = useState('');
  const [issuerId, setIssuerId] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [privateKeyFile, setPrivateKeyFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const [isMockData, setIsMockData] = useState(false);
  const [availableApps, setAvailableApps] = useState([]);
  const [hasServerCredentials, setHasServerCredentials] = useState(false);
  const [useServerCredentials, setUseServerCredentials] = useState(true);
  const [showCacheOptions, setShowCacheOptions] = useState(false);
  const [useCache, setUseCache] = useState(true);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);
  const [showDateRange, setShowDateRange] = useState(true);

  // Check backend availability and configured apps on mount
  useEffect(() => {
    const checkBackend = async () => {
      await appleAppStoreBrowserService.checkBackendAvailability();
      setBackendAvailable(appleAppStoreBrowserService.isBackendAvailable);
      
      // Fetch configured apps if backend is available
      if (appleAppStoreBrowserService.isBackendAvailable) {
        try {
          const response = await fetch(appleAppStoreBrowserService.backendURL.replace('/apple-reviews', '/apple-apps'));
          if (response.ok) {
            const data = await response.json();
            setAvailableApps(data.apps || []);
            setHasServerCredentials(data.hasServerCredentials || false);
            
            // If there are configured apps, select the first one by default
            if (data.apps && data.apps.length > 0) {
              setAppId(data.apps[0].id);
            }
          }
        } catch (err) {
          console.log('Could not fetch configured apps');
        }
      }
    };
    checkBackend();
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.p8')) {
      setPrivateKeyFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPrivateKey(event.target.result);
        setError('');
      };
      reader.readAsText(file);
    } else {
      setError('Please upload a valid .p8 private key file');
    }
  };

  // Validate credentials format
  const validateCredentials = () => {
    const errors = [];
    
    // Validate App ID (should be numeric)
    if (!/^\d+$/.test(appId.trim())) {
      errors.push('App ID should contain only numbers');
    }
    
    // Validate Issuer ID (UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(issuerId.trim())) {
      errors.push('Issuer ID should be in UUID format (e.g., xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)');
    }
    
    // Validate private key
    if (!privateKey || !privateKey.includes('BEGIN PRIVATE KEY')) {
      errors.push('Invalid private key format');
    }
    
    return errors;
  };

  // Fetch metadata when credentials are complete
  const fetchMetadata = async () => {
    if (!appId) return;
    
    // Check if we have necessary credentials
    if (!hasServerCredentials || !useServerCredentials) {
      if (!issuerId || !privateKey) return;
    }
    
    setFetchingMetadata(true);
    setError('');
    
    try {
      const keyContent = privateKeyFile || privateKey;
      const metadata = await appleAppStoreBrowserService.getReviewMetadata(
        appId.trim(),
        issuerId.trim(),
        keyContent,
        useServerCredentials && hasServerCredentials
      );
      setMetadata(metadata);
      setShowDateRange(true);
    } catch (err) {
      setError('Failed to fetch review metadata: ' + err.message);
    } finally {
      setFetchingMetadata(false);
    }
  };

  const handleDateRangeChange = (range) => {
    setSelectedStartDate(range.start);
    setSelectedEndDate(range.end);
  };

  const handleEnterApp = async () => {
    // Validate minimum requirements
    if (!appId) {
      setError('Please select an app');
      return;
    }
    
    // Enter app with empty data - reviews will be fetched on-demand
    onImport([]);
    setSuccess(true);
    setImportProgress({ status: 'Entering dashboard...', percentage: 100 });
    
    // Store app credentials in session for later use
    if (typeof window !== 'undefined') {
      const config = {
        appId: appId.trim(),
        issuerId: issuerId?.trim(),
        useServerCredentials: useServerCredentials && hasServerCredentials,
        startDate: selectedStartDate,
        endDate: selectedEndDate
      };
      
      // Store private key separately if not using server credentials
      if (!useServerCredentials && privateKey) {
        sessionStorage.setItem('applePrivateKey', privateKey);
      }
      
      sessionStorage.setItem('appleAppConfig', JSON.stringify(config));
    }
    
    // Clear progress after a short delay
    setTimeout(() => {
      setImportProgress(null);
    }, 1000);
  };

  const handleImport = async () => {
    // If using server credentials, only need app ID
    if (hasServerCredentials && useServerCredentials) {
      if (!appId) {
        setError('Please select an app');
        return;
      }
    } else {
      // Otherwise, need all credentials
      if (!appId || !issuerId || !privateKey) {
        setError('Please fill in all required fields');
        return;
      }

      // Validate credentials
      const validationErrors = validateCredentials();
      if (validationErrors.length > 0) {
        setError(validationErrors.join('. '));
        return;
      }
    }

    setIsLoading(true);
    setError('');
    setSuccess(false);
    setIsMockData(false);
    setImportProgress({ status: 'Connecting to Apple App Store...', percentage: 10 });

    try {
      // Use file if available, otherwise use text content
      const keyContent = privateKeyFile || privateKey;
      
      setImportProgress({ status: 'Authenticating...', percentage: 30 });
      
      // Set up progress monitoring
      const progressInterval = setInterval(() => {
        setImportProgress(prev => ({
          status: 'Fetching reviews... This may take a minute for apps with many reviews',
          percentage: Math.min(prev.percentage + 2, 75) // Gradually increase to 75%
        }));
      }, 1000);
      
      try {
        const reviews = await appleAppStoreBrowserService.importReviews(
          appId.trim(),
          issuerId.trim(),
          keyContent,
          useServerCredentials && hasServerCredentials,
          { 
            useCache, 
            forceRefresh,
            startDate: selectedStartDate,
            endDate: selectedEndDate
          }
        );

        clearInterval(progressInterval);
        setImportProgress({ status: 'Processing reviews...', percentage: 80 });

        if (reviews && reviews.length > 0) {
          // Check if this is mock data
          const firstReview = reviews[0];
          if (firstReview.hasOwnProperty('isMockData') && firstReview.isMockData) {
            setIsMockData(true);
          }
          
          onImport(reviews);
          setSuccess(true);
          setImportProgress({ status: `Import complete! Fetched ${reviews.length} reviews`, percentage: 100 });
          
          // Clear progress after success
          setTimeout(() => {
            setImportProgress(null);
          }, 5000);
        } else {
          setError('No reviews found for the specified app');
          setImportProgress(null);
        }
      } catch (importError) {
        clearInterval(progressInterval);
        throw importError;
      }
    } catch (err) {
      setError(err.message || 'Failed to import reviews from Apple App Store');
      setImportProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="apple-import-container">
      <div className="import-header">
        <Apple size={24} />
        <h3>Import from Apple App Store</h3>
      </div>

      <div className="import-form">
        {/* Show app selector if multiple apps are configured */}
        {hasServerCredentials && availableApps.length > 0 && (
          <div className="form-group">
            <label>
              <Apple size={16} />
              Select App
            </label>
            <select
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              disabled={isLoading}
              className="app-selector"
            >
              <option value="">-- Select an App --</option>
              {availableApps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name} ({app.id})
                </option>
              ))}
            </select>
            <small>Select from your configured apps</small>
          </div>
        )}

        {/* Toggle for using server credentials */}
        {hasServerCredentials && (
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useServerCredentials}
                onChange={(e) => setUseServerCredentials(e.target.checked)}
                disabled={isLoading}
              />
              Use server-configured credentials
            </label>
          </div>
        )}

        {/* Date Range Selector */}
        {showDateRange && appId && (
          <div className="form-group">
            <label>
              <Calendar size={16} />
              Date Range
            </label>
            <div className="date-range-selector">
              <DateRangeCalendar
                reviews={[]} 
                onDateRangeChange={handleDateRangeChange}
                initialRange={{ start: selectedStartDate, end: selectedEndDate }}
                showDisplay={true}
                inline={false}
              />
            </div>
            <small>Select a date range to fetch reviews from Apple App Store</small>
          </div>
        )}

        {/* Cache Options */}
        <div className="form-group">
          <button
            type="button"
            className="toggle-cache-options"
            onClick={() => setShowCacheOptions(!showCacheOptions)}
          >
            {showCacheOptions ? 'Hide' : 'Show'} Cache Options
          </button>
          
          {showCacheOptions && (
            <div className="cache-options-panel">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useCache}
                  onChange={(e) => {
                    setUseCache(e.target.checked);
                    if (!e.target.checked) setForceRefresh(false);
                  }}
                  disabled={isLoading}
                />
                Use cached reviews if available
              </label>
              
              {useCache && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={forceRefresh}
                    onChange={(e) => setForceRefresh(e.target.checked)}
                    disabled={isLoading}
                  />
                  Force refresh (fetch new reviews since last update)
                </label>
              )}
              
              <small className="cache-hint">
                {useCache && !forceRefresh && 'Will use cached reviews if available, otherwise fetch all'}
                {useCache && forceRefresh && 'Will fetch only new reviews since last update'}
                {!useCache && 'Will fetch all reviews from Apple (may take longer)'}
              </small>
            </div>
          )}
        </div>
        
        {/* Show manual app ID input if no server credentials or user wants to use different credentials */}
        {(!hasServerCredentials || !useServerCredentials || availableApps.length === 0) && (
          <div className="form-group">
            <label htmlFor="app-id">
              <Hash size={16} />
              App ID
            </label>
            <input
              id="app-id"
              type="text"
              placeholder="Enter your App Store app ID"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              disabled={isLoading}
            />
            <small>Found in App Store Connect under App Information</small>
          </div>
        )}

        {/* Show credential fields only if not using server credentials */}
        {(!hasServerCredentials || !useServerCredentials) && (
          <>
            <div className="form-group">
              <label htmlFor="issuer-id">
                <Key size={16} />
                Issuer ID
              </label>
              <input
                id="issuer-id"
                type="text"
                placeholder="Enter your Issuer ID"
                value={issuerId}
                onChange={(e) => setIssuerId(e.target.value)}
                disabled={isLoading}
              />
              <small>Found in App Store Connect under Users and Access → Keys</small>
            </div>

            <div className="form-group">
              <label htmlFor="private-key">
                <Key size={16} />
                Private Key (.p8 file)
              </label>
              <div className="file-input-wrapper">
                <input
                  id="private-key"
                  type="file"
                  accept=".p8"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  style={{ display: 'none' }}
                />
                <label htmlFor="private-key" className="file-input-label">
                  <Upload size={16} />
                  {privateKey ? 'Key file loaded' : 'Upload .p8 key file'}
                </label>
              </div>
              <small>Download from App Store Connect API Keys</small>
            </div>
          </>
        )}

        {/* Backend availability indicator */}
        {backendAvailable !== null && (
          <div className={`backend-status ${backendAvailable ? 'available' : 'unavailable'}`}>
            <Info size={16} />
            {backendAvailable 
              ? 'Connected to Apple API service' 
              : 'Using demo mode (backend service not available)'}
          </div>
        )}

        {error && (
          <div className="error-message">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            <CheckCircle size={16} />
            {isMockData 
              ? 'Successfully loaded demo reviews. Connect backend service for real data.'
              : 'Successfully imported reviews from Apple App Store!'}
          </div>
        )}

        {/* Progress indicator */}
        {importProgress && (
          <div className="import-progress">
            <div className="progress-status">
              <Loader className="spinner" size={16} />
              {importProgress.status}
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${importProgress.percentage}%` }}
              />
            </div>
          </div>
        )}

        <div className="import-actions">
          <button
            className="import-btn primary"
            onClick={handleEnterApp}
            disabled={!appId}
          >
            Enter Dashboard
          </button>

          <button
            className="import-btn secondary"
            onClick={() => setShowInstructions(!showInstructions)}
          >
            {showInstructions ? 'Hide' : 'Show'} Instructions
          </button>
          
          <details className="advanced-options">
            <summary>Advanced Options</summary>
            <div className="advanced-buttons">
              <button
                className="import-btn secondary"
                onClick={handleImport}
                disabled={isLoading || !appId || (!hasServerCredentials || !useServerCredentials) && (!issuerId || !privateKey)}
              >
                {isLoading ? 'Importing...' : 'Import Reviews Now'}
              </button>
            </div>
          </details>
        </div>


        {showInstructions && (
          <div className="instructions">
            <h4>How to get your Apple App Store credentials:</h4>
            <ol>
              <li>
                <strong>App ID:</strong> Log in to App Store Connect → My Apps → Select your app → App Information → General Information → Apple ID
              </li>
              <li>
                <strong>Issuer ID:</strong> App Store Connect → Users and Access → Keys → Copy your Issuer ID (top of the page)
              </li>
              <li>
                <strong>Private Key:</strong> App Store Connect → Users and Access → Keys → Create a new key with "App Store Connect API" access → Download the .p8 file
              </li>
            </ol>
            <div className="note">
              <strong>Note:</strong> 
              {backendAvailable 
                ? 'Your credentials will be securely sent to the backend service for API authentication.'
                : 'Backend service not detected. Using demo mode with sample data. To fetch real reviews, start the backend service (see documentation).'}
            </div>
            
            {!backendAvailable && (
              <div className="backend-setup">
                <h5>Quick Backend Setup:</h5>
                <ol>
                  <li>Navigate to the <code>backend</code> folder</li>
                  <li>Run <code>npm install</code></li>
                  <li>Run <code>npm start</code></li>
                  <li>Refresh this page to connect</li>
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppleImport;