# Apple App Store Date Range Integration

## Overview

The review dashboard now supports on-demand fetching of Apple App Store reviews using the integrated date range selector. This allows users to efficiently fetch only the reviews they need based on specific date ranges.

## How It Works

1. **Enter Dashboard Without Pre-fetching**
   - When you select an Apple app and click "Enter Dashboard", you enter with empty data
   - No reviews are fetched initially to avoid long wait times

2. **Select Date Range**
   - Click on the date range filter in the dashboard
   - The date range selector modal appears with:
     - Quick select options (Last 7 Days, Last 14 Days, etc.)
     - Calendar view for custom date selection

3. **Fetch Reviews**
   - Once a date range is selected, the "Fetch Reviews" button becomes enabled
   - Click "Fetch Reviews" to load Apple reviews for the selected date range
   - The system will show a loading spinner while fetching

## Key Features

### Apple Data Banner
When in Apple data mode, a banner appears showing:
- Current status (no data loaded or data loaded)
- "Fetch Reviews" button that's enabled when a date range is selected
- Loading state with spinner during fetch operations

### Date Range Selector Integration
- Seamlessly integrated with the existing dashboard filters
- Shows the same date range UI as shown in your screenshot
- Supports both quick select and calendar-based selection

### Session Persistence
- Apple app configuration is stored in session storage
- You don't need to re-enter credentials when fetching different date ranges

## Technical Implementation

The integration adds:
1. `onFetchReviews` prop support in EnhancedDashboard
2. `handleFetchAppleReviews` function that:
   - Retrieves Apple app config from session storage
   - Fetches reviews using the selected date range
   - Updates the dashboard with new data
3. Apple data banner UI with fetch button
4. CSS styling for the Apple-specific UI elements

## Usage Example

1. Go to upload page and select "Apple App Store"
2. Select your app and click "Enter Dashboard"
3. In the dashboard, click the date range filter
4. Select "Last 30 Days" from quick select
5. Click "Fetch Reviews" in the Apple data banner
6. Reviews for the last 30 days will be loaded

## Benefits

- **Performance**: Only fetch the reviews you need
- **Flexibility**: Change date ranges without leaving the dashboard
- **Efficiency**: Avoid fetching thousands of reviews unnecessarily
- **User Experience**: No long initial wait times