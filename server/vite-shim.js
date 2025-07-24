/**
 * Vite shim for production environments
 * Provides fallback functionality when Vite is not available
 */

export async function setupVite(app, server) {
  console.log('Vite shim: Development mode detected but Vite not available');
  
  // Fallback to static serving when Vite is not available
  const path = await import('path');
  const fs = await import('fs');
  const express = await import('express');
  
  const distPath = path.resolve(import.meta.dirname, '..', 'dist', 'public');
  
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log('Vite shim: Static file serving enabled');
  } else {
    app.use('*', (req, res) => {
      res.status(500).json({ 
        error: 'Development server not available and no build found' 
      });
    });
    console.log('Vite shim: No build found, serving error responses');
  }
}