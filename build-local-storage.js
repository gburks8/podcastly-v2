#!/usr/bin/env node
// Build script that switches from Object Storage to local storage to fix deployment issues

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Building with local storage (removes Object Storage dependency)');

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

// Step 2: Build server without Object Storage dependencies
console.log('⚙️ Building server with local storage only...');

const serverBuildCommand = [
  'npx esbuild server/index.ts',
  '--platform=node',
  '--target=node18',
  '--bundle',
  '--format=esm',
  '--outfile=dist/index.js',
  '--minify',
  '--packages=external',
  // Externalize all Node.js built-in modules to prevent dynamic require errors
  '--external:path',
  '--external:fs',
  '--external:crypto',
  '--external:os',
  '--external:util',
  '--external:events',
  '--external:stream',
  '--external:http',
  '--external:https',
  '--external:url',
  '--external:querystring',
  '--external:zlib',
  '--external:child_process',
  // Externalize npm packages (standard approach without Object Storage)
  '--external:bcrypt',
  '--external:sharp',
  '--external:express',
  '--external:@neondatabase/serverless',
  '--external:drizzle-orm',
  '--external:passport',
  '--external:express-session',
  '--external:connect-pg-simple',
  '--external:multer',
  '--external:ws',
  '--external:stripe',
  // Exclude Object Storage package
  '--external:@replit/object-storage',
  '--define:process.env.NODE_ENV=\\"production\\"'
].join(' ');

try {
  execSync(serverBuildCommand, { stdio: 'inherit' });
  console.log('✅ Server built successfully');
} catch (error) {
  console.error('❌ Server build failed:', error.message);
  process.exit(1);
}

// Step 3: Create production package.json without Object Storage
console.log('📄 Creating production package.json (no Object Storage)...');

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

// Step 4: Create uploads directory for local storage
mkdirSync('dist/uploads', { recursive: true });
mkdirSync('dist/uploads/videos', { recursive: true });
mkdirSync('dist/uploads/headshots', { recursive: true });

// Step 5: Copy essential files
if (existsSync('drizzle.config.ts')) {
  copyFileSync('drizzle.config.ts', 'dist/drizzle.config.ts');
}

console.log('✅ Local storage build completed!');
console.log('📦 Build outputs:');
console.log('   🌐 Frontend: dist/public/ (complete React app)');
console.log('   ⚙️ Server: dist/index.js (standard externalized dependencies)');
console.log('   📁 Storage: dist/uploads/ (local file storage)');
console.log('   📄 Dependencies: Standard npm packages (no Object Storage)');
console.log('🎯 Should work without REPLIT_DISABLE_PACKAGE_LAYER flag!');