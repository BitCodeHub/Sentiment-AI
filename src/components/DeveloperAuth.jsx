import React, { useState, useEffect } from 'react';
import { User, Lock, LogOut, Shield, X, MessageSquare } from 'lucide-react';
import './DeveloperAuth.css';

const DeveloperAuth = ({ onAuthChange, isOpen, onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [developerInfo, setDeveloperInfo] = useState(null);
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if developer is already authenticated
    const savedAuth = localStorage.getItem('developerAuth');
    if (savedAuth) {
      const authData = JSON.parse(savedAuth);
      setIsAuthenticated(true);
      setDeveloperInfo(authData);
      onAuthChange(authData);
    }
  }, [onAuthChange]);

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    // In a real app, this would validate against Apple Developer credentials
    // For demo purposes, we'll use a simple validation
    if (credentials.email && credentials.password) {
      const authData = {
        email: credentials.email,
        name: credentials.email.split('@')[0],
        role: 'Developer',
        appIds: ['com.example.app'], // In reality, fetch from Apple Developer account
        authenticated: true
      };

      // Save to localStorage
      localStorage.setItem('developerAuth', JSON.stringify(authData));
      setIsAuthenticated(true);
      setDeveloperInfo(authData);
      onAuthChange(authData);
      onClose();
    } else {
      setError('Please enter both email and password');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('developerAuth');
    setIsAuthenticated(false);
    setDeveloperInfo(null);
    onAuthChange(null);
  };

  if (!isOpen && !isAuthenticated) return null;

  if (isAuthenticated && !isOpen) {
    return (
      <div className="developer-auth-badge">
        <Shield size={16} />
        <span>Developer: {developerInfo.name}</span>
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="developer-auth-modal">
      <div className="developer-auth-overlay" onClick={onClose}></div>
      <div className="developer-auth-container">
        <div className="developer-auth-header">
          <h2>Developer Authentication</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="developer-auth-content">
          <div className="auth-info">
            <p>Sign in with your Apple Developer account to reply to user reviews.</p>
            <div className="auth-features">
              <div className="auth-feature">
                <Shield size={20} />
                <span>Secure authentication</span>
              </div>
              <div className="auth-feature">
                <MessageSquare size={20} />
                <span>Reply to any review</span>
              </div>
              <div className="auth-feature">
                <User size={20} />
                <span>Developer privileges</span>
              </div>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Apple ID Email</label>
              <div className="input-wrapper">
                <User size={18} />
                <input
                  type="email"
                  id="email"
                  placeholder="developer@company.com"
                  value={credentials.email}
                  onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock size={18} />
                <input
                  type="password"
                  id="password"
                  placeholder="Enter your password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn">
              Sign In
            </button>
          </form>

          <div className="auth-note">
            <p>Note: In production, this would authenticate against Apple App Store Connect.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperAuth;