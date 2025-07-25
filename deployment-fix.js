#!/usr/bin/env node

/**
 * Deployment Fix Script for fluent-ffmpeg
 * This script ensures all dependencies are properly available for deployment
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔧 Running deployment fixes for fluent-ffmpeg...');

// Step 1: Clear npm cache to ensure fresh package resolution
console.log('🧹 Clearing npm cache...');
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
} catch (error) {
  console.warn('Cache clear failed, continuing...');
}

// Step 2: Reinstall fluent-ffmpeg to ensure it's properly in production
console.log('📦 Reinstalling video processing dependencies...');
try {
  execSync('npm install fluent-ffmpeg@^2.1.3 sharp@^0.34.3 multer@^2.0.2 --save', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to reinstall dependencies:', error.message);
  process.exit(1);
}

// Step 3: Verify fluent-ffmpeg is in the correct dependency section
console.log('✅ Verifying package.json dependency structure...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (!packageJson.dependencies['fluent-ffmpeg']) {
  console.error('❌ fluent-ffmpeg not found in dependencies section!');
  process.exit(1);
}

console.log('✅ fluent-ffmpeg is correctly placed in dependencies section');

// Step 4: Create a deployment-ready build
console.log('🏗️ Creating deployment build...');
try {
  // Build the frontend
  execSync('vite build', { stdio: 'inherit' });
  
  // Build the backend with proper externals
  const buildCommand = [
    'npx esbuild server/index.ts',
    '--platform=node',
    '--target=node18',
    '--bundle',
    '--format=esm',
    '--outfile=dist/server.js',
    '--external:fluent-ffmpeg',
    '--external:sharp',
    '--external:multer',
    '--external:bcrypt',
    '--external:@neondatabase/serverless',
    '--define:process.env.NODE_ENV="production"'
  ].join(' ');
  
  execSync(buildCommand, { stdio: 'inherit' });
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}

console.log('🎉 Deployment fixes completed successfully!');
console.log('📋 Summary of fixes applied:');
console.log('  ✅ Cleared package cache');
console.log('  ✅ Reinstalled fluent-ffmpeg as production dependency');
console.log('  ✅ Verified dependency structure');
console.log('  ✅ Created deployment build with proper externals');
console.log('');
console.log('🚀 Your app should now deploy successfully with fluent-ffmpeg!');