#!/bin/bash
# Build script for backend on Render

# Exit on any error
set -e

# Navigate to the correct directory
cd Documents/sentiment/review-dashboard/backend

# Install dependencies
npm install --legacy-peer-deps

echo "Backend build completed successfully"