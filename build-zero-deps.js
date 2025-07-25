#!/usr/bin/env node
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Zero-dependency deployment build');

// Clean dist directory
if (existsSync('dist')) {
  rmSync('dist', { recursive: true, force: true });
}
mkdirSync('dist', { recursive: true });
mkdirSync('dist/public', { recursive: true });
mkdirSync('dist/public/assets', { recursive: true });

// Step 1: Copy the working React frontend from development build
console.log('🎨 Copying working React frontend...');

// Copy the complete working frontend build
if (existsSync('client/dist')) {
  execSync('cp -r client/dist/* dist/public/');
  console.log('✅ Copied complete working frontend from client/dist');
} else {
  console.log('❌ client/dist not found, building frontend first...');
  // Build frontend using existing method
  try {
    execSync('cd client && npm run build', { stdio: 'inherit' });
    execSync('cp -r client/dist/* dist/public/');
    console.log('✅ Built and copied frontend');
  } catch (error) {
    console.error('Failed to build/copy frontend:', error);
    process.exit(1);
  }
}

// Step 2: Build full Express server with esbuild
console.log('⚙️ Building full Express server...');

try {
  // Bundle with fewer externals to work with REPLIT_DISABLE_PACKAGE_LAYER=true
  execSync('npx esbuild server/index.ts --bundle --outfile=dist/index.js --platform=node --target=node18 --format=esm --external:bcrypt --external:sharp --external:@neondatabase/serverless --external:ws --external:express --external:drizzle-orm --external:express-session --external:connect-pg-simple --external:passport --external:passport-local --external:zod --external:nanoid --external:multer --external:stripe', { stdio: 'inherit' });
  console.log('✅ Server built successfully');
} catch (error) {
  console.error('Failed to build server:', error);
  process.exit(1);
}

// Step 3: Create production package.json with required dependencies
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

console.log('✅ Production build completed!');
console.log('📦 Build outputs:');
console.log('   🌐 Frontend: dist/public/ (complete React app)');
console.log('   ⚙️ Server: dist/index.js (bundled with externals)');
console.log('   📄 Dependencies: All required runtime packages included');
console.log('🎯 Ready for deployment with REPLIT_DISABLE_PACKAGE_LAYER=true!');