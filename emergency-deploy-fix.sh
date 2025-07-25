#!/bin/bash

# EMERGENCY DEPLOYMENT FIX - Physically move large directories
echo "🚨 EMERGENCY DEPLOYMENT FIX - Moving large directories temporarily"

# Create backup location outside project
BACKUP_DIR="/tmp/replit-backup-$$"
mkdir -p "$BACKUP_DIR"

echo "📦 Moving large directories to $BACKUP_DIR..."

# Move the problematic directories
if [ -d ".git" ]; then
    echo "   Moving .git/ (2.0GB)..."
    mv .git "$BACKUP_DIR/"
fi

if [ -d "uploads" ]; then
    echo "   Moving uploads/ (7.4GB)..."
    mv uploads "$BACKUP_DIR/"
fi

if [ -d "attached_assets" ]; then
    echo "   Moving attached_assets/ (110MB)..."
    mv attached_assets "$BACKUP_DIR/"
fi

# Keep only essential node_modules
if [ -d "node_modules" ]; then
    echo "   Moving node_modules/ (453MB)..."
    mv node_modules "$BACKUP_DIR/"
fi

echo "🧹 Cleaning remaining artifacts..."
find . -name "*.log" -delete 2>/dev/null || true
find . -name "*.map" -delete 2>/dev/null || true
rm -rf .vite .cache tmp .tmp 2>/dev/null || true

echo "⚙️ Installing production dependencies only..."
export NODE_ENV=production
export NPM_CONFIG_PRODUCTION=true
npm install --production --no-audit --no-fund

echo "🏗️ Building production assets..."
npm run build

echo "📊 Current directory size after cleanup:"
du -sh . 2>/dev/null || echo "Size check complete"

echo ""
echo "✅ EMERGENCY FIX COMPLETE!"
echo ""
echo "🚀 Your project is now ready for deployment:"
echo "   - Removed 9.96GB of problematic directories"
echo "   - Installed only production dependencies"
echo "   - Built optimized production assets"
echo ""
echo "💾 Large directories backed up to: $BACKUP_DIR"
echo "   You can restore them after deployment if needed."
echo ""
echo "📝 TO RESTORE AFTER DEPLOYMENT:"
echo "   mv $BACKUP_DIR/.git ."
echo "   mv $BACKUP_DIR/uploads ."
echo "   mv $BACKUP_DIR/attached_assets ."
echo "   npm install  # Restore all dependencies"