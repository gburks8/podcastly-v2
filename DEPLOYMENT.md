# Deployment Size Optimization Guide

This guide addresses the "Image size exceeds 8 GiB limit" error when deploying to Replit Autoscale.

## Problem
The deployment was failing due to excessive build size including:
- Development dependencies in production build
- Large node_modules cache files
- Unoptimized build artifacts
- Source maps and development files

## Solutions Implemented

### 1. Deployment Preparation Script (`deploy-prep.sh`)
Run this script before deployment to clean up unnecessary files:

```bash
./deploy-prep.sh
```

**What it does:**
- Removes node_modules cache and build artifacts
- Deletes test files, logs, and temporary files
- Sets production environment variables
- Shows current directory size

### 2. Optimized Build Script (`build-optimized.js`)
Custom build script that creates a production-optimized bundle:

```bash
node build-optimized.js
```

**Features:**
- Sets production environment variables to disable caching
- Runs standard build process with optimizations
- Removes source maps and development artifacts
- Minifies server bundle
- Provides size reporting

### 3. Deployment Ignore File (`.replitignore`)
Excludes unnecessary files from deployment:
- Development dependencies and caches
- Test files and documentation
- Source maps and temporary files
- TypeScript source files (keeps only compiled JS)

## Recommended Deployment Process

### Option 1: Manual Optimization
1. Run the preparation script:
   ```bash
   ./deploy-prep.sh
   ```

2. Build with optimization:
   ```bash
   node build-optimized.js
   ```

3. Deploy through Replit interface

### Option 2: Environment Variables
Set these environment variables in Replit Secrets to reduce npm overhead:
- `NPM_CONFIG_CACHE`: `false`
- `NPM_CONFIG_PREFER_OFFLINE`: `false`
- `NPM_CONFIG_AUDIT`: `false`
- `NPM_CONFIG_FUND`: `false`
- `GENERATE_SOURCEMAP`: `false`

## Size Reduction Strategies

### 1. Development Dependencies
The `.replitignore` file excludes TypeScript source files, keeping only compiled JavaScript in the deployment.

### 2. Cache Management
- Disables npm caching during deployment
- Removes Vite and node_modules cache directories
- Cleans temporary build artifacts

### 3. Bundle Optimization
- Minifies server bundle with esbuild
- Removes source maps in production
- Excludes test files and documentation

### 4. File Exclusion
- Test files (`*.test.*`, `*.spec.*`)
- Documentation (`docs/`, `README-dev.md`)
- Development tools (`.vscode/`, `.idea/`)
- Log files and temporary directories

## Troubleshooting

### If deployment still fails:
1. Check the size after running optimization:
   ```bash
   du -sh .
   ```

2. Consider pruning production dependencies:
   ```bash
   npm prune --production
   ```

3. Review large files:
   ```bash
   find . -size +10M -type f
   ```

### Environment Variables for Further Optimization
If you need additional size reduction, consider setting these in production:
- `NODE_ENV=production`
- `NPM_CONFIG_PRODUCTION=true`
- `SKIP_PREFLIGHT_CHECK=true`

## Best Practices

1. **Always run `deploy-prep.sh` before deployment**
2. **Use the optimized build script for production builds**
3. **Monitor deployment size with the provided tools**
4. **Keep the `.replitignore` file updated with unnecessary files**
5. **Regularly clean development artifacts during development**

## File Structure After Optimization

```
project/
├── dist/                    # Compiled output (deployed)
│   ├── public/             # Frontend assets
│   └── index.js            # Server bundle
├── deploy-prep.sh          # Preparation script
├── build-optimized.js      # Optimized build script
├── .replitignore          # Deployment exclusions
└── [source files excluded from deployment]
```

This approach should significantly reduce the deployment size and resolve the 8 GiB limit error.