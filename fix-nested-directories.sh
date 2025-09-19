#!/bin/bash

# This script fixes the nested directory structure by moving all project files to the repository root

echo "=== Fixing Nested Directory Structure ==="
echo "This will move all project files from Documents/sentiment/review-dashboard/ to the repository root"
echo ""

# Check if we're in the right directory
if [ ! -f "render.yaml" ]; then
    echo "Error: Please run this script from the repository root directory"
    exit 1
fi

# Check if the nested structure exists
if [ ! -d "Documents/sentiment/review-dashboard" ]; then
    echo "Error: Documents/sentiment/review-dashboard directory not found"
    exit 1
fi

echo "Current directory: $(pwd)"
echo "Files to be moved from: Documents/sentiment/review-dashboard/"
echo ""
read -p "Do you want to continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled"
    exit 1
fi

echo ""
echo "Moving files..."

# Move all contents from nested directory to root, excluding node_modules
cd Documents/sentiment/review-dashboard/
for item in *; do
    if [ "$item" != "node_modules" ] && [ "$item" != "dist" ]; then
        echo "Moving $item to repository root..."
        mv "$item" ../../
    fi
done

# Move hidden files (.env, .gitignore, etc) if they exist
for item in .*; do
    if [ "$item" != "." ] && [ "$item" != ".." ]; then
        echo "Moving $item to repository root..."
        mv "$item" ../../ 2>/dev/null || true
    fi
done

cd ../../

echo ""
echo "Cleaning up empty directories..."

# Remove the now-empty nested directories
rm -rf Documents/

echo ""
echo "Creating simplified render.yaml..."

# Create a new render.yaml with simplified paths
cat > render.yaml << 'EOF'
services:
  # Frontend Service - Static Site
  - type: web
    name: sentiment-review-dashboard
    env: static
    buildCommand: npm install --legacy-peer-deps && npm run build
    staticPublishPath: dist
    envVars:
      - key: NODE_VERSION
        value: 20.11.1
      - key: VITE_OPENAI_API_KEY
        sync: false
      - key: VITE_REDDIT_API_ENDPOINT
        value: https://sentiment-review-backend.onrender.com/api/reddit
      - key: VITE_APPLE_API_ENDPOINT
        value: https://sentiment-review-backend.onrender.com/api/apple-reviews
      - key: VITE_GEMINI_API_KEY
        sync: false
      - key: VITE_API_ENDPOINT
        value: https://sentiment-review-backend.onrender.com
    headers:
      - path: /*
        name: X-Frame-Options
        value: DENY
      - path: /*
        name: X-Content-Type-Options
        value: nosniff

  # Backend Service - Node.js
  - type: web
    name: sentiment-review-backend
    env: node
    region: oregon
    buildCommand: cd backend && npm install --legacy-peer-deps
    startCommand: cd backend && node server-production.js
    healthCheckPath: /health
    envVars:
      - key: NODE_VERSION
        value: 20.11.1
      - key: NODE_ENV
        value: production
      - key: PORT
        generateValue: true
      
      # Apple API Credentials
      - key: APPLE_APP1_ID
        value: "893514610"
      - key: APPLE_APP1_NAME
        value: myHyundai with Bluelink
      - key: APPLE_APP2_ID
        value: "867941329"
      - key: APPLE_APP2_NAME
        value: Genesis Intelligent Assistant
      - key: APPLE_ISSUER_ID
        sync: false
      - key: APPLE_KEY_ID
        sync: false
      - key: APPLE_PRIVATE_KEY_BASE64
        sync: false
      
      # Reddit API Credentials
      - key: REDDIT_CLIENT_ID
        sync: false
      - key: REDDIT_CLIENT_SECRET
        sync: false
      - key: REDDIT_USER_AGENT
        value: ReviewDashboard/1.0.0
      
      # CORS Configuration
      - key: FRONTEND_URL
        value: https://sentiment-review-dashboard.onrender.com
      
      # Redis (optional)
      - key: REDIS_URL
        sync: false
        
      # Rate Limiting
      - key: RATE_LIMIT_WINDOW_MS
        value: "900000"
      - key: RATE_LIMIT_MAX
        value: "100"
        
      # Database Configuration
      - key: DATABASE_URL
        fromDatabase:
          name: review-dashboard-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
EOF

echo ""
echo "=== Directory Structure Fixed! ==="
echo ""
echo "Project files have been moved to the repository root."
echo "The render.yaml has been updated with simplified paths."
echo ""
echo "Next steps:"
echo "1. Review the changes with: git status"
echo "2. Stage the changes: git add ."
echo "3. Commit: git commit -m \"fix: restructure repository to eliminate nested directories\""
echo "4. Push: git push origin main"
echo ""
echo "Render will automatically redeploy with the correct structure."