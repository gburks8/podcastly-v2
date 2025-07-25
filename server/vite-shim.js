// Production shim for vite.ts to prevent import errors
// This file is used when Vite is not available in production

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
  // No-op in production
  log("Vite setup skipped in production mode");
}

export function serveStatic(app) {
  // No-op - handled by main server
  log("Static serving handled by main server in production");
}