#!/usr/bin/env node
/**
 * Deployment Build Wrapper
 * 
 * This script ensures the deployment build works correctly 
 * by calling the proper build-deployment.js script.
 * 
 * Use this in deployment environments where package.json 
 * build script cannot be modified.
 */

import { execSync } from 'child_process';

console.log('🚀 Running deployment build wrapper...');

try {
  // Run the deployment build script
  execSync('node build-deployment.js', { stdio: 'inherit' });
  
  console.log('✅ Deployment build wrapper completed successfully!');
  console.log('📦 The dist/server/index.js file has been created and is ready for deployment.');
  
} catch (error) {
  console.error('❌ Deployment build wrapper failed:', error.message);
  process.exit(1);
}