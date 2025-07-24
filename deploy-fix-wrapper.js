#!/usr/bin/env node

/**
 * Deployment wrapper that handles Vite dependency issues
 * This script runs before the main server to ensure clean startup
 */

import { spawn } from 'child_process';
import { existsSync, writeFileSync } from 'fs';

console.log('🚀 MediaPro Deployment Wrapper Starting...');

// Ensure production environment
process.env.NODE_ENV = 'production';

// Create a minimal vite shim if not present
if (!existsSync('node_modules/vite')) {
  console.log('📦 Creating Vite compatibility shim for production...');
  
  // Create minimal node_modules structure if needed
  if (!existsSync('node_modules')) {
    import('fs').then(fs => fs.mkdirSync('node_modules', { recursive: true }));
  }
  
  // Create a minimal vite shim to prevent import errors
  const viteShim = `
// Minimal Vite shim for production deployment
export function createServer() {
  throw new Error('Vite createServer not available in production');
}

export function createLogger() {
  return {
    info: console.log,
    warn: console.warn,
    error: console.error
  };
}

export function defineConfig(config) {
  return config;
}
`;

  try {
    import('fs').then(fs => {
      fs.mkdirSync('node_modules/vite', { recursive: true });
      fs.writeFileSync('node_modules/vite/index.js', viteShim);
      fs.writeFileSync('node_modules/vite/package.json', JSON.stringify({
        name: 'vite',
        version: '0.0.0-shim',
        main: 'index.js',
        type: 'module'
      }, null, 2));
    });
    console.log('✅ Vite shim created successfully');
  } catch (error) {
    console.warn('⚠️  Could not create Vite shim:', error.message);
  }
}

// Start the main server
console.log('🎬 Starting production server...');

const serverProcess = spawn('node', ['dist/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

serverProcess.on('error', (error) => {
  console.error('❌ Server failed to start:', error.message);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  serverProcess.kill('SIGINT');
});