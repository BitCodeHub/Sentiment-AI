# Deployment Architecture

## Authentication & Database Strategy

### Current Implementation (Frontend-Only)
The authentication system currently uses localStorage for storing user sessions and data. This approach:
- ✅ Works immediately without backend setup
- ✅ Allows testing authentication features locally
- ✅ Deploys successfully to Render.com
- ❌ Data is not persistent across devices
- ❌ Data is lost when browser cache is cleared

### Production Implementation (Future)
To implement proper authentication with persistent storage:

1. **Backend API Endpoints** (recommended approach)
   - Create REST API endpoints in the backend service
   - Handle authentication via JWT tokens
   - Store user data in PostgreSQL on Render
   
   Example endpoints:
   ```
   POST /api/auth/signup
   POST /api/auth/signin
   POST /api/auth/signout
   GET  /api/auth/session
   POST /api/assignments
   GET  /api/assignments
   ```

2. **Environment Variables Needed**
   ```
   # Backend service (already has these)
   DATABASE_URL=postgresql://...
   JWT_SECRET=...
   
   # Frontend service
   VITE_API_ENDPOINT=https://sentiment-review-backend.onrender.com
   ```

3. **Migration Path**
   - Keep current localStorage implementation as fallback
   - Add API calls when backend endpoints are available
   - Use environment variables to switch between modes

### Why This Architecture?

1. **Separation of Concerns**
   - Frontend handles UI and user interactions
   - Backend handles data persistence and security
   - No database dependencies in frontend build

2. **Security**
   - Sensitive operations happen server-side
   - JWT tokens for secure session management
   - Database credentials never exposed to frontend

3. **Scalability**
   - Can deploy frontend to CDN
   - Backend can scale independently
   - Database managed by Render.com

## Current Status
- ✅ Frontend deploys successfully
- ✅ Authentication UI works with localStorage
- ✅ Backend service is running
- ⏳ Backend authentication endpoints need to be created
- ⏳ Frontend needs to be updated to use API endpoints when available