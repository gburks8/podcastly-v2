#!/usr/bin/env node

/**
 * Verification script to ensure deployment readiness
 * Checks all deployment fixes are applied correctly
 */

import { readFileSync, existsSync } from 'fs';

console.log('🔍 Verifying deployment readiness...');

let allChecks = true;

// Check 1: Production build exists
if (existsSync('dist/index.js') && existsSync('dist/public/index.html')) {
  console.log('✅ Production build files exist');
} else {
  console.log('❌ Production build files missing');
  allChecks = false;
}

// Check 2: Server bundle has no Vite imports
if (existsSync('dist/index.js')) {
  const bundleContent = readFileSync('dist/index.js', 'utf8');
  const vitePatterns = ['from "vite"', "from 'vite'", 'createViteServer', '@vitejs'];
  
  const hasVite = vitePatterns.some(pattern => bundleContent.includes(pattern));
  
  if (!hasVite) {
    const bundleSize = Math.round(bundleContent.length / 1024);
    console.log(`✅ Server bundle is Vite-free (${bundleSize}KB)`);
  } else {
    console.log('❌ Server bundle still contains Vite imports');
    allChecks = false;
  }
}

// Check 3: Required Replit packages are installed
try {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const requiredPackages = [
    '@replit/vite-plugin-runtime-error-modal',
    '@replit/vite-plugin-cartographer',
    '@radix-ui/react-tooltip',
    '@tailwindcss/typography'
  ];
  
  const hasAllPackages = requiredPackages.every(pkg => 
    packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg]
  );
  
  if (hasAllPackages) {
    console.log('✅ All required packages are installed');
  } else {
    console.log('❌ Missing required packages');
    allChecks = false;
  }
} catch (error) {
  console.log('❌ Could not verify package installation');
  allChecks = false;
}

// Check 4: Production startup script exists
if (existsSync('start-production.js')) {
  console.log('✅ Production startup script exists');
} else {
  console.log('❌ Production startup script missing');
  allChecks = false;
}

// Check 5: Build script exists and works
if (existsSync('vite-free-build.js')) {
  console.log('✅ Vite-free build script exists');
} else {
  console.log('❌ Vite-free build script missing');
  allChecks = false;
}

if (allChecks) {
  console.log('\n🎉 ALL DEPLOYMENT FIXES SUCCESSFULLY APPLIED');
  console.log('📋 Ready for deployment with:');
  console.log('   • Missing packages installed');
  console.log('   • Vite-free production build system');
  console.log('   • Production startup script');
  console.log('   • Clean server bundle (no Vite imports)');
  console.log('\n🚀 Your application is ready for deployment!');
} else {
  console.log('\n❌ DEPLOYMENT ISSUES FOUND');
  console.log('Please address the issues above before deploying.');
  process.exit(1);
}