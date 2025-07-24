#!/bin/bash

# Deployment preparation script to reduce build size
echo "🚀 Preparing for deployment - optimizing build size..."

# Clean up development artifacts
echo "🧹 Cleaning development artifacts..."
rm -rf node_modules/.cache
rm -rf .vite
rm -rf dist
rm -rf client/dist

# Remove unnecessary files that might bloat the deployment
echo "📦 Removing unnecessary files..."
find . -name "*.log" -delete
find . -name "*.test.*" -delete
find . -name "*.spec.*" -delete
find . -name "__tests__" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "test" -type d -exec rm -rf {} + 2>/dev/null || true

# Clean up any temporary files
echo "🗑️ Cleaning temporary files..."
rm -rf tmp/
rm -rf .tmp/
rm -rf uploads/temp/

# Set production environment variables for npm
export NODE_ENV=production
export NPM_CONFIG_CACHE=false
export NPM_CONFIG_PREFER_OFFLINE=false
export NPM_CONFIG_AUDIT=false
export NPM_CONFIG_FUND=false
export NPM_CONFIG_UPDATE_NOTIFIER=false
export GENERATE_SOURCEMAP=false

echo "✅ Deployment preparation complete!"
echo "📊 Current directory size:"
du -sh .

echo ""
echo "🔧 To further reduce size, consider:"
echo "- Running 'npm prune --production' after deployment prep"
echo "- Ensuring devDependencies are not installed in production"
echo "- Using .dockerignore or .replitignore to exclude unnecessary files"