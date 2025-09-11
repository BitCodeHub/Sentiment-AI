#!/bin/bash

echo "Starting Review Dashboard Services..."
echo "===================================="

# Start backend server
echo "Starting backend server on port 3001..."
cd backend && npm start &
BACKEND_PID=$!

# Give backend a moment to start
sleep 2

# Start frontend
echo "Starting frontend on port 5173..."
cd .. && npm run dev

# When frontend exits, kill backend
kill $BACKEND_PID 2>/dev/null
echo "Services stopped."