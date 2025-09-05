# App Review Analytics Dashboard

A powerful, AI-enhanced dashboard for analyzing app store reviews with sentiment analysis, topic categorization, and actionable insights.

## Features

- 📊 **Interactive Dashboard** - Real-time analytics with beautiful charts
- 🎯 **Sentiment Analysis** - Automatic categorization of reviews as Positive, Neutral, or Negative
- 🏷️ **Topic Categorization** - Reviews organized by themes (Bugs, Features, Performance, etc.)
- 🔍 **Advanced Filtering** - Filter by rating, sentiment, category, platform, and date range
- ☁️ **Keyword Cloud** - Visual representation of most frequent terms
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 📈 **Trend Analysis** - Track rating and sentiment changes over time
- 🎨 **Modern UI** - Clean, intuitive interface with smooth animations
- 🤖 **AI-Powered Insights** - Google Gemini AI integration for automatic review analysis and recommendations
- 🍎 **Apple App Store Import** - Direct import of iOS app reviews (mock data for demo)

## Tech Stack

- **Frontend**: React 18, Vite
- **Styling**: CSS3 with modern features
- **Charts**: Chart.js with React-chartjs-2
- **Routing**: React Router v6
- **File Processing**: XLSX for Excel parsing
- **AI Integration**: Google Gemini Pro
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Google Gemini API key (for AI features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd review-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your Google Gemini API key
```

4. Start the development server:
```bash
npm run dev
```

5. Open http://localhost:5173 in your browser

### Building for Production

```bash
npm run build
npm run preview
```

## Usage

### Uploading Review Data

1. Click "Choose Excel File" on the home page
2. Select an Excel file with app reviews
3. The dashboard will automatically process and display analytics

#### Expected Excel Format

Your Excel file should contain these columns:
- Review ID
- Rating (1-5)
- Review Title
- Review Text / Body
- Author
- Date
- App Version
- Platform (iOS/Android)
- Country
- Developer Response (optional)

### Using AI Analysis

1. Upload your review data
2. Click the "AI Analysis" button in the dashboard header
3. Wait for AI to analyze reviews (10-20 seconds)
4. View insights including:
   - Main pain points
   - Feature requests
   - Technical issues
   - UI/UX feedback
   - Strategic recommendations

### Apple App Store Import

1. Click "Import from Apple App Store"
2. Enter your App ID, Issuer ID, and upload .p8 key file
3. Click "Import Reviews"

Note: Due to browser limitations, this currently shows mock data. For production use, implement a backend proxy.

## AI Integration Setup

See [OPENAI_SETUP.md](./OPENAI_SETUP.md) for detailed instructions on:
- Getting an OpenAI API key
- Configuring the environment
- Security best practices
- Production considerations
- Troubleshooting common issues

## Features in Detail

### Sentiment Analysis
Reviews are automatically categorized as:
- **Positive**: 4-5 star ratings or positive language
- **Neutral**: 3 star ratings or mixed sentiment
- **Negative**: 1-2 star ratings or negative language

### Topic Detection
Automatic categorization into topics:
- Satisfied Users
- Dissatisfied Users
- Bugs & Technical Issues
- Design & UX
- Performance

### Filters
- **Rating**: Filter by star rating (1-5)
- **Sentiment**: Positive, Neutral, Negative
- **Platform**: iOS, Android
- **Date Range**: Custom date selection
- **Search**: Full-text search in reviews

### AI Insights
- **Pain Points**: Top user frustrations
- **Feature Requests**: Most requested features
- **Technical Issues**: Common bugs and errors
- **Recommendations**: Actionable improvement suggestions
- **Trend Analysis**: Sentiment changes over time

## Development

### Project Structure
```
review-dashboard/
├── src/
│   ├── components/       # React components
│   ├── services/        # API and business logic
│   ├── utils/           # Helper functions
│   └── App.jsx          # Main app component
├── public/              # Static assets
└── package.json         # Dependencies
```

### Key Components
- `EnhancedDashboard`: Main dashboard view
- `AIInsights`: AI analysis display
- `FilterPanel`: Advanced filtering sidebar
- `ReviewList`: Review cards display
- `TopicDetailView`: Detailed topic analysis

### Adding New Features

1. Create new components in `src/components/`
2. Add services in `src/services/`
3. Update routing in `App.jsx` if needed
4. Follow existing patterns for consistency

## Security Notes

- Never commit API keys to version control
- Use environment variables for sensitive data
- Implement backend proxy for production
- Validate and sanitize all user inputs
- Use HTTPS in production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and feature requests, please open an issue on GitHub.