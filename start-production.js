#!/usr/bin/env node

/**
 * Production startup script
 * Ensures clean production environment without Vite dependencies
 */

import { existsSync } from 'fs';
import { execSync } from 'child_process';

// Ensure we're in production mode
process.env.NODE_ENV = 'production';

console.log('🚀 Starting MediaPro in production mode...');

// Verify build exists
if (!existsSync('dist/index.js')) {
  console.error('❌ Production build not found. Please run build first.');
  console.log('💡 Run: node build-production.js');
  process.exit(1);
}

// Verify no Vite in node_modules for production
const hasVite = existsSync('node_modules/vite');
if (hasVite) {
  console.warn('⚠️  Warning: Vite found in node_modules. For optimal production:');
  console.warn('   - Use "npm ci --omit=dev" to exclude dev dependencies');
  console.warn('   - This won\'t break the app, but increases bundle size');
}

console.log('✅ Production environment verified');
console.log('🎬 Starting MediaPro server...');

// Start the production server
try {
  execSync('node dist/index.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Server startup failed:', error.message);
  process.exit(1);
}