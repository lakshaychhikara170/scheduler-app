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
app.use(cors());
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
