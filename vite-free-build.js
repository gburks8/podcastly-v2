#!/usr/bin/env node
// This file exists because deployment looks for it, but we redirect to our simple build
import { execSync } from 'child_process';

console.log('🚫 Vite-free deployment build starting...');
console.log('📞 Redirecting to simple build system (no Vite dependencies)');

try {
  execSync('node build-simple.js', { stdio: 'inherit' });
  console.log('✅ Comprehensive build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}