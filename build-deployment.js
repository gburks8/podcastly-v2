#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, copyFileSync } from 'fs';

console.log('🚀 Starting deployment build...');

try {
  // Step 1: Clean and prepare dist directory
  console.log('🧹 Preparing dist directory...');
  execSync('rm -rf dist && mkdir -p dist', { stdio: 'inherit' });
  
  // Step 2: Build frontend with Vite first (to client/dist)
  console.log('🔨 Building frontend assets...');
  execSync('npx vite build', { stdio: 'inherit' });
  
  // Step 3: Copy frontend build to dist directory
  console.log('📂 Copying frontend assets...');
  execSync('cp -r client/dist/* dist/', { stdio: 'inherit' });
  
  // Step 4: Compile TypeScript server code
  console.log('📦 Compiling TypeScript server code...');
  execSync('npx tsc -p tsconfig.build.json', { stdio: 'inherit' });
  
  // Step 5: Verify critical files exist
  const criticalFiles = [
    'dist/server/index.js',
    'dist/index.html',
    'dist/assets'
  ];
  
  console.log('🔍 Verifying build output...');
  for (const file of criticalFiles) {
    if (!existsSync(file)) {
      throw new Error(`Missing critical file: ${file}`);
    }
    console.log(`✅ ${file} exists`);
  }
  
  // Step 4: Copy package.json for production dependencies
  if (existsSync('package.json')) {
    copyFileSync('package.json', 'dist/package.json');
    console.log('✅ Copied package.json to dist/');
  }
  
  console.log('🎉 Deployment build completed successfully!');
  console.log('📂 Build output:');
  execSync('ls -la dist/', { stdio: 'inherit' });
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}