# Deploying Review Dashboard to Render.com

## Prerequisites
- Render account (which you already have)
- GitHub repository with your code

## Deployment Steps

### Step 1: Push Your Code to GitHub
First, commit and push all the changes:

```bash
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

### Step 2: Deploy on Render

1. **Go to [Render Dashboard](https://dashboard.render.com/)**

2. **Click "New +" → "Static Site"**

3. **Connect your GitHub repository**
   - If not connected, authorize Render to access your GitHub
   - Select the repository: `Sentiment-AI`

4. **Configure your static site:**
   - **Name**: `review-dashboard` (or any name you prefer)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (uses repository root)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

5. **Environment Variables** (if needed):
   Click "Advanced" and add:
   - `VITE_GEMINI_API_KEY`: Your Gemini API key
   - `VITE_OPENAI_API_KEY`: Your OpenAI API key (if used)

6. **Click "Create Static Site"**

### Step 3: Wait for Deployment
- Render will automatically build and deploy your app
- This usually takes 2-5 minutes
- You'll see the build logs in real-time

### Step 4: Access Your App
Once deployed, you'll get a URL like:
`https://review-dashboard-xxx.onrender.com`

## Alternative: Using render.yaml (Blueprint)

I've already created a `render.yaml` file for you. To use it:

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` file
5. Click "Apply" to create the service

## Features Configured

✅ **Automatic builds** on every push to main branch
✅ **Client-side routing** support (SPA)
✅ **Pull request previews** enabled
✅ **Optimized static file serving**

## Troubleshooting

### If build fails:
1. Check the build logs for errors
2. Ensure all dependencies are in `package.json`
3. Verify environment variables are set correctly

### If routing doesn't work:
- The `_redirects` file in public folder handles this
- All routes redirect to index.html for React Router

## Updating Your App

After initial deployment, any push to your main branch will trigger automatic redeployment.

```bash
git add .
git commit -m "Update app"
git push origin main
```

## Custom Domain (Optional)

1. Go to your service settings on Render
2. Click "Custom Domains"
3. Add your domain and follow DNS configuration instructions