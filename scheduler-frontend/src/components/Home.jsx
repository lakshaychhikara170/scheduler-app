import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usePreferences } from '../PreferencesContext';
import { useAuth } from '../AuthContext';
import api from '../api';
import {
  Target, CheckCircle2, Clock, TrendingUp, CalendarDays, 
  CalendarCheck, CalendarRange, ArrowRight, Zap, Star,
  AlertCircle, Plus, Sparkles, Activity
} from 'lucide-react';

// ── Helpers ─────────────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5)  return { text: 'Still up?', emoji: '🌙' };
  if (h < 12) return { text: 'Good morning', emoji: '☀️' };
  if (h < 17) return { text: 'Good afternoon', emoji: '🌤️' };
  if (h < 21) return { text: 'Good evening', emoji: '🌆' };
  return { text: 'Good night', emoji: '🌙' };
};

const motivationalLines = [
  "Every big journey starts with a single task. Let's go! 🚀",
  "You're capable of more than you think. Prove it today.",
  "Small steps consistently beat giant leaps sporadically.",
  "The only bad workout is the one that didn't happen. Same with goals.",
  "Today's effort is tomorrow's head start.",
  "Your future self is watching. Don't let them down 👀",
];

export default function Home() {
  const { preferences } = usePreferences();
  const { user } = useAuth();
  const [stats, setStats] = useState({ daily: {}, weekly: {}, monthly: {}, yearly: {} });
  const [overdue, setOverdue] = useState([]);
  const [today, setToday] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quote] = useState(() => motivationalLines[new Date().getDay() % motivationalLines.length]);
  const greeting = getGreeting();
  const userName = preferences.userName || user?.name || 'there';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const types = ['daily', 'weekly', 'monthly', 'yearly'];
      const results = await Promise.all(types.map(t => api.get(`/events?type=${t}`)));
      const newStats = {};
      const overdueGoals = [];
      const todayGoals = [];
      const now = new Date();

      types.forEach((type, i) => {
        const goals = (results[i].data && results[i].data.events) || [];
        const completed = goals.filter(g => g.status === 'completed').length;
        newStats[type] = { total: goals.length, completed, pct: goals.length ? Math.round((completed / goals.length) * 100) : 0 };

        goals.filter(g => g.status !== 'completed').forEach(g => {
          if (g.start_time) {
            const dl = new Date(g.start_time);
            if (dl < now) overdueGoals.push({ ...g, type });
            else if (dl - now < 86400000) todayGoals.push({ ...g, type });
          } else if (type === 'daily') {
            todayGoals.push({ ...g, type });
          }
        });
      });

      setStats(newStats);
      setOverdue(overdueGoals.slice(0, 4));
      setToday(todayGoals.slice(0, 5));
    } catch (e) {
      console.error('Home fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalGoals   = Object.values(stats).reduce((a, s) => a + (s.total || 0), 0);
  const totalDone    = Object.values(stats).reduce((a, s) => a + (s.completed || 0), 0);
  const overallPct   = totalGoals ? Math.round((totalDone / totalGoals) * 100) : 0;

  const statCards = [
    { label: 'Today',    emoji: '📅', pct: stats.daily?.pct   ?? 0, done: stats.daily?.completed   ?? 0, total: stats.daily?.total   ?? 0, path: '/daily',   color: 'var(--primary)' },
    { label: 'This Week',emoji: '📆', pct: stats.weekly?.pct  ?? 0, done: stats.weekly?.completed  ?? 0, total: stats.weekly?.total  ?? 0, path: '/weekly',  color: '#22c55e' },
    { label: 'Month',    emoji: '🗓️', pct: stats.monthly?.pct ?? 0, done: stats.monthly?.completed ?? 0, total: stats.monthly?.total ?? 0, path: '/monthly', color: '#f59e0b' },
    { label: 'Lifetime', emoji: '🌟', pct: stats.yearly?.pct  ?? 0, done: stats.yearly?.completed  ?? 0, total: stats.yearly?.total  ?? 0, path: '/yearly',  color: 'var(--accent)' },
  ];

  const quickLinks = [
    { label: 'Daily Goals',   path: '/daily',   icon: CalendarDays,  },
    { label: 'Weekly Goals',  path: '/weekly',  icon: CalendarCheck, },
    { label: 'Monthly Goals', path: '/monthly', icon: CalendarRange, },
    { label: 'Lifetime Goals',path: '/yearly',  icon: Target,        },
    { label: 'Calendar',      path: '/calendar',icon: Activity,      },
    { label: 'Settings',      path: '/settings',icon: Zap,           },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* ── Hero Greeting ────────────────────────────────── */}
      <div
        className="relative rounded-3xl overflow-hidden p-8 md:p-10"
        style={{
          background: `linear-gradient(135deg, rgba(var(--primary-rgb),0.15) 0%, rgba(var(--accent-rgb),0.10) 100%)`,
          border: '1px solid rgba(var(--primary-rgb),0.2)',
        }}
      >
        {/* decorative blobs */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-20" style={{ background: `radial-gradient(circle, var(--accent), transparent 70%)` }} />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full opacity-15" style={{ background: `radial-gradient(circle, var(--primary), transparent 70%)` }} />

        <div className="relative">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] mb-1" style={{ color: 'var(--primary)', opacity: 0.8 }}>
                {greeting.emoji} {greeting.text}
              </p>
              <h1 className="text-4xl md:text-5xl font-black leading-tight" style={{ color: 'var(--text-main)' }}>
                {userName}
                <span className="block text-2xl md:text-3xl font-light opacity-60 mt-1" style={{ color: 'var(--text-main)' }}>Your dashboard is ready.</span>
              </h1>
            </div>
            {/* Ring chart */}
            <div className="flex flex-col items-center gap-1">
              <div className="relative w-20 h-20">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9155" fill="none"
                    stroke="var(--primary)" strokeWidth="3"
                    strokeDasharray={`${overallPct} ${100 - overallPct}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-black" style={{ color: 'var(--text-main)' }}>{overallPct}%</span>
                </div>
              </div>
              <span className="text-[10px] uppercase tracking-widest font-black opacity-60" style={{ color: 'var(--text-main)' }}>Overall</span>
            </div>
          </div>
          {/* Quote */}
          <div className="mt-6 flex items-start gap-3 bg-black/5 rounded-2xl px-4 py-3 border border-black/5">
            <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
            <p className="text-sm italic leading-relaxed" style={{ color: 'var(--text-main)', opacity: 0.8 }}>{quote}</p>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(card => (
          <Link key={card.label} to={card.path}>
            <div className="stat-card cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl">{card.emoji}</span>
                <ArrowRight className="w-4 h-4 opacity-30 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-main)' }} />
              </div>
              <div className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>{card.done}<span className="opacity-40 font-normal text-base">/{card.total}</span></div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-3" style={{ color: 'var(--text-main)' }}>{card.label}</p>
              {/* Progress bar */}
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${card.pct}%`, background: card.color }}
                />
              </div>
              <p className="text-right mt-1 text-[10px] font-bold opacity-40" style={{ color: 'var(--text-main)' }}>{card.pct}%</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Today's Focus + Overdue ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Today's Focus */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              Today's Focus
            </h2>
            <Link to="/daily" className="text-[10px] uppercase font-black tracking-widest opacity-50 hover:opacity-100 transition-opacity flex items-center gap-1" style={{ color: 'var(--text-main)' }}>
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-zinc-800/50 rounded-xl animate-pulse" />)}</div>
          ) : today.length === 0 ? (
            <div className="text-center py-8 text-zinc-600">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">All clear! Nothing due today.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {today.map(g => (
                <li key={g.id} className="flex items-center gap-3 bg-black/5 rounded-xl px-4 py-2.5 border transition-all" style={{ borderColor: 'var(--panel-border)' }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: g.priority === 'high' ? '#ef4444' : g.priority === 'medium' ? '#f59e0b' : 'var(--primary)' }} />
                  <span className="text-sm truncate flex-1 font-medium" style={{ color: 'var(--text-main)' }}>{g.title}</span>
                  <span className="text-[9px] uppercase tracking-widest opacity-40 font-black" style={{ color: 'var(--text-main)' }}>{g.type}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Overdue */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <AlertCircle className="w-4 h-4 text-red-500" />
              Overdue
              {overdue.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full text-[9px] font-black">{overdue.length}</span>
              )}
            </h2>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-10 bg-zinc-800/50 rounded-xl animate-pulse" />)}</div>
          ) : overdue.length === 0 ? (
            <div className="text-center py-8 text-zinc-600">
              <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Zero overdue goals! You're crushing it 🎉</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {overdue.map(g => (
                <li key={g.id} className="flex items-center gap-3 bg-red-500/5 rounded-xl px-4 py-2.5 border border-red-500/10 hover:border-red-500/30 transition-all">
                  <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
                  <span className="text-sm text-red-500 truncate flex-1 font-bold">{g.title}</span>
                  <span className="text-[9px] uppercase tracking-widest text-red-500/50 font-black">{g.type}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Quick Navigation ────────────────────────────── */}
      <div>
        <h2 className="text-sm font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" /> Quick Navigate
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {quickLinks.map(lnk => (
            <Link key={lnk.path} to={lnk.path}>
              <div
                className="group glass-panel rounded-2xl p-4 flex flex-col items-center gap-2 hover:-translate-y-1 transition-all duration-200 cursor-pointer text-center"
                style={{ borderColor: 'var(--panel-border)', backgroundColor: 'var(--panel-bg)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-black/5">
                  <lnk.icon className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider opacity-40 group-hover:opacity-100 transition-all leading-tight" style={{ color: 'var(--text-main)' }}>{lnk.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Progress Overview ────────────────────────────── */}
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-5" style={{ color: 'var(--text-main)' }}>
          <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          Progress Breakdown
        </h2>
        <div className="space-y-4">
          {statCards.map(card => (
            <div key={card.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--text-main)' }}>{card.emoji} {card.label}</span>
                <span className="text-xs font-black" style={{ color: card.color }}>{card.pct}%</span>
              </div>
              <div className="h-2 bg-black/5 rounded-full overflow-hidden border" style={{ borderColor: 'var(--panel-border)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${card.pct}%`, background: `linear-gradient(90deg, ${card.color}, ${card.color}aa)` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
