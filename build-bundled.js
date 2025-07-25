#!/usr/bin/env node
// Complete bundling approach for REPLIT_DISABLE_PACKAGE_LAYER=true environment

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting bundled deployment build (REPLIT_DISABLE_PACKAGE_LAYER compatible)');

// Clean dist directory
if (existsSync('dist')) {
  rmSync('dist', { recursive: true, force: true });
}
mkdirSync('dist', { recursive: true });
mkdirSync('dist/public', { recursive: true });

// Step 1: Build frontend with esbuild
console.log('🎨 Building React frontend...');

const entryHTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MediaPro Portal</title>
    <link rel="stylesheet" href="/index.css">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.js"></script>
  </body>
</html>`;

writeFileSync('dist/public/index.html', entryHTML);

// Build CSS
try {
  execSync('npx tailwindcss -i client/src/index.css -o dist/public/index.css --minify', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ CSS build failed:', error.message);
  process.exit(1);
}

// Build JavaScript frontend
const frontendBuildCommand = [
  'npx esbuild client/src/main.tsx',
  '--bundle',
  '--format=esm',
  '--target=es2020',
  '--outfile=dist/public/index.js',
  '--minify',
  '--jsx=automatic',
  '--loader:.png=file',
  '--loader:.jpg=file',
  '--loader:.jpeg=file',
  '--loader:.svg=file',
  '--public-path=/',
  '--asset-names=[name]-[hash]',
  '--define:process.env.NODE_ENV=\\"production\\"',
  '--define:import.meta.env.NODE_ENV=\\"production\\"',
  '--define:import.meta.env.VITE_STRIPE_PUBLIC_KEY=\\"pk_test_51QKnSvFsHlZWd8GJE6ZkGZQNb1TeLF96J9zWfJZLX3tFLfW4XsJrPqsA8Qm3KVjnzHJoMfKPVqQFnUOj6IIhOIgB00XOKnz2SY\\"',
  '--define:import.meta.env.PROD=true',
  '--define:import.meta.env.DEV=false',
  '--alias:@=' + resolve(__dirname, 'client/src'),
  '--alias:@shared=' + resolve(__dirname, 'shared'),
  '--alias:@assets=' + resolve(__dirname, 'attached_assets')
].join(' ');

try {
  execSync(frontendBuildCommand, { stdio: 'inherit' });
  console.log('✅ Frontend built successfully');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

// Step 2: Bundle ALL dependencies into server (except native binaries)
console.log('⚙️ Building server with ALL dependencies bundled...');

const serverBuildCommand = [
  'npx esbuild server/index.ts',
  '--platform=node',
  '--target=node18',
  '--bundle',
  '--format=esm',
  '--outfile=dist/index.js',
  // Don't minify to avoid dynamic require issues
  // '--minify',
  // Only externalize the absolutely necessary native modules
  '--external:bcrypt',
  '--external:sharp', 
  '--external:@neondatabase/serverless',
  '--external:ws',
  // Bundle everything else, including express, drizzle-orm, etc.
  '--define:process.env.NODE_ENV=\\"production\\"'
].join(' ');

try {
  execSync(serverBuildCommand, { stdio: 'inherit' });
  console.log('✅ Server bundled successfully');
} catch (error) {
  console.error('❌ Server build failed:', error.message);
  process.exit(1);
}

// Step 3: Create minimal production package.json (only native modules that can't be bundled)
console.log('📄 Creating minimal production package.json...');

const productionPackage = {
  "name": "rest-express",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    // Only native/binary modules that can't be bundled
    "@neondatabase/serverless": "^0.10.4",
    "bcrypt": "^5.1.1",
    "sharp": "^0.34.3",
    "ws": "^8.18.3"
  }
};

writeFileSync('dist/package.json', JSON.stringify(productionPackage, null, 2));

// Step 4: Copy essential files
if (existsSync('drizzle.config.ts')) {
  copyFileSync('drizzle.config.ts', 'dist/drizzle.config.ts');
}

console.log('✅ Bundled build completed successfully!');
console.log('📦 Build outputs:');
console.log('   🌐 Frontend: dist/public/ (complete React app)');
console.log('   ⚙️ Server: dist/index.js (ALL JS dependencies bundled)');
console.log('   📄 Dependencies: Only 4 native modules (bcrypt, sharp, @neondatabase/serverless, ws)');
console.log('🎯 Fully compatible with REPLIT_DISABLE_PACKAGE_LAYER=true!');