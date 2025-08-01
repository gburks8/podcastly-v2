import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage.js";
import { User as SelectUser } from "../shared/schema.js";
import connectPg from "connect-pg-simple";
import { pool } from "./db.js";
import { nanoid } from "nanoid";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const PostgresSessionStore = connectPg(session);
  
  // Create session store with error handling
  let sessionStore;
  try {
    sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: false,
      tableName: 'session',
      schemaName: 'public',
    });
  } catch (error) {
    console.warn('Failed to create PostgreSQL session store, falling back to memory store:', error);
    // Fallback to memory store for development
    sessionStore = undefined;
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: false, // Disable secure for development to ensure cookies work
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      sameSite: 'lax' // Add sameSite attribute for better compatibility
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password'
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !user.password || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: 'Invalid email or password' });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        id: nanoid(),
        email,
        password: hashedPassword,
        firstName,
        lastName,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Login failed" });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    const user = req.user;
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      needsPasswordSetup: user.needsPasswordSetup,
    });
  });

  // Admin password reset endpoint
  app.post("/api/admin/reset-password", isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user;
      if (!currentUser || !currentUser.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId, newPassword } = req.body;
      if (!userId || !newPassword) {
        return res.status(400).json({ message: "User ID and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(userId, hashedPassword);

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // User password setup endpoint (for first-time login)
  app.post("/api/setup-password", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const { newPassword } = req.body;

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!newPassword) {
        return res.status(400).json({ message: "New password is required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Only allow if user needs password setup
      if (!user.needsPasswordSetup) {
        return res.status(400).json({ message: "Password already set up" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.setupUserPassword(user.id, hashedPassword);

      res.json({ message: "Password set up successfully" });
    } catch (error) {
      console.error("Password setup error:", error);
      res.status(500).json({ message: "Failed to set up password" });
    }
  });
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: any, res: any, next: any) {
  console.log('🔐 Auth check:', {
    isAuthenticated: req.isAuthenticated?.(),
    user: req.user ? { id: req.user.id, email: req.user.email } : null,
    sessionID: req.sessionID,
    url: req.url
  });
  
  if (req.isAuthenticated()) {
    return next();
  }
  console.log('❌ Authentication failed for:', req.url);
  res.status(401).json({ message: "Unauthorized" });
}