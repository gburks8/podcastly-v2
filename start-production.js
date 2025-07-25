#!/usr/bin/env node
// Production start script for Replit deployment
import { spawn } from 'child_process';
import { existsSync } from 'fs';

console.log('🚀 Starting production server...');

// Check if the built server exists
if (!existsSync('dist/server/index.js')) {
  console.error('❌ Production server not found. Please run build first.');
  console.log('Run: node build-deployment.js');
  process.exit(1);
}

// Start the production server
const server = spawn('node', ['dist/server/index.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  server.kill('SIGINT');
});