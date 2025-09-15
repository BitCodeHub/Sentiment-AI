# Render.com Environment Variables Setup

## Important: Manual Configuration Required

After pushing the render.yaml file, you need to manually set the following sensitive environment variables in the Render dashboard:

### Frontend Service (sentiment-review-dashboard)

1. Go to: https://dashboard.render.com
2. Select `sentiment-review-dashboard` service
3. Go to "Environment" tab
4. Add these variables:
   - `VITE_OPENAI_API_KEY` - Your OpenAI API key

### Backend Service (sentiment-review-backend)

1. Go to: https://dashboard.render.com
2. Select `sentiment-review-backend` service  
3. Go to "Environment" tab
4. Add these sensitive variables:

#### Apple API Credentials
- `APPLE_ISSUER_ID` = `69a6de71-59d9-47e3-e053-5b8c7c11a4d1`
- `APPLE_KEY_ID` = `34999638C7`
- `APPLE_PRIVATE_KEY_BASE64` = `LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR1RBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJIa3dkd0lCQVFRZ3c4Y3FQL3o4YXYvbmdVSWIKRGhFOWwxUXVTTlJ4cml5R3RQZDcyUGVGUlRPZ0NnWUlLb1pJemowREFRZWhSQU5DQUFSWlkwMmFUajJBRE9TUwpjeHhMOUs4a3AvM3lqUDh4WXlWdVl3SXdpVEl5Sm52aUZqOHkzU0pPenVXS1RXbHkzMG1TaW9IN1dPVFYzMlk2CksyaEFMb3ExCi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0=`

#### Reddit API Credentials
- `REDDIT_CLIENT_ID` - Your Reddit client ID
- `REDDIT_CLIENT_SECRET` - Your Reddit client secret

#### Optional: Redis Cache
- `REDIS_URL` - Your Redis URL (if using Redis for caching)

## Verifying Deployment

After setting environment variables:

1. **Trigger a manual deploy** for each service
2. **Check logs** to ensure services start correctly
3. **Test endpoints**:
   - Frontend: https://sentiment-review-dashboard.onrender.com
   - Backend Health: https://sentiment-review-backend.onrender.com/health
   - Apple Apps: https://sentiment-review-backend.onrender.com/api/apple-apps

## Automatic Deployments

Once configured, every push to the `main` branch will automatically:
1. Build and deploy the frontend
2. Build and deploy the backend
3. Use the environment variables configured in Render

## Troubleshooting

If deployments fail:
1. Check build logs in Render dashboard
2. Verify all environment variables are set
3. Ensure Node version matches (22.16.0)
4. Check that the rootDir paths are correct in render.yaml