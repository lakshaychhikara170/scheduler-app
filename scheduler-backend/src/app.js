require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const { startReminderScheduler } = require('./utils/reminderScheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security & Parsing ───────────────────────────────────────────
app.use(helmet());

const allowedOrigins = [
  'https://scheduler-frontend-iota.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  // Allow any Vercel preview deployments for this project
  /https:\/\/scheduler-frontend.*\.vercel\.app$/,
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
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

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// ── Health check ─────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── DB Startup Migration ─────────────────────────────────────────
const db = require('./db/pool');
db.getClient().then(async client => {
  try {
    // Note: SQLite uses double quotes for string literals sometimes, but Postgres requires single quotes.
    // Also ensuring queries are compatible with both.
    await client.query("ALTER TABLE events ADD COLUMN attachments TEXT DEFAULT '[]'");
    await client.query('ALTER TABLE users ADD COLUMN push_topic TEXT');
    console.log('✅ Base migrations checked.');
  } catch (err) {
    // Ignore errors for existing columns
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
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Scheduler API running on port ${PORT}`);
  startReminderScheduler();
});

module.exports = app;
