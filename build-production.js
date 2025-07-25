#!/usr/bin/env node

/**
 * Production Build Script for Replit Deployment
 * 
 * This script replaces the standard npm run build command to create
 * deployment-ready builds that work in Replit's production environment.
 * 
 * Usage: node build-production.js
 * Called by: npm run build (configured via vite-free-build.js)
 */

import { execSync } from 'child_process';
import { existsSync, rmSync, writeFileSync, readFileSync } from 'fs';

console.log('🚀 Starting production build for Replit deployment...');

// Clean previous builds
if (existsSync('dist')) {
  rmSync('dist', { recursive: true, force: true });
  console.log('✓ Cleaned previous build artifacts');
}

// Step 1: Build frontend using production-specific Vite config
console.log('📦 Building frontend (React + Vite)...');
try {
  execSync('NODE_ENV=production npx vite build --config vite.config.production.ts --outDir dist/public', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✓ Frontend build completed successfully');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  
  // Try fallback with default config 
  console.log('🔄 Attempting fallback build...');
  try {
    execSync('NODE_ENV=production npx vite build --outDir dist/public', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    console.log('✓ Fallback frontend build completed');
  } catch (fallbackError) {
    console.error('❌ All frontend builds failed:', fallbackError.message);
    process.exit(1);
  }
}

// Step 2: Build server with external Vite dependencies
console.log('⚙️ Building server (Node.js + Express)...');

const serverBuildCommand = [
  'npx esbuild server/index.ts',
  '--platform=node', 
  '--bundle',
  '--format=esm',
  '--outfile=dist/index.js',
  '--packages=external',
  // Externalize all Vite-related packages to prevent bundling
  '--external:vite',
  '--external:@vitejs/*',
  '--external:@replit/vite-*',
  '--external:./vite',
  '--external:./vite.js',
  // Externalize dev-only dependencies
  '--external:tsx',
  '--external:typescript',
  '--external:drizzle-kit',
  '--external:esbuild',
  '--external:@types/*',
  '--external:ws',
  '--minify'
].join(' ');

try {
  execSync(serverBuildCommand, { stdio: 'inherit' });
  console.log('✓ Server build completed successfully');
} catch (error) {
  console.error('❌ Server build failed:', error.message);
  process.exit(1);
}

// Step 3: Validate the build
console.log('🔍 Validating production build...');

if (!existsSync('dist/index.js')) {
  console.error('❌ Server bundle not found');
  process.exit(1);
}

if (!existsSync('dist/public/index.html')) {
  console.error('❌ Frontend bundle not found');
  process.exit(1);
}

// Check for problematic Vite imports in server bundle
const bundleContent = readFileSync('dist/index.js', 'utf8');
const problemPatterns = [
  /import.*from.*["']vite["']/g,
  /import.*from.*["']@vitejs/g,
  /require\(.*["']vite["'].*\)/g,
  /createViteServer/g
];

const foundProblems = [];
problemPatterns.forEach((pattern, index) => {
  if (pattern.test(bundleContent)) {
    foundProblems.push(pattern.source);
  }
});

if (foundProblems.length > 0) {
  console.error('❌ Problematic Vite imports found in server bundle:');
  foundProblems.forEach(problem => console.error(`  - ${problem}`));
  process.exit(1);
}

const bundleSize = Math.round(bundleContent.length / 1024);
console.log(`✅ Build validation passed (server: ${bundleSize}KB)`);

// Step 4: Create deployment manifest
const manifest = {
  buildTime: new Date().toISOString(),
  environment: 'production',
  frontend: {
    framework: 'React + Vite',
    outputDir: 'dist/public'
  },
  backend: {
    framework: 'Node.js + Express',
    outputFile: 'dist/index.js',
    bundleSize: `${bundleSize}KB`
  },
  deployment: {
    platform: 'Replit',
    viteFree: true,
    validated: true
  }
};

writeFileSync('dist/build-manifest.json', JSON.stringify(manifest, null, 2));

console.log('🎉 Production build completed successfully!');
console.log('📋 Ready for Replit deployment');
console.log(`📊 Bundle size: ${bundleSize}KB`);