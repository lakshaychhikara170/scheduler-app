import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { PreferencesProvider, usePreferences } from './PreferencesContext';
import Login from './components/Login';
import GoalList from './components/GoalList';
import RoamingBot from './components/RoamingBot';
import Settings from './components/Settings';
import CalendarView from './components/CalendarView';
import Home from './components/Home';
import { Target, CalendarDays, CalendarCheck, CalendarRange, Calendar, LogOut, Settings as SettingsIcon, Zap } from 'lucide-react';

const Sidebar = () => {
  const { logout, user } = useAuth();
  const { preferences } = usePreferences();
  const location = useLocation();

  const userName = preferences.userName || user?.name || 'User';
  const userAvatar = preferences.userAvatar;

  const links = [
    { name: 'Home', path: '/home', icon: Zap },
    { name: 'Calendar Overview', path: '/calendar', icon: Calendar },
    { name: 'Daily Goals', path: '/daily', icon: CalendarDays },
    { name: 'Weekly Goals', path: '/weekly', icon: CalendarCheck },
    { name: 'Monthly Goals', path: '/monthly', icon: CalendarRange },
    { name: 'Lifetime Goals', path: '/yearly', icon: Target },
  ];

  const bottomLinks = [
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <div 
      className="w-64 border-r flex flex-col shadow-2xl relative z-10 transition-colors duration-500"
      style={{ 
        backgroundColor: 'var(--sidebar-bg)',
        borderColor: 'var(--panel-border)'
      }}
    >
      <div className="p-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(var(--primary-rgb), 0.1)' }}>
            <Target className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          </div>
          <span style={{ color: 'var(--text-main)' }}>Scheduler</span>
        </h1>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1">
        {links.map(link => {
          const active = location.pathname.startsWith(link.path) || (location.pathname === '/' && link.path === '/daily');
          return (
            <Link
              key={link.name}
              to={link.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-300 ${
                active ? 'bg-primary shadow-[0_0_15px_rgba(59,130,246,0.3)] text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <link.icon className={`w-5 h-5 ${active ? 'text-white' : 'text-zinc-500'}`} />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-2 border-t border-white/5 space-y-1">
        {bottomLinks.map(link => {
          const active = location.pathname.startsWith(link.path);
          return (
            <Link
              key={link.name}
              to={link.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-300 ${
                active ? 'bg-primary shadow-[0_0_15px_rgba(59,130,246,0.3)] text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <link.icon className={`w-5 h-5 ${active ? 'text-white' : 'text-zinc-500'}`} />
              {link.name}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-zinc-800 bg-black/20">
        <div className="flex items-center justify-between gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/5 overflow-hidden flex-shrink-0">
            {userAvatar ? (
               <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
               <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold">
                 {userName.charAt(0)}
               </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{userName}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Authorized</p>
          </div>
          <button 
            onClick={logout}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const AppLayout = () => {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  
  if (!user) return <Login />;

  const isLight = preferences.appTheme === 'Light';
  const glassIntensity = preferences.glassIntensity ?? 20;
  const primary = preferences.themePrimary || '#3b82f6';
  const accent = preferences.themeAccent || '#8b5cf6';

  // Derive RGB components for use in rgba() expressions
  const hexToRgb = (hex) => {
    if (!hex) return '0,0,0';
    let h = hex.replace('#', '');
    if (h.length === 3) {
      h = h.split('').map(char => char + char).join('');
    }
    const r = parseInt(h.slice(0, 2), 16) || 0;
    const g = parseInt(h.slice(2, 4), 16) || 0;
    const b = parseInt(h.slice(4, 6), 16) || 0;
    return `${r},${g},${b}`;
  };

  useEffect(() => {
    const root = document.documentElement;
    if (isLight) {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    
    root.style.setProperty('--bg-app', isLight ? '#f8fafc' : '#030303');
    root.style.setProperty('--text-main', isLight ? '#0f172a' : '#f4f4f5');
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--primary-rgb', hexToRgb(primary));
    root.style.setProperty('--accent-rgb', hexToRgb(accent));
    root.style.setProperty('--glass-blur', `${glassIntensity}px`);
  }, [isLight, primary, accent, glassIntensity, hexToRgb]);

  return (
    <BrowserRouter>
      <div 
        className={`flex h-screen overflow-hidden relative transition-colors duration-500 ${isLight ? 'light' : ''}`}
        style={{
          '--bg-app': isLight ? '#f8fafc' : '#030303',
          '--text-main': isLight ? '#0f172a' : '#f4f4f5',
          '--glass-blur': `${glassIntensity}px`,
          '--primary': primary,
          '--accent': accent,
          '--primary-rgb': hexToRgb(primary),
          '--accent-rgb': hexToRgb(accent),
        }}
      >
        {/* Global theme gradients */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
           <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
           <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/15 blur-[120px] rounded-full" />
        </div>

        <RoamingBot />
        <Sidebar />
        <main className="flex-1 overflow-auto relative z-10">
          <div className="max-w-4xl mx-auto py-8 px-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Home />} />
              <Route path="/daily" element={<GoalList type="daily" />} />
              <Route path="/weekly" element={<GoalList type="weekly" />} />
              <Route path="/monthly" element={<GoalList type="monthly" />} />
              <Route path="/yearly" element={<GoalList type="yearly" />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
};

function App() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <AppLayout />
      </PreferencesProvider>
    </AuthProvider>
  );
}

export default App;
