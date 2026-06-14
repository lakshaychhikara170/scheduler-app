import axios from 'axios';
import { localStore } from './localStore';

// Use VITE_API_URL from environment, fallback to localhost for development
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('scheduler_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Local-mode helpers (no token = use localStorage) ─────────────────────────

/**
 * Returns a mock axios-like response wrapping local data.
 */
const localResponse = (data) => ({ data, status: 200, statusText: 'OK' });

/**
 * Intercept outgoing requests and serve from localStorage when unauthenticated.
 * Only intercepts /events routes — auth and other routes pass through.
 */
const _get = api.get.bind(api);
const _post = api.post.bind(api);
const _patch = api.patch.bind(api);
const _delete = api.delete.bind(api);

api.get = (url, config) => {
  const token = localStorage.getItem('scheduler_token');
  if (!token && url.startsWith('/events')) {
    const params = config?.params || {};
    // Parse ?type=daily etc from the url string too
    const typeMatch = url.match(/[?&]type=([^&]+)/);
    if (typeMatch) params.type = typeMatch[1];
    return Promise.resolve(localResponse(localStore.getEvents(params)));
  }
  return _get(url, config);
};

api.post = (url, data, config) => {
  const token = localStorage.getItem('scheduler_token');
  if (!token && url.startsWith('/events')) {
    return Promise.resolve(localResponse(localStore.createEvent(data)));
  }
  return _post(url, data, config);
};

api.patch = (url, data, config) => {
  const token = localStorage.getItem('scheduler_token');
  if (!token && url.startsWith('/events/')) {
    const id = url.split('/events/')[1].split('?')[0];
    return Promise.resolve(localResponse(localStore.updateEvent(id, data)));
  }
  // Silently ignore auth/me patch when no token
  if (!token && url.startsWith('/auth/')) {
    return Promise.resolve(localResponse({}));
  }
  return _patch(url, data, config);
};

api.delete = (url, config) => {
  const token = localStorage.getItem('scheduler_token');
  if (!token && url.startsWith('/events/')) {
    const id = url.split('/events/')[1].split('?')[0];
    localStore.deleteEvent(id);
    return Promise.resolve(localResponse({}));
  }
  return _delete(url, config);
};

export default api;
