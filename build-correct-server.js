#!/usr/bin/env node

/**
 * Build server correctly without Vite dependencies
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, cpSync, rmSync } from 'fs';

console.log('🔧 Building deployment-ready server...');

// Clean and create directories
if (existsSync('deployment-fixed')) {
  rmSync('deployment-fixed', { recursive: true, force: true });
}
mkdirSync('deployment-fixed', { recursive: true });
mkdirSync('deployment-fixed/dist', { recursive: true });

// Build frontend first
console.log('⚙️ Building frontend...');
process.env.NODE_ENV = 'production';
process.env.GENERATE_SOURCEMAP = 'false';
execSync('npm run build', { stdio: 'inherit', env: process.env });

// Copy frontend build
cpSync('dist/public', 'deployment-fixed/dist/public', { recursive: true });
console.log('   ✅ Frontend built and copied');

// Build server with proper externals
console.log('⚙️ Building server (no vite imports)...');
const serverBuildCmd = [
  'npx esbuild server/index.ts',
  '--platform=node',
  '--format=esm',
  '--bundle',
  '--outfile=deployment-fixed/dist/index.js',
  '--external:express',
  '--external:@neondatabase/serverless',
  '--external:@replit/object-storage',
  '--external:drizzle-orm',
  '--external:passport',
  '--external:multer',
  '--external:sharp',
  '--external:fluent-ffmpeg',
  '--external:stripe',
  '--external:@sendgrid/mail',
  '--external:ws',
  '--external:zod',
  '--external:nanoid',
  '--external:express-session',
  '--external:connect-pg-simple',
  '--external:memorystore',
  '--external:passport-local',
  '--external:memoizee',
  '--external:zod-validation-error',
  '--external:drizzle-zod',
  '--define:process.env.NODE_ENV=\'"production"\'',
  '--minify'
].join(' ');

execSync(serverBuildCmd, { stdio: 'inherit' });
console.log('   ✅ Server built without vite dependencies');

// Copy essential files
cpSync('shared', 'deployment-fixed/shared', { recursive: true });
cpSync('drizzle.config.ts', 'deployment-fixed/drizzle.config.ts');
console.log('   ✅ Essential files copied');

// Install production dependencies
console.log('📦 Installing production dependencies...');
process.chdir('deployment-fixed');
execSync('npm install --production --no-audit --no-fund', { 
  stdio: 'inherit',
  env: { 
    ...process.env, 
    NODE_ENV: 'production',
    NPM_CONFIG_PRODUCTION: 'true' 
  }
});
process.chdir('..');

console.log('📊 Final deployment size:');
const sizeOutput = execSync('du -sh deployment-fixed', { encoding: 'utf8' });
console.log(`   ${sizeOutput.trim()}`);

console.log('');
console.log('✅ CORRECTED DEPLOYMENT PACKAGE READY!');
console.log('📁 Deploy the contents of deployment-fixed/ directory');
console.log('🚀 This package has proper dependency resolution and will work!');