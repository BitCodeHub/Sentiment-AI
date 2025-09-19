# Render Deployment Exit Code 127 Fix

## Problem Analysis

Exit code 127 specifically means "command not found". In your case, this is happening because:

1. **Nested Directory Structure**: Your repository has an unusual nested structure where the actual application is inside `Documents/sentiment/review-dashboard/` instead of at the repository root.

2. **Command Execution Context**: Render may not support complex shell commands like `cd` in the `buildCommand` field, or the shell environment might be limited.

3. **Path Resolution**: When Render clones your repo, it expects to find files relative to the repository root.

## Solutions

### Solution 1: Build Scripts (Recommended) ✅

I've created build scripts that Render can execute directly:

**Files created:**
- `build-frontend.sh` - Handles frontend build process
- `build-backend.sh` - Handles backend build process  
- `start-backend.sh` - Starts the backend server
- `render.yaml` - Updated to use these scripts

**To deploy:**
```bash
git add build-frontend.sh build-backend.sh start-backend.sh render.yaml
git commit -m "fix: use build scripts to handle nested directory structure"
git push origin main
```

### Solution 2: Alternative render.yaml

If the build scripts don't work, try the alternative configuration:

```bash
cp render-alternative.yaml render.yaml
git add render.yaml
git commit -m "fix: use rootDir to handle nested directories"
git push origin main
```

### Solution 3: Restructure Repository (Most Reliable)

The most reliable solution is to move all files to the repository root:

```bash
# Move all files from nested directory to root
mv Documents/sentiment/review-dashboard/* .
mv Documents/sentiment/review-dashboard/.[^.]* . 2>/dev/null || true

# Remove empty directories
rm -rf Documents/

# Update render.yaml to use standard paths
cat > render.yaml << 'EOF'
services:
  # Frontend Service
  - type: web
    name: sentiment-review-dashboard
    env: static
    buildCommand: npm install --legacy-peer-deps && npm run build
    staticPublishPath: ./dist
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

  # Backend Service
  - type: web
    name: sentiment-review-backend
    env: node
    region: oregon
    rootDir: backend
    buildCommand: npm install --legacy-peer-deps
    startCommand: node server-production.js
    healthCheckPath: /health
    envVars:
      - key: NODE_VERSION
        value: 20.11.1
      - key: NODE_ENV
        value: production
      - key: PORT
        generateValue: true
      # ... rest of env vars ...
EOF

# Commit and push
git add -A
git commit -m "fix: restructure repository to standard layout"
git push origin main
```

## Debugging Steps

If deployment still fails:

1. **Check Render Logs**
   - Look for the exact command that's failing
   - Check if npm/node is available in the build environment

2. **Verify Environment**
   ```bash
   # Add this to your build script to debug:
   echo "Current directory: $(pwd)"
   echo "Directory contents: $(ls -la)"
   echo "Node version: $(node -v)"
   echo "NPM version: $(npm -v)"
   ```

3. **Test Locally**
   ```bash
   # Simulate Render's build process
   cd /tmp
   git clone your-repo-url
   cd your-repo
   ./build-frontend.sh
   ```

## Common Causes of Exit 127

1. **Missing executable**: The command doesn't exist (e.g., `npm` not found)
2. **Wrong path**: The script or command is not in the expected location
3. **Permission issues**: Script is not executable (we fixed this with `chmod +x`)
4. **Shell differences**: Render might use a different shell (sh vs bash)

## Quick Fixes to Try

1. **Use explicit paths**:
   ```yaml
   buildCommand: /usr/bin/npm install --legacy-peer-deps
   ```

2. **Use shell wrapper**:
   ```yaml
   buildCommand: sh -c 'cd Documents/sentiment/review-dashboard && npm install'
   ```

3. **Check Node version**:
   - Try different Node versions (18.x, 20.x, 22.x)
   - Render might not support the exact version specified

## Verification After Deployment

Once deployment succeeds:

1. Backend health: `https://sentiment-review-backend.onrender.com/health`
2. Frontend: `https://sentiment-review-dashboard.onrender.com`
3. API endpoints: `https://sentiment-review-backend.onrender.com/api/apple-reviews`

## Next Steps

1. Try Solution 1 first (build scripts) - this is the quickest fix
2. If that fails, try Solution 2 (alternative render.yaml)
3. If both fail, use Solution 3 (restructure repository) - most reliable but requires more work

The key insight is that Render expects a standard repository structure. The nested `Documents/sentiment/review-dashboard/` path is causing the deployment system to fail when trying to locate and execute commands.