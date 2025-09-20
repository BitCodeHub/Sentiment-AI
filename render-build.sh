#!/bin/bash
set -e

echo "Starting Render build process..."

# Debug information
echo "Node version:"
node --version || echo "Node not found"

echo "NPM version:"
npm --version || echo "NPM not found"

echo "Current directory:"
pwd

echo "Directory contents:"
ls -la

# Install dependencies
echo "Installing dependencies..."
npm install --legacy-peer-deps

# Build the project
echo "Building project..."
npm run build

echo "Build completed successfully!"