#!/bin/bash
echo "=== Deployment Test Script ==="
echo "Current directory: $(pwd)"
echo ""

echo "1. Checking Node.js installation:"
which node || echo "node not found"
node --version || echo "node version check failed"

echo ""
echo "2. Checking npm installation:"
which npm || echo "npm not found"
npm --version || echo "npm version check failed"

echo ""
echo "3. Directory structure:"
ls -la

echo ""
echo "4. Package.json exists:"
if [ -f "package.json" ]; then
  echo "✓ package.json found"
  cat package.json | head -10
else
  echo "✗ package.json NOT found"
fi

echo ""
echo "5. Testing npm install:"
npm install --legacy-peer-deps --dry-run

echo ""
echo "=== End of test ==="