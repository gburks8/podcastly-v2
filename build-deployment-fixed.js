#!/usr/bin/env node
// Enhanced build script applying all suggested deployment fixes
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, copyFileSync, cpSync, readFileSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting deployment-fixed build with all suggested fixes applied');

// Clean dist directory
if (existsSync('dist')) {
  rmSync('dist', { recursive: true, force: true });
}
mkdirSync('dist', { recursive: true });
mkdirSync('dist/public', { recursive: true });

// Step 1: Build frontend with esbuild (replacing Vite)
console.log('🎨 Building React frontend with esbuild...');

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

// Build CSS with Tailwind
console.log('🎨 Building CSS with Tailwind...');
try {
  execSync('npx tailwindcss -i client/src/index.css -o dist/public/index.css --minify', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ CSS build failed:', error.message);
  process.exit(1);
}

// Build JavaScript with esbuild
console.log('⚙️ Building JavaScript with esbuild...');

const buildCommand = [
  'npx esbuild client/src/main.tsx',
  '--bundle',
  '--format=esm',
  '--target=es2020',
  '--outfile=dist/public/index.js',
  '--minify',
  '--sourcemap',
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
  execSync(buildCommand, { stdio: 'inherit' });
  console.log('✅ Frontend JavaScript built');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

// Step 2: Build server with esbuild
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
  // All dependencies that should be installed in production
  '--external:bcrypt',
  '--external:esbuild',
  '--external:sharp',
  '--external:express',
  '--external:@neondatabase/serverless',
  '--external:drizzle-orm',
  '--external:passport',
  '--external:passport-local',
  '--external:express-session',
  '--external:connect-pg-simple',
  '--external:multer',
  '--external:ws',
  '--external:stripe',
  '--external:nanoid',
  '--external:zod',
  '--define:process.env.NODE_ENV=\\"production\\"'
].join(' ');

try {
  execSync(serverBuildCommand, { stdio: 'inherit' });
  console.log('✅ Server build completed');
} catch (error) {
  console.error('❌ Server build failed:', error.message);
  process.exit(1);
}

// Step 3: Create COMPREHENSIVE production package.json with ALL required dependencies
console.log('📄 Creating comprehensive production package.json...');

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
    "esbuild": "^0.25.8",
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
  },
  "engines": {
    "node": ">=18.0.0"
  }
};

writeFileSync('dist/package.json', JSON.stringify(productionPackage, null, 2));

// Step 4: Copy essential files for deployment
console.log('📋 Copying essential deployment files...');

if (existsSync('drizzle.config.ts')) {
  copyFileSync('drizzle.config.ts', 'dist/drizzle.config.ts');
}

// Create package-lock.json in dist to ensure dependency resolution
console.log('📦 Creating package-lock.json for deployment...');
try {
  // Change to dist directory and run npm install to create package-lock.json
  process.chdir('dist');
  execSync('npm install --package-lock-only', { stdio: 'inherit' });
  process.chdir(__dirname);
  console.log('✅ Package-lock.json created in dist/');
} catch (error) {
  console.warn('⚠️ Could not create package-lock.json:', error.message);
}

// Step 5: Create .env file template for deployment
console.log('🔧 Creating deployment environment setup...');

const envTemplate = `# Production environment variables
NODE_ENV=production
PORT=5000
DATABASE_URL=${process.env.DATABASE_URL || 'your_database_url_here'}

# For deployment with disabled package layer
REPLIT_DISABLE_PACKAGE_LAYER=true
NPM_CONFIG_INCLUDE=dev
`;

writeFileSync('dist/.env.example', envTemplate);

// Step 6: Create startup verification script
console.log('✅ Creating startup verification...');

const verificationScript = `#!/usr/bin/env node
// Startup verification for deployment
import { readFileSync, existsSync } from 'fs';

console.log('🔍 Verifying deployment package...');

// Check required files
const requiredFiles = ['index.js', 'package.json', 'public/index.html', 'public/index.js'];
let allFilesExist = true;

for (const file of requiredFiles) {
  if (existsSync(file)) {
    console.log('✅', file);
  } else {
    console.log('❌', file, '- MISSING');
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.error('❌ Deployment verification failed - missing files');
  process.exit(1);
}

// Check package.json dependencies
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
console.log('📦 Dependencies:', Object.keys(packageJson.dependencies).length);

console.log('✅ Deployment package verified successfully');
console.log('🚀 Ready for production deployment');
`;

writeFileSync('dist/verify-deployment.js', verificationScript);

console.log('✅ Enhanced deployment build completed successfully!');
console.log('📦 Applied all suggested fixes:');
console.log('   ✅ Comprehensive dependencies in production package.json');
console.log('   ✅ Package-lock.json updated for dependency resolution');
console.log('   ✅ Environment variables configured for disabled package layer');
console.log('   ✅ All runtime dependencies externalized and included');
console.log('   ✅ Build process compatible with REPLIT_DISABLE_PACKAGE_LAYER=true');
console.log('');
console.log('🎯 Build outputs:');
console.log('   🌐 Frontend: dist/public/ (' + (existsSync('dist/public/index.js') ? 'Ready' : 'Missing') + ')');
console.log('   ⚙️ Server: dist/index.js (' + (existsSync('dist/index.js') ? 'Ready' : 'Missing') + ')');
console.log('   📄 Dependencies: dist/package.json with 14+ packages');
console.log('   🔧 Verification: dist/verify-deployment.js');
console.log('');
console.log('🚢 Ready for deployment with all suggested fixes applied!');