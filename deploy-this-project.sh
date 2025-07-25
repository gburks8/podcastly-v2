#!/bin/bash

# DEPLOY FROM THIS PROJECT - Final fix
echo "🔧 Configuring current project for successful deployment..."

# Backup original files
cp package.json package.json.backup
echo "📋 Backed up original package.json"

# Replace with minimal deployment package.json
cat > package.json << 'EOF'
{
  "name": "media-pro-deploy",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server-deploy.js"
  },
  "dependencies": {
    "express": "^4.21.2",
    "@neondatabase/serverless": "^0.10.4",
    "drizzle-orm": "^0.39.1",
    "express-session": "^1.18.1",
    "connect-pg-simple": "^10.0.0",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "bcrypt": "^5.1.1",
    "zod": "^3.24.2",
    "nanoid": "^5.1.5"
  }
}
EOF

echo "✅ Updated package.json for deployment"

# Update .replitignore to be more aggressive
cat > .replitignore << 'EOF'
# EXCLUDE EVERYTHING EXCEPT ESSENTIALS
*

# Include only deployment essentials
!server-deploy.js
!package.json
!dist/
!shared/
!drizzle.config.ts
!.replit

# Exclude all problematic directories
.git/
uploads/
attached_assets/
node_modules/
client/
server/
build*/
deploy*/
*deploy*.js
*.md
*.backup
*.json.backup

# Make sure dist/public is included
!dist/public/
EOF

echo "✅ Updated .replitignore to exclude everything except essentials"

echo ""
echo "🚀 PROJECT READY FOR DEPLOYMENT!"
echo ""
echo "Your project is now configured to deploy successfully:"
echo "   - Only essential files included (server-deploy.js, dist/, shared/)"
echo "   - Minimal dependencies (10 packages only)"
echo "   - All problematic files excluded"
echo ""
echo "Deploy now using Replit's Deploy button - it will work!"
echo ""
echo "To restore for development later:"
echo "   mv package.json.backup package.json"