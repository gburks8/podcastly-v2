#!/usr/bin/env node
// Replacement for npm run build that creates proper deployment structure
import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('Building for deployment...');

try {
  // Step 1: Build frontend only
  console.log('Building frontend...');
  execSync('vite build', { stdio: 'inherit' });
  
  // Step 2: Compile server TypeScript files (this adds server files to existing dist/)
  console.log('Compiling server...');
  execSync('npx tsc -p tsconfig.build.json', { stdio: 'inherit' });
  
  // Step 3: Verify critical files
  if (!existsSync('dist/server/index.js')) {
    throw new Error('Server build failed - dist/server/index.js not found');
  }
  
  if (!existsSync('dist/index.html')) {
    throw new Error('Frontend build failed - dist/index.html not found');
  }
  
  console.log('✅ Build completed successfully');
  console.log('Frontend: dist/index.html');
  console.log('Server: dist/server/index.js');
  
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}