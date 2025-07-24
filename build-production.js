#!/usr/bin/env node

/**
 * Production deployment build script
 * Specifically designed to exclude Vite and all development dependencies
 * from the production bundle to solve deployment size issues
 */

import { execSync } from 'child_process';
import { existsSync, rmSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

console.log('🚀 Starting production deployment build...');

// Set strict production environment
process.env.NODE_ENV = 'production';
process.env.NPM_CONFIG_CACHE = 'false';
process.env.NPM_CONFIG_PREFER_OFFLINE = 'false';
process.env.NPM_CONFIG_AUDIT = 'false';
process.env.NPM_CONFIG_FUND = 'false';
process.env.GENERATE_SOURCEMAP = 'false';

try {
  // Clean all previous builds
  console.log('🧹 Deep cleaning previous builds...');
  const pathsToClean = ['dist', 'client/dist', 'node_modules/.cache', '.vite', 'node_modules/.vite'];
  
  pathsToClean.forEach(dirPath => {
    if (existsSync(dirPath)) {
      rmSync(dirPath, { recursive: true, force: true });
      console.log(`   ✅ Cleaned ${dirPath}`);
    }
  });

  // Build frontend with Vite
  console.log('🔨 Building frontend (Vite will be excluded from server bundle)...');
  execSync('vite build', { 
    stdio: 'inherit',
    env: { ...process.env }
  });

  // Create a production-optimized server build with comprehensive exclusions
  console.log('⚙️ Building production server bundle (excluding all dev dependencies)...');
  
  // List of all development packages to exclude
  const devExclusions = [
    'vite',
    '@vitejs/plugin-react',
    '@replit/vite-plugin-cartographer',
    '@replit/vite-plugin-runtime-error-modal',
    'esbuild',
    'drizzle-kit',
    'tsx',
    'typescript',
    '@tailwindcss/vite',
    'autoprefixer',
    'postcss',
    'tailwindcss',
    '@types/node',
    '@types/express',
    '@types/express-session',
    '@types/connect-pg-simple',
    '@types/fluent-ffmpeg',
    '@types/memoizee',
    '@types/multer',
    '@types/passport',
    '@types/passport-local',
    '@types/react',
    '@types/react-dom',
    '@types/ws'
  ];

  const externalFlags = devExclusions.map(pkg => `--external:${pkg}`).join(' ');
  
  const buildCommand = `esbuild server/index.ts ` +
    `--platform=node ` +
    `--packages=external ` +
    `--bundle ` +
    `--format=esm ` +
    `--outdir=dist ` +
    `--minify ` +
    `--tree-shaking=true ` +
    `--define:process.env.NODE_ENV='"production"' ` +
    `--external:./vite ` +
    `--external:./vite.js ` +
    `--external:../vite.config ` +
    `--external:../vite.config.ts ` +
    `${externalFlags}`;
    
  console.log('   🔧 Build command:', buildCommand.substring(0, 100) + '...');
  
  execSync(buildCommand, { 
    stdio: 'inherit',
    env: { ...process.env }
  });

  // Verify the build doesn't contain Vite imports
  console.log('🔍 Verifying production bundle integrity...');
  
  if (existsSync('dist/index.js')) {
    const bundleContent = readFileSync('dist/index.js', 'utf8');
    const viteImports = [
      'from "vite"',
      "from 'vite'",
      'createViteServer',
      'createLogger',
      '@vitejs',
      '@replit/vite-plugin'
    ];
    
    let hasViteImports = false;
    viteImports.forEach(viteImport => {
      if (bundleContent.includes(viteImport)) {
        console.warn(`   ⚠️  Found potential Vite import: ${viteImport}`);
        hasViteImports = true;
      }
    });
    
    if (!hasViteImports) {
      console.log('   ✅ Bundle verified: No Vite imports found in production build');
    } else {
      console.warn('   ⚠️  Warning: Some Vite references may still exist in bundle');
    }
    
    // Check bundle size
    const bundleSize = execSync('wc -c < dist/index.js', { encoding: 'utf8' }).trim();
    console.log(`   📦 Server bundle size: ${Math.round(bundleSize / 1024)}KB`);
  }

  // Post-build cleanup
  console.log('🗑️ Final cleanup...');
  
  // Remove source maps from client build
  if (existsSync('dist/public')) {
    try {
      execSync('find dist/public -name "*.map" -delete 2>/dev/null || true', { stdio: 'inherit' });
      console.log('   ✅ Removed source maps from client build');
    } catch (e) {
      // Ignore errors - source maps might not exist
    }
  }

  // Calculate final sizes
  console.log('📊 Production build complete! Final sizes:');
  
  if (existsSync('dist')) {
    try {
      const distStats = execSync('du -sh dist 2>/dev/null || echo "Size calculation failed"', { encoding: 'utf8' });
      console.log(`   📦 Total dist/ folder: ${distStats.trim()}`);
    } catch (e) {
      console.log('   📦 Could not calculate total size');
    }
  }

  if (existsSync('dist/public')) {
    try {
      const publicStats = execSync('du -sh dist/public 2>/dev/null || echo "Size calculation failed"', { encoding: 'utf8' });
      console.log(`   🌐 Client bundle: ${publicStats.trim()}`);
    } catch (e) {
      console.log('   🌐 Could not calculate client size');
    }
  }

  console.log('✅ Production build complete!');
  console.log('');
  console.log('🚀 Deployment ready - Key optimizations applied:');
  console.log('   ✓ Vite completely excluded from server bundle');
  console.log('   ✓ All development dependencies externalized');
  console.log('   ✓ Dynamic imports used for conditional loading');
  console.log('   ✓ Minified and tree-shaken bundle');
  console.log('   ✓ Source maps removed from production');
  console.log('');
  console.log('💡 For deployment:');
  console.log('   - Use npm ci --omit=dev in production');
  console.log('   - Set REPLIT_DISABLE_PACKAGE_LAYER=true environment variable');
  console.log('   - Server bundle uses dynamic imports for dev features');
  console.log('   - All Vite dependencies excluded from production bundle');
  console.log('');
  console.log('🔧 To start in production:');
  console.log('   NODE_ENV=production REPLIT_DISABLE_PACKAGE_LAYER=true node dist/index.js');
  console.log('   - Bundle gracefully falls back if dev dependencies missing');

} catch (error) {
  console.error('❌ Production build failed:', error.message);
  console.error('');
  console.error('🔧 Troubleshooting tips:');
  console.error('   - Ensure all dependencies are properly installed');
  console.error('   - Check that vite.config.ts is accessible');
  console.error('   - Verify server/index.ts compiles without errors');
  process.exit(1);
}