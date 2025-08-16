# Localhost Connection Refused - Fix Guide

## Problem
You're experiencing "localhost connection refused" errors when trying to access your Vite development server or any local servers on your Mac.

## Root Cause
**ESET Cyber Security Pro** is blocking localhost connections. This firewall software is preventing Node.js and other applications from accepting incoming connections, even on localhost.

## Solutions

### Solution 1: Temporarily Disable ESET Firewall (Quick Fix)
1. Open **ESET Cyber Security Pro** application
2. Navigate to **Setup** > **Network protection**
3. Toggle **"Enable firewall"** to **OFF**
4. Run your server: `npm run dev`
5. Access your app at: http://localhost:5173
6. **Important**: Remember to turn the firewall back ON when done

### Solution 2: Add Firewall Exception for Node.js (Permanent Fix)
1. Open **ESET Cyber Security Pro**
2. Go to **Setup** > **Network protection** > **Firewall**
3. Click **"Rules and zones"** > **"Setup..."**
4. Click **"Add"** to create a new rule
5. Configure the rule:
   - Name: "Allow Node.js Development"
   - Direction: **In/Out**
   - Action: **Allow**
   - Protocol: **TCP & UDP**
   - Application: Browse to `/usr/local/bin/node` (or wherever Node is installed)
6. Add another rule for specific ports:
   - Name: "Allow Development Ports"
   - Direction: **In/Out**
   - Action: **Allow**
   - Protocol: **TCP**
   - Local Port: **3000-9999** (covers most dev server ports)
   - Remote Address: **127.0.0.1** (localhost only)

### Solution 3: Use the Troubleshooting Script
I've created a script that handles the server startup with proper error handling:

```bash
chmod +x start-server.sh
./start-server.sh
```

This script will:
- Detect ESET and warn you
- Try multiple server configurations
- Provide clear feedback on what's working

## Alternative Approaches

### Use a Different Port
Sometimes certain ports are less restricted:
```bash
# Edit vite.config.js to use port 8080
npm run dev -- --port 8080
```

### Use IP Address Instead of Localhost
Try accessing via IP:
- Instead of: http://localhost:5173
- Use: http://127.0.0.1:5173

### Check What's Listening
To see what servers are actually running:
```bash
lsof -i -P | grep LISTEN
```

### Kill Stuck Processes
If servers seem stuck:
```bash
pkill -f vite
pkill -f node
```

## Verification Steps
1. Check if ESET is running:
   ```bash
   ps aux | grep -i eset
   ```

2. Test localhost connectivity:
   ```bash
   ping 127.0.0.1
   curl http://127.0.0.1:5173
   ```

3. Check if port is open:
   ```bash
   lsof -i :5173
   ```

## Long-term Recommendation
For development work, consider:
1. Creating a comprehensive ESET firewall rule for all development tools
2. Using ESET's "Interactive Mode" to allow connections as needed
3. Creating a "Development Profile" in ESET that you can switch to when coding

## Emergency Fallback
If nothing else works, you can serve the built files using Python:
```bash
npm run build
cd dist
python3 -m http.server 8000
```
Then access at: http://127.0.0.1:8000

Remember to re-enable your firewall after development!