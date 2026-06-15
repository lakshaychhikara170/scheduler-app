require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const routes = require('./routes');
const { startReminderScheduler } = require('./utils/reminderScheduler');

// ── Require JWT_SECRET ──────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Set it in Vercel environment variables or your .env file.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// ── Security & Parsing ───────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow images from external sources
}));

// Trust proxy (needed for rate limiting behind Vercel/Nginx)
app.set('trust proxy', 1);

const allowedOrigins = [
  'https://scheduler-frontend-iota.vercel.app',
  // Tighter regex: only allow exact project preview URLs (prevents subdomain spoofing)
  /^https:\/\/scheduler-frontend-[a-z0-9-]+\.vercel\.app$/,
  // Allow localhost only in development
  ...(isProd ? [] : ['http://localhost:5173', 'http://localhost:3000']),
];

app.use(cors({
  origin: (origin, callback) => {
    // Block requests with no origin in production (e.g. suspicious server-to-server)
    if (!origin) {
      if (isProd) return callback(new Error('CORS: No origin header'));
      return callback(null, true); // Allow no-origin in dev (curl, Postman etc)
    }
    const allowed = allowedOrigins.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    if (allowed) return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Global rate limiter (all routes) ────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ── Health check ─────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── DB Startup Migration ─────────────────────────────────────────
const db = require('./db/pool');
const isPostgres = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);

db.getClient().then(async client => {
  try {
    if (isPostgres) {
      // Auto-create all tables for Postgres (Vercel) using IF NOT EXISTS
      await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          timezone TEXT DEFAULT 'UTC',
          push_topic TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          location TEXT,
          start_time TIMESTAMPTZ NOT NULL,
          end_time TIMESTAMPTZ NOT NULL,
          all_day BOOLEAN DEFAULT FALSE,
          color TEXT DEFAULT '#3B82F6',
          status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
          attachments TEXT DEFAULT '[]',
          is_recurring BOOLEAN DEFAULT FALSE,
          recurrence_rule TEXT CHECK (recurrence_rule IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly', 'lifetime', NULL)),
          recurrence_end_date TIMESTAMPTZ,
          recurrence_count INTEGER,
          parent_event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS reminders (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
          event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          remind_at TIMESTAMPTZ NOT NULL,
          method TEXT DEFAULT 'push' CHECK (method IN ('push', 'email', 'sms')),
          minutes_before INTEGER NOT NULL,
          sent BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Indexes
      await client.query(`CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_reminders_event_id ON reminders(event_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`);

      console.log('✅ Postgres schema initialized successfully.');
    } else {
      // SQLite: only try to add columns that may be missing
      await client.query("ALTER TABLE events ADD COLUMN attachments TEXT DEFAULT '[]'");
      await client.query('ALTER TABLE users ADD COLUMN push_topic TEXT');
      console.log('✅ SQLite migrations checked.');
    }
  } catch (err) {
    if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
      console.error('⚠️ Schema migration error:', err.message);
    }
  } finally {
    client.release();
  }
});

// ── API Routes ───────────────────────────────────────────────────
app.use('/api/v1', routes);

// ── 404 handler ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  // Never leak stack traces or internal error details to clients
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) console.error('Unhandled error:', err);
  else console.error('Unhandled error:', err.message); // Only log message in prod
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Scheduler API running on port ${PORT}`);
  startReminderScheduler();
});

module.exports = app;
