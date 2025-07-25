#!/usr/bin/env node

/**
 * PRODUCTION DEPLOYMENT BUILD SCRIPT
 * 
 * This script creates a production-ready build that works with 
 * REPLIT_DISABLE_PACKAGE_LAYER=true by bundling all dependencies
 */

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync, cpSync } from 'fs';
import path from 'path';

console.log('🚀 Starting production deployment build...');

// Clean previous builds
if (existsSync('dist')) {
  rmSync('dist', { recursive: true, force: true });
}
mkdirSync('dist', { recursive: true });

// Step 1: Build frontend with all assets
console.log('📦 Building frontend...');
try {
  execSync('NODE_ENV=production npx vite build --outDir dist/public', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
} catch (error) {
  console.error('Frontend build failed:', error.message);
  process.exit(1);
}

// Step 2: Build server with ALL dependencies bundled (no externals)
console.log('⚙️ Building server with all dependencies bundled...');

const serverBuildCommand = [
  'npx esbuild server/index.ts',
  '--platform=node', 
  '--target=node18',
  '--bundle',
  '--format=esm',
  '--outfile=dist/index.js',
  '--minify',
  '--sourcemap',
  // Bundle EVERYTHING except native Node.js modules
  '--external:fs',
  '--external:path', 
  '--external:url',
  '--external:crypto',
  '--external:http',
  '--external:https',
  '--external:stream',
  '--external:util',
  '--external:events',
  '--external:buffer',
  '--external:querystring',
  '--external:zlib',
  '--external:os',
  '--external:net',
  '--external:tls',
  '--external:child_process',
  '--external:cluster',
  '--external:worker_threads',
  // Allow all other dependencies to be bundled
  '--define:process.env.NODE_ENV="production"'
].join(' ');

try {
  execSync(serverBuildCommand, { stdio: 'inherit' });
} catch (error) {
  console.error('Server build failed:', error.message);
  process.exit(1);
}

// Step 3: Create a minimal package.json for deployment
console.log('📄 Creating deployment package.json...');
const deploymentPackageJson = {
  "name": "media-portal-production",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  }
  // No dependencies needed since everything is bundled
};

writeFileSync('dist/package.json', JSON.stringify(deploymentPackageJson, null, 2));

// Step 4: Verify the build
if (existsSync('dist/index.js') && existsSync('dist/public/index.html')) {
  const bundleSize = Math.round(readFileSync('dist/index.js', 'utf8').length / 1024);
  console.log(`✅ Production build complete!`);
  console.log(`   📦 Server bundle: ${bundleSize}KB`);
  console.log(`   🌐 Frontend: dist/public/`);
  console.log(`   📄 Deployment package.json created`);
  console.log('');
  console.log('🎯 Ready for deployment with REPLIT_DISABLE_PACKAGE_LAYER=true');
} else {
  console.error('❌ Build verification failed');
  process.exit(1);
}