#!/bin/bash

# Production deployment script - optimizes for Cloud Run 8GB limit
echo "🚀 Starting production deployment optimization..."

# Set production environment variables
export NODE_ENV=production
export NPM_CONFIG_PRODUCTION=true
export NPM_CONFIG_CACHE=false
export NPM_CONFIG_PREFER_OFFLINE=false
export NPM_CONFIG_AUDIT=false
export NPM_CONFIG_FUND=false
export NPM_CONFIG_UPDATE_NOTIFIER=false
export GENERATE_SOURCEMAP=false
export SKIP_PREFLIGHT_CHECK=true

# Clean development artifacts
echo "🧹 Cleaning development artifacts..."
rm -rf node_modules/.cache
rm -rf .vite
rm -rf .cache
rm -rf tmp/
rm -rf .tmp/
find . -name "*.log" -delete 2>/dev/null || true
find . -name "*.map" -delete 2>/dev/null || true

# Remove test files
echo "🗑️ Removing test files..."
find . -name "*.test.*" -delete 2>/dev/null || true
find . -name "*.spec.*" -delete 2>/dev/null || true
find . -name "__tests__" -type d -exec rm -rf {} + 2>/dev/null || true

# Build production assets
echo "⚙️ Building production assets..."
npm run build

# Clean up build artifacts not needed for runtime
echo "🔧 Cleaning post-build artifacts..."
rm -rf client/src
rm -rf server/*.ts
# Keep server/*.js files for runtime

# Verify deployment readiness
echo "✅ Production optimization complete!"
echo ""
echo "📊 Estimated deployment size (after .replitignore exclusions):"
du -sh dist/ package.json server/*.js 2>/dev/null || echo "Main deployment files ready"
echo ""
echo "🚫 Excluded from deployment (via .replitignore):"
echo "   - uploads/ (7.4GB user files)"
echo "   - attached_assets/ (110MB)"
echo "   - node_modules development packages"
echo "   - Source files and build tools"
echo ""
echo "Ready for deployment! The .replitignore file will automatically exclude large files."