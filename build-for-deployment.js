#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Building for Replit Deployment...');

// Clean previous build
if (fs.existsSync('dist')) {
  execSync('rm -rf dist', { stdio: 'inherit' });
}

console.log('✅ Step 1: Compiling TypeScript...');
try {
  // Compile TypeScript to JavaScript
  execSync('npx tsc --outDir dist --rootDir .', { stdio: 'inherit' });
  console.log('✅ TypeScript compilation successful!');
} catch (error) {
  console.error('❌ TypeScript compilation failed!');
  process.exit(1);
}

console.log('✅ Step 2: Copying static assets...');
// Copy client build if it exists
if (fs.existsSync('client/dist')) {
  if (!fs.existsSync('dist/client')) {
    fs.mkdirSync('dist/client', { recursive: true });
  }
  execSync('cp -r client/dist/* dist/client/', { stdio: 'inherit' });
}

// Copy uploads directory
if (fs.existsSync('uploads')) {
  execSync('cp -r uploads dist/', { stdio: 'inherit' });
} else {
  fs.mkdirSync('dist/uploads', { recursive: true });
  fs.mkdirSync('dist/uploads/videos', { recursive: true });
  fs.mkdirSync('dist/uploads/headshots', { recursive: true });
  fs.mkdirSync('dist/uploads/thumbnails', { recursive: true });
}

console.log('✅ Step 3: Creating production package.json...');
const originalPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const productionPackage = {
  name: originalPackage.name,
  version: originalPackage.version,
  type: 'module',
  main: 'server/index.js',
  scripts: {
    start: 'NODE_ENV=production node server/index.js'
  },
  dependencies: {
    // Core Express
    "express": originalPackage.dependencies["express"],
    "express-session": originalPackage.dependencies["express-session"],
    
    // Database
    "@neondatabase/serverless": originalPackage.dependencies["@neondatabase/serverless"],
    "drizzle-orm": originalPackage.dependencies["drizzle-orm"],
    "drizzle-zod": originalPackage.dependencies["drizzle-zod"],
    "connect-pg-simple": originalPackage.dependencies["connect-pg-simple"],
    
    // Authentication
    "passport": originalPackage.dependencies["passport"],
    "passport-local": originalPackage.dependencies["passport-local"],
    "openid-client": originalPackage.dependencies["openid-client"],
    "bcrypt": originalPackage.dependencies["bcrypt"],
    
    // File handling
    "multer": originalPackage.dependencies["multer"],
    "sharp": originalPackage.dependencies["sharp"],
    
    // Payment
    "stripe": originalPackage.dependencies["stripe"],
    
    // WebSocket and utilities
    "ws": originalPackage.dependencies["ws"],
    "nanoid": originalPackage.dependencies["nanoid"],
    "zod": originalPackage.dependencies["zod"],
    "zod-validation-error": originalPackage.dependencies["zod-validation-error"]
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(productionPackage, null, 2));

console.log('✅ Step 4: Fixing imports for production...');
// Fix any .ts imports to .js in the compiled files
const fixImports = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixImports(filePath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      // Fix relative imports from .ts to .js
      content = content.replace(/from ['"]([^'"]*?)\.ts['"]/g, "from '$1.js'");
      content = content.replace(/import\(['"]([^'"]*?)\.ts['"]\)/g, "import('$1.js')");
      fs.writeFileSync(filePath, content);
    }
  }
};

fixImports('dist');

console.log('✅ Build complete! Deployment ready.');
console.log('');
console.log('📦 Deployment structure:');
console.log('- dist/server/index.js - Main server entry point');
console.log('- dist/package.json - Production dependencies');
console.log('- dist/uploads/ - File storage directories');
console.log('- dist/client/ - Frontend assets');
console.log('');
console.log('🚀 Ready for Replit deployment!');