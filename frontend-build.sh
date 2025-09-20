#!/bin/bash
set -e

echo "=== Frontend Build Script ==="
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

echo ""
echo "=== Environment Info ==="
echo "PATH: $PATH"
echo "NODE_VERSION env: $NODE_VERSION"

echo ""
echo "=== Checking for Node.js ==="
if command -v node &> /dev/null; then
    echo "Node.js found at: $(which node)"
    echo "Node.js version: $(node --version)"
else
    echo "ERROR: Node.js not found!"
    echo "Checking common locations..."
    for path in /usr/local/bin/node /usr/bin/node /opt/render/project/.nvm/versions/node/*/bin/node; do
        if [ -f "$path" ]; then
            echo "Found node at: $path"
            export PATH="$(dirname $path):$PATH"
            break
        fi
    done
fi

echo ""
echo "=== Checking for npm ==="
if command -v npm &> /dev/null; then
    echo "npm found at: $(which npm)"
    echo "npm version: $(npm --version)"
else
    echo "ERROR: npm not found!"
    echo "Checking common locations..."
    for path in /usr/local/bin/npm /usr/bin/npm /opt/render/project/.nvm/versions/node/*/bin/npm; do
        if [ -f "$path" ]; then
            echo "Found npm at: $path"
            export PATH="$(dirname $path):$PATH"
            break
        fi
    done
fi

echo ""
echo "=== Checking package.json ==="
if [ -f "package.json" ]; then
    echo "package.json found"
    cat package.json | head -20
else
    echo "ERROR: package.json not found!"
fi

echo ""
echo "=== Installing Dependencies ==="
# Try different approaches to run npm
if command -v npm &> /dev/null; then
    npm install --legacy-peer-deps
elif [ -f "/usr/local/bin/npm" ]; then
    /usr/local/bin/npm install --legacy-peer-deps
else
    echo "ERROR: Cannot find npm to install dependencies!"
    exit 127
fi

echo ""
echo "=== Building Project ==="
if command -v npm &> /dev/null; then
    npm run build
elif [ -f "/usr/local/bin/npm" ]; then
    /usr/local/bin/npm run build
else
    echo "ERROR: Cannot find npm to build project!"
    exit 127
fi

echo ""
echo "=== Build Output ==="
echo "Checking dist directory:"
if [ -d "dist" ]; then
    echo "dist directory exists"
    ls -la dist/
else
    echo "ERROR: dist directory not found after build!"
    exit 1
fi

echo ""
echo "=== Build Complete ==="