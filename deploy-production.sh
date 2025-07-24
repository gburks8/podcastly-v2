#!/bin/bash

# Production deployment script for MediaPro Client Portal
# Applies all deployment fixes to resolve Vite import issues

echo "🚀 Starting production deployment process..."

# Set production environment variables
export NODE_ENV=production
export REPLIT_DISABLE_PACKAGE_LAYER=true
export NPM_CONFIG_CACHE=false
export NPM_CONFIG_AUDIT=false
export NPM_CONFIG_FUND=false
export GENERATE_SOURCEMAP=false

echo "✅ Environment variables set for production"

# Clean install production dependencies only
echo "📦 Installing production dependencies only..."
npm ci --omit=dev --silent

# Run optimized production build
echo "🔨 Running optimized production build..."
node build-production.js

# Verify build integrity
if [ -f "dist/index.js" ]; then
    echo "✅ Production build successful"
    
    # Check bundle size
    BUNDLE_SIZE=$(wc -c < dist/index.js | awk '{print int($1/1024)"KB"}')
    echo "📦 Server bundle size: $BUNDLE_SIZE"
    
    # Verify no Vite imports
    if grep -q "from [\"']vite[\"']" dist/index.js; then
        echo "❌ Warning: Vite imports still found in bundle"
        exit 1
    else
        echo "✅ Verified: No Vite imports in production bundle"
    fi
else
    echo "❌ Build failed: dist/index.js not found"
    exit 1
fi

echo ""
echo "🎉 Deployment ready!"
echo "📝 Next steps:"
echo "   1. Upload dist/ folder to production"
echo "   2. Run: NODE_ENV=production REPLIT_DISABLE_PACKAGE_LAYER=true node dist/index.js"
echo "   3. Application will serve from port 5000"