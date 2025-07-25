#!/usr/bin/env node

/**
 * SIMPLE PRODUCTION BUILD
 * No Vite complexity - just build what we need
 */

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'fs';

console.log('🚀 Starting simple production build...');

// Clean previous builds
if (existsSync('dist')) {
  rmSync('dist', { recursive: true, force: true });
}
mkdirSync('dist', { recursive: true });

// Step 1: Build frontend with Vite (but don't include Vite in server)
console.log('📦 Building frontend...');
try {
  execSync('NODE_ENV=production npx vite build --outDir dist/public', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ Frontend build completed');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

// Step 2: Build server bundle - SIMPLE approach
console.log('⚙️ Building server bundle...');

const serverBuildCommand = [
  'npx esbuild server/index.ts',
  '--platform=node', 
  '--target=node18',
  '--bundle',
  '--format=esm',
  '--outfile=dist/index.js',
  '--minify',
  // Keep it simple - bundle everything except native modules
  '--external:sharp',
  '--external:fluent-ffmpeg', 
  '--external:bcrypt',
  '--external:ws',
  '--define:process.env.NODE_ENV=\\"production\\"'
].join(' ');

try {
  execSync(serverBuildCommand, { stdio: 'inherit' });
  console.log('✅ Server build completed');
} catch (error) {
  console.error('❌ Server build failed:', error.message);
  process.exit(1);
}

// Step 3: Create minimal production package.json
console.log('📄 Creating production package.json...');

const productionPackage = {
  "name": "media-portal",
  "version": "1.0.0", 
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "sharp": "^0.34.3",
    "fluent-ffmpeg": "^2.1.3",
    "bcrypt": "^5.1.1", 
    "ws": "^8.18.3"
  }
};

writeFileSync('dist/package.json', JSON.stringify(productionPackage, null, 2));

console.log('✅ Simple production build complete!');
console.log('   📦 Server: dist/index.js');
console.log('   🌐 Frontend: dist/public/');
console.log('   📄 Dependencies: Only native modules');
console.log('');
console.log('🎯 Ready for deployment - no Vite complications!');