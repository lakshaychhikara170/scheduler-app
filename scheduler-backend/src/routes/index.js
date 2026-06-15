const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const auth = require('../controllers/authController');
const events = require('../controllers/eventsController');
const reminders = require('../controllers/remindersController');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// ── Simple in-memory rate limiter (no extra deps needed) ─────────────────────
const rateLimitStore = new Map();

const makeRateLimiter = (max, windowMs, message) => (req, res, next) => {
  const key = req.ip + req.path;
  const now = Date.now();
  const record = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }
  record.count++;
  rateLimitStore.set(key, record);

  const remaining = Math.max(0, max - record.count);
  res.setHeader('X-RateLimit-Limit', max);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

  if (record.count > max) {
    return res.status(429).json({ error: message });
  }
  next();
};

const loginLimiter    = makeRateLimiter(10, 15 * 60 * 1000, 'Too many login attempts. Please try again in 15 minutes.');
const registerLimiter = makeRateLimiter(5,  60 * 60 * 1000, 'Too many registration attempts. Please try again later.');
const refreshLimiter  = makeRateLimiter(20, 15 * 60 * 1000, 'Too many token refresh attempts.');

// ── Auth Routes ──────────────────────────────────────────────────
router.post('/auth/register', registerLimiter, [
  body('email').isEmail().normalizeEmail().isLength({ max: 254 }),
  body('password').isLength({ min: 8, max: 128 }),
  body('name').trim().notEmpty().isLength({ min: 1, max: 100 }),
  body('timezone').optional().isString().isLength({ max: 50 }),
], validate, auth.register);

router.post('/auth/login', loginLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().isLength({ max: 128 }),
], validate, auth.login);

router.post('/auth/refresh', refreshLimiter, [
  body('refreshToken').notEmpty().isString(),
], validate, auth.refresh);

router.post('/auth/logout', auth.logout);

router.get('/auth/me', authenticate, auth.getMe);
router.patch('/auth/me', authenticate, [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('timezone').optional().isString().isLength({ max: 50 }),
], validate, auth.updateMe);

// ── Events Routes ────────────────────────────────────────────────
router.get('/events', authenticate, [
  query('start').optional().isISO8601(),
  query('end').optional().isISO8601(),
  query('status').optional().isIn(['active', 'cancelled', 'completed']),
], validate, events.getEvents);

router.get('/events/upcoming', authenticate, [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
], validate, events.getUpcoming);

router.get('/events/:id', authenticate, [
  param('id').isString().isLength({ max: 100 }),
], validate, events.getEvent);

router.post('/events', authenticate, [
  body('title').trim().notEmpty().isLength({ min: 1, max: 500 }),
  body('description').optional().isString().isLength({ max: 5000 }),
  body('location').optional().isString().isLength({ max: 500 }),
  body('start_time').isISO8601(),
  body('end_time').isISO8601(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('is_recurring').optional().isBoolean(),
  body('recurrence_rule').optional().isIn(['daily', 'weekly', 'biweekly', 'monthly', 'yearly', 'lifetime']),
  body('reminders').optional().isArray({ max: 10 }),
  body('reminders.*.minutes_before').optional().isInt({ min: 0, max: 43200 }),
  body('reminders.*.method').optional().isIn(['push', 'email', 'sms']),
], validate, events.createEvent);

router.patch('/events/:id', authenticate, [
  param('id').isString().isLength({ max: 100 }),
  body('title').optional().trim().notEmpty().isLength({ max: 500 }),
  body('description').optional().isString().isLength({ max: 5000 }),
  body('location').optional().isString().isLength({ max: 500 }),
  body('start_time').optional().isISO8601(),
  body('end_time').optional().isISO8601(),
  body('update_scope').optional().isIn(['this', 'all']),
], validate, events.updateEvent);

router.delete('/events/:id', authenticate, [
  param('id').isString().isLength({ max: 100 }),
  query('scope').optional().isIn(['this', 'all']),
], validate, events.deleteEvent);

// ── Reminders Routes ─────────────────────────────────────────────
router.get('/reminders', authenticate, reminders.getReminders);

router.post('/reminders', authenticate, [
  body('event_id').isString().isLength({ max: 100 }),
  body('minutes_before').isInt({ min: 1, max: 43200 }),
  body('method').optional().isIn(['push', 'email', 'sms']),
], validate, reminders.createReminder);

router.delete('/reminders/:id', authenticate, [
  param('id').isString().isLength({ max: 100 }),
], validate, reminders.deleteReminder);

module.exports = router;
