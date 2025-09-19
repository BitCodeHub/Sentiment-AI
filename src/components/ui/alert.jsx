import React from 'react';

export const Alert = ({ 
  className = '', 
  children, 
  variant = 'default',
  ...props 
}) => {
  const variantClasses = {
    default: 'bg-blue-50 text-blue-900 border-blue-200',
    destructive: 'bg-red-50 text-red-900 border-red-200',
    success: 'bg-green-50 text-green-900 border-green-200',
    warning: 'bg-yellow-50 text-yellow-900 border-yellow-200'
  };
  
  return (
    <div
      className={`relative p-4 rounded-lg border ${variantClasses[variant]} ${className}`}
      role="alert"
      {...props}
    >
      <div className="flex items-start gap-3">
        {children}
      </div>
    </div>
  );
};

export const AlertDescription = ({ className = '', children, ...props }) => {
  return (
    <div className={`text-sm ${className}`} {...props}>
      {children}
    </div>
  );
};