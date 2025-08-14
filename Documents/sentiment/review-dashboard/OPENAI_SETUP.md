# OpenAI Integration Setup Guide

## Overview
The review dashboard includes AI-powered analysis features using OpenAI's GPT-3.5-turbo model to provide:
- Main pain points and issues identification
- Feature requests summary
- Technical issues analysis
- UI/UX feedback insights
- Strategic recommendations
- Trend analysis

## Setup Instructions

### 1. Get an OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/signup)
2. Sign up or log in to your account
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Copy the key (it starts with `sk-`)

### 2. Configure the API Key
1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your API key:
   ```
   VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

3. Restart the development server:
   ```bash
   npm run dev
   ```

### 3. Using AI Analysis
1. Upload your review data or import from Apple App Store
2. Click the "AI Analysis" button in the dashboard header
3. Wait for the analysis to complete (usually 10-20 seconds)
4. View the insights below the analytics charts

## Important Security Notes

### API Key Security
- **Never commit your API key** to version control
- The `.env` file should be in `.gitignore`
- For production, use environment variables from your hosting platform

### Production Considerations
- The current implementation uses `dangerouslyAllowBrowser: true` for demo purposes
- **For production**, implement a backend proxy to:
  - Keep your API key secure on the server
  - Handle rate limiting
  - Add authentication
  - Cache results

### Backend Proxy Example (Node.js/Express)
```javascript
// server.js
app.post('/api/analyze-reviews', authenticate, async (req, res) => {
  const { reviews } = req.body;
  
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: generatePrompt(reviews) }],
      temperature: 0.7,
      max_tokens: 1000
    });
    
    res.json({ analysis: JSON.parse(response.choices[0].message.content) });
  } catch (error) {
    res.status(500).json({ error: 'Analysis failed' });
  }
});
```

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Verify your API key is correct in `.env`
   - Ensure the key hasn't been revoked
   - Check you have credits in your OpenAI account

2. **"Rate limit exceeded" error**
   - Wait a few minutes and try again
   - Consider upgrading your OpenAI plan
   - Implement caching to reduce API calls

3. **"Failed to parse AI response" error**
   - This is usually temporary
   - Try again in a few moments
   - Check the browser console for details

4. **No response or timeout**
   - Check your internet connection
   - Verify OpenAI services are operational
   - Review browser console for CORS errors

## Cost Considerations
- Each analysis uses approximately 1,000-2,000 tokens
- GPT-3.5-turbo pricing: ~$0.002 per 1K tokens
- Estimated cost: ~$0.004 per analysis
- Consider implementing caching to reduce costs

## Future Enhancements
- Support for GPT-4 (more accurate but more expensive)
- Batch processing for large review sets
- Custom prompts for specific analysis needs
- Scheduled automatic analysis
- Export AI insights to PDF reports