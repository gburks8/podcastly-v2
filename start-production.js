#!/usr/bin/env node

/**
 * Production startup script that ensures compatibility
 * even when development dependencies are missing
 */

import { existsSync, writeFileSync } from 'fs';
import { spawn } from 'child_process';
import path from 'path';

console.log('🚀 Starting MediaPro in production mode...');

// Ensure production environment
process.env.NODE_ENV = 'production';

// Check if dist directory exists
if (!existsSync('dist/index.js')) {
  console.error('❌ Production build not found!');
  console.error('Please run: node build-production.js');
  process.exit(1);
}

// Create minimal compatibility shims if needed
const shimDir = 'node_modules/.compatibility-shims';
const viteShimPath = path.join(shimDir, 'vite.js');

// Create compatibility directory if it doesn't exist
import { mkdirSync } from 'fs';
if (!existsSync(shimDir)) {
  mkdirSync(shimDir, { recursive: true });
}

// Create minimal Vite shim for any lingering imports
if (!existsSync(viteShimPath)) {
  const viteShim = `
// Minimal Vite compatibility shim for production
export function createViteServer() {
  throw new Error('Vite is not available in production mode');
}

export function createLogger() {
  return {
    info: console.log,
    warn: console.warn,
    error: console.error
  };
}

export default {
  createViteServer,
  createLogger
};
`;
  writeFileSync(viteShimPath, viteShim);
  console.log('📦 Created Vite compatibility shim');
}

// Start the production server
console.log('⚡ Starting production server...');

const serverProcess = spawn('node', ['dist/index.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(code);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  serverProcess.kill('SIGINT');
});