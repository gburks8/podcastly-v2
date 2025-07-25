#!/usr/bin/env node
// Self-contained build for REPLIT_DISABLE_PACKAGE_LAYER=true environment
// This build bundles EVERYTHING possible to avoid package resolution issues

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Building self-contained deployment (no external package dependencies)');

// Clean dist directory
if (existsSync('dist')) {
  rmSync('dist', { recursive: true, force: true });
}
mkdirSync('dist', { recursive: true });
mkdirSync('dist/public', { recursive: true });

// Step 1: Build frontend
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

// Step 2: Build server with aggressive bundling
console.log('⚙️ Building completely self-contained server...');

const serverBuildCommand = [
  'npx esbuild server/index.ts',
  '--platform=node',
  '--target=node18',
  '--bundle',
  '--format=esm',
  '--outfile=dist/index.js',
  // Don't minify to avoid issues
  // Bundle everything except these that absolutely cannot be bundled
  '--external:@neondatabase/serverless',
  '--external:bcrypt',
  '--external:sharp',
  '--keep-names',
  '--define:process.env.NODE_ENV=\\"production\\"'
].join(' ');

try {
  execSync(serverBuildCommand, { stdio: 'inherit' });
  console.log('✅ Self-contained server built');
} catch (error) {
  console.error('❌ Server build failed:', error.message);
  process.exit(1);
}

// Step 3: Create minimal package.json with only unbundleable native modules
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
    "@neondatabase/serverless": "^0.10.4",
    "bcrypt": "^5.1.1",
    "sharp": "^0.34.3"
  }
};

writeFileSync('dist/package.json', JSON.stringify(productionPackage, null, 2));

// Step 4: Copy essential config files
if (existsSync('drizzle.config.ts')) {
  copyFileSync('drizzle.config.ts', 'dist/drizzle.config.ts');
}

console.log('✅ Self-contained build completed!');
console.log('📦 Build outputs:');
console.log('   🌐 Frontend: dist/public/ (complete React app)');
console.log('   ⚙️ Server: dist/index.js (ALL dependencies bundled except 3 native modules)');
console.log('   📄 Dependencies: Only 3 native modules that cannot be bundled');
console.log('🎯 Designed specifically for REPLIT_DISABLE_PACKAGE_LAYER=true environment!');

// Step 5: Verify the build doesn't have problematic imports
console.log('🔍 Verifying build...');
try {
  const serverContent = readFileSync('dist/index.js', 'utf8');
  const problemPatterns = [
    /require\s*\(\s*['"`]express['"`]\s*\)/,
    /require\s*\(\s*['"`]drizzle-orm['"`]\s*\)/,
    /require\s*\(\s*['"`]stripe['"`]\s*\)/
  ];
  
  for (const pattern of problemPatterns) {
    if (pattern.test(serverContent)) {
      console.log('⚠️ Warning: Found potential require() calls that should be bundled');
      break;
    }
  }
  console.log('✅ Build verification complete');
} catch (error) {
  console.log('⚠️ Could not verify build, but proceeding...');
}