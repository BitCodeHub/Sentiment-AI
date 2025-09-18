import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, Mail, ArrowRight, UserPlus, Users } from 'lucide-react';
import './Login.css';

const Login = ({ onSuccess }) => {
  const { signIn, signUp, signInAsGuest } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        onSuccess();
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
        onSuccess();
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
    setError(''); // Clear error on input change
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Review Dashboard</h1>
          <p>{isSignUp ? 'Create your account' : 'Sign in to continue'}</p>
        </div>

        {error && (
          <div className="login-error">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {isSignUp && (
            <div className="form-group">
              <label htmlFor="name">
                <User size={18} />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                id="name"
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
            <label htmlFor="email">
              <Mail size={18} />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <Lock size={18} />
              <span>Password</span>
            </label>
            <input
              type="password"
              id="password"
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
              <span className="loading">Please wait...</span>
            ) : (
              <>
                {isSignUp ? <UserPlus size={18} /> : <ArrowRight size={18} />}
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
              </>
            )}
          </button>
        </form>

        <div className="login-divider">
          <span>OR</span>
        </div>

        <button 
          onClick={handleGuestLogin} 
          className="guest-btn"
          disabled={loading}
        >
          <Users size={18} />
          <span>Continue as Guest</span>
        </button>

        <div className="login-footer">
          <p>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setFormData({ email: '', password: '', name: '' });
              }}
              className="toggle-btn"
              disabled={loading}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>

        {!isSignUp && (
          <div className="demo-credentials">
            <p>Demo credentials:</p>
            <code>admin@example.com / admin123</code>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;