const db = require('../db/pool');

// Generate recurring event instances
const generateRecurringInstances = (baseEvent, startRange, endRange) => {
  const instances = [];
  const { recurrence_rule, recurrence_end_date, recurrence_count } = baseEvent;
  const duration = new Date(baseEvent.end_time) - new Date(baseEvent.start_time);

  let current = new Date(baseEvent.start_time);
  let count = 0;
  const maxEnd = recurrence_end_date ? new Date(recurrence_end_date) : endRange;

  const advance = (date) => {
    const d = new Date(date);
    switch (recurrence_rule) {
      case 'daily':   d.setDate(d.getDate() + 1); break;
      case 'weekly':  d.setDate(d.getDate() + 7); break;
      case 'biweekly':d.setDate(d.getDate() + 14); break;
      case 'monthly': d.setMonth(d.getMonth() + 1); break;
      case 'yearly':  d.setFullYear(d.getFullYear() + 1); break;
    }
    return d;
  };

  // Skip past instances before range
  while (current < startRange) {
    current = advance(current);
    count++;
    if (recurrence_count && count >= recurrence_count) return instances;
  }

  while (current <= endRange && current <= maxEnd) {
    if (recurrence_count && count >= recurrence_count) break;
    instances.push({
      ...baseEvent,
      start_time: current.toISOString(),
      end_time: new Date(current.getTime() + duration).toISOString(),
      is_instance: true,
    });
    current = advance(current);
    count++;
  }

  return instances;
};

const getEvents = async (req, res) => {
  const { start, end, status } = req.query;
  try {
    let q = `
      SELECT id, user_id, title, description, location, start_time, end_time, all_day, color, status, is_recurring, recurrence_rule, recurrence_end_date, recurrence_count, parent_event_id, created_at, updated_at
      FROM events
      WHERE user_id = $1
        AND parent_event_id IS NULL
        AND ($2 IS NULL OR start_time >= $2)
        AND ($3 IS NULL OR start_time <= $3)
        AND ($4 IS NULL OR status = $4)
      ORDER BY start_time ASC
    `;
    const result = await db.query(q, [req.user.id, start || null, end || null, status || null]);

    let events = result.rows;

    // Expand recurring events within range
    if (start && end) {
      const startRange = new Date(start);
      const endRange = new Date(end);
      const expanded = [];

      for (const event of events) {
        expanded.push(event);
        if (event.is_recurring) {
          const instances = generateRecurringInstances(event, startRange, endRange);
          // Skip the original if it falls outside range
          expanded.push(...instances.slice(1));
        }
      }
      events = expanded;
    }

    res.json({ events, count: events.length });
  } catch (err) {
    console.error('getEvents error:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

const getEvent = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM events WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch event' });
  }
};

const createEvent = async (req, res) => {
    const {
      title, description, location, start_time, end_time,
      all_day, color, is_recurring, recurrence_rule,
      recurrence_end_date, recurrence_count, reminders = [],
      attachments = '[]'
    } = req.body;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const eventResult = await client.query(
        `INSERT INTO events (user_id, title, description, location, start_time, end_time,
          all_day, color, is_recurring, recurrence_rule, recurrence_end_date, recurrence_count, attachments)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [req.user.id, title, description, location, start_time, end_time,
         all_day, color, is_recurring, recurrence_rule, recurrence_end_date, recurrence_count, typeof attachments === 'string' ? attachments : JSON.stringify(attachments)]
      );

    const event = eventResult.rows[0];

    // Create reminders
    const createdReminders = [];
    for (const reminder of reminders) {
      const remindAt = new Date(new Date(start_time).getTime() - reminder.minutes_before * 60000);
      const r = await client.query(
        `INSERT INTO reminders (event_id, user_id, remind_at, method, minutes_before)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [event.id, req.user.id, remindAt, reminder.method || 'push', reminder.minutes_before]
      );
      createdReminders.push(r.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({ ...event, reminders: createdReminders });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createEvent error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  } finally {
    client.release();
  }
};

const updateEvent = async (req, res) => {
  const {
    title, description, location, start_time, end_time,
    all_day, color, status, is_recurring, recurrence_rule,
    recurrence_end_date, recurrence_count, update_scope = 'this',
    attachments
  } = req.body;

  const serializedAttachments = attachments !== undefined 
    ? (typeof attachments === 'string' ? attachments : JSON.stringify(attachments)) 
    : undefined;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Verify ownership
    const existing = await client.query(
      'SELECT * FROM events WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!existing.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    let result;

    if (update_scope === 'all' && existing.rows[0].is_recurring) {
      // Update all future instances by updating parent
      result = await client.query(
        `UPDATE events SET
          title = COALESCE($1, title), description = COALESCE($2, description),
          location = COALESCE($3, location), start_time = COALESCE($4, start_time),
          end_time = COALESCE($5, end_time), all_day = COALESCE($6, all_day),
          color = COALESCE($7, color), status = COALESCE($8, status),
          recurrence_rule = COALESCE($9, recurrence_rule),
          recurrence_end_date = COALESCE($10, recurrence_end_date),
          recurrence_count = COALESCE($11, recurrence_count),
          attachments = COALESCE($12, attachments),
          updated_at = NOW()
        WHERE id = $13 AND user_id = $14 RETURNING *`,
        [title, description, location, start_time, end_time, all_day, color, status,
         recurrence_rule, recurrence_end_date, recurrence_count, serializedAttachments, req.params.id, req.user.id]
      );
    } else {
      result = await client.query(
        `UPDATE events SET
          title = COALESCE($1, title), description = COALESCE($2, description),
          location = COALESCE($3, location), start_time = COALESCE($4, start_time),
          end_time = COALESCE($5, end_time), all_day = COALESCE($6, all_day),
          color = COALESCE($7, color), status = COALESCE($8, status),
          attachments = COALESCE($9, attachments),
          updated_at = NOW()
        WHERE id = $10 AND user_id = $11 RETURNING *`,
        [title, description, location, start_time, end_time, all_day, color, status,
         serializedAttachments, req.params.id, req.user.id]
      );
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('updateEvent error:', err);
    res.status(500).json({ error: 'Failed to update event' });
  } finally {
    client.release();
  }
};

const deleteEvent = async (req, res) => {
  const { scope = 'this' } = req.query;
  try {
    const existing = await db.query(
      'SELECT * FROM events WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!existing.rows[0]) return res.status(404).json({ error: 'Event not found' });

    if (scope === 'all') {
      // Delete parent and all children
      const parentId = existing.rows[0].parent_event_id || existing.rows[0].id;
      await db.query('DELETE FROM events WHERE id = $1 OR parent_event_id = $1', [parentId]);
    } else {
      await db.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('deleteEvent error:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

const getUpcoming = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  try {
    const result = await db.query(
      `SELECT e.id, e.title, e.start_time, e.color, e.status, array_agg(json_build_object('id', r.id, 'remind_at', r.remind_at, 'method', r.method)) 
         FILTER (WHERE r.id IS NOT NULL) as reminders
       FROM events e
       LEFT JOIN reminders r ON r.event_id = e.id AND r.sent = FALSE
       WHERE e.user_id = $1 AND e.start_time >= NOW() AND e.status = 'active'
       GROUP BY e.id
       ORDER BY e.start_time ASC
       LIMIT $2`,
      [req.user.id, limit]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
};

module.exports = { getEvents, getEvent, createEvent, updateEvent, deleteEvent, getUpcoming };
