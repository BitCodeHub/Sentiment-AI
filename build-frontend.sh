#!/bin/bash
# Build script for frontend on Render

# Exit on any error
set -e

# Navigate to the correct directory
cd Documents/sentiment/review-dashboard

# Install dependencies
npm install --legacy-peer-deps

# Build the application
npm run build

echo "Frontend build completed successfully"