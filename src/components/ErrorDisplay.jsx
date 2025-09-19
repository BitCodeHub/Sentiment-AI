import React from 'react';
import { AlertCircle, Clock, Key, Globe, Wrench, X } from 'lucide-react';
import './ErrorDisplay.css';

const ErrorDisplay = ({ error, onDismiss }) => {
  if (!error) return null;

  const getIcon = () => {
    switch (error.type) {
      case 'rate-limit':
        return <Clock className="error-icon rate-limit" size={20} />;
      case 'auth':
        return <Key className="error-icon auth" size={20} />;
      case 'service':
        return <Wrench className="error-icon service" size={20} />;
      case 'network':
        return <Globe className="error-icon network" size={20} />;
      default:
        return <AlertCircle className="error-icon generic" size={20} />;
    }
  };

  return (
    <div className={`error-display ${error.type}`}>
      <div className="error-content">
        {getIcon()}
        <div className="error-text">
          <h4 className="error-title">{error.title}</h4>
          <p className="error-message">{error.message}</p>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="error-dismiss">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;