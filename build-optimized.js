#!/usr/bin/env node

/**
 * Optimized build script for deployment
 * This script helps reduce the final deployment size by:
 * 1. Setting production environment variables
 * 2. Running the standard build process
 * 3. Cleaning up unnecessary files
 * 4. Optimizing the final bundle
 */

import { execSync } from 'child_process';
import { existsSync, rmSync, statSync } from 'fs';
import path from 'path';

console.log('🚀 Starting optimized build process...');

// Set production environment variables
process.env.NODE_ENV = 'production';
process.env.NPM_CONFIG_CACHE = 'false';
process.env.NPM_CONFIG_PREFER_OFFLINE = 'false';
process.env.NPM_CONFIG_AUDIT = 'false';
process.env.NPM_CONFIG_FUND = 'false';
process.env.GENERATE_SOURCEMAP = 'false';

try {
  // Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  const pathsToClean = ['dist', 'client/dist', 'node_modules/.cache', '.vite'];
  
  pathsToClean.forEach(dirPath => {
    if (existsSync(dirPath)) {
      rmSync(dirPath, { recursive: true, force: true });
      console.log(`   ✅ Cleaned ${dirPath}`);
    }
  });

  // Run the standard build process
  console.log('🔨 Running Vite build...');
  execSync('vite build', { 
    stdio: 'inherit',
    env: { ...process.env }
  });

  console.log('⚙️ Building server bundle...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --minify --external:vite --external:@vitejs/* --external:@replit/vite-plugin-* --define:process.env.NODE_ENV=\\"production\\"', { 
    stdio: 'inherit',
    env: { ...process.env }
  });

  // Post-build cleanup
  console.log('🗑️ Post-build cleanup...');
  
  // Remove source maps if they exist
  if (existsSync('dist/public')) {
    execSync('find dist/public -name "*.map" -delete', { stdio: 'inherit' });
  }

  // Calculate final size
  console.log('📊 Build complete! Final sizes:');
  
  if (existsSync('dist')) {
    const distStats = execSync('du -sh dist 2>/dev/null || echo "Size calculation failed"', { encoding: 'utf8' });
    console.log(`   📦 dist/ folder: ${distStats.trim()}`);
  }

  console.log('✅ Optimized build complete!');
  console.log('');
  console.log('💡 Deployment tips:');
  console.log('   - Ensure devDependencies are not installed in production');
  console.log('   - Use npm ci --production for faster, reliable installs');
  console.log('   - Consider using npm prune --production before deployment');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}