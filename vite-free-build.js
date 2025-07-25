#!/usr/bin/env node
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { resolve } from 'path';

console.log('🚀 Starting vite-free-build.js - Production deployment build');

// Step 1: Create dist directory
console.log('📁 Creating dist directory...');
if (!existsSync('dist')) {
  mkdirSync('dist', { recursive: true });
}

// Step 2: Build frontend with Vite
console.log('🎨 Building frontend...');
try {
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('✅ Frontend build completed');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

// Step 3: Build server with esbuild
console.log('⚙️ Building server...');

const serverBuildCommand = [
  'npx esbuild server/index.ts',
  '--platform=node',
  '--target=node18',
  '--bundle',
  '--format=esm',
  '--outfile=dist/index.js',
  '--minify',
  '--sourcemap',
  // External native modules
  '--external:sharp',
  '--external:fluent-ffmpeg',
  '--external:bcrypt',
  '--external:ws',
  '--external:@neondatabase/serverless',
  '--external:esbuild',
  // External Node.js built-ins
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
  '--define:process.env.NODE_ENV="production"'
].join(' ');

try {
  execSync(serverBuildCommand, { stdio: 'inherit' });
  console.log('✅ Server build completed');
} catch (error) {
  console.error('❌ Server build failed:', error.message);
  process.exit(1);
}

// Step 4: Create production package.json
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
    "sharp": "^0.34.3",
    "fluent-ffmpeg": "^2.1.3",
    "ws": "^8.18.3",
    "esbuild": "^0.25.8"
  }
};

writeFileSync('dist/package.json', JSON.stringify(productionPackage, null, 2));

// Step 5: Copy drizzle.config.ts for database operations
if (existsSync('drizzle.config.ts')) {
  copyFileSync('drizzle.config.ts', 'dist/drizzle.config.ts');
  console.log('✅ Copied drizzle.config.ts');
}

// Step 6: Create .env placeholder
writeFileSync('dist/.env', '# Production environment variables will be injected by the platform\n');

console.log('✅ Production build completed successfully!');
console.log('📦 Build outputs:');
console.log('   🌐 Frontend: dist/public/');
console.log('   ⚙️ Server: dist/index.js');
console.log('   📄 Dependencies: dist/package.json');
console.log('');
console.log('🎯 Ready for deployment!');