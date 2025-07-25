#!/usr/bin/env node

/**
 * Production startup script for deployment
 * This ensures the application runs in production mode without Vite dependencies
 */

import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';

console.log('🚀 Starting MediaPro in production mode...');

// Verify production build exists
if (!existsSync('dist/index.js')) {
  console.log('❌ Production build not found. Running build process...');
  try {
    execSync('node vite-free-build.js', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Start the production server
console.log('🌟 Starting production server...');
const server = spawn('node', ['dist/index.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

server.on('error', (error) => {
  console.error('❌ Server startup failed:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('🛑 Shutting down production server...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('🛑 Terminating production server...');
  server.kill('SIGTERM');
});