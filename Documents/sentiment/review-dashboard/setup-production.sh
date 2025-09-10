#!/bin/bash

# Production Setup Script for Apple App Store Integration
# This script helps you set up the production environment securely

echo "🍎 Apple App Store Integration - Production Setup"
echo "================================================"
echo ""
echo "This script will help you configure your production environment."
echo "Your credentials will ONLY be stored locally and never shared."
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "Checking prerequisites..."
if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Prerequisites checked"
echo ""

# Ask for deployment method
echo "How do you want to deploy the backend?"
echo "1) Local testing (localhost)"
echo "2) Deploy to Vercel"
echo "3) Deploy to Heroku"
echo "4) Deploy to your own server"
echo "5) Skip backend (use demo mode only)"
read -p "Choose an option (1-5): " deployment_choice

# Backend setup based on choice
case $deployment_choice in
    1)
        echo ""
        echo "Setting up for local testing..."
        cd backend
        
        # Install dependencies
        echo "Installing backend dependencies..."
        npm install
        
        # Create .env file
        echo "Creating .env file..."
        cat > .env << EOL
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
EOL
        
        echo "✅ Backend configured for local testing"
        echo "Run 'npm start' in the backend folder to start the server"
        backend_url="http://localhost:3001"
        ;;
        
    2)
        echo ""
        echo "Setting up for Vercel deployment..."
        
        if ! command_exists vercel; then
            echo "Installing Vercel CLI..."
            npm i -g vercel
        fi
        
        cd backend
        npm install
        
        # Create vercel.json
        cat > vercel.json << 'EOL'
{
  "version": 2,
  "builds": [
    {
      "src": "server-production.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server-production.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
EOL
        
        echo "Ready to deploy to Vercel!"
        echo "Run 'vercel --prod' in the backend folder"
        echo "After deployment, get your URL from Vercel"
        read -p "Enter your Vercel URL (e.g., https://your-app.vercel.app): " backend_url
        ;;
        
    3)
        echo ""
        echo "Setting up for Heroku deployment..."
        
        if ! command_exists heroku; then
            echo "❌ Heroku CLI is not installed."
            echo "Please install it from: https://devcenter.heroku.com/articles/heroku-cli"
            exit 1
        fi
        
        cd backend
        npm install
        
        # Create Procfile
        echo "web: npm run start:production" > Procfile
        
        echo "Ready to deploy to Heroku!"
        echo "Run these commands:"
        echo "  heroku create your-app-name"
        echo "  git add ."
        echo "  git commit -m 'Add backend'"
        echo "  git push heroku main"
        read -p "Enter your Heroku URL (e.g., https://your-app.herokuapp.com): " backend_url
        ;;
        
    4)
        echo ""
        read -p "Enter your server's API URL (e.g., https://api.yourdomain.com): " backend_url
        echo "Please deploy the backend folder to your server manually."
        echo "See PRODUCTION_SETUP.md for detailed instructions."
        ;;
        
    5)
        echo ""
        echo "Skipping backend setup. The app will use demo mode."
        backend_url=""
        ;;
esac

# Frontend configuration
echo ""
echo "Configuring frontend..."
cd ..

# Check if .env exists
if [ -f .env ]; then
    echo "Found existing .env file"
    read -p "Do you want to update it? (y/n): " update_env
else
    update_env="y"
fi

if [ "$update_env" = "y" ]; then
    # Get Gemini API key
    echo ""
    echo "Enter your Gemini API key (for AI features)"
    echo "Get one from: https://makersuite.google.com/app/apikey"
    read -p "Gemini API Key: " gemini_key
    
    # Create/update .env
    cat > .env << EOL
# Gemini API Configuration
VITE_GEMINI_API_KEY=$gemini_key

# Apple App Store API Configuration
VITE_APPLE_API_ENDPOINT=$backend_url/api/apple-reviews
EOL
    
    echo "✅ Frontend configured"
fi

# Ask about credentials storage
if [ "$deployment_choice" != "5" ]; then
    echo ""
    echo "Do you want to store Apple credentials on the server?"
    echo "This is more convenient but requires secure server storage."
    read -p "Store credentials on server? (y/n): " store_creds
    
    if [ "$store_creds" = "y" ]; then
        echo ""
        echo "⚠️  WARNING: Only do this on a secure server you control!"
        echo ""
        echo "Add these to your server's environment variables:"
        echo ""
        read -p "Apple App ID: " app_id
        read -p "Apple Issuer ID: " issuer_id
        read -p "Apple Key ID (from .p8 filename): " key_id
        read -p "Path where you'll store the .p8 file on server: " key_path
        
        echo ""
        echo "Add these environment variables to your server:"
        echo "APPLE_APP_ID=$app_id"
        echo "APPLE_ISSUER_ID=$issuer_id"
        echo "APPLE_KEY_ID=$key_id"
        echo "APPLE_PRIVATE_KEY_PATH=$key_path"
        echo ""
        echo "Remember to:"
        echo "1. Upload your .p8 file to $key_path"
        echo "2. Set permissions: chmod 400 $key_path"
        echo "3. Restart your backend service"
    fi
fi

# Final instructions
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""

if [ "$deployment_choice" = "1" ]; then
    echo "To start development:"
    echo "1. Terminal 1: cd backend && npm start"
    echo "2. Terminal 2: npm run dev"
    echo "3. Open http://localhost:5173"
elif [ "$deployment_choice" = "5" ]; then
    echo "To start in demo mode:"
    echo "1. Run: npm run dev"
    echo "2. Open http://localhost:5173"
else
    echo "To deploy:"
    echo "1. Complete backend deployment"
    echo "2. Run: npm run build"
    echo "3. Deploy the 'dist' folder to your hosting service"
fi

echo ""
echo "For more details, see PRODUCTION_SETUP.md"
echo ""
echo "Need help? Check the troubleshooting section in the docs!"