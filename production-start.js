#!/usr/bin/env node

/**
 * Production startup script with deployment fixes
 * Sets required environment variables and starts the server safely
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';

console.log('🚀 Starting MediaPro Client Portal in production mode...');

// Verify production build exists
if (!existsSync('dist/index.js')) {
  console.error('❌ Production build not found. Run: node build-production.js');
  process.exit(1);
}

// Set critical production environment variables
const env = {
  ...process.env,
  NODE_ENV: 'production',
  REPLIT_DISABLE_PACKAGE_LAYER: 'true',
  NPM_CONFIG_CACHE: 'false',
  NPM_CONFIG_AUDIT: 'false',
  NPM_CONFIG_FUND: 'false'
};

console.log('✅ Production environment configured');
console.log('📦 Starting server from dist/index.js...');

// Start the production server
const server = spawn('node', ['dist/index.js'], {
  env,
  stdio: 'inherit'
});

server.on('error', (error) => {
  console.error('❌ Server startup error:', error.message);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(code);
  } else {
    console.log('✅ Server shutdown gracefully');
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  server.kill('SIGTERM');
});