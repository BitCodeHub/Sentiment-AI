#!/bin/bash

echo "Clearing build cache and restarting development server..."

# Kill any running Vite processes
echo "Stopping any running dev servers..."
pkill -f vite || true

# Clear Vite cache
echo "Clearing Vite cache..."
rm -rf node_modules/.vite

# Clear browser service worker (if any)
echo ""
echo "⚠️  IMPORTANT: Clear your browser cache!"
echo "   • Chrome/Edge: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)"
echo "   • Safari: Cmd+Option+E then Cmd+R"
echo "   • Or open DevTools → Application → Storage → Clear site data"
echo ""

# Start dev server
echo "Starting development server..."
npm run dev