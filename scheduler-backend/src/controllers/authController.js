const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/pool');

const ACCESS_TOKEN_TTL = '30d';
const REFRESH_TOKEN_TTL_DAYS = 30;

const generateTokens = async (user) => {
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );

  const refreshToken = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  await db.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, refreshToken, expiresAt]
  );

  return { accessToken, refreshToken };
};

const register = async (req, res) => {
  const { email, password, name, timezone = 'UTC' } = req.body;
  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.query(
      'INSERT INTO users (email, password_hash, name, timezone) VALUES ($1, $2, $3, $4) RETURNING id, email, name, timezone, created_at',
      [email.toLowerCase(), passwordHash, name, timezone]
    );

    const user = result.rows[0];
    const tokens = await generateTokens(user);

    res.status(201).json({ user, ...tokens });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query(
      'SELECT id, email, name, timezone, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const { password_hash, ...safeUser } = user;
    const tokens = await generateTokens(safeUser);

    res.json({ user: safeUser, ...tokens });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const result = await db.query(
      'SELECT rt.user_id, rt.expires_at, u.email FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE rt.token = $1',
      [refreshToken]
    );

    const row = result.rows[0];
    if (!row) return res.status(401).json({ error: 'Invalid refresh token' });
    if (new Date(row.expires_at) < new Date()) {
      await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    const tokens = await generateTokens({ id: row.user_id, email: row.email });
    res.json(tokens);
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
  }
  res.json({ message: 'Logged out successfully' });
};

const getMe = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, name, timezone, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

const updateMe = async (req, res) => {
  const { name, timezone, push_topic } = req.body;
  try {
    const result = await db.query(
      'UPDATE users SET name = COALESCE($1, name), timezone = COALESCE($2, timezone), push_topic = COALESCE($3, push_topic), updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, email, name, timezone, push_topic',
      [name, timezone, push_topic, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('UpdateMe error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

module.exports = { register, login, refresh, logout, getMe, updateMe };
