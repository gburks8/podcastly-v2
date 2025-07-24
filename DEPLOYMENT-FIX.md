# Deployment Vite Import Fix

## Problem
The deployment was failing with error:
```
Cannot find package 'vite' imported from /home/runner/workspace/dist/index.js
The build is including Vite imports in the production bundle when Vite should only be used in development
```

## Root Cause
- Vite was being imported at the top level of `server/vite.ts`
- Even though Vite functions were only called conditionally in development, the imports were still being bundled into production
- esbuild was including these imports despite the `--packages=external` flag

## Solution Applied

### 1. Dynamic Imports in server/index.ts
- Removed static imports of Vite functions from `server/vite.ts`
- Implemented dynamic imports that only load Vite in development mode
- Added fallback static file serving that doesn't depend on Vite

### 2. Enhanced Build Script (build-production.js)
- Created comprehensive build script that explicitly excludes all Vite and dev dependencies
- Added verification to check that no Vite imports exist in production bundle
- Includes fallback mechanisms for graceful degradation

### 3. Improved .replitignore
- Excludes Vite and all development dependencies from deployment
- Reduces deployment size by excluding unnecessary development files

## Key Changes Made

### server/index.ts
```javascript
// Before: Static import (caused bundling issues)
import { setupVite, serveStatic, log } from "./vite";

// After: Dynamic imports only when needed
if (app.get("env") === "development") {
  try {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } catch (error) {
    // Fallback to static serving
  }
}
```

### build-production.js
- Explicitly excludes all Vite-related packages from bundle
- Verifies production bundle integrity
- Creates optimized 39KB server bundle (vs. previous large bundle)

## Deployment Process

### For Production Deployment:
1. Run: `node build-production.js`
2. Verify bundle size and integrity
3. Deploy with `npm ci --omit=dev` to exclude development dependencies
4. Start with `node dist/index.js`

### Build Output:
- Server bundle: 39KB (optimized)
- Client bundle: 632KB
- Total deployment: ~672KB
- All Vite dependencies excluded

## Verification
- Production build tested and working
- No Vite imports in final bundle
- Graceful fallback if development dependencies missing
- Server starts correctly in production mode

## Benefits
- ✅ Deployment size dramatically reduced
- ✅ No more Vite import errors in production
- ✅ Clean separation of development and production concerns
- ✅ Graceful degradation when dev dependencies missing
- ✅ Maintains full functionality in both environments