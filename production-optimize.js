#!/usr/bin/env node

/**
 * Production optimization tool for Replit deployment
 * Addresses the 8GB deployment size limit by:
 * - Creating production-only package.json
 * - Removing dev dependencies from node_modules
 * - Optimizing deployment bundle
 */

import { readFileSync, writeFileSync, existsSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

console.log('🚀 Starting production optimization...');

try {
  // Read current package.json
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  
  // Create production package.json
  const prodPackageJson = {
    ...packageJson,
    devDependencies: {}, // Remove all dev dependencies
    scripts: {
      start: packageJson.scripts.start,
      // Keep only production scripts
    }
  };

  // Backup original package.json
  writeFileSync('package.json.backup', JSON.stringify(packageJson, null, 2));
  console.log('📋 Backed up original package.json');

  // Write production package.json
  writeFileSync('package.json', JSON.stringify(prodPackageJson, null, 2));
  console.log('📦 Created production package.json (removed devDependencies)');

  // Remove development dependencies from node_modules
  const devDeps = Object.keys(packageJson.devDependencies || {});
  console.log(`🗑️ Removing ${devDeps.length} development dependencies...`);
  
  devDeps.forEach(dep => {
    const depPath = path.join('node_modules', dep);
    if (existsSync(depPath)) {
      rmSync(depPath, { recursive: true, force: true });
      console.log(`   ✅ Removed ${dep}`);
    }
  });

  // Remove large development-only packages that might not be in devDependencies
  const additionalDevPackages = [
    '@types',
    'typescript',
    'tsx',
    'drizzle-kit',
    '@vitejs',
    'vite',
    'esbuild',
    '@replit/vite-plugin-cartographer',
    '@replit/vite-plugin-runtime-error-modal'
  ];

  console.log('🧹 Removing additional development packages...');
  additionalDevPackages.forEach(pkg => {
    const pkgPath = path.join('node_modules', pkg);
    if (existsSync(pkgPath)) {
      rmSync(pkgPath, { recursive: true, force: true });
      console.log(`   ✅ Removed ${pkg}`);
    }
  });

  // Clean package-lock.json to reflect changes
  if (existsSync('package-lock.json')) {
    rmSync('package-lock.json');
    console.log('🔄 Removed package-lock.json for clean state');
  }

  // Calculate size reduction
  console.log('📊 Checking final sizes...');
  const nodeModulesSize = execSync('du -sh node_modules 2>/dev/null || echo "Size check failed"', { encoding: 'utf8' });
  console.log(`   📦 node_modules: ${nodeModulesSize.trim()}`);

  const totalSize = execSync('du -sh . --exclude=.git 2>/dev/null || echo "Size check failed"', { encoding: 'utf8' });
  console.log(`   📁 Total (excluding .git): ${totalSize.trim()}`);

  console.log('\n✅ Production optimization complete!');
  console.log('\n💡 Next steps:');
  console.log('   1. Run your production build');
  console.log('   2. Deploy with the optimized package');
  console.log('   3. To restore dev environment: mv package.json.backup package.json && npm install');

} catch (error) {
  console.error('❌ Optimization failed:', error.message);
  
  // Restore backup if it exists
  if (existsSync('package.json.backup')) {
    const backup = readFileSync('package.json.backup', 'utf8');
    writeFileSync('package.json', backup);
    console.log('🔄 Restored original package.json');
  }
  
  process.exit(1);
}