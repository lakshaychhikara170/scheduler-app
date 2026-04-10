const db = require('../db/pool');

const getReminders = async (req, res) => {
  const { event_id } = req.query;
  try {
    let q, params;
    if (event_id) {
      q = `SELECT r.* FROM reminders r
           JOIN events e ON e.id = r.event_id
           WHERE r.event_id = $1 AND r.user_id = $2
           ORDER BY r.remind_at ASC`;
      params = [event_id, req.user.id];
    } else {
      q = `SELECT r.*, e.title as event_title, e.start_time as event_start
           FROM reminders r
           JOIN events e ON e.id = r.event_id
           WHERE r.user_id = $1 AND r.sent = FALSE AND r.remind_at >= NOW()
           ORDER BY r.remind_at ASC`;
      params = [req.user.id];
    }
    const result = await db.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
};

const createReminder = async (req, res) => {
  const { event_id, minutes_before, method = 'push' } = req.body;
  try {
    // Verify event ownership
    const event = await db.query(
      'SELECT id, start_time FROM events WHERE id = $1 AND user_id = $2',
      [event_id, req.user.id]
    );
    if (!event.rows[0]) return res.status(404).json({ error: 'Event not found' });

    const remindAt = new Date(new Date(event.rows[0].start_time).getTime() - minutes_before * 60000);

    const result = await db.query(
      `INSERT INTO reminders (event_id, user_id, remind_at, method, minutes_before)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [event_id, req.user.id, remindAt, method, minutes_before]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create reminder' });
  }
};

const deleteReminder = async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM reminders WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Reminder not found' });
    res.json({ message: 'Reminder deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
};

module.exports = { getReminders, createReminder, deleteReminder };
