// Error handler utility for better user experience

export const getErrorMessage = (error) => {
  // Rate limit errors
  if (error.message?.includes('rate limit')) {
    return {
      title: 'API Rate Limit Reached',
      message: 'Too many requests. The system will automatically retry in a few moments.',
      type: 'rate-limit',
      icon: '⏱️'
    };
  }
  
  // API key errors
  if (error.message?.includes('API key') || error.message?.includes('401')) {
    return {
      title: 'API Key Issue',
      message: 'Please check your OpenAI API key configuration in the .env file.',
      type: 'auth',
      icon: '🔑'
    };
  }
  
  // Service unavailable
  if (error.message?.includes('service') || error.message?.includes('503')) {
    return {
      title: 'Service Temporarily Unavailable',
      message: 'OpenAI service is experiencing issues. Please try again later.',
      type: 'service',
      icon: '🔧'
    };
  }
  
  // Network errors
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return {
      title: 'Network Error',
      message: 'Please check your internet connection and try again.',
      type: 'network',
      icon: '🌐'
    };
  }
  
  // Default error
  return {
    title: 'Analysis Error',
    message: error.message || 'An unexpected error occurred. Please try again.',
    type: 'generic',
    icon: '❌'
  };
};

export const formatRetryMessage = (retryCount, maxRetries) => {
  if (retryCount >= maxRetries) {
    return 'Maximum retry attempts reached. Please try again later.';
  }
  return `Retrying... (Attempt ${retryCount + 1}/${maxRetries})`;
};