#!/bin/bash

# Navigate to the project directory
cd /Users/jimmylam/Documents/sentiment/review-dashboard

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Try to start the dev server
echo "Starting Vite development server..."
npm run dev

# If npm run dev fails, try npx vite
if [ $? -ne 0 ]; then
    echo "npm run dev failed, trying npx vite..."
    npx vite
fi

# If that also fails, try to serve the dist folder
if [ $? -ne 0 ]; then
    echo "Development server failed, serving dist folder..."
    if [ -d "dist" ]; then
        python3 -m http.server 8080 --directory dist
    else
        echo "No dist folder found. Building project..."
        npm run build
        python3 -m http.server 8080 --directory dist
    fi
fi