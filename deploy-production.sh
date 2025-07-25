#!/bin/bash
# Production deployment script applying all suggested fixes

echo "🚀 Starting production deployment with all suggested fixes..."

# Apply suggested fix 1: Add environment variable to include development dependencies
export REPLIT_DISABLE_PACKAGE_LAYER=true
export NPM_CONFIG_INCLUDE=dev
export NODE_ENV=production

echo "✅ Environment variables set:"
echo "   REPLIT_DISABLE_PACKAGE_LAYER=true"
echo "   NPM_CONFIG_INCLUDE=dev"
echo "   NODE_ENV=production"

# Apply suggested fix 2: Ensure package-lock.json is updated
echo "📦 Updating package-lock.json..."
npm install --package-lock-only

# Apply suggested fix 3: Build with enhanced dependency management
echo "🔨 Building with comprehensive deployment fixes..."
node build-deployment-fixed.js

# Apply suggested fix 4: Verify all dependencies are included
echo "🔍 Verifying deployment package..."
cd dist
node verify-deployment.js

if [ $? -eq 0 ]; then
    echo "✅ All deployment fixes successfully applied!"
    echo "📦 Production package ready with:"
    echo "   - Express and all runtime dependencies included"
    echo "   - Package-lock.json updated"
    echo "   - Environment variables configured"
    echo "   - Dependencies verified for production"
    echo ""
    echo "🚢 Ready for deployment! No more missing dependency errors."
else
    echo "❌ Deployment verification failed"
    exit 1
fi