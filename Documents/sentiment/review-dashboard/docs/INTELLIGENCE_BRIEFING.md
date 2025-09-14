# Intelligence Briefing Feature

## Overview
The Intelligence Briefing feature allows users to request executive-level analysis for specific time periods using natural language queries. When a user asks for "this week's intelligence briefing", the system automatically:

1. Parses the date request
2. Filters the data to the requested time period
3. Generates an executive analysis based only on that filtered data

## How It Works

### Date Parsing
The system recognizes various natural language date requests:
- "this week's intelligence briefing" - Current week (Sunday to Saturday)
- "last week's executive analysis" - Previous week
- "today's intelligence briefing" - Today only
- "this month's executive summary" - Current month
- "last 7 days intelligence briefing" - Rolling 7 days
- "last 30 days" - Rolling 30 days
- And more...

### Implementation
1. **Date Parser Utility** (`src/utils/dateParser.js`)
   - Parses natural language date requests
   - Returns start and end dates
   - Identifies intelligence briefing requests

2. **Dashboard Integration** (`src/components/EnhancedDashboard.jsx`)
   - `handleIntelligenceBriefingRequest` function processes requests
   - Automatically sets date filters
   - Triggers executive analysis with filtered data
   - For Apple data, fetches new data from API with date range

3. **UI Component** (`src/components/IntelligenceBriefingHandler.jsx`)
   - Provides chat-like interface for requests
   - Shows sample requests
   - Displays system responses

## Usage

### Via UI
1. Click the "Briefing" button in the toolbar
2. Type or select a sample request like "Give me this week's intelligence briefing"
3. The system will:
   - Set the date filter to the requested period
   - Fetch data if needed (for Apple reviews)
   - Generate executive analysis for that period only

### Programmatically
```javascript
// The dashboard exposes a global function
window.handleIntelligenceBriefingRequest("Give me this week's intelligence briefing");
```

## Key Features
- **Automatic Date Filtering**: No manual date selection needed
- **Apple API Integration**: Fetches fresh data when date range changes
- **Natural Language**: Understands various date expressions
- **Executive Analysis**: Generates comprehensive business insights

## Example Requests
- "Give me this week's intelligence briefing"
- "Show me last week's executive analysis"
- "Generate today's intelligence briefing"
- "Create this month's executive summary"
- "Show me the last 7 days intelligence briefing"

## Technical Details
- Date ranges are inclusive (start of day to end of day)
- Week starts on Sunday
- For Apple data, the API is called with the specific date range
- Analysis includes only reviews within the requested period