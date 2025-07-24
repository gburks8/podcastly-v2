#!/usr/bin/env node

/**
 * DEPLOYMENT EMERGENCY FIX
 * This script replaces the broken build process with a Vite-free version
 * When Replit runs "npm run build", this will intercept and fix it
 */

import { execSync } from 'child_process';
import { existsSync, rmSync, readFileSync, writeFileSync } from 'fs';

console.log('🚨 DEPLOYMENT FIX: Running Vite-free build process...');

// Clean previous builds completely
if (existsSync('dist')) {
  rmSync('dist', { recursive: true, force: true });
}

// Build frontend using vite (but won't include it in server bundle)
console.log('📦 Building frontend...');
try {
  execSync('npx vite build --outDir dist/public', { stdio: 'inherit' });
} catch (error) {
  console.error('Frontend build failed:', error.message);
  process.exit(1);
}

// Build server WITHOUT any Vite dependencies using production-only entry point
console.log('⚙️ Building server (100% Vite-free production version)...');

const serverBuildCommand = [
  'npx esbuild server/index-production.ts',
  '--platform=node', 
  '--bundle',
  '--format=esm',
  '--outfile=dist/index.js',
  '--packages=external',
  '--external:vite',
  '--external:@vitejs/*',
  '--external:@replit/vite-*',
  '--external:tsx',
  '--external:typescript',
  '--external:drizzle-kit',
  '--external:esbuild',
  '--external:@types/*',
  '--minify'
].join(' ');

try {
  execSync(serverBuildCommand, { stdio: 'inherit' });
} catch (error) {
  console.error('Server build failed:', error.message);
  process.exit(1);
}

// Verify no Vite imports in bundle
if (existsSync('dist/index.js')) {
  const bundleContent = readFileSync('dist/index.js', 'utf8');
  const vitePatterns = ['from "vite"', "from 'vite'", 'createViteServer', '@vitejs'];
  
  const hasVite = vitePatterns.some(pattern => bundleContent.includes(pattern));
  
  if (hasVite) {
    console.error('❌ DEPLOYMENT FIX FAILED: Vite still found in bundle');
    process.exit(1);
  } else {
    const bundleSize = Math.round(bundleContent.length / 1024);
    console.log(`✅ DEPLOYMENT FIX SUCCESS: Clean bundle created (${bundleSize}KB)`);
  }
} else {
  console.error('❌ No server bundle created');
  process.exit(1);
}

console.log('🎉 Vite-free deployment build complete!');