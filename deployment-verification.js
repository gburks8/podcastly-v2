#!/usr/bin/env node
// Verification script to ensure deployment package is ready for REPLIT_DISABLE_PACKAGE_LAYER=true

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🔍 Verifying deployment package...\n');

// Check if dist folder exists
if (!existsSync('dist')) {
  console.error('❌ dist/ folder not found. Run build first.');
  process.exit(1);
}

// Check if main files exist
const requiredFiles = [
  'dist/index.js',
  'dist/package.json',
  'dist/public/index.html',
  'dist/public/index.js',
  'dist/public/index.css'
];

console.log('📁 Checking required files:');
for (const file of requiredFiles) {
  if (existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    process.exit(1);
  }
}

// Check package.json dependencies (bundled approach - only native modules)
console.log('\n📦 Checking production dependencies (bundled approach):');
const packageJson = JSON.parse(readFileSync('dist/package.json', 'utf8'));
const requiredNativeDeps = [
  '@neondatabase/serverless',
  'bcrypt',
  'sharp',
  'ws'
];

for (const dep of requiredNativeDeps) {
  if (packageJson.dependencies[dep]) {
    console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
  } else {
    console.log(`❌ ${dep} - MISSING`);
    process.exit(1);
  }
}

console.log(`\n📊 Total production dependencies: ${Object.keys(packageJson.dependencies).length} (native modules only)`);
console.log('📝 Note: All JavaScript dependencies (express, drizzle-orm, stripe, etc.) are bundled in server.js');

// Check server bundle size
const serverStats = existsSync('dist/index.js') ? 
  Math.round(readFileSync('dist/index.js').length / 1024) : 0;
console.log(`\n📊 Server bundle: ${serverStats}KB`);

// Check frontend bundle size
const frontendStats = existsSync('dist/public/index.js') ? 
  Math.round(readFileSync('dist/public/index.js').length / 1024) : 0;
console.log(`📊 Frontend bundle: ${frontendStats}KB`);

console.log('\n✅ Deployment package verification complete!');
console.log('🎯 Ready for deployment with REPLIT_DISABLE_PACKAGE_LAYER=true');
console.log('\nDeployment Command: NODE_ENV=production node dist/index.js');