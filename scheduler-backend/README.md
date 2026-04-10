# Scheduler Backend API

Full-featured REST API for a scheduler app built with **Node.js + Express + PostgreSQL**.

## Features
- 🔐 JWT auth with refresh tokens
- 📅 Full event CRUD with date range filtering
- 🔁 Recurring events (daily / weekly / biweekly / monthly / yearly)
- 🔔 Reminders with cron-based dispatch (push / email / SMS stubs)
- 🛡️ Input validation, CORS, Helmet security headers

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your values
cp .env.example .env

# 3. Create the database and run migrations
createdb scheduler_db
npm run db:migrate

# 4. Start dev server
npm run dev
```

---

## API Reference

### Auth

| Method | Endpoint            | Auth? | Description          |
|--------|---------------------|-------|----------------------|
| POST   | `/api/v1/auth/register` | ✗ | Register new user    |
| POST   | `/api/v1/auth/login`    | ✗ | Login & get tokens   |
| POST   | `/api/v1/auth/refresh`  | ✗ | Refresh access token |
| POST   | `/api/v1/auth/logout`   | ✗ | Invalidate tokens    |
| GET    | `/api/v1/auth/me`       | ✓ | Get current user     |
| PATCH  | `/api/v1/auth/me`       | ✓ | Update profile       |

### Events

| Method | Endpoint               | Auth? | Description                        |
|--------|------------------------|-------|------------------------------------|
| GET    | `/api/v1/events`       | ✓ | List events (supports `?start=&end=&status=`) |
| GET    | `/api/v1/events/upcoming` | ✓ | Next N events (`?limit=10`)     |
| GET    | `/api/v1/events/:id`   | ✓ | Get single event                   |
| POST   | `/api/v1/events`       | ✓ | Create event (+ inline reminders)  |
| PATCH  | `/api/v1/events/:id`   | ✓ | Update event (`update_scope: this\|all`) |
| DELETE | `/api/v1/events/:id`   | ✓ | Delete event (`?scope=this\|all`)  |

### Reminders

| Method | Endpoint                  | Auth? | Description          |
|--------|---------------------------|-------|----------------------|
| GET    | `/api/v1/reminders`       | ✓ | List pending reminders (optional `?event_id=`) |
| POST   | `/api/v1/reminders`       | ✓ | Add reminder to event |
| DELETE | `/api/v1/reminders/:id`   | ✓ | Delete reminder      |

---

## Example: Create a recurring event with reminders

```json
POST /api/v1/events
{
  "title": "Team standup",
  "start_time": "2026-04-07T09:00:00Z",
  "end_time": "2026-04-07T09:15:00Z",
  "is_recurring": true,
  "recurrence_rule": "daily",
  "recurrence_end_date": "2026-12-31T00:00:00Z",
  "reminders": [
    { "minutes_before": 10, "method": "push" },
    { "minutes_before": 60, "method": "email" }
  ]
}
```

## Adding Real Notifications

Edit `src/utils/reminderScheduler.js` and replace the stubs:
- **Email**: [Resend](https://resend.com) or [SendGrid](https://sendgrid.com)
- **SMS**: [Twilio](https://twilio.com)
- **Push**: [Firebase FCM](https://firebase.google.com/docs/cloud-messaging)
