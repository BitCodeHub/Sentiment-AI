import React from 'react';

export const Button = ({ 
  className = '', 
  children, 
  variant = 'primary',
  disabled = false,
  onClick,
  ...props 
}) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500 disabled:text-gray-400',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300'
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};