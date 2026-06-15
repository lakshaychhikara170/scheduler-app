/**
 * localStore.js — localStorage-based data store for goals (no-auth mode).
 * Mimics the backend API response shape so the rest of the app works unchanged.
 */

const KEY = 'scheduler_local_events';

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};

const save = (events) => {
  localStorage.setItem(KEY, JSON.stringify(events));
};

const randomId = () => crypto.randomUUID();

export const localStore = {
  getEvents(params = {}) {
    let events = load();
    if (params.type) {
      events = events.filter(e => e.recurrence_rule === params.type);
    }
    return { events };
  },

  createEvent(data) {
    const events = load();
    const newEvent = {
      id: randomId(),
      title: data.title || '',
      description: data.description || '',
      recurrence_rule: data.recurrence_rule || null,
      priority: data.priority || 'medium',
      color: data.color || '#3b82f6',
      start_time: data.start_time || new Date().toISOString(),
      end_time: data.end_time || new Date().toISOString(),
      status: 'active',
      attachments: data.attachments || '[]',
      is_recurring: data.is_recurring || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    events.push(newEvent);
    save(events);
    return { event: newEvent };
  },

  updateEvent(id, data) {
    const events = load();
    const idx = events.findIndex(e => e.id === id);
    if (idx !== -1) {
      events[idx] = { ...events[idx], ...data, updated_at: new Date().toISOString() };
      save(events);
      return { event: events[idx] };
    }
    return null;
  },

  deleteEvent(id) {
    const events = load().filter(e => e.id !== id);
    save(events);
    return true;
  },
};
