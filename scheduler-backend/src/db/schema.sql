-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(2))) || lower(hex(randomblob(6)))),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(2))) || lower(hex(randomblob(6)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  all_day BOOLEAN DEFAULT 0,
  color TEXT DEFAULT '#3B82F6',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),

  is_recurring BOOLEAN DEFAULT 0,
  recurrence_rule TEXT CHECK (recurrence_rule IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly', NULL)),
  recurrence_end_date DATETIME,
  recurrence_count INTEGER,
  parent_event_id TEXT REFERENCES events(id) ON DELETE CASCADE,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(2))) || lower(hex(randomblob(6)))),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  remind_at DATETIME NOT NULL,
  method TEXT DEFAULT 'push' CHECK (method IN ('push', 'email', 'sms')),
  minutes_before INTEGER NOT NULL,
  sent BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(2))) || lower(hex(randomblob(6)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_parent_id ON events(parent_event_id);
CREATE INDEX IF NOT EXISTS idx_reminders_event_id ON reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at) WHERE sent = 0;
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
