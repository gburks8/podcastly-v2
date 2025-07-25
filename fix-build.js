#!/usr/bin/env node
// Post-build script to add server files to existing dist/ directory
import { execSync } from 'child_process';
import { existsSync } from 'fs';

// Only run server compilation if server files don't exist
if (!existsSync('dist/server/index.js')) {
  console.log('Adding server files to deployment...');
  execSync('npx tsc -p tsconfig.build.json', { stdio: 'inherit' });
  console.log('✅ Server files added successfully');
} else {
  console.log('✅ Server files already exist');
}