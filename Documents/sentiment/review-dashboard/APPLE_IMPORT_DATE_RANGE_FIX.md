# Apple Import Date Range Selection Fix

## Issue
The date range selection in the "Import from Apple App Store" component was not working. Users could see the "Select date range (optional)" button, but clicking it didn't show the date picker.

## Root Cause
The DateRangeCalendar component was being used with incorrect props:
1. Using `onChange` instead of `onDateRangeChange` 
2. Not specifying `inline={true}`, causing it to use portal rendering which conflicted with the conditional visibility

## Solution
Fixed the AppleImport component to properly use DateRangeCalendar:

```jsx
<DateRangeCalendar 
  onDateRangeChange={(range) => {  // Changed from onChange
    console.log('[AppleImport] Date range selected:', range);
    setDateRange(range);
    setShowDatePicker(false);
  }}
  initialRange={dateRange}
  inline={true}         // Added to render inline
  showDisplay={false}   // Added to hide the display component
/>
```

## Technical Details
- The DateRangeCalendar component has two rendering modes: inline and portal
- When `inline={false}` (default), it uses React portal to render outside the component tree
- The AppleImport was managing visibility with `showDatePicker` state, which conflicted with portal rendering
- Setting `inline={true}` makes it render within the component tree, fixing the visibility issue

## Result
Users can now:
1. Click "Select date range (optional)" button
2. See the date picker calendar popup
3. Select start and end dates
4. The selected range displays in the button
5. The range is passed to the import function correctly