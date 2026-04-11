import React, { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Check, Clock, Trash2, Calendar, X, Image as ImageIcon, FileText } from 'lucide-react';

const PRIORITY_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6'
};

import GoalModal from './GoalModal';

export default function GoalList({ type }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [notificationSetting, setNotificationSetting] = useState('smart');

  const getDefaultDeadline = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d - offset).toISOString().slice(0, 16);
  };

  const [deadline, setDeadline] = useState(getDefaultDeadline());

  const fetchGoals = async () => {
    try {
      const res = await api.get('/events');
      const filtered = res.data.events.filter(e => e.recurrence_rule === type);
      setGoals(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
    setNotificationSetting('smart');
  }, [type]);

  const updateGoalDetails = async (id, description, attachments) => {
    try {
      await api.patch(`/events/${id}`, { description, attachments: JSON.stringify(attachments) });
      setSelectedGoal(null);
      fetchGoals();
    } catch (err) {
      console.error('Failed to update details', err);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newTitle) return;

    // Build start_time based on deadline input or default to 1 hour from now
    let start = new Date();
    if (deadline) {
      start = new Date(deadline);
    } else {
      start.setHours(start.getHours() + 1);
    }

    let remindersPayload = [];
    const remainingMinutes = Math.floor((start.getTime() - Date.now()) / 60000);

    // Generate interval-based reminders; if interval exceeds remaining time, add smart fallbacks
    const generateIntervalReminders = (intervalMinutes) => {
      const arr = [];
      for (let m = intervalMinutes; m <= remainingMinutes; m += intervalMinutes) {
        arr.push({ minutes_before: m, method: 'push' });
      }
      // If no interval reminders were created (deadline too soon), add smart fallbacks
      if (arr.length === 0) {
        const fallbacks = [60, 30, 15, 10].filter(m => m <= remainingMinutes);
        fallbacks.forEach(m => arr.push({ minutes_before: m, method: 'push' }));
      }
      // Always include an at-deadline reminder if the deadline is in the future
      if (remainingMinutes >= 0 && !arr.find(r => r.minutes_before === 0)) {
        arr.push({ minutes_before: 0, method: 'push' });
      }
      return arr;
    };

    if (notificationSetting === 'none') {
      remindersPayload = [];
    } else if (notificationSetting === 'smart') {
      if (type === 'daily') {
        remindersPayload = [{ minutes_before: 60, method: 'push' }, { minutes_before: 15, method: 'push' }];
      } else if (type === 'weekly') {
        remindersPayload = [{ minutes_before: 24 * 60, method: 'push' }, { minutes_before: 4 * 60, method: 'push' }, { minutes_before: 60, method: 'push' }];
      } else if (type === 'monthly') {
        remindersPayload = [{ minutes_before: 3 * 24 * 60, method: 'push' }, { minutes_before: 24 * 60, method: 'push' }, { minutes_before: 120, method: 'push' }];
      } else {
        remindersPayload = [{ minutes_before: 7 * 24 * 60, method: 'push' }, { minutes_before: 3 * 24 * 60, method: 'push' }, { minutes_before: 24 * 60, method: 'push' }];
      }
    } else if (notificationSetting === 'persistent') {
      remindersPayload = generateIntervalReminders(60);
    } else if (notificationSetting === 'twice_a_day') {
      remindersPayload = generateIntervalReminders(12 * 60);
    } else if (notificationSetting === 'once_a_day') {
      remindersPayload = generateIntervalReminders(24 * 60);
    } else if (notificationSetting === 'every_2_days') {
      remindersPayload = generateIntervalReminders(48 * 60);
    } else if (notificationSetting === 'twice_a_week') {
      remindersPayload = generateIntervalReminders(3.5 * 24 * 60);
    } else if (notificationSetting === 'once_a_week') {
      remindersPayload = generateIntervalReminders(7 * 24 * 60);
    } else if (notificationSetting === 'every_3_days') {
      remindersPayload = generateIntervalReminders(3 * 24 * 60);
    } else if (notificationSetting === 'once_a_month') {
      remindersPayload = generateIntervalReminders(30 * 24 * 60);
    } else if (notificationSetting === 'twice_a_month') {
      remindersPayload = generateIntervalReminders(15 * 24 * 60);
    } else if (notificationSetting === '10m') {
      remindersPayload = [{ minutes_before: 10, method: 'push' }, { minutes_before: 0, method: 'push' }];
    } else if (notificationSetting === '1h') {
      remindersPayload = [{ minutes_before: 60, method: 'push' }, { minutes_before: 0, method: 'push' }];
    } else if (notificationSetting === '24h') {
      remindersPayload = [{ minutes_before: 24 * 60, method: 'push' }, { minutes_before: 0, method: 'push' }];
    } else if (notificationSetting === '3d') {
      remindersPayload = [{ minutes_before: 3 * 24 * 60, method: 'push' }, { minutes_before: 0, method: 'push' }];
    } else if (notificationSetting === '1w') {
      remindersPayload = [{ minutes_before: 7 * 24 * 60, method: 'push' }, { minutes_before: 0, method: 'push' }];
    }

    // Ensure non-'none' modes always have at least an at-deadline reminder if deadline is future
    if (notificationSetting !== 'none' && remainingMinutes >= 0) {
      if (!remindersPayload.find(r => r.minutes_before === 0)) {
        remindersPayload.push({ minutes_before: 0, method: 'push' });
      }
    }

    const payload = {
      title: newTitle,
      start_time: start.toISOString(),
      end_time: new Date(start.getTime() + 3600000).toISOString(),
      color: PRIORITY_COLORS[newPriority],
      recurrence_rule: type,
      status: 'active',
      reminders: remindersPayload
    };

    try {
      await api.post('/events', payload);
      setNewTitle('');
      setShowAdd(false);
      setDeadline('');
      setNotificationSetting('smart');
      fetchGoals();
    } catch (err) {
      console.error('Failed to create goal');
    }
  };

  const CONGRATS = [
    "YESSS! You did it!! I'm so proud of you!! 🎉🎊",
    "Goal completed! That's my human! 🥳",
    "You actually did it! I had full faith. (I was 60% sure.) ✅",
    "Task done! Okay I'll admit, I didn't see that coming. Proud of you! 💪",
    "Another one down! You're unstoppable! ...Don't stop. 🌟",
  ];

  const toggleComplete = async (goal) => {
    const newStatus = goal.status === 'completed' ? 'active' : 'completed';
    try {
      await api.patch(`/events/${goal.id}`, { status: newStatus });
      fetchGoals();
      if (newStatus === 'completed') {
        const msg = CONGRATS[Math.floor(Math.random() * CONGRATS.length)];
        window.dispatchEvent(new CustomEvent('bot-remark', { detail: { text: msg, type: 'celebrate', duration: 6000 } }));
      }
    } catch (err) {
      console.error('Update failed');
    }
  };

  const deleteGoal = async (id) => {
    try {
      await api.delete(`/events/${id}`);
      fetchGoals();
    } catch (err) {
      console.error('Delete failed');
    }
  };

  const now = new Date();
  const activeGoals = goals.filter(g => g.status === 'active' && new Date(g.start_time) >= now);
  const failedGoals = goals.filter(g => g.status === 'active' && new Date(g.start_time) < now);
  const completedGoals = goals.filter(g => g.status === 'completed');
  const progress = goals.length === 0 ? 0 : Math.round((completedGoals.length / goals.length) * 100);

  if (loading) return <div className="text-sm font-medium opacity-50" style={{ color: 'var(--text-main)' }}>Loading your goals...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold capitalize" style={{ color: 'var(--text-main)' }}>{type} Goals</h2>
          <p className="opacity-50 mt-1" style={{ color: 'var(--text-main)' }}>Manage and track your {type} objectives</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!showAdd) {
               setDeadline(getDefaultDeadline());
               setNewTitle('');
            }
            setShowAdd(!showAdd);
          }}
          className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          Add Goal
        </button>
      </div>

      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-main)' }}>Progress Overview</h3>
          <span className="font-bold" style={{ color: 'var(--primary)' }}>{progress}%</span>
        </div>
        <div className="w-full h-3 bg-black/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm opacity-40 mt-3" style={{ color: 'var(--text-main)' }}>
          {completedGoals.length} completed out of {goals.length} total tasks
        </p>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="glass-panel rounded-xl p-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-main)' }}>Create New Goal</h3>
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="What do you want to accomplish?"
                className="w-full rounded-lg px-4 py-3 focus:outline-none transition-colors"
                style={{ 
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--panel-border)',
                  color: 'var(--text-main)',
                  outlineColor: 'var(--primary)'
                }}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium opacity-50 mb-1" style={{ color: 'var(--text-main)' }}>Priority</label>
                <select
                  className="w-full rounded-lg px-4 py-2.5 focus:outline-none"
                  style={{ 
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--panel-border)',
                    color: 'var(--text-main)'
                  }}
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium opacity-50 mb-1 ml-1" style={{ color: 'var(--text-main)' }}>Deadline Time</label>
                <input
                  type="datetime-local"
                  required
                  className="w-full rounded-lg px-4 py-2.5 focus:outline-none"
                  style={{ 
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--panel-border)',
                    color: 'var(--text-main)'
                  }}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium opacity-50 mb-1 ml-1" style={{ color: 'var(--text-main)' }}>Notifications</label>
                <select
                  className="w-full rounded-lg px-4 py-2.5 focus:outline-none"
                  style={{ 
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--panel-border)',
                    color: 'var(--text-main)'
                  }}
                  value={notificationSetting}
                  onChange={(e) => setNotificationSetting(e.target.value)}
                >
                  <option value="smart">Smart Tiered</option>
                  <option value="none">No Notifications</option>
                  {type === 'daily' && (
                    <>
                      <option value="persistent">Persistent (Hourly)</option>
                      <option value="1h">1 Hour Before</option>
                      <option value="10m">10 Mins Before</option>
                    </>
                  )}
                  {type === 'weekly' && (
                    <>
                      <option value="twice_a_day">Twice a day</option>
                      <option value="once_a_day">Once a day</option>
                      <option value="every_2_days">Once every 2 days</option>
                      <option value="24h">1 Day Before</option>
                    </>
                  )}
                  {type === 'monthly' && (
                    <>
                      <option value="twice_a_week">Twice a week</option>
                      <option value="once_a_week">Once a week</option>
                      <option value="every_3_days">Every 3 days</option>
                      <option value="3d">3 Days Before</option>
                    </>
                  )}
                  {type === 'yearly' && (
                    <>
                      <option value="once_a_month">Once a month</option>
                      <option value="twice_a_month">Twice a month</option>
                      <option value="once_a_week">Once a week</option>
                      <option value="1w">1 Week Before</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 opacity-50 hover:opacity-100 transition-opacity"
                style={{ color: 'var(--text-main)' }}
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Save Goal
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {activeGoals.map(goal => (
          <GoalItem 
            key={goal.id} 
            goal={goal} 
            onToggle={() => toggleComplete(goal)}
            onDelete={() => deleteGoal(goal.id)}
            onFocus={(goal) => setSelectedGoal(goal)}
          />
        ))}

        {failedGoals.length > 0 && (
          <div className="pt-6">
            <h4 className="text-sm font-bold text-red-500 mb-3 ml-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              Failed / Overdue
            </h4>
            <div className="space-y-3 opacity-90">
              {failedGoals.map(goal => (
                <GoalItem 
                  key={goal.id} 
                  goal={goal} 
                  onToggle={() => toggleComplete(goal)}
                  onDelete={() => deleteGoal(goal.id)}
                  onFocus={(goal) => setSelectedGoal(goal)}
                />
              ))}
            </div>
          </div>
        )}
        
        {completedGoals.length > 0 && (
          <div className="pt-6">
            <h4 className="text-sm font-medium text-zinc-500 mb-3 ml-2">Completed</h4>
            <div className="space-y-3">
              {completedGoals.map(goal => (
                <GoalItem 
                  key={goal.id} 
                  goal={goal} 
                  onToggle={() => toggleComplete(goal)}
                  onDelete={() => deleteGoal(goal.id)}
                  onFocus={(goal) => setSelectedGoal(goal)}
                  isCompleted 
                />
              ))}
            </div>
          </div>
        )}
        
        {goals.length === 0 && !showAdd && (
          <div className="bg-surface border border-zinc-800 border-dashed rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-zinc-200 font-medium text-lg">No {type} goals yet</h3>
            <p className="text-zinc-500 mt-1">Click the Add Goal button to get started.</p>
          </div>
        )}
      </div>

      {selectedGoal && (
        <GoalModal 
          goal={selectedGoal} 
          onClose={() => setSelectedGoal(null)} 
          onSave={updateGoalDetails} 
        />
      )}
    </div>
  );
}

