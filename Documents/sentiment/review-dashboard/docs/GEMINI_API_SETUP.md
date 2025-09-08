# Gemini API Setup Guide

The AI Chat feature requires a Google Gemini API key to function. Follow these steps to set it up:

## Step 1: Get Your Free API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

## Step 2: Configure Your Application

### For Local Development:

1. Create a `.env` file in your project root (if it doesn't exist)
2. Add the following line:
   ```
   VITE_GEMINI_API_KEY=your-actual-api-key-here
   ```
3. Save the file
4. Restart your development server (`npm run dev`)

### For Production (Render, Vercel, etc.):

1. Go to your hosting platform's dashboard
2. Find the Environment Variables section
3. Add a new variable:
   - Key: `VITE_GEMINI_API_KEY`
   - Value: Your actual API key
4. Save and redeploy your application

## Step 3: Verify Setup

1. Open your application
2. Click the chat button in the bottom-right corner
3. The chat should initialize without errors
4. Try asking a question about your reviews

## Troubleshooting

### "API Key Required" Error
- Make sure you've added the API key to your `.env` file
- Verify the key name is exactly `VITE_GEMINI_API_KEY`
- Restart your development server after adding the key

### "Invalid API Key" Error
- Double-check that you copied the entire API key
- Ensure there are no extra spaces or quotes around the key
- Try generating a new API key from Google AI Studio

### Rate Limits
- Free tier allows 60 requests per minute
- If you hit rate limits, wait a moment and try again
- Consider upgrading to a paid plan for higher limits

## Security Notes

- Never commit your `.env` file to git
- Always use environment variables for API keys
- Regenerate your API key if it's ever exposed
- The `.env.example` file shows the format without exposing actual keys

## Additional Resources

- [Google AI Studio Documentation](https://ai.google.dev/docs)
- [Gemini API Pricing](https://ai.google.dev/pricing)
- [API Best Practices](https://ai.google.dev/api/rest/v1beta/models/generateContent)