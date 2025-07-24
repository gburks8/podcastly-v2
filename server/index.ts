import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";

// Conditional logging function that doesn't rely on Vite imports
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup appropriate serving mode based on environment
  if (app.get("env") === "development") {
    try {
      // Try to import the real vite module
      const viteModule = await import("./vite.js").catch(async () => {
        // Fallback to shim if vite module is not available
        return await import("./vite-shim.js");
      });
      await viteModule.setupVite(app, server);
      log("Vite development server setup complete");
    } catch (error) {
      log("Vite setup failed, falling back to static serving: " + (error as Error).message);
      setupProductionStaticServing(app);
    }
  } else {
    // Production mode - use static file serving
    setupProductionStaticServing(app);
  }

  function setupProductionStaticServing(app: express.Express) {
    try {
      import("path").then(async (path) => {
        const fs = await import("fs");
        
        const distPath = path.resolve(import.meta.dirname, "public");
        
        if (fs.existsSync(distPath)) {
          app.use(express.static(distPath));
          app.use("*", (_req: Request, res: Response) => {
            res.sendFile(path.resolve(distPath, "index.html"));
          });
          log("Production static file serving setup complete");
        } else {
          log("Build directory not found, serving error page");
          app.use("*", (_req: Request, res: Response) => {
            res.status(500).json({ 
              error: "Application not properly built. Please run the build process first." 
            });
          });
        }
      }).catch((error) => {
        log("Static file serving setup failed: " + error.message);
        app.use("*", (_req: Request, res: Response) => {
          res.status(500).json({ 
            error: "Static file serving unavailable" 
          });
        });
      });
    } catch (error) {
      log("Static file serving setup failed: " + (error as Error).message);
      app.use("*", (_req: Request, res: Response) => {
        res.status(500).json({ 
          error: "Static file serving unavailable" 
        });
      });
    }
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
