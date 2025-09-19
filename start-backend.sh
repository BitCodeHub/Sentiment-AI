#!/bin/bash
# Start script for backend on Render

# Exit on any error
set -e

# Navigate to the correct directory
cd Documents/sentiment/review-dashboard/backend

# Start the production server
node server-production.js