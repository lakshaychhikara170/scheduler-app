import React, { createContext, useContext, useState, useEffect } from 'react';
import api from './api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('scheduler_token');
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data);
          // Populate userName from server if local pref is still the default
          try {
            const saved = localStorage.getItem('scheduler_prefs');
            const parsed = saved ? JSON.parse(saved) : null;
            if (parsed && (!parsed.userName || parsed.userName === 'User') && res.data.name) {
              parsed.userName = res.data.name;
              localStorage.setItem('scheduler_prefs', JSON.stringify(parsed));
            }
          } catch (e) { /* ignore */ }
        })
        .catch(() => {
          localStorage.removeItem('scheduler_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('scheduler_token', res.data.accessToken);
    const userData = res.data.user;
    setUser(userData);
    // Populate userName from server if local pref is still the default
    try {
      const saved = localStorage.getItem('scheduler_prefs');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && (!parsed.userName || parsed.userName === 'User') && userData.name) {
        parsed.userName = userData.name;
        localStorage.setItem('scheduler_prefs', JSON.stringify(parsed));
      }
    } catch (e) { /* ignore */ }
  };

  const register = async (email, password, name) => {
    const res = await api.post('/auth/register', { email, password, name });
    localStorage.setItem('scheduler_token', res.data.accessToken);
    const userData = res.data.user;
    setUser(userData);
    // Populate userName from the registration name
    try {
      const saved = localStorage.getItem('scheduler_prefs');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && userData.name) {
        parsed.userName = parsed.userName && parsed.userName !== 'User' ? parsed.userName : userData.name;
        localStorage.setItem('scheduler_prefs', JSON.stringify(parsed));
      }
    } catch (e) { /* ignore */ }
  };

  const logout = () => {
    localStorage.removeItem('scheduler_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
