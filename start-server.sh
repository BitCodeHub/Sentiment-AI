#!/bin/bash

echo "========================================="
echo "Review Dashboard Server Troubleshooter"
echo "========================================="
echo ""

# Check for ESET
if ps aux | grep -q "[e]sets_fwprompt"; then
    echo "⚠️  WARNING: ESET Cyber Security Pro detected!"
    echo "This is likely blocking localhost connections."
    echo ""
    echo "SOLUTION OPTIONS:"
    echo "1. Temporarily disable ESET firewall:"
    echo "   - Open ESET Cyber Security Pro"
    echo "   - Go to Setup > Network protection"
    echo "   - Toggle 'Enable firewall' to OFF"
    echo ""
    echo "2. Add firewall exception for Node.js:"
    echo "   - In ESET, go to Setup > Network protection > Firewall"
    echo "   - Click 'Rules and zones' > 'Setup...'"
    echo "   - Add rule: Allow Node.js (usually at /usr/local/bin/node)"
    echo "   - Set Direction: Both, Action: Allow"
    echo ""
    echo "Press Enter to continue anyway..."
    read
fi

# Kill existing processes
echo "Cleaning up existing processes..."
pkill -f "vite" 2>/dev/null || true
pkill -f "node test-server" 2>/dev/null || true
pkill -f "serve" 2>/dev/null || true
pkill -f "http-server" 2>/dev/null || true

# Test localhost connectivity
echo ""
echo "Testing localhost connectivity..."
if ping -c 1 127.0.0.1 > /dev/null 2>&1; then
    echo "✅ Loopback interface (127.0.0.1) is working"
else
    echo "❌ Loopback interface is not working - serious network issue!"
    exit 1
fi

# Option 1: Try Vite dev server
echo ""
echo "Option 1: Starting Vite development server..."
npm run dev &
VITE_PID=$!
sleep 5

if lsof -i :5173 > /dev/null 2>&1; then
    echo "✅ Server started on port 5173"
    echo "Try opening: http://127.0.0.1:5173"
    echo ""
    echo "Press Ctrl+C to stop the server"
    wait $VITE_PID
else
    echo "❌ Failed to start on port 5173"
    kill $VITE_PID 2>/dev/null || true
    
    # Option 2: Try preview server
    echo ""
    echo "Option 2: Starting Vite preview server..."
    npm run preview &
    PREVIEW_PID=$!
    sleep 5
    
    if lsof -i :4173 > /dev/null 2>&1; then
        echo "✅ Server started on port 4173"
        echo "Try opening: http://127.0.0.1:4173"
        echo ""
        echo "Press Ctrl+C to stop the server"
        wait $PREVIEW_PID
    else
        echo "❌ Failed to start preview server"
        kill $PREVIEW_PID 2>/dev/null || true
        
        # Option 3: Try serve command
        echo ""
        echo "Option 3: Using npx serve..."
        npm run serve
    fi
fi