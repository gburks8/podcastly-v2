import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import session from 'express-session';
import ConnectPgSimple from 'connect-pg-simple';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { eq, desc, and, sql } from 'drizzle-orm';
import { 
  pgTable, 
  text, 
  timestamp, 
  boolean, 
  integer, 
  decimal, 
  json,
  varchar
} from 'drizzle-orm/pg-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database Schema (embedded)
const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  isAdmin: boolean('is_admin').default(false),
  stripeCustomerId: text('stripe_customer_id'),
  hasPremiumAccess: boolean('has_premium_access').default(false),
  hasAdditional3Videos: boolean('has_additional_3_videos').default(false),
  hasAllRemainingContent: boolean('has_all_remaining_content').default(false),
  freeVideoSelections: text('free_video_selections').array().default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

const projects = pgTable('projects', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  name: text('name').notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

const content = pgTable('content', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull(), // 'video' or 'headshot'
  category: text('category').notNull(), // 'free' or 'premium'
  fileUrl: text('file_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  fileSizeBytes: integer('file_size_bytes'),
  durationSeconds: integer('duration_seconds'),
  aspectRatio: text('aspect_ratio'),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

const downloads = pgTable('downloads', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  contentId: text('content_id').references(() => content.id, { onDelete: 'cascade' }).notNull(),
  downloadedAt: timestamp('downloaded_at').defaultNow()
});

// Express App Setup
const app = express();
const PORT = process.env.PORT || 5000;

// Database setup
const dbSql = neon(process.env.DATABASE_URL);
const db = drizzle(dbSql);

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
app.use(express.static(join(__dirname, 'dist', 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Basic API routes
app.get('/api/user', (req, res) => {
  if (req.user) {
    res.json({ 
      id: req.user.id, 
      email: req.user.email,
      name: req.user.name,
      isAdmin: req.user.isAdmin || false
    });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

app.post('/api/auth/login', passport.authenticate('local'), (req, res) => {
  res.json({ 
    id: req.user.id, 
    email: req.user.email,
    name: req.user.name,
    isAdmin: req.user.isAdmin || false
  });
});

app.post('/api/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
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
  res.sendFile(join(__dirname, 'dist', 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Static files served from: ${join(__dirname, 'dist', 'public')}`);
  console.log(`🗄️ Database connected: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`);
});