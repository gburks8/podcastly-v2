import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";
import fs from "fs";

// Production-only logging function (no Vite dependencies)
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

  // Production-only static file serving (NO Vite references)
  function setupProductionStaticServing() {
    const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
    
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
  }

  // PRODUCTION MODE: Always use static file serving (NO Vite dependencies)
  setupProductionStaticServing();

  // ALWAYS serve the app on port 5000
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`MediaPro serving on port ${port} (production mode - Vite-free)`);
  });
})();