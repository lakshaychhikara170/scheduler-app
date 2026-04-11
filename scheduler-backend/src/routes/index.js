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

// ── Auth Routes ──────────────────────────────────────────────────
router.post('/auth/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().notEmpty(),
  body('timezone').optional().isString(),
], validate, auth.register);

router.post('/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], validate, auth.login);

router.post('/auth/refresh', [
  body('refreshToken').notEmpty(),
], validate, auth.refresh);

router.post('/auth/logout', auth.logout);

router.get('/auth/me', authenticate, auth.getMe);
router.patch('/auth/me', authenticate, [
  body('name').optional().trim().notEmpty(),
  body('timezone').optional().isString(),
], validate, auth.updateMe);

// ── Events Routes ────────────────────────────────────────────────
router.get('/events', authenticate, [
  query('start').optional().isISO8601(),
  query('end').optional().isISO8601(),
  query('status').optional().isIn(['active', 'cancelled', 'completed']),
], validate, events.getEvents);

router.get('/events/upcoming', authenticate, events.getUpcoming);

router.get('/events/:id', authenticate, [
  param('id').isString(),
], validate, events.getEvent);

router.post('/events', authenticate, [
  body('title').trim().notEmpty(),
  body('start_time').isISO8601(),
  body('end_time').isISO8601(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('is_recurring').optional().isBoolean(),
  body('recurrence_rule').optional().isIn(['daily', 'weekly', 'biweekly', 'monthly', 'yearly', 'lifetime']),
  body('reminders').optional().isArray(),
  body('reminders.*.minutes_before').optional().isInt({ min: 0 }),
  body('reminders.*.method').optional().isIn(['push', 'email', 'sms']),
], validate, events.createEvent);

router.patch('/events/:id', authenticate, [
  param('id').isString(),
  body('start_time').optional().isISO8601(),
  body('end_time').optional().isISO8601(),
  body('update_scope').optional().isIn(['this', 'all']),
], validate, events.updateEvent);

router.delete('/events/:id', authenticate, [
  param('id').isString(),
  query('scope').optional().isIn(['this', 'all']),
], validate, events.deleteEvent);

// ── Reminders Routes ─────────────────────────────────────────────
router.get('/reminders', authenticate, reminders.getReminders);

router.post('/reminders', authenticate, [
  body('event_id').isString(),
  body('minutes_before').isInt({ min: 1 }),
  body('method').optional().isIn(['push', 'email', 'sms']),
], validate, reminders.createReminder);

router.delete('/reminders/:id', authenticate, [
  param('id').isString(),
], validate, reminders.deleteReminder);

module.exports = router;
