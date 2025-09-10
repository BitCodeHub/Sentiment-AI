# Production Setup Guide

This guide walks you through setting up the Apple App Store integration in production.

## ⚠️ Security First

**NEVER share or commit your Apple credentials!** Keep your `.p8` private key file secure.

## Step 1: Backend Deployment

### Option A: Deploy to Vercel (Recommended for Simplicity)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Create `vercel.json` in the backend folder:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server-production.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server-production.js"
    }
  ]
}
```

3. Deploy:
```bash
cd backend
vercel --prod
```

4. Set environment variables in Vercel dashboard:
   - `FRONTEND_URL`: Your frontend URL
   - `NODE_ENV`: production

### Option B: Deploy to Heroku

1. Create `Procfile` in backend folder:
```
web: npm run start:production
```

2. Deploy:
```bash
cd backend
heroku create your-app-name
git push heroku main
```

3. Set environment variables:
```bash
heroku config:set NODE_ENV=production
heroku config:set FRONTEND_URL=https://your-frontend.com
```

### Option C: Deploy to Your Own Server

1. SSH into your server
2. Clone the repository
3. Install dependencies:
```bash
cd backend
npm install --production
```

4. Create `.env.production`:
```bash
cp .env.production.example .env.production
nano .env.production  # Edit with your values
```

5. Use PM2 for process management:
```bash
npm install -g pm2
pm2 start server-production.js --name review-api
pm2 save
pm2 startup
```

6. Set up Nginx reverse proxy:
```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Step 2: Frontend Configuration

1. Update your `.env.production` file:
```env
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_APPLE_API_ENDPOINT=https://your-backend-url.com/api/apple-reviews
```

2. Build the frontend:
```bash
npm run build
```

3. Deploy the `dist` folder to your hosting service

## Step 3: Secure Credential Management

### Method 1: Upload Credentials Each Time (More Secure)
- Users provide credentials through the UI
- Credentials are sent to backend for each request
- Nothing is stored server-side

### Method 2: Store Credentials Server-Side (More Convenient)
1. Upload your `.p8` file to a secure location on your server
2. Set environment variables:
```bash
APPLE_APP_ID=your-app-id
APPLE_ISSUER_ID=your-issuer-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY_PATH=/secure/path/to/AuthKey_XXXXXX.p8
```

3. Set file permissions:
```bash
chmod 400 /secure/path/to/AuthKey_XXXXXX.p8
chown appuser:appuser /secure/path/to/AuthKey_XXXXXX.p8
```

## Step 4: Testing Production Setup

1. Test the backend health endpoint:
```bash
curl https://your-backend-url.com/api/health
```

2. Test the integration:
   - Go to your production frontend
   - Navigate to Import from App Store
   - Enter your credentials (or skip if stored server-side)
   - Click Import Reviews

## Step 5: Monitoring & Maintenance

### Set Up Logging
```bash
# Create log directory
mkdir -p /var/log/review-dashboard
chmod 755 /var/log/review-dashboard
```

### Monitor with PM2
```bash
pm2 monit
pm2 logs review-api
```

### Set Up Alerts
Consider using services like:
- UptimeRobot for availability monitoring
- Sentry for error tracking
- New Relic for performance monitoring

## Security Checklist

- [ ] HTTPS enabled on both frontend and backend
- [ ] CORS configured to only allow your frontend domain
- [ ] Rate limiting enabled
- [ ] Helmet.js security headers configured
- [ ] Environment variables used for sensitive data
- [ ] Private key file has restricted permissions (400)
- [ ] No credentials in version control
- [ ] Regular security updates applied

## Troubleshooting

### "CORS error"
- Check `FRONTEND_URL` in backend environment
- Ensure it matches your actual frontend URL
- Include protocol (https://)

### "Authentication failed"
- Verify Apple credentials are correct
- Check private key file format
- Ensure Key ID matches the .p8 filename

### "Rate limit exceeded"
- Apple allows 3,600 requests/hour
- Implement caching if needed
- Consider storing reviews in a database

## Cost Optimization

1. **Cache Reviews**: Store fetched reviews in a database
2. **Incremental Updates**: Only fetch new reviews
3. **CDN**: Use CloudFlare or similar for API caching
4. **Auto-scaling**: Configure based on usage patterns

## Next Steps

1. Set up automated backups
2. Configure CI/CD pipeline
3. Implement webhook for real-time updates
4. Add multi-region support
5. Consider GraphQL for efficient data fetching

Remember: Your Apple credentials are sensitive. Treat them like passwords and never expose them publicly!