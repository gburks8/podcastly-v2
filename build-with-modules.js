#!/usr/bin/env node
// Alternative build approach that copies node_modules to avoid dynamic require issues

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync, cpSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting build with node_modules copy (for REPLIT_DISABLE_PACKAGE_LAYER=true)');

// Clean dist directory
if (existsSync('dist')) {
  rmSync('dist', { recursive: true, force: true });
}
mkdirSync('dist', { recursive: true });
mkdirSync('dist/public', { recursive: true });

// Step 1: Build frontend (same as before)
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

// Step 2: Build server with minimal bundling
console.log('⚙️ Building server with minimal bundling...');

const serverBuildCommand = [
  'npx esbuild server/index.ts',
  '--platform=node',
  '--target=node18',
  '--bundle',
  '--format=esm',
  '--outfile=dist/index.js',
  '--packages=external',
  '--define:process.env.NODE_ENV=\\"production\\"'
].join(' ');

try {
  execSync(serverBuildCommand, { stdio: 'inherit' });
  console.log('✅ Server built successfully');
} catch (error) {
  console.error('❌ Server build failed:', error.message);
  process.exit(1);
}

// Step 3: Copy essential node_modules
console.log('📦 Copying required node_modules...');

const requiredModules = [
  '@neondatabase/serverless',
  'bcrypt',
  'connect-pg-simple',
  'drizzle-orm',
  'express',
  'express-session',
  'multer',
  'nanoid',
  'passport',
  'passport-local',
  'sharp',
  'stripe',
  'ws',
  'zod'
];

mkdirSync('dist/node_modules', { recursive: true });

for (const moduleName of requiredModules) {
  const sourcePath = `node_modules/${moduleName}`;
  const destPath = `dist/node_modules/${moduleName}`;
  
  if (existsSync(sourcePath)) {
    try {
      cpSync(sourcePath, destPath, { recursive: true });
      console.log(`✅ Copied ${moduleName}`);
    } catch (error) {
      console.log(`⚠️ Failed to copy ${moduleName}: ${error.message}`);
    }
  } else {
    console.log(`⚠️ Module not found: ${moduleName}`);
  }
}

// Step 4: Create production package.json with all dependencies
console.log('📄 Creating production package.json...');

const productionPackage = {
  "name": "rest-express",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@neondatabase/serverless": "^0.10.4",
    "bcrypt": "^5.1.1",
    "connect-pg-simple": "^10.0.0",
    "drizzle-orm": "^0.39.1",
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "multer": "^2.0.2",
    "nanoid": "^5.1.5",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "sharp": "^0.34.3",
    "stripe": "^18.3.0",
    "ws": "^8.18.3",
    "zod": "^3.24.2"
  }
};

writeFileSync('dist/package.json', JSON.stringify(productionPackage, null, 2));

// Step 5: Copy essential files
if (existsSync('drizzle.config.ts')) {
  copyFileSync('drizzle.config.ts', 'dist/drizzle.config.ts');
}

console.log('✅ Build with node_modules completed successfully!');
console.log('📦 Build outputs:');
console.log('   🌐 Frontend: dist/public/ (complete React app)');
console.log('   ⚙️ Server: dist/index.js (minimal bundle)');
console.log('   📦 Modules: dist/node_modules/ (copied dependencies)');
console.log('   📄 Dependencies: Complete package.json with all deps');
console.log('🎯 Should work with REPLIT_DISABLE_PACKAGE_LAYER=true!');