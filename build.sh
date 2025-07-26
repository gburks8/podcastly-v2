#!/bin/bash

echo "Cleaning previous build..."
rm -rf dist

echo "Compiling TypeScript..."
tsc

echo "Copying server entry to expected location..."
mkdir -p dist/server
cp server/index.js dist/server/index.js

echo "✅ Build completed successfully."