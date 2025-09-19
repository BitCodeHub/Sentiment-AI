# Setting up PostgreSQL Database on Render.com

## Quick Setup Guide

### 1. Create a PostgreSQL Database on Render

1. Log in to your [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" and select "PostgreSQL"
3. Fill in the details:
   - **Name**: `review-dashboard-db`
   - **Database**: Leave blank (auto-generated)
   - **User**: Leave blank (auto-generated)
   - **Region**: Choose closest to your users
   - **PostgreSQL Version**: 15 (or latest)
   - **Plan**: Free tier is fine for testing

4. Click "Create Database"

### 2. Get Your Database Credentials

After creation, you'll see your database details:
- **Hostname**: `xxx.render.com`
- **Port**: `5432`
- **Database**: `xxx_xxxx`
- **Username**: `xxx_xxxx_user`
- **Password**: `xxxxxxxxx`

Copy the **Internal Database URL** (starts with `postgresql://`)

### 3. Set Environment Variables

In your Render web service:
1. Go to "Environment" tab
2. Add these environment variables:

```
DATABASE_URL = postgresql://your_database_url_here
JWT_SECRET = generate-a-random-string-here
NODE_ENV = production
```

### 4. Initialize the Database

Run this SQL in the Render PostgreSQL dashboard:

```sql
-- Create tables
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id VARCHAR(255) NOT NULL,
    assigned_to_email VARCHAR(255) NOT NULL,
    assigned_by_email VARCHAR(255) NOT NULL,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. Update Your Code

The database service (`databaseService.js`) is already configured to:
- Use PostgreSQL in production when `DATABASE_URL` is set
- Fall back to localStorage in development

### 6. Deploy

1. Push your code to GitHub
2. Render will automatically deploy
3. The app will use PostgreSQL for user authentication and assignments

## Testing

After deployment, test the authentication:
1. Create a new account
2. Log in with the account
3. Assign reviews to team members
4. Data will persist in PostgreSQL

## Troubleshooting

- **Connection errors**: Check DATABASE_URL is correctly set
- **Permission errors**: Ensure database user has correct privileges
- **Schema errors**: Run the SQL commands in the PostgreSQL dashboard