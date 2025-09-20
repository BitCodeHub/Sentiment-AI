# Authentication Setup

## Overview
The application now requires authentication for all access. Users must create an account or sign in before using any features. All user accounts are stored in the PostgreSQL database on Render.com.

## Changes Made

### 1. Routing Protection
- All routes now require authentication
- Unauthenticated users are redirected to `/login`
- The main route ("/") is now protected with `ProtectedRoute`

### 2. Guest Login Removed
- "Continue as Guest" option has been removed from both Login and LoginDropdown components
- Users must create an account or sign in with existing credentials

### 3. Database Integration
- User accounts are stored in PostgreSQL database (`review-dashboard-db` on Render)
- Authentication uses JWT tokens for session management
- Backend API handles all authentication operations

## Authentication Flow

1. **First Visit**: Users land on `/login` page
2. **Sign Up**: New users can create account with:
   - Full Name
   - Email Address
   - Password (minimum 6 characters)
3. **Sign In**: Existing users log in with email/password
4. **Session**: JWT token stored in localStorage
5. **Protected Access**: After login, users can access all features

## Database Schema

The PostgreSQL database stores:
- **users** table: User accounts with encrypted passwords
- **assignments** table: Review assignments linked to users
- Session management via JWT tokens

## Testing

### Local Development
```bash
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Demo Credentials
- Email: `admin@example.com`
- Password: `admin123`

### Production
- Frontend: https://sentiment-review-dashboard.onrender.com
- Backend: https://sentiment-review-backend.onrender.com
- Database: PostgreSQL on Render (review-dashboard-db)

## Environment Variables

### Frontend (.env)
```
VITE_API_ENDPOINT=https://sentiment-review-backend.onrender.com
```

### Backend (Render Dashboard)
```
DATABASE_URL=(auto-linked from review-dashboard-db)
JWT_SECRET=(auto-generated)
NODE_ENV=production
```

## Security Features

1. **Password Hashing**: bcrypt with salt rounds
2. **JWT Tokens**: Secure session management
3. **HTTPS**: All production traffic encrypted
4. **CORS**: Configured for frontend domain only
5. **Rate Limiting**: API endpoints protected

## User Management

### Creating Users
Users self-register through the sign-up form. All accounts are stored in PostgreSQL.

### Password Reset
Currently not implemented. Can be added by:
1. Creating password reset token system
2. Sending reset emails
3. Adding reset endpoints to backend

## Troubleshooting

### "Invalid credentials" error
- Verify email/password are correct
- Check if account exists in database
- Ensure backend is running and accessible

### Session expired
- JWT tokens expire after set time
- User must log in again
- Check JWT_SECRET is set in backend

### Cannot connect to database
- Verify DATABASE_URL in Render
- Check PostgreSQL service is running
- Review connection pool settings