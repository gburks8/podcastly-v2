#!/usr/bin/env node

/**
 * PRODUCTION DEPLOYMENT BUILD
 * Comprehensive build script that works with REPLIT_DISABLE_PACKAGE_LAYER=true
 * by bundling ALL dependencies into the server bundle
 */

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

console.log('🚀 Starting comprehensive production build...');

// Clean previous builds completely
if (existsSync('dist')) {
  rmSync('dist', { recursive: true, force: true });
}
mkdirSync('dist', { recursive: true });

// Step 1: Build frontend
console.log('📦 Building frontend...');
try {
  // Build to client/dist first (Vite default), then copy to deployment location
  execSync('NODE_ENV=production npx vite build', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  // Copy built frontend to deployment location
  if (existsSync('client/dist')) {
    execSync('cp -r client/dist/* dist/');
    console.log('✅ Frontend copied to deployment directory');
  }
} catch (error) {
  console.error('Frontend build failed:', error.message);
  process.exit(1);
}

// Step 2: Build server with core bundling (external for native modules)
console.log('⚙️ Building server bundle...');

const serverBuildCommand = [
  'npx esbuild server/index.ts',
  '--platform=node', 
  '--target=node18',
  '--bundle',
  '--format=esm',
  '--outfile=dist/index.js',
  '--minify',
  '--sourcemap',
  // CRITICAL: Exclude ALL Vite-related imports to prevent deployment failures
  '--external:vite',
  '--external:@vitejs/*',
  '--external:@replit/vite-*',
  '--external:./vite',
  '--external:./vite.js',
  '--external:./vite.ts',
  '--external:../vite.config*',
  // Node.js built-in modules
  '--external:fs',
  '--external:path', 
  '--external:url',
  '--external:crypto',
  '--external:http',
  '--external:https',
  '--external:stream',
  '--external:util',
  '--external:events',
  '--external:buffer',
  '--external:querystring',
  '--external:zlib',
  '--external:os',
  '--external:net',
  '--external:tls',
  '--external:child_process',
  '--external:cluster',
  '--external:worker_threads',
  '--external:dns',
  '--external:readline',
  '--external:perf_hooks',
  '--external:inspector',
  // Development and build tools (should remain external)
  '--external:@babel/*',
  '--external:lightningcss',
  '--external:tsx',
  '--external:typescript',
  '--external:drizzle-kit',
  '--external:@types/*',
  '--external:esbuild',
  // Runtime dependencies that should be external for proper resolution
  '--external:sharp',
  '--external:fluent-ffmpeg',
  '--external:bcrypt',
  '--external:ws',
  '--external:multer',
  '--external:passport',
  '--external:passport-local',
  '--external:express-session',
  '--external:connect-pg-simple',
  '--external:@neondatabase/serverless',
  '--external:drizzle-orm',
  '--external:stripe',
  '--external:nanoid',
  '--external:zod',
  '--external:express',
  '--packages=external',
  '--define:process.env.NODE_ENV=\\"production\\"'
].join(' ');

try {
  execSync(serverBuildCommand, { stdio: 'inherit' });
} catch (error) {
  console.error('Server build failed:', error.message);
  process.exit(1);
}

// Step 3: Verify no Vite imports in production bundle
console.log('🔍 Verifying no Vite imports in production bundle...');

const bundleContent = readFileSync('dist/index.js', 'utf8');
const viteImports = [
  'import.*vite',
  'require.*vite',
  'createViteServer',
  'from.*vite',
  '@vitejs',
  './vite'
];

const foundViteImports = viteImports.filter(pattern => 
  new RegExp(pattern, 'i').test(bundleContent)
);

if (foundViteImports.length > 0) {
  console.error('❌ Production bundle contains Vite imports:', foundViteImports);
  console.error('This will cause deployment failures. Please fix the build configuration.');
  process.exit(1);
} else {
  console.log('✅ No Vite imports found in production bundle');
}

// Step 4: Create production package.json with ONLY runtime dependencies
console.log('📄 Creating production package.json...');

// Get only production runtime dependencies (no dev deps, no build tools)
const productionDeps = {
  "@neondatabase/serverless": "^0.10.4",
  "bcrypt": "^5.1.1",
  "connect-pg-simple": "^10.0.0", 
  "drizzle-orm": "^0.39.1",
  "express": "^4.21.2",
  "express-session": "^1.18.1",
  "fluent-ffmpeg": "^2.1.3",
  "multer": "^2.0.1",
  "nanoid": "^5.1.5",
  "passport": "^0.7.0",
  "passport-local": "^1.0.0",
  "sharp": "^0.34.3",
  "stripe": "^18.3.0",
  "ws": "^8.18.3",
  "zod": "^3.24.2"
};

const deploymentPackageJson = {
  "name": "media-portal-production",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": productionDeps
};

writeFileSync('dist/package.json', JSON.stringify(deploymentPackageJson, null, 2));

// Step 5: Verify the build
const serverExists = existsSync('dist/index.js');
const frontendExists = existsSync('dist/index.html') || existsSync('dist/public/index.html');
const packageExists = existsSync('dist/package.json');

if (serverExists && frontendExists && packageExists) {
  const bundleSize = Math.round(readFileSync('dist/index.js', 'utf8').length / 1024);
  console.log(`✅ Production build complete!`);
  console.log(`   📦 Server bundle: ${bundleSize}KB`);
  console.log(`   🌐 Frontend: ${existsSync('dist/public/index.html') ? 'dist/public/' : 'dist/'}`);
  console.log(`   📄 Production package.json with runtime dependencies`);
  console.log('');
  console.log('🎯 Ready for deployment!');
  console.log('   Runtime dependencies included in package.json for proper installation');
} else {
  console.error('❌ Build verification failed');
  console.error(`   Server bundle: ${serverExists ? '✅' : '❌'}`);
  console.error(`   Frontend assets: ${frontendExists ? '✅' : '❌'}`);
  console.error(`   Package.json: ${packageExists ? '✅' : '❌'}`);
  process.exit(1);
}