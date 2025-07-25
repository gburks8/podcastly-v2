import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import session from 'express-session';
import ConnectPgSimple from 'connect-pg-simple';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import multer from 'multer';
import { nanoid } from 'nanoid';
import Stripe from 'stripe';
import sgMail from '@sendgrid/mail';
import { z } from 'zod';
import { eq, desc, and } from 'drizzle-orm';
import { users, content, projects, downloads, packages, packagePurchases } from './shared/schema.js';
import { createInsertSchema } from 'drizzle-zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Database setup
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// SendGrid setup
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Session store
const PgSession = ConnectPgSimple(session);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session configuration
app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (user.length === 0) {
      return done(null, false);
    }
    
    const isValid = await bcrypt.compare(password, user[0].passwordHash);
    if (!isValid) {
      return done(null, false);
    }
    
    return done(null, user[0]);
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
    done(null, user[0] || null);
  } catch (error) {
    done(error);
  }
});

// Serve static files
app.use(express.static(join(__dirname, 'public')));

// Basic API routes
app.get('/api/user', (req, res) => {
  if (req.user) {
    res.json({ id: req.user.id, email: req.user.email });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userProjects = await db.select().from(projects).where(eq(projects.userId, req.user.id));
    res.json(userProjects);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/content', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userContent = await db.select().from(content).where(eq(content.userId, req.user.id));
    res.json(userContent);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/downloads/history', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userDownloads = await db.select().from(downloads).where(eq(downloads.userId, req.user.id));
    res.json(userDownloads);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Catch-all handler for client-side routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});