function GoalItem({ goal, onToggle, onDelete, isCompleted, onFocus }) {
  const isHighPriority = goal.color === PRIORITY_COLORS.high;
  const isOverdue = !isCompleted && new Date(goal.start_time) < new Date();
  
  return (
    <div 
      className={`group flex items-center gap-4 glass-panel rounded-xl p-4 transition-all hover:border-blue-500/30 cursor-pointer 
        ${isCompleted ? 'opacity-40' : ''}
        ${isOverdue ? 'border border-red-500/30 bg-red-500/5' : ''}`}
      style={{ borderColor: isOverdue ? undefined : 'var(--panel-border)' }}
      onClick={(e) => {
        if(e.target.closest('button')) return;
        onFocus && onFocus(goal);
      }}
    >
      <button 
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          isCompleted 
            ? 'bg-primary border-primary text-white' 
            : isOverdue
              ? 'border-red-500 hover:bg-red-500/20'
              : 'opacity-40 hover:opacity-100 hover:border-primary hover:bg-primary/10'
        }`}
        style={{ borderColor: isCompleted || isOverdue ? undefined : 'var(--text-main)' }}
      >
        {isCompleted && <Check className="w-3 h-3" />}
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={`font-medium truncate ${isCompleted ? 'line-through opacity-40' : isOverdue ? 'text-red-500 font-bold' : ''}`} style={{ color: isCompleted || isOverdue ? undefined : 'var(--text-main)' }}>
            {goal.title}
          </h4>
          {isOverdue && <span className="text-[10px] uppercase tracking-wider font-bold bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full outline outline-1 outline-red-500/50 flex-shrink-0">Failed</span>}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Clock className="w-3 h-3" />
            {new Date(goal.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: goal.color }} />
            <span className="text-xs opacity-40 capitalize" style={{ color: 'var(--text-main)' }}>
              {Object.keys(PRIORITY_COLORS).find(k => PRIORITY_COLORS[k] === goal.color) || 'Priority'}
            </span>
          </div>
        </div>
      </div>

      <button 
        onClick={onDelete}
        className="p-2 opacity-0 group-hover:opacity-40 hover:!opacity-100 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
        style={{ color: 'var(--text-main)' }}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
