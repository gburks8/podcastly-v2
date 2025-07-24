// Minimal Vite shim for production deployment
// This file is used when the real vite.ts is not available

export function log(message, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app, server) {
  throw new Error('Vite is not available in production mode. Use static file serving instead.');
}

export function serveStatic(app) {
  throw new Error('Use setupProductionStaticServing instead');
}