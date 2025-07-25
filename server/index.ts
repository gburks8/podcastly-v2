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

  // Health check endpoint for deployment
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Simple static file serving for all environments
  setupStaticServing(app);

  function setupStaticServing(app: express.Express) {
    import("path").then(async (path) => {
      const fs = await import("fs");
      
      // Try development build first, then production
      const possiblePaths = [
        path.resolve(import.meta.dirname, "..", "client", "dist"),
        path.resolve(import.meta.dirname, "..", "dist", "public")
      ];
      
      let distPath: string | null = null;
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          distPath = testPath;
          break;
        }
      }
      
      if (distPath) {
        // Serve static files
        app.use(express.static(distPath));
        
        // Handle React routing - serve index.html for all non-API routes
        app.get("*", (_req: Request, res: Response) => {
          const indexPath = path.resolve(distPath!, "index.html");
          if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
          } else {
            res.status(404).json({ 
              error: "Frontend index.html not found" 
            });
          }
        });
        log(`Static file serving setup complete from: ${distPath}`);
      } else {
        log("No frontend build directory found");
        app.get("*", (_req: Request, res: Response) => {
          res.status(500).json({ 
            error: "Frontend not built. Run build command first.",
            searchedPaths: possiblePaths
          });
        });
      }
    }).catch((error) => {
      log("Static file serving setup failed: " + error.message);
      app.get("*", (_req: Request, res: Response) => {
        res.status(500).json({ 
          error: "Static file serving unavailable",
          details: error.message
        });
      });
    });
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
