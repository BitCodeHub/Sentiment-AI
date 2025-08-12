#!/bin/bash

echo "Starting Review Dashboard..."
echo "Attempting to start on multiple ports..."

# Kill any existing processes
pkill -f "vite" 2>/dev/null || true
pkill -f "http-server" 2>/dev/null || true

# Try different approaches
echo "1. Trying Vite dev server on port 5173..."
npm run dev &
VITE_PID=$!

sleep 3

# Test if it's working
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Success! Open http://localhost:5173"
else
    echo "❌ Vite dev server failed, trying alternative..."
    kill $VITE_PID 2>/dev/null || true
    
    echo "2. Building and serving production build..."
    npm run build
    
    echo "3. Starting HTTP server on port 8888..."
    npx http-server dist -p 8888 -o
fi

echo ""
echo "If you're still having issues, try:"
echo "1. Disable firewall temporarily"
echo "2. Check if any antivirus is blocking localhost"
echo "3. Try using 127.0.0.1 instead of localhost"
echo "4. Run: sudo lsof -i :5173 (to check what's using the port)"