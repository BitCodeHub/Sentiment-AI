import React, { useState } from 'react';
import { Apple, Key, Hash, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import appleAppStoreBrowserService from '../services/appleAppStoreBrowser';
import './AppleImport.css';

const AppleImport = ({ onImport }) => {
  const [appId, setAppId] = useState('');
  const [issuerId, setIssuerId] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.p8')) {
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

  const handleImport = async () => {
    if (!appId || !issuerId || !privateKey) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const reviews = await appleAppStoreBrowserService.importReviews(
        appId,
        issuerId,
        privateKey
      );

      if (reviews && reviews.length > 0) {
        onImport(reviews);
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      } else {
        setError('No reviews found for the specified app');
      }
    } catch (err) {
      setError(err.message || 'Failed to import reviews from Apple App Store');
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

        {error && (
          <div className="error-message">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            <CheckCircle size={16} />
            Successfully imported reviews from Apple App Store!
          </div>
        )}

        <div className="import-actions">
          <button
            className="import-btn primary"
            onClick={handleImport}
            disabled={isLoading || !appId || !issuerId || !privateKey}
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
            <p className="note">
              <strong>Note:</strong> Due to browser security restrictions, the actual API integration requires a backend server. 
              This demo shows mock data to demonstrate the functionality.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppleImport;