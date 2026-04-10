import React, { useState, useEffect } from 'react';
import api from '../api';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Check, X } from 'lucide-react';
import GoalModal from './GoalModal';

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' };

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(null);
  const [daySidebar, setDaySidebar] = useState(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState('medium');
  
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const fetchMonthEvents = async () => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
    
    try {
      const res = await api.get(`/events?start=${start}&end=${end}`);
      setEvents(res.data.events);
    } catch (err) {
      console.error('Failed to fetch calendar events', err);
    }
  };

  useEffect(() => {
    fetchMonthEvents();
  }, [currentDate]);

  const updateGoalDetails = async (id, description, attachments) => {
    try {
      await api.patch(`/events/${id}`, { description, attachments: typeof attachments === 'string' ? attachments : JSON.stringify(attachments) });
      setSelectedGoal(null);
      fetchMonthEvents();
      // If sidebar is open, update its event data too without closing it
      if (daySidebar) {
        const upDay = new Date(daySidebar.fullDate);
        setDaySidebar(null); // Simple close to refresh, or we can fetch again
      }
    } catch (err) {
      console.error('Failed to update details', err);
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickTitle || !showQuickAdd) return;

    // Default to Noon on that selected day
    const start = new Date(showQuickAdd);
    start.setHours(12, 0, 0, 0);

    const payload = {
      title: quickTitle,
      start_time: start.toISOString(),
      end_time: new Date(start.getTime() + 3600000).toISOString(),
      color: PRIORITY_COLORS[quickPriority] || '#3b82f6',
      recurrence_rule: 'daily',
      status: 'active',
      reminders: []
    };

    try {
      await api.post('/events', payload);
      setQuickTitle('');
      setShowQuickAdd(null);
      if (daySidebar) {
        setDaySidebar(null); // Refresh sidebar on close
      }
      fetchMonthEvents();
    } catch (err) {
      console.error('Failed to quick add goal');
    }
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const days = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const calendarGrid = [];
  for (let i = 0; i < firstDay; i++) {
    calendarGrid.push({ empty: true });
  }
  for (let d = 1; d <= days; d++) {
    const defaultDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
    const dayIndex = defaultDate.getDay();
    const isWeekend = dayIndex === 0 || dayIndex === 6;

    const dayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
    const dayEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), d, 23, 59, 59);
    
    const dayEvents = events.filter(e => {
      const eDate = new Date(e.start_time);
      return eDate >= dayStart && eDate <= dayEnd;
    });
    
    calendarGrid.push({ empty: false, date: d, dayEvents, isWeekend, fullDate: defaultDate });
  }

  return (
    <div className="space-y-6">
      <style>{`
        .stripe-pattern {
          background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 20px);
        }
      `}</style>
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold capitalize" style={{ color: 'var(--text-main)' }}>Calendar Overview</h2>
          <p className="opacity-50 mt-1" style={{ color: 'var(--text-main)' }}>Visually track your entire schedule.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
             onClick={() => setCurrentDate(new Date())}
             className="px-4 py-2 rounded-lg transition-colors font-medium border shadow flex items-center gap-2 cursor-pointer"
             style={{ 
               backgroundColor: 'var(--panel-bg)', 
               color: 'var(--text-main)',
               borderColor: 'var(--panel-border)'
             }}
          >
             <CalendarIcon className="w-4 h-4" style={{ color: 'var(--primary)' }} /> Today
          </button>
          
          <div className="flex items-center gap-2 p-2 rounded-xl border" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
             <button onClick={prevMonth} className="p-2 hover:bg-black/5 rounded-lg transition-colors cursor-pointer"><ChevronLeft className="w-5 h-5" style={{ color: 'var(--text-main)' }} /></button>
             <div className="font-semibold text-lg w-40 text-center" style={{ color: 'var(--text-main)' }}>
               {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
             </div>
             <button onClick={nextMonth} className="p-2 hover:bg-black/5 rounded-lg transition-colors cursor-pointer"><ChevronRight className="w-5 h-5" style={{ color: 'var(--text-main)' }} /></button>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl animate-in fade-in slide-in-from-bottom-4">
        {/* Calendar Grid Header */}
        <div className="grid grid-cols-7 gap-4 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-zinc-500 uppercase tracking-wider">{day}</div>
          ))}
        </div>
        
        {/* Calendar Grid Body */}
        <div className="grid grid-cols-7 gap-3">
          {calendarGrid.map((cell, idx) => {
            const isToday = !cell.empty && new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), cell.date).toDateString();
            return (
              <div 
                key={idx} 
                onClick={(e) => {
                  if (cell.empty || e.target !== e.currentTarget) return;
                  setShowQuickAdd(cell.fullDate);
                }}
                className={`min-h-[140px] rounded-xl p-2 flex flex-col ${cell.empty ? 'bg-transparent' : `cursor-pointer transition-colors border hover:border-zinc-600 ${cell.isWeekend ? 'bg-zinc-900/80 stripe-pattern' : 'bg-black/30'}`} ${isToday ? 'border-primary shadow-[0_0_15px_rgba(59,130,246,0.2)] bg-primary/5' : 'border-zinc-800/50'}`}>
                {!cell.empty && (
                  <>
                    <div 
                      onClick={() => setDaySidebar(cell)}
                      className={`text-sm font-bold mb-2 flex items-center justify-center w-7 h-7 rounded-full cursor-pointer hover:scale-110 transition-transform ${isToday ? 'bg-primary text-white' : 'opacity-40 hover:opacity-100 hover:bg-black/10'}`}
                      style={{ color: isToday ? 'white' : 'var(--text-main)' }}
                      title="View all tasks for this day"
                    >
                      {cell.date}
                    </div>
                    <div className="space-y-1.5 overflow-hidden flex-1">
                      {cell.dayEvents.map((evt, eIdx) => (
                         <div 
                           key={eIdx} 
                           onClick={() => setSelectedGoal(evt)}
                           className="text-[10px] font-medium px-2 py-1 rounded truncate cursor-pointer transition-transform hover:scale-105 overflow-hidden whitespace-nowrap opacity-90 hover:opacity-100 shadow-sm"
                           style={{ backgroundColor: `${evt.color}20`, color: evt.color, border: `1px solid ${evt.color}40` }}
                         >
                           {evt.status === 'completed' ? '✓ ' : ''}{new Date(evt.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {evt.title}
                         </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowQuickAdd(null)}>
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-1">Schedule Task</h3>
            <p className="text-sm text-zinc-400 mb-6">{showQuickAdd.toDateString()}</p>
            <form onSubmit={handleQuickAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Doctor Appointment"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Priority Theme</label>
                <select
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                  value={quickPriority}
                  onChange={(e) => setQuickPriority(e.target.value)}
                >
                  <option value="high">High (Red)</option>
                  <option value="medium">Medium (Yellow)</option>
                  <option value="low">Low (Blue)</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-white/10">
                <button 
                  type="button" 
                  onClick={() => setShowQuickAdd(null)}
                  className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!quickTitle}
                  className="bg-primary hover:bg-blue-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Save to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Day Slide-over Sidebar */}
      {daySidebar && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex justify-end transition-opacity" onClick={() => setDaySidebar(null)}>
          <div 
            className="w-[400px] h-full border-l flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl" 
            style={{ 
              backgroundColor: 'var(--sidebar-bg)', 
              borderColor: 'var(--panel-border)' 
            }}
            onClick={e => e.stopPropagation()}
          >
             <div className="flex justify-between items-center mb-8 border-b pb-4 px-6 pt-6" style={{ borderColor: 'var(--panel-border)' }}>
               <div>
                 <h2 className="text-2xl font-bold capitalize" style={{ color: 'var(--text-main)' }}>{daySidebar.fullDate.toLocaleDateString([], { weekday: 'long' })}</h2>
                 <p className="opacity-50 font-medium" style={{ color: 'var(--text-main)' }}>{daySidebar.fullDate.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</p>
               </div>
               <button onClick={() => setDaySidebar(null)} className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer opacity-40 hover:opacity-100">
                 <X className="w-5 h-5" style={{ color: 'var(--text-main)' }} />
               </button>
             </div>
             
             <div className="flex-1 overflow-y-auto space-y-4 pr-2">
               <button onClick={() => setShowQuickAdd(daySidebar.fullDate)} className="w-full py-4 rounded-xl border-2 border-dashed font-semibold transition-colors flex items-center justify-center gap-2 mb-6 cursor-pointer" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-main)' }}>
                 <Plus className="w-4 h-4" /> Schedule New Task Here
               </button>

               {daySidebar.dayEvents.length === 0 ? (
                 <div className="text-center text-zinc-500 mt-16">
                   <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                   <p>Your schedule is perfectly clear.</p>
                 </div>
               ) : daySidebar.dayEvents.map((evt, idx) => (
                 <div key={idx} className="bg-black/5 border-l-[4px] border-black/5 rounded-lg rounded-l-none p-4 hover:bg-black/10 transition-colors cursor-pointer group shadow-sm shadow-black/5" style={{ borderLeftColor: evt.color }} onClick={() => setSelectedGoal(evt)}>
                   <div className="flex justify-between items-start mb-1">
                     <span className={`font-semibold ${evt.status === 'completed' ? 'line-through opacity-40' : ''}`} style={{ color: evt.status === 'completed' ? undefined : 'var(--text-main)' }}>{evt.title}</span>
                     <span className="text-[10px] opacity-40 font-bold bg-black/5 px-2 py-1 rounded" style={{ color: 'var(--text-main)' }}>{new Date(evt.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                   </div>
                   {evt.description && <p className="text-xs opacity-50 line-clamp-2 mt-2 leading-relaxed" style={{ color: 'var(--text-main)' }}>{evt.description}</p>}
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}

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
