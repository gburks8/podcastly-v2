#!/usr/bin/env node
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Building development version (no Vite)');

// Create development build directory
if (!existsSync('client/dist')) {
  mkdirSync('client/dist', { recursive: true });
}

// Build HTML
const entryHTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MediaPro Portal - Development</title>
    <link rel="stylesheet" href="/index.css">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.js"></script>
  </body>
</html>`;

writeFileSync('client/dist/index.html', entryHTML);

// Build CSS with Tailwind
console.log('🎨 Building CSS...');
try {
  execSync('npx tailwindcss -i client/src/index.css -o client/dist/index.css', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ CSS build failed:', error.message);
  process.exit(1);
}

// Build JavaScript with esbuild
console.log('⚙️ Building JavaScript...');
const buildCommand = [
  'npx esbuild client/src/main.tsx',
  '--bundle',
  '--format=esm',
  '--target=es2020',
  '--outfile=client/dist/index.js',
  '--sourcemap',
  '--jsx=automatic',
  '--loader:.png=file',
  '--loader:.jpg=file',
  '--loader:.jpeg=file',
  '--loader:.svg=file',
  '--public-path=/',
  '--asset-names=[name]',
  '--define:process.env.NODE_ENV=\\"development\\"',
  '--define:process.env.STRIPE_PUBLIC_KEY=\\"pk_test_51QKnSvFsHlZWd8GJE6ZkGZQNb1TeLF96J9zWfJZLX3tFLfW4XsJrPqsA8Qm3KVjnzHJoMfKPVqQFnUOj6IIhOIgB00XOKnz2SY\\"',
  '--define:import.meta.env.PROD=false',
  '--define:import.meta.env.DEV=true',
  '--alias:@=' + resolve(__dirname, 'client/src'),
  '--alias:@shared=' + resolve(__dirname, 'shared'),
  '--alias:@assets=' + resolve(__dirname, 'attached_assets')
].join(' ');

try {
  execSync(buildCommand, { stdio: 'inherit' });
  console.log('✅ Development build completed');
} catch (error) {
  console.error('❌ JavaScript build failed:', error.message);
  process.exit(1);
}

console.log('✅ Development build ready!');