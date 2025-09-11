# Backend Server Required for Apple Integration

## The Issue
The "All Ratings" feature was showing 0.0 because the backend server wasn't running. The Apple App Store API integration requires JWT authentication which must be handled server-side for security reasons.

## Solution
Both the frontend AND backend servers must be running for Apple features to work properly.

### Quick Start
Run this command from the review-dashboard directory:
```bash
./start-all.sh
```

### Manual Start
If you prefer to run them separately:

1. **Start Backend** (in one terminal):
   ```bash
   cd backend
   npm install  # Only needed first time
   npm start    # Runs on http://localhost:3001
   ```

2. **Start Frontend** (in another terminal):
   ```bash
   npm run dev  # Runs on http://localhost:5173
   ```

## Verification
With debug logging enabled, you should see in the browser console:
- `[appleAppStoreBrowser] Backend service available: true`
- The actual ratings data being fetched

Without the backend running, you'll see:
- `[appleAppStoreBrowser] Backend service available: false`
- Mock data with 0.0 ratings

## Important Notes
- The backend server runs on port 3001
- The frontend expects the backend at http://localhost:3001/api/apple-reviews
- Without the backend, only mock data is available
- All Apple API calls require JWT authentication via the backend