# Quick Start: Apple App Store Integration

## 🚀 Test Your Credentials (5 minutes)

### Step 1: Verify Your Credentials
```bash
cd backend
npm install  # If not already done
cd ..
node test-apple-credentials.js YOUR_APP_ID YOUR_ISSUER_ID ./path/to/AuthKey_XXXXX.p8
```

Example:
```bash
node test-apple-credentials.js 123456789 69a6de70-1234-5678-9abc-def012345678 ./AuthKey_ABC123DEF.p8
```

### Step 2: Quick Local Test

1. **Start the backend:**
```bash
cd backend
npm start
```

2. **In a new terminal, start the frontend:**
```bash
npm run dev
```

3. **Test the integration:**
- Open http://localhost:5173
- Go to the upload page
- Click "Import from App Store" tab
- Enter your credentials
- Upload your .p8 file
- Click "Import Reviews"

## 🏭 Production Deployment (30 minutes)

### Option 1: Quick Deploy with Vercel (Free)

1. **Deploy Backend:**
```bash
cd backend
npm i -g vercel  # Install Vercel CLI
vercel --prod    # Deploy
```

2. **Update Frontend:**
```bash
# In root directory
echo "VITE_APPLE_API_ENDPOINT=https://your-backend.vercel.app" >> .env
npm run build
```

3. **Deploy Frontend:**
- Upload `dist` folder to Vercel, Netlify, or GitHub Pages

### Option 2: Use Existing Server

1. **On your server:**
```bash
git clone [your-repo]
cd review-dashboard/backend
npm install --production
```

2. **Create production config:**
```bash
nano .env.production
# Add:
# NODE_ENV=production
# FRONTEND_URL=https://your-frontend.com
# PORT=3001
```

3. **Run with PM2:**
```bash
npm install -g pm2
pm2 start server-production.js
pm2 save
```

## 🔒 Security Best Practices

### Never Do This:
- ❌ Share your .p8 file
- ❌ Commit credentials to Git
- ❌ Use HTTP in production
- ❌ Store credentials in frontend code

### Always Do This:
- ✅ Use HTTPS everywhere
- ✅ Keep .p8 file permissions at 400
- ✅ Use environment variables
- ✅ Enable CORS for your domain only

## 📱 Using Your Credentials

### Method 1: Upload Each Time (More Secure)
- Enter credentials in the UI when importing
- Nothing stored on server
- Credentials sent over HTTPS only

### Method 2: Store on Server (More Convenient)
```bash
# On your server
export APPLE_APP_ID=your-app-id
export APPLE_ISSUER_ID=your-issuer-id
export APPLE_KEY_ID=your-key-id
export APPLE_PRIVATE_KEY_PATH=/secure/path/to/key.p8
```

## 🚨 Troubleshooting

### "Backend service not available"
```bash
# Check if backend is running
curl http://localhost:3001/api/health
```

### "Invalid credentials"
```bash
# Test your credentials
node test-apple-credentials.js APP_ID ISSUER_ID ./key.p8
```

### "CORS error"
- Check FRONTEND_URL in backend .env matches your frontend URL
- Include protocol (http:// or https://)

## 📊 What You'll Get

When successful, you'll see:
- Real reviews from your iOS app
- Ratings, review text, and dates
- Author names and app versions
- Country/territory information
- Developer response status

## 🎯 Next Steps

1. **Monitor Reviews**: Set up a cron job to fetch reviews periodically
2. **Add Notifications**: Get alerts for new reviews
3. **Multi-Region**: Fetch reviews from different countries
4. **Analytics**: Track review trends over time

## 💡 Pro Tips

1. **Rate Limits**: Apple allows 3,600 requests/hour
2. **Caching**: Store reviews to reduce API calls
3. **Pagination**: Fetch in batches of 200 reviews
4. **Territories**: Default is USA, but you can fetch from any App Store region

Need help? Check the full guides:
- [APPLE_IMPORT_GUIDE.md](./APPLE_IMPORT_GUIDE.md) - Detailed setup
- [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) - Production deployment

Remember: Your Apple credentials are like passwords. Keep them secure! 🔐