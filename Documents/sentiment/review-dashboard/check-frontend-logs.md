# Debugging Frontend Date Range Issue

## The Problem
- Backend date filtering IS working correctly (confirmed by tests)
- Frontend shows exactly 174 reviews
- 174 reviews corresponds to date range: 2025-06-21 to today (85 days)

## To Debug on Frontend

1. **Open browser DevTools Console** and run:
```javascript
// Check what's in sessionStorage
const config = JSON.parse(sessionStorage.getItem('appleAppConfig') || '{}');
console.log('Apple config:', config);
console.log('Start date:', config.startDate);
console.log('End date:', config.endDate);

// Check if there's a selected date range
console.log('Any date range in sessionStorage?');
for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key.includes('date') || key.includes('Date')) {
        console.log(key + ':', sessionStorage.getItem(key));
    }
}
```

2. **Check Network Tab** in DevTools:
- Look for the request to `/api/apple-reviews/hybrid`
- Check the Request payload/FormData
- Look for `startDate` and `endDate` parameters
- See what date range is actually being sent

3. **Check the UI**:
- Is there a date range selector showing "Last 85 days" or specific dates?
- Is "Last 90 days" selected but actually sending different dates?

## Possible Causes

1. **User has manually selected a date range** that results in 174 reviews
2. **There's a saved date range** in sessionStorage/localStorage
3. **The date picker has a bug** where "Last 90 days" actually sends 85 days
4. **The frontend is caching** an old result with 174 reviews

## Quick Fix to Test

In the browser console, run:
```javascript
// Clear any saved date range
sessionStorage.removeItem('selectedDateRange');
sessionStorage.removeItem('dateRange');

// Reload the page
location.reload();
```

Then check if it still shows 174 reviews.