const cron = require('node-cron');
const db = require('../db/pool');
const notifier = require('node-notifier');

/**
 * Runs every minute to check for due reminders.
 * In production, replace the console.log stubs with real
 * push notification / email / SMS dispatch logic.
 */
const startReminderScheduler = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const result = await db.query(
        `SELECT r.*, e.title, e.start_time, u.email as user_email, u.name as user_name
         FROM reminders r
         JOIN events e ON e.id = r.event_id
         JOIN users u ON u.id = r.user_id
         WHERE r.sent = FALSE
           AND e.status = 'active'
           AND r.remind_at <= datetime('now')
           AND r.remind_at >= datetime('now', '-5 minutes')`
      );

      if (result.rows.length === 0) return;

      for (const reminder of result.rows) {
        await dispatchReminder(reminder);
        await db.query('UPDATE reminders SET sent = TRUE WHERE id = $1', [reminder.id]);
      }
    } catch (err) {
      console.error('Reminder scheduler error:', err);
    }
  });

  console.log('✅ Reminder scheduler started (checks every minute)');
};

const dispatchReminder = async (reminder) => {
  const { title, start_time, minutes_before, push_topic } = reminder;
  const startFormatted = new Date(start_time).toLocaleString();

  const message = minutes_before === 0 
    ? `TASK OVERDUE: "${title}" | The deadline has passed!` 
    : `Upcoming: "${title}" at ${startFormatted}`;

  // OS Native Notification (Local)
  notifier.notify({
    title: `Scheduler: ${title}`,
    message,
    sound: true,
    wait: false
  });

  // Mobile Push (ntfy.sh)
  if (push_topic) {
    try {
      // Using fetch (Node 18+) or a basic https post
      await fetch(`https://ntfy.sh/${push_topic}`, {
        method: 'POST',
        body: message,
        headers: { 'Title': 'Scheduler Reminder', 'Priority': 'high', 'Tags': 'calendar' }
      });
      console.log(`[PUSH] Successfully sent to ntfy topic: ${push_topic}`);
    } catch (err) {
      console.error('[PUSH] Failed to send to ntfy:', err.message);
    }
  }

  console.log(`[LOG] Dispatching: ${message}`);
};

module.exports = { startReminderScheduler };
