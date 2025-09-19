import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, Mail, ArrowRight, UserPlus, Users, X } from 'lucide-react';
import './LoginDropdown.css';

const LoginDropdown = () => {
  const { user, signIn, signUp, signInAsGuest } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (isSignUp) {
        if (!formData.name.trim()) {
          setError('Please enter your name');
          setLoading(false);
          return;
        }
        result = await signUp(formData.email, formData.password, formData.name);
      } else {
        result = await signIn(formData.email, formData.password);
      }

      if (result.success) {
        setIsOpen(false);
        setFormData({ email: '', password: '', name: '' });
        // Refresh the page to show authenticated content
        window.location.reload();
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await signInAsGuest();
      if (result.success) {
        setIsOpen(false);
        window.location.reload();
      } else {
        setError(result.error || 'Guest login failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setFormData({ email: '', password: '', name: '' });
  };

  // If user is already logged in, don't show login button
  if (user) return null;

  return (
    <div className="login-dropdown-container" ref={dropdownRef}>
      <button 
        className="login-trigger-btn" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <User size={18} />
        <span>Login</span>
      </button>

      {isOpen && (
        <div className="login-dropdown">
          <div className="dropdown-header">
            <h3>{isSignUp ? 'Create Account' : 'Sign In'}</h3>
            <button 
              className="close-btn" 
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <X size={20} />
            </button>
          </div>

          {error && (
            <div className="dropdown-error">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="dropdown-form">
            {isSignUp && (
              <div className="form-group">
                <label htmlFor="dropdown-name">
                  <User size={16} />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  id="dropdown-name"
                  name="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                  required={isSignUp}
                  disabled={loading}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="dropdown-email">
                <Mail size={16} />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                id="dropdown-email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="dropdown-password">
                <Lock size={16} />
                <span>Password</span>
              </label>
              <input
                type="password"
                id="dropdown-password"
                name="password"
                placeholder={isSignUp ? 'Create a password' : 'Enter your password'}
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <span>Please wait...</span>
              ) : (
                <>
                  {isSignUp ? <UserPlus size={16} /> : <ArrowRight size={16} />}
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>

          <div className="dropdown-divider">
            <span>OR</span>
          </div>

          <button 
            onClick={handleGuestLogin} 
            className="guest-btn"
            disabled={loading}
            type="button"
          >
            <Users size={16} />
            <span>Continue as Guest</span>
          </button>

          <div className="dropdown-footer">
            <p>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button
                onClick={toggleMode}
                className="toggle-btn"
                disabled={loading}
                type="button"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>

          {!isSignUp && (
            <div className="demo-hint">
              <p>Demo: admin@example.com / admin123</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LoginDropdown;