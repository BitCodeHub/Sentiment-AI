import React, { useState, useEffect } from 'react';
import { Apple, Key, Hash, Upload, AlertCircle, CheckCircle, Loader, Info, Calendar } from 'lucide-react';
import appleAppStoreBrowserService from '../services/appleAppStoreBrowser';
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
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [useServerCredentials, setUseServerCredentials] = useState(false);
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);

  // Check backend availability and fetch apps on mount
  useEffect(() => {
    const checkBackend = async () => {
      await appleAppStoreBrowserService.checkBackendAvailability();
      setBackendAvailable(appleAppStoreBrowserService.isBackendAvailable);
      
      // If backend is available, fetch configured apps
      if (appleAppStoreBrowserService.isBackendAvailable) {
        try {
          // Use the base backend URL to access the apps endpoint
          const appsEndpoint = `${appleAppStoreBrowserService.baseBackendUrl}/api/apple-apps`;
          console.log('[AppleImport] Fetching configured apps from:', appsEndpoint);
          
          const response = await fetch(appsEndpoint);
          if (response.ok) {
            const data = await response.json();
            console.log('[AppleImport] Received apps data:', data);
            
            if (data.apps && data.apps.length > 0) {
              setApps(data.apps);
              setUseServerCredentials(true);
              // Auto-select first app
              const firstApp = data.apps[0];
              setSelectedApp(firstApp);
              setAppId(firstApp.id);
              console.log('[AppleImport] Using server credentials, selected app:', firstApp.name);
            } else {
              console.log('[AppleImport] No configured apps found on server');
            }
          } else {
            console.error('[AppleImport] Failed to fetch apps, status:', response.status);
          }
        } catch (error) {
          console.error('[AppleImport] Error fetching apps:', error);
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

  const handleImport = async () => {
    if (!appId || (!useServerCredentials && (!issuerId || !privateKey))) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate credentials only if not using server credentials
    if (!useServerCredentials) {
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
    setImportProgress({ status: 'Fetching reviews...', percentage: 20 });

    try {
      // Use file if available, otherwise use text content
      const keyContent = privateKeyFile || privateKey;
      
      // Only show authentication progress if not using server credentials
      if (!useServerCredentials) {
        setImportProgress({ status: 'Authenticating...', percentage: 30 });
      }
      
      // Save config to session storage for dashboard to use
      const config = {
        appId: appId.trim(),
        issuerId: useServerCredentials ? '' : issuerId.trim(),
        keyId: '', // This needs to be added to the form
        privateKey: useServerCredentials ? '' : keyContent,
        useServerCredentials: useServerCredentials,
        startDate: dateRange.start,
        endDate: dateRange.end,
        appName: selectedApp?.name || 'Unknown App'
      };
      
      sessionStorage.setItem('appleAppConfig', JSON.stringify(config));
      if (!useServerCredentials && keyContent) {
        sessionStorage.setItem('applePrivateKey', keyContent);
      }
      
      const reviews = await appleAppStoreBrowserService.importReviews(
        appId.trim(),
        useServerCredentials ? '' : issuerId.trim(),
        '', // keyId - not used in current implementation
        useServerCredentials ? '' : keyContent,
        useServerCredentials,
        {
          startDate: dateRange.start,
          endDate: dateRange.end,
          useCache: false,
          forceRefresh: true
        }
      );

      setImportProgress({ status: 'Processing reviews...', percentage: 80 });

      if (reviews && reviews.length > 0) {
        // Check if this is mock data
        if (reviews[0]._isMockData) {
          setIsMockData(true);
          delete reviews[0]._isMockData;
        }
        
        setImportProgress({ status: `Imported ${reviews.length} reviews`, percentage: 100 });
        onImport(reviews);
        setSuccess(true);
        
        // Clear form after successful import
        setTimeout(() => {
          setSuccess(false);
          setImportProgress(null);
          if (!isMockData) {
            setAppId('');
            setIssuerId('');
            setPrivateKey('');
            setPrivateKeyFile(null);
          }
        }, 5000);
      } else {
        setError('No reviews found for the specified app');
        setImportProgress(null);
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
        {/* Show app selection if server has configured apps */}
        {useServerCredentials && apps.length > 0 ? (
          <div className="form-group">
            <label htmlFor="app-select">
              <Apple size={16} />
              Select App
            </label>
            <select
              id="app-select"
              value={appId}
              onChange={(e) => {
                const app = apps.find(a => a.id === e.target.value);
                setSelectedApp(app);
                setAppId(app.id);
              }}
              disabled={isLoading}
            >
              {apps.map(app => (
                <option key={app.id} value={app.id}>
                  {app.name} ({app.id})
                </option>
              ))}
            </select>
            <small>Using server-configured credentials</small>
          </div>
        ) : (
          <>
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

        {/* Date Range Selection */}
        <div className="form-group">
          <label>
            <Calendar size={16} />
            Date Range (Optional)
          </label>
          <button
            className="date-range-button"
            onClick={() => setShowDatePicker(!showDatePicker)}
            disabled={isLoading}
          >
            {dateRange.start && dateRange.end 
              ? `${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}`
              : 'Select date range (optional)'}
          </button>
          {showDatePicker && (
            <>
              <div className="date-picker-backdrop" onClick={() => setShowDatePicker(false)} />
              <div 
                className="date-picker-popup"
                onClick={(e) => e.stopPropagation()}
              >
                <DateRangeCalendar 
                  onDateRangeChange={(range) => {
                    console.log('[AppleImport] Date range selected:', range);
                    setDateRange(range);
                    // Only close when both start and end dates are selected
                    if (range.start && range.end) {
                      setShowDatePicker(false);
                    }
                  }}
                  initialRange={dateRange}
                  inline={true}
                  showDisplay={false}
                />
              </div>
            </>
          )}
        </div>

        <div className="import-actions">
          <button
            className="import-btn primary"
            onClick={handleImport}
            disabled={isLoading || !appId || (!useServerCredentials && (!issuerId || !privateKey))}
          >
            {isLoading ? 'Importing...' : 'Import Reviews'}
          </button>

          <button
            className="import-btn secondary"
            onClick={() => setShowInstructions(!showInstructions)}
          >
            {showInstructions ? 'Hide' : 'Show'} Instructions
          </button>
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