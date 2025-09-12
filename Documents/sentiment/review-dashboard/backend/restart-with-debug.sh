#!/bin/bash

echo "=== Restarting Backend Server with Debug Logging ==="
echo "Timestamp: $(date)"
echo ""

# Kill any existing backend process
echo "Stopping existing backend process..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || echo "No existing process found on port 3001"

# Wait a moment
sleep 2

# Check if .env exists
if [ -f ".env" ]; then
    echo "✓ .env file found"
    echo "Reddit credentials check:"
    grep -q "REDDIT_CLIENT_ID=" .env && echo "  ✓ REDDIT_CLIENT_ID is set" || echo "  ✗ REDDIT_CLIENT_ID is missing"
    grep -q "REDDIT_CLIENT_SECRET=" .env && echo "  ✓ REDDIT_CLIENT_SECRET is set" || echo "  ✗ REDDIT_CLIENT_SECRET is missing"
else
    echo "✗ .env file not found!"
fi

echo ""
echo "Starting backend server..."
echo "Server will log all incoming requests and Reddit API calls"
echo "Press Ctrl+C to stop the server"
echo ""
echo "=== Server Output ==="

# Start the server with environment variables loaded
npm start