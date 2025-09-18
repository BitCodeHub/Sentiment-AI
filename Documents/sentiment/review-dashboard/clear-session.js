// Utility script to clear all authentication data
// Run this in the browser console if you can't see the login page

(function clearAllAuthData() {
  console.log('Clearing all authentication data...');
  
  // Clear all auth-related localStorage keys
  const authKeys = [
    'review_session_token',
    'user_session', 
    'current_user',
    'review_users',
    'user_sessions',
    'review_assignments'
  ];
  
  authKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`Removing ${key}:`, localStorage.getItem(key));
      localStorage.removeItem(key);
    }
  });
  
  console.log('All authentication data cleared!');
  console.log('Reloading page to show login...');
  
  // Reload the page after a short delay
  setTimeout(() => {
    window.location.href = '/login';
  }, 500);
})();