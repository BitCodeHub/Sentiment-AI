// Utility script to clear all session data from localStorage
// Run this in the browser console if you're stuck and can't see the login page

function clearAllSessionData() {
  const keysToRemove = [
    'review_session_token',
    'user_session',
    'current_user',
    'user_sessions',
    'review_users',
    'review_assignments'
  ];
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`Removed ${key} from localStorage`);
  });
  
  // Also clear any supabase-related keys
  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    if (key.includes('supabase') || key.includes('auth')) {
      localStorage.removeItem(key);
      console.log(`Removed ${key} from localStorage`);
    }
  });
  
  console.log('All session data cleared. Please refresh the page.');
}

// Export for use in browser console
window.clearAllSessionData = clearAllSessionData;

// Instructions
console.log(`
To clear all session data and see the login page:
1. Open browser console (F12)
2. Run: clearAllSessionData()
3. Refresh the page
`);