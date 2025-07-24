#!/usr/bin/env node

/**
 * Production build optimization for Cloud Run deployment
 * Reduces deployment size by excluding development dependencies
 */

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync } from 'fs';

console.log('🚀 Optimizing build for production deployment...');

// Set production environment variables
process.env.NODE_ENV = 'production';
process.env.GENERATE_SOURCEMAP = 'false';
process.env.NPM_CONFIG_PRODUCTION = 'true';

try {
  // Clean existing build artifacts
  console.log('🧹 Cleaning build artifacts...');
  const cleanDirs = ['dist', 'client/dist', '.vite', 'node_modules/.cache'];
  cleanDirs.forEach(dir => {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
      console.log(`   ✅ Cleaned ${dir}`);
    }
  });

  // Create dist directory
  if (!existsSync('dist')) {
    mkdirSync('dist', { recursive: true });
  }

  // Build frontend with production optimizations
  console.log('⚙️ Building frontend (production mode)...');
  execSync('npx vite build', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      GENERATE_SOURCEMAP: 'false'
    }
  });

  // Build backend with production optimizations
  console.log('⚙️ Building backend (optimized)...');
  const buildCmd = [
    'npx esbuild server/index.ts',
    '--platform=node',
    '--packages=external', 
    '--bundle',
    '--format=esm',
    '--outdir=dist',
    '--minify',
    '--tree-shaking=true',
    '--define:process.env.NODE_ENV=\'"production"\'',
    '--external:./uploads/*',
    '--external:./attached_assets/*'
  ].join(' ');

  execSync(buildCmd, { stdio: 'inherit' });

  // Clean up source maps and development files
  console.log('🗑️ Removing development artifacts...');
  const patterns = ['**/*.map', '**/*.test.*', '**/*.spec.*'];
  patterns.forEach(pattern => {
    try {
      execSync(`find dist -name "${pattern}" -delete 2>/dev/null || true`);
    } catch (e) {
      // Ignore errors for missing files
    }
  });

  console.log('✅ Production build optimization complete!');
  console.log('');
  console.log('📊 Build output:');
  if (existsSync('dist')) {
    execSync('ls -la dist/', { stdio: 'inherit' });
  }

} catch (error) {
  console.error('❌ Build optimization failed:', error.message);
  process.exit(1);
}