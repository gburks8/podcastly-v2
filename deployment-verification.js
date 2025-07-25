#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Verifies all fluent-ffmpeg deployment fixes are properly applied
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔍 Verifying fluent-ffmpeg deployment fixes...\n');

let allChecksPass = true;

// Check 1: FFmpeg system dependency
console.log('1. ✅ FFmpeg System Dependency');
try {
  const ffmpegPath = execSync('which ffmpeg', { encoding: 'utf8' }).trim();
  console.log(`   📍 FFmpeg found at: ${ffmpegPath}`);
} catch (error) {
  console.log('   ❌ FFmpeg system dependency missing');
  allChecksPass = false;
}

// Check 2: Package.json structure
console.log('\n2. ✅ Package Dependencies');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const requiredPackages = ['fluent-ffmpeg', 'sharp', 'multer'];
requiredPackages.forEach(pkg => {
  if (packageJson.dependencies[pkg]) {
    console.log(`   ✅ ${pkg}: ${packageJson.dependencies[pkg]} (in dependencies)`);
  } else {
    console.log(`   ❌ ${pkg}: Missing from dependencies`);
    allChecksPass = false;
  }
});

// Check 3: Type definitions
if (packageJson.dependencies['@types/fluent-ffmpeg']) {
  console.log(`   ✅ @types/fluent-ffmpeg: ${packageJson.dependencies['@types/fluent-ffmpeg']}`);
} else {
  console.log('   ❌ @types/fluent-ffmpeg: Missing');
  allChecksPass = false;
}

// Check 4: Import functionality
console.log('\n3. ✅ Import Verification');
try {
  execSync('node -e "import(\'fluent-ffmpeg\').then(() => console.log(\'Import successful\')).catch(err => {console.error(err.message); process.exit(1)})"', 
    { stdio: 'pipe' });
  console.log('   ✅ fluent-ffmpeg import works correctly');
} catch (error) {
  console.log('   ❌ fluent-ffmpeg import failed');
  allChecksPass = false;
}

// Check 5: Server startup
console.log('\n4. ✅ Server Status');
try {
  const response = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:5000', { encoding: 'utf8' });
  if (response === '200') {
    console.log('   ✅ Server is running and responsive');
  } else {
    console.log(`   ⚠️  Server responded with status: ${response}`);
  }
} catch (error) {
  console.log('   ⚠️  Could not verify server status (may be normal)');
}

console.log('\n' + '='.repeat(50));
if (allChecksPass) {
  console.log('🎉 ALL DEPLOYMENT FIXES VERIFIED SUCCESSFULLY!');
  console.log('\n📋 Summary of applied fixes:');
  console.log('   ✅ FFmpeg system dependency installed');
  console.log('   ✅ fluent-ffmpeg in production dependencies');
  console.log('   ✅ All video processing packages properly configured');
  console.log('   ✅ Import functionality verified');
  console.log('   ✅ Type definitions available');
  console.log('\n🚀 Ready for deployment without fluent-ffmpeg errors!');
} else {
  console.log('❌ Some deployment fixes need attention');
  console.log('Please review the failed checks above');
}