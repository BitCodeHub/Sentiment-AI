import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import './RateLimitNotification.css';

const RateLimitNotification = () => {
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const handleRateLimit = (event) => {
      const { retryAfter, attempt, maxRetries } = event.detail;
      setRateLimitInfo({ retryAfter, attempt, maxRetries });
    };

    window.addEventListener('openai-rate-limit', handleRateLimit);

    return () => {
      window.removeEventListener('openai-rate-limit', handleRateLimit);
    };
  }, []);

  useEffect(() => {
    if (!rateLimitInfo?.retryAfter) {
      setCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((rateLimitInfo.retryAfter - Date.now()) / 1000));
      setCountdown(remaining);

      if (remaining === 0) {
        setRateLimitInfo(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 100);

    return () => clearInterval(interval);
  }, [rateLimitInfo]);

  if (!rateLimitInfo || countdown === 0) return null;

  return (
    <div className="rate-limit-notification">
      <div className="rate-limit-content">
        <AlertCircle className="rate-limit-icon" size={20} />
        <div className="rate-limit-text">
          <p className="rate-limit-title">API Rate Limit Reached</p>
          <p className="rate-limit-message">
            Retrying in {countdown} seconds... (Attempt {rateLimitInfo.attempt}/{rateLimitInfo.maxRetries})
          </p>
        </div>
        <Clock className="rate-limit-clock" size={16} />
      </div>
      <div className="rate-limit-progress">
        <div 
          className="rate-limit-progress-bar" 
          style={{ 
            width: `${(countdown / ((rateLimitInfo.retryAfter - Date.now() + countdown * 1000) / 1000)) * 100}%` 
          }}
        />
      </div>
    </div>
  );
};

export default RateLimitNotification;