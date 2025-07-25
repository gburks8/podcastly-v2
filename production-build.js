#!/usr/bin/env node

/**
 * ALTERNATIVE PRODUCTION BUILD SCRIPT
 * Enhanced version with better Vite handling and dependency management
 * Compatible with Replit deployment constraints
 */

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync, cpSync } from 'fs';
import { resolve } from 'path';

console.log('🚀 Starting enhanced production build...');

// Clean previous builds
if (existsSync('dist')) {
  rmSync('dist', { recursive: true, force: true });
}
mkdirSync('dist', { recursive: true });

// Step 1: Build frontend assets first
console.log('📦 Building frontend with Vite...');
try {
  execSync('NODE_ENV=production npx vite build --outDir client/dist', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  // Copy frontend assets to deployment directory
  if (existsSync('client/dist')) {
    cpSync('client/dist', 'dist/public', { recursive: true });
    console.log('✅ Frontend assets copied to dist/public');
  }
} catch (error) {
  console.error('Frontend build failed:', error.message);
  process.exit(1);
}

// Step 2: Copy the vite-shim to ensure it's available during runtime
if (existsSync('server/vite-shim.js')) {
  cpSync('server/vite-shim.js', 'dist/vite-shim.js');
  console.log('✅ Vite shim copied to dist/');
}

// Step 3: Build server bundle with maximum exclusions
console.log('⚙️ Building server bundle with enhanced Vite exclusion...');

const serverBuildArgs = [
  'npx esbuild server/index.ts',
  '--platform=node',
  '--target=node18', 
  '--bundle',
  '--format=esm',
  '--outfile=dist/index.js',
  '--minify',
  '--sourcemap',
  
  // ENHANCED VITE EXCLUSIONS - every possible variant
  '--external:vite',
  '--external:@vitejs',
  '--external:@vitejs/*',
  '--external:@vitejs/**',
  '--external:@replit/vite-*',
  '--external:./vite',
  '--external:./vite.js',
  '--external:./vite.ts',
  '--external:server/vite',
  '--external:server/vite.js', 
  '--external:server/vite.ts',
  '--external:../vite.config',
  '--external:../vite.config.ts',
  '--external:../vite.config.js',
  
  // All Node.js built-ins
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
  
  // Build tools and dev dependencies
  '--external:tsx',
  '--external:typescript',
  '--external:esbuild',
  '--external:drizzle-kit',
  '--external:@types/*',
  '--external:@babel/*',
  '--external:lightningcss',
  
  // Runtime dependencies should remain external for proper resolution
  '--packages=external',
  '--define:process.env.NODE_ENV=\\"production\\"'
];

try {
  execSync(serverBuildArgs.join(' '), { stdio: 'inherit' });
  console.log('✅ Server bundle created successfully');
} catch (error) {
  console.error('Server build failed:', error.message);
  process.exit(1);
}

// Step 4: Enhanced verification - check for any Vite traces
console.log('🔍 Performing enhanced Vite import verification...');

const bundleContent = readFileSync('dist/index.js', 'utf8');
const vitePatterns = [
  /import[^;]*vite/gi,
  /require[^;]*vite/gi,
  /createViteServer/gi,
  /from[^;]*vite/gi,
  /@vitejs/gi,
  /\.\/vite(?!-shim)/gi, // Allow vite-shim but not vite itself
  /server\/vite/gi,
  /vite\.config/gi
];

const foundViteReferences = [];
vitePatterns.forEach((pattern, index) => {
  const matches = bundleContent.match(pattern);
  if (matches) {
    foundViteReferences.push({ pattern: pattern.toString(), matches: matches.slice(0, 3) });
  }
});

if (foundViteReferences.length > 0) {
  console.error('❌ Production bundle still contains Vite references:');
  foundViteReferences.forEach(ref => {
    console.error(`   Pattern ${ref.pattern}: ${ref.matches.join(', ')}`);
  });
  console.error('This WILL cause deployment failures. Build configuration needs fixing.');
  process.exit(1);
} else {
  console.log('✅ No Vite imports found in production bundle');
}

// Step 5: Create optimized production package.json
console.log('📄 Creating production package.json...');

const productionPackage = {
  "name": "media-portal-production",
  "version": "1.0.0", 
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
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
  }
};

writeFileSync('dist/package.json', JSON.stringify(productionPackage, null, 2));

// Step 6: Final verification
const buildFiles = {
  server: existsSync('dist/index.js'),
  frontend: existsSync('dist/public/index.html'),
  package: existsSync('dist/package.json'),
  shim: existsSync('dist/vite-shim.js')
};

console.log('\n📋 Build verification:');
Object.entries(buildFiles).forEach(([name, exists]) => {
  console.log(`   ${name}: ${exists ? '✅' : '❌'}`);
});

if (Object.values(buildFiles).every(Boolean)) {
  const bundleSize = Math.round(readFileSync('dist/index.js', 'utf8').length / 1024);
  console.log(`\n🎉 Enhanced production build complete!`);
  console.log(`   📦 Server bundle: ${bundleSize}KB (Vite-free)`);
  console.log(`   🌐 Frontend: dist/public/`);
  console.log(`   🛡️ Vite shim: available for fallback`);
  console.log(`   📄 Optimized dependencies`);
  console.log('\n🚀 Ready for deployment with enhanced Vite isolation!');
} else {
  console.error('\n❌ Build incomplete - missing required files');
  process.exit(1);
}