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

// Build frontend using production config first (without Replit plugins)
console.log('📦 Building frontend with production config...');
try {
  execSync('NODE_ENV=production npx vite build --config vite.config.production.ts --outDir dist/public', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
} catch (error) {
  console.error('Production config build failed, trying default config:', error.message);
  
  // Try fallback with default config
  console.log('🔄 Trying default vite config...');
  try {
    execSync('NODE_ENV=production npx vite build --outDir dist/public', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
  } catch (fallbackError) {
    console.error('All frontend builds failed:', fallbackError.message);
    process.exit(1);
  }
}

// Build server WITHOUT any Vite dependencies using production-only entry point
console.log('⚙️ Building server (100% Vite-free production version)...');

const serverBuildCommand = [
  'npx esbuild server/index.ts',
  '--platform=node', 
  '--bundle',
  '--format=esm',
  '--outfile=dist/index.js',
  '--packages=external',
  '--external:vite',
  '--external:@vitejs/*',
  '--external:@replit/vite-*',
  '--external:./vite',
  '--external:./vite.js',
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
} catch (error) {
  console.error('Server build failed:', error.message);
  process.exit(1);
}

// Verify no problematic Vite imports in bundle (only check for actual import statements)
if (existsSync('dist/index.js')) {
  const bundleContent = readFileSync('dist/index.js', 'utf8');
  const problemPatterns = [
    'import.*from.*"vite"',
    'import.*from.*\'vite\'',
    'require\\(.*"vite".*\\)',
    'require\\(.*\'vite\'.*\\)',
    'createViteServer',
    'import.*from.*"@vitejs',
    'import.*from.*\'@vitejs'
  ];
  
  const hasProblematicVite = problemPatterns.some(pattern => 
    new RegExp(pattern).test(bundleContent)
  );
  
  if (hasProblematicVite) {
    console.error('❌ DEPLOYMENT FIX FAILED: Problematic Vite imports still found in bundle');
    problemPatterns.forEach(pattern => {
      const regex = new RegExp(pattern);
      if (regex.test(bundleContent)) {
        console.error(`  Found pattern: ${pattern}`);
      }
    });
    process.exit(1);
  } else {
    const bundleSize = Math.round(bundleContent.length / 1024);
    console.log(`✅ DEPLOYMENT FIX SUCCESS: Clean bundle created (${bundleSize}KB)`);
    console.log('✅ No problematic Vite imports detected');
  }
} else {
  console.error('❌ No server bundle created');
  process.exit(1);
}

console.log('🎉 Vite-free deployment build complete!');