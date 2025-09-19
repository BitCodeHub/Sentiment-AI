# PostgreSQL Database Setup with Render

## Overview
Your review dashboard now supports PostgreSQL database storage for user accounts, authentication, and review assignments. When users create accounts, their data is saved to your Render PostgreSQL database.

## Database Connection

### 1. Get Your Database URL
1. Go to your Render dashboard
2. Click on your PostgreSQL database: `review-dashboard-db`
3. Find the **External Connection String** (starts with `postgresql://`)
4. Copy this connection string

### 2. Set Environment Variables in Render

#### Backend Service (sentiment-review-backend):
1. Go to your backend service in Render
2. Click on "Environment" tab
3. Add these variables:
   - `DATABASE_URL` = (paste your PostgreSQL connection string)
   - `JWT_SECRET` = (click "Generate" or use a random string)
   - `NODE_ENV` = `production`

#### Frontend Service (sentiment-review-dashboard):
1. Go to your frontend service in Render
2. Make sure this variable is set:
   - `VITE_API_ENDPOINT` = `https://sentiment-review-backend.onrender.com`

## Features Implemented

### 1. User Registration & Authentication
- Users can create accounts with email/password
- Passwords are securely hashed using bcrypt
- JWT tokens for session management
- Guest login option available

### 2. Database Schema
```sql
-- Users table
users (
  id: UUID primary key
  email: unique, required
  password_hash: encrypted
  name: user's display name
  role: 'member' or 'admin'
  is_guest: boolean
  created_at: timestamp
  updated_at: timestamp
)

-- Sessions table
sessions (
  id: UUID primary key
  user_id: references users
  token: unique JWT token
  expires_at: timestamp
  created_at: timestamp
)

-- Assignments table
assignments (
  id: UUID primary key
  review_id: string
  assigned_to: references users
  assigned_by: references users
  notes: text
  status: 'pending', 'in_progress', 'completed'
  created_at: timestamp
  updated_at: timestamp
)
```

### 3. API Endpoints
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/signin` - Login
- `POST /api/auth/signin-guest` - Guest login
- `POST /api/auth/signout` - Logout
- `GET /api/auth/session` - Check current session
- `GET /api/auth/users` - Get all team members
- `POST /api/assignments` - Create review assignment
- `GET /api/assignments` - Get assignments
- `PATCH /api/assignments/:id` - Update assignment status

### 4. Frontend Integration
The frontend automatically uses the database when available:
1. If the backend API is reachable → Uses PostgreSQL
2. If API fails → Falls back to localStorage (for development)

## Testing the Integration

### 1. Local Development
```bash
# Backend (.env file)
DATABASE_URL=postgresql://user:password@host:port/dbname
JWT_SECRET=your-secret-key
PORT=3001

# Start backend
cd backend
npm install
npm start

# Frontend (.env file)
VITE_API_ENDPOINT=http://localhost:3001

# Start frontend
cd ..
npm install
npm run dev
```

### 2. Production (Render)
1. Deploy both services
2. Verify environment variables are set
3. Test creating an account
4. Check PostgreSQL logs in Render dashboard

## Troubleshooting

### Database Connection Issues
1. Check if `DATABASE_URL` is correctly set in backend
2. Verify PostgreSQL service is running in Render
3. Check backend logs for connection errors

### Authentication Not Working
1. Ensure `JWT_SECRET` is set in backend
2. Check CORS settings match your frontend URL
3. Verify `VITE_API_ENDPOINT` points to correct backend URL

### Data Not Persisting
1. Check if backend can connect to database
2. Look for SQL errors in backend logs
3. Verify database schema was created

## Security Notes
- Never commit database credentials to Git
- Use environment variables for all sensitive data
- Enable SSL for database connections in production
- Regularly backup your database
- Monitor for suspicious login attempts

## Next Steps
1. Set up regular database backups
2. Add email verification for new accounts
3. Implement password reset functionality
4. Add admin panel for user management
5. Set up database monitoring and alerts