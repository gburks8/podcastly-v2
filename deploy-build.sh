#!/bin/bash
# Complete deployment build for Replit
echo "🚀 Building for Replit deployment..."

# Run the standard build
npm run build

# Add server files to deployment
node fix-build.js

echo "✅ Deployment build complete!"
echo "Ready for: node dist/server/index.js"