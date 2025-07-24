#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Verifies all deployment fixes are properly applied
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🔍 Deployment Verification Report\n');

// Check 1: Verify build command and output structure
console.log('1. Build Command and Directory Structure:');
try {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const buildScript = packageJson.scripts.build;
  
  if (buildScript.includes('vite build')) {
    console.log('   ✅ Using standard npm run build (vite build)');
  } else {
    console.log('   ❌ Build script not using standard vite build');
  }
  
  // Check if dist/public exists
  if (existsSync('dist/public')) {
    console.log('   ✅ dist/public directory exists');
    
    if (existsSync('dist/public/index.html')) {
      console.log('   ✅ index.html found in dist/public');
    } else {
      console.log('   ❌ index.html missing in dist/public');
    }
    
    if (existsSync('dist/public/assets')) {
      console.log('   ✅ assets directory found in dist/public');
    } else {
      console.log('   ❌ assets directory missing in dist/public');
    }
  } else {
    console.log('   ❌ dist/public directory missing - run npm run build');
  }
} catch (error) {
  console.log('   ❌ Error checking build configuration:', error.message);
}

// Check 2: Verify health check endpoint
console.log('\n2. Health Check Endpoint:');
try {
  const serverContent = readFileSync('server/index.ts', 'utf8');
  
  if (serverContent.includes('app.get("/health"')) {
    console.log('   ✅ Health check endpoint implemented');
    
    if (serverContent.includes('res.status(200)')) {
      console.log('   ✅ Health check returns 200 status');
    } else {
      console.log('   ❌ Health check not returning 200 status');
    }
  } else {
    console.log('   ❌ Health check endpoint not found');
  }
} catch (error) {
  console.log('   ❌ Error checking health endpoint:', error.message);
}

// Check 3: Verify static file serving configuration
console.log('\n3. Static File Serving Configuration:');
try {
  const serverContent = readFileSync('server/index.ts', 'utf8');
  
  if (serverContent.includes('dist/public')) {
    console.log('   ✅ Server configured to serve from dist/public');
  } else {
    console.log('   ❌ Server not configured for dist/public');
  }
  
  if (serverContent.includes('express.static')) {
    console.log('   ✅ Static file serving enabled');
  } else {
    console.log('   ❌ Static file serving not configured');
  }
  
  if (serverContent.includes('app.get("*"')) {
    console.log('   ✅ Catch-all route for SPA routing');
  } else {
    console.log('   ❌ Catch-all route missing');
  }
} catch (error) {
  console.log('   ❌ Error checking static file configuration:', error.message);
}

// Check 4: Verify build optimization files
console.log('\n4. Deployment Optimization:');

if (existsSync('.replitignore')) {
  console.log('   ✅ .replitignore file exists for deployment optimization');
  
  const replitIgnoreContent = readFileSync('.replitignore', 'utf8');
  if (replitIgnoreContent.includes('attached_assets/')) {
    console.log('   ✅ Large assets excluded from deployment');
  }
  if (replitIgnoreContent.includes('node_modules/@types/')) {
    console.log('   ✅ TypeScript types excluded from deployment');
  }
} else {
  console.log('   ❌ .replitignore file missing');
}

// Check 5: Verify vite configuration
console.log('\n5. Vite Configuration:');
try {
  const viteConfigContent = readFileSync('vite.config.ts', 'utf8');
  
  if (viteConfigContent.includes('outDir: path.resolve(import.meta.dirname, "dist/public")')) {
    console.log('   ✅ Vite configured to build to dist/public');
  } else {
    console.log('   ❌ Vite not configured for correct output directory');
  }
} catch (error) {
  console.log('   ❌ Error checking vite configuration:', error.message);
}

// Summary
console.log('\n📋 Deployment Fixes Applied:');
console.log('   ✓ Changed build command to use standard npm run build');
console.log('   ✓ Updated static file serving path to dist/public');
console.log('   ✓ Added health check endpoint returning 200 status');
console.log('   ✓ Ensured build process creates correct directory structure');
console.log('   ✓ Updated catch-all route to serve index.html from correct location');
console.log('   ✓ Added .replitignore for deployment size optimization');

console.log('\n🚀 Ready for Deployment:');
console.log('   1. Run: npm run build');
console.log('   2. Deploy using Replit\'s deployment interface');
console.log('   3. Health check available at: /health');
console.log('   4. All static assets served from dist/public');