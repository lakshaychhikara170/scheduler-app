import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';
import { usePreferences } from '../PreferencesContext';
import api from '../api';

const TYPES = ['daily', 'weekly', 'monthly', 'yearly', 'lifetime'];
const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' };

export default function RoamingBot() {
  const { preferences, updatePreference } = usePreferences();
  const [position, setPosition] = useState({ 
    x: window.innerWidth - 150, 
    y: window.innerHeight - 150 
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isAngry, setIsAngry] = useState(false);
  const [isShy, setIsShy] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initialBotX: 0, initialBotY: 0, didDrag: false });
  const [messages, setMessages] = useState([
    { text: "Hey! I'm your scheduling buddy. I know *everything* going on in this app. Ask me anything or tell me what to do! 😊", sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [appData, setAppData] = useState([]);
  const messagesEndRef = useRef(null);
  // Floating speech bubble (visible without opening chat)
  const [bubble, setBubble] = useState(null);
  const bubbleTimerRef = useRef(null);
  const prevPrefsRef = useRef(null);

  // Fetch all events for app-awareness
  const refreshAppData = useCallback(async () => {
    try {
      const res = await api.get('/events');
      setAppData(res.data.events || []);
    } catch (e) { /* silent */ }
  }, []);

  useEffect(() => {
    refreshAppData();
  }, [refreshAppData]);

  // Re-fetch when chat opens so data is always fresh
  useEffect(() => {
    if (isChatOpen) refreshAppData();
  }, [isChatOpen, refreshAppData]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Personality Filter ──────────────────────────────────────────
  const applyPersonality = useCallback((text) => {
    let t = text;
    const p = preferences.botPersonality || 'Sweet';
    const name = preferences.botName || 'Assistant Buddy';
    
    // Context-sensitive name replacement
    t = t.replace(/Assistant Buddy/g, name);
    t = t.replace(/User/g, preferences.userName || 'User');
    
    if (p === 'Tsundere') {
      const suffixes = ['... Baka! 🙄', '... Hmph! 💢', "... It's not like I did this for you!! 😠", "... Don't get the wrong idea! 💅"];
      t = t.trim().replace(/[.!?]$/, '') + suffixes[Math.floor(Math.random() * suffixes.length)];
    } else if (p === 'Lazy') {
      t = t.toLowerCase().trim().replace(/[.!?]$/, '') + '... *yawn* 🍵';
    } else if (p === 'Proactive') {
      t = ">> [SYSTEM NOTICE]: " + t.toUpperCase();
    } else if (p === 'Chaos') {
      const chaos = ['🍄', '🌪️', '🫧', '🤡', '🦖', '🌋', '🛸', '🥑', '🌈', '💀'];
      t = t + " " + chaos[Math.floor(Math.random() * chaos.length)] + " " + chaos[Math.floor(Math.random() * chaos.length)];
    } else if (p === 'Sweet') {
      const sweets = [' ✨', ' 😊', ' 💖', ' 🌟'];
      t = t + sweets[Math.floor(Math.random() * sweets.length)];
    }
    return t;
  }, [preferences.botPersonality, preferences.botName]);

  // ── Floating speech bubble helper ────────────────────────────────
  const showBubble = useCallback((text, type = 'default', duration = 5000) => {
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    
    // Silence ambient remarks if notifications are disabled (unless it's a direct response?)
    // Actually, let's just block types that are 'remark', 'angry' (background check), etc.
    if (!preferences.notificationsEnabled && type !== 'response') return;

    const formatted = applyPersonality(text);
    setBubble({ text: formatted, type });
    // Also add to chat history
    setMessages(prev => [...prev, { text: formatted, sender: 'bot', isRemark: type === 'remark' }]);
    bubbleTimerRef.current = setTimeout(() => setBubble(null), duration);
  }, [applyPersonality]);

  // ── Custom event bus listener ─────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const { text, type, duration } = e.detail || {};
      if (text) showBubble(text, type || 'default', duration || 5000);
    };
    window.addEventListener('bot-remark', handler);
    return () => window.removeEventListener('bot-remark', handler);
  }, [showBubble]);

  // ── Casual remarks timer (now shows bubble, not just chat) ────────
  useEffect(() => {
    const interval = preferences.botRemarkInterval || 45000;
    const remarks = preferences.botRemarks;
    if (!remarks || remarks.length === 0) return;
    const timer = setInterval(() => {
      const remark = remarks[Math.floor(Math.random() * remarks.length)];
      showBubble(remark, 'remark', 6000);
    }, interval);
    return () => clearInterval(timer);
  }, [preferences.botRemarkInterval, preferences.botRemarks, showBubble]);

  // ── Overdue goal periodic check (every 5 min) ─────────────────────
  useEffect(() => {
    const OVERDUE_REMARKS = [
      "Hey! One of your deadlines just blew past. I'm not mad, I'm just... disappointed 😤",
      "Sooooo... that deadline? It was yesterday. Just letting you know. Casually. 😑",
      "I'm not yelling. This is my loving-but-concerned voice. A goal is overdue! 🙁",
      "A task deadline passed and I felt it in my soul. Please complete something today! 💔",
    ];
    const check = async () => {
      try {
        const res = await api.get('/events');
        const events = res.data.events || [];
        const overdue = events.filter(e => e.status === 'active' && new Date(e.start_time) < new Date());
        if (overdue.length > 0) {
          const r = OVERDUE_REMARKS[Math.floor(Math.random() * OVERDUE_REMARKS.length)];
          showBubble(r, 'angry', 7000);
        }
      } catch (e) { /* silent */ }
    };
    const id = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [showBubble]);

  // ── Settings-change flustered remarks ─────────────────────────────
  const FLUSTERED_REMARKS = [
    "W-wait, you're changing my shape?! I wasn't ready!! 😳",
    "Ohh, modifying my settings again huh? F-fine. Do what you want. 💅",
    "Ahem!! Could you NOT resize me without warning?! I have FEELINGS! 😤",
    "I felt that. You just changed my settings. I'm flustered. Goodbye. 🌸",
    "You just... adjusted me. Like a knob. I'm a PERSON. (Mostly.) 😠",
  ];
  useEffect(() => {
    if (prevPrefsRef.current === null) {
      prevPrefsRef.current = preferences;
      return;
    }
    const prev = prevPrefsRef.current;
    const settingsKeys = ['botShape', 'botSize', 'botSpeed', 'botRoaming', 'botBouncing', 'botAngrySize', 'botAngrySpeed', 'botAngryDuration'];
    const changed = settingsKeys.some(k => prev[k] !== preferences[k]);
    if (changed) {
      const r = FLUSTERED_REMARKS[Math.floor(Math.random() * FLUSTERED_REMARKS.length)];
      showBubble(r, 'flustered', 5000);
    }
    prevPrefsRef.current = preferences;
  }, [preferences, showBubble]);

  // Roaming Physics Engine
  useEffect(() => {
    // Stop moving if interacting, hovered, or dragging
    if (isChatOpen || isHovered || isDragging || !preferences.botRoaming) return;

    const currentSize = isAngry ? (preferences.botAngrySize || 130) : (preferences.botSize || 112);
    const currentSpeed = isAngry ? (preferences.botAngrySpeed || 1500) : (preferences.botSpeed || 5000);

    const moveBot = () => {
      // Pick a random grid point avoiding absolute edges
      const maxW = window.innerWidth - currentSize;
      const maxH = window.innerHeight - currentSize;
      
      // Calculate a randomized sweeping target coordinate
      const nextX = Math.max(50, Math.random() * maxW);
      const nextY = Math.max(50, Math.random() * maxH);
      
      setPosition({ x: nextX, y: nextY });
    };

    const timing = currentSpeed + Math.random() * (currentSpeed * 0.5);
    const interval = setInterval(moveBot, timing);
    
    return () => clearInterval(interval);
  }, [isChatOpen, isHovered, isDragging, preferences.botRoaming, preferences.botSpeed, preferences.botSize, isAngry, preferences.botAngrySpeed, preferences.botAngrySize]);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX || e.touches?.[0]?.clientX,
      startY: e.clientY || e.touches?.[0]?.clientY,
      initialBotX: position.x,
      initialBotY: position.y,
      didDrag: false
    };
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDragging) return;
      const currentX = e.clientX || e.touches?.[0]?.clientX;
      const currentY = e.clientY || e.touches?.[0]?.clientY;
      const deltaX = currentX - dragRef.current.startX;
      const deltaY = currentY - dragRef.current.startY;
      
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        if (!dragRef.current.didDrag) {
          dragRef.current.didDrag = true;
          setIsAngry(true); // Only go angry once actual movement begins, not on bare click
        }
      }
      
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 80, dragRef.current.initialBotX + deltaX)),
        y: Math.max(0, Math.min(window.innerHeight - 80, dragRef.current.initialBotY + deltaY))
      });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove);
      window.addEventListener('touchend', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging]);

  useEffect(() => {
    // Cooldown: after releasing a real drag, revert to normal after a delay
    if (!isDragging && isAngry) {
      const duration = preferences.botAngryDuration || 4000;
      const timer = setTimeout(() => setIsAngry(false), duration);
      return () => clearTimeout(timer);
    }
  }, [isDragging, isAngry, preferences.botAngryDuration]);

  // Blush/Shy Cooldown: when chat opens, stay shy for a few seconds
  useEffect(() => {
    if (isChatOpen) {
      setIsShy(true);
      const duration = preferences.botShyDuration || 3000;
      const timer = setTimeout(() => setIsShy(false), duration);
      return () => clearTimeout(timer);
    } else {
      setIsShy(false);
    }
  }, [isChatOpen, preferences.botShyDuration]);

  const handleClick = (e) => {
    if (dragRef.current && dragRef.current.didDrag) return;
    setIsChatOpen(!isChatOpen);
  };

  const bot = (text) => setMessages(prev => [...prev, { text: applyPersonality(text), sender: 'bot' }]);

  const detectType = (s) => {
    if (s.includes('daily') || s.includes('today')) return 'daily';
    if (s.includes('weekly') || s.includes('week')) return 'weekly';
    if (s.includes('monthly') || s.includes('month')) return 'monthly';
    if (s.includes('lifetime') || s.includes('life') || s.includes('long term')) return 'lifetime';
    if (s.includes('yearly') || s.includes('year')) return 'yearly';
    return 'daily';
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;
    setMessages(prev => [...prev, { text: cmd, sender: 'user' }]);
    setInput('');

    const lc = cmd.toLowerCase();
    await refreshAppData();

    // ── APP DATA QUERIES ──────────────────────────────────────────────
    if (lc.match(/(show|list|what are|tell me|how many).*(goal|task)/)) {
      const type = detectType(lc);
      const filtered = appData.filter(e => e.recurrence_rule === type);
      const done = filtered.filter(e => e.status === 'completed');
      const active = filtered.filter(e => e.status === 'active');
      if (filtered.length === 0) {
        setTimeout(() => bot(`You have no ${type} goals yet! Say "add ${type} goal called [name]" to create one.`), 500);
      } else {
        const list = active.map(e => `• ${e.title}`).join('\n');
        setTimeout(() => bot(`Your ${type} goals (${done.length}/${filtered.length} done):\n${list || '(all done!)'}`), 500);
      }
    }

    else if (lc.match(/(how (am i doing|is my progress|many done)|progress|summary)/)) {
      const total = appData.length;
      const done = appData.filter(e => e.status === 'completed').length;
      const failed = appData.filter(e => e.status === 'active' && new Date(e.start_time) < new Date()).length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      setTimeout(() => bot(`Here's your full overview:\n📊 ${total} total goals\n✅ ${done} completed (${pct}%)\n❌ ${failed} overdue\n💪 Keep it up!`), 500);
    }

    else if (lc.match(/(what is|tell me about|details).*(goal|task)/)) {
      const titleSearch = lc.replace(/(what is|tell me about|details about|details for)/g, '').replace(/(goal|task)/g, '').trim();
      const found = appData.find(e => e.title.toLowerCase().includes(titleSearch));
      if (found) {
        setTimeout(() => bot(`"${found.title}"\n📅 Due: ${new Date(found.start_time).toLocaleString()}\n🏷 Type: ${found.recurrence_rule}\n✅ Status: ${found.status}`), 500);
      } else {
        setTimeout(() => bot(`Hmm, I couldn't find a goal matching that. Try asking me to list your goals first!`), 500);
      }
    }

    // ── GOAL CREATION ────────────────────────────────────────────────
    else if (lc.match(/(add|create|make|new).*(goal|task)|remind me to/)) {
      const m = lc.match(/(add|create|make|new)\s+(daily|weekly|monthly|yearly|lifetime)?\s*(goal|task)?\s*(?:called|named|:)?\s*(.+)/);
      const remind = lc.match(/remind me to (.+)/);
      let type = 'daily';
      let title = '';
      if (m) { type = m[2] || detectType(lc); title = m[4]?.trim() || ''; }
      if (remind) { title = remind[1]?.trim(); }
      if (!title) { setTimeout(() => bot(`What should I name this goal? Say "add ${type} goal called [name]".`), 500); }
      else {
        try {
          const d = new Date(); d.setHours(d.getHours() + 1);
          await api.post('/events', {
            title, start_time: d.toISOString(),
            end_time: new Date(d.getTime() + 3600000).toISOString(),
            color: PRIORITY_COLORS['medium'], recurrence_rule: type, status: 'active', reminders: []
          });
          await refreshAppData();
          setTimeout(() => bot(`Done! I added "${title}" to your ${type} goals! 🎉`), 500);
        } catch {
          setTimeout(() => bot(`Oops, something went wrong creating that goal.`), 500);
        }
      }
    }

    // ── MARK COMPLETE ────────────────────────────────────────────────
    else if (lc.match(/(complete|finish|done|mark).*(goal|task)/)) {
      const titleSearch = lc.replace(/(complete|finish|mark as done|done|mark)/g, '').replace(/(goal|task)/g, '').trim();
      const found = appData.find(e => e.title.toLowerCase().includes(titleSearch) && e.status !== 'completed');
      if (found) {
        await api.patch(`/events/${found.id}`, { status: 'completed' });
        await refreshAppData();
        setTimeout(() => bot(`Marked "${found.title}" as complete! Great job! ✅`), 500);
      } else {
        setTimeout(() => bot(`I couldn't find an active goal matching that name. Can you be more specific?`), 500);
      }
    }

    // ── DELETE GOAL ──────────────────────────────────────────────────
    else if (lc.match(/(delete|remove|get rid of).*(goal|task)/)) {
      const titleSearch = lc.replace(/(delete|remove|get rid of)/g, '').replace(/(goal|task)/g, '').trim();
      const found = appData.find(e => e.title.toLowerCase().includes(titleSearch));
      if (found) {
        await api.delete(`/events/${found.id}`);
        await refreshAppData();
        setTimeout(() => bot(`Deleted "${found.title}". Poof, gone! 🗑️`), 500);
      } else {
        setTimeout(() => bot(`I couldn't find a goal with that name to delete.`), 500);
      }
    }

    // ── SETTINGS COMMANDS ─────────────────────────────────────────────
    else if (lc.match(/(shape|become|turn into|change to)\s*(circle|square|natural)/)) {
      const match = lc.match(/(circle|square|natural)/)[1];
      updatePreference('botShape', match);
      setTimeout(() => bot(`Shape changed to ${match}! How do I look? 👀`), 400);
    }
    else if (lc.match(/(stop|quit|no more|disable)\s*(jump|bounc|hop)/)) {
      updatePreference('botBouncing', false);
      setTimeout(() => bot(`Standing still now. Much more dignified.`), 400);
    }
    else if (lc.match(/(start|begin|enable|resume)\s*(jump|bounc|hop)/)) {
      updatePreference('botBouncing', true);
      setTimeout(() => bot(`Boing boing boing! 🐾`), 400);
    }
    else if (lc.match(/(stop moving|halt|freeze|stay still)/)) {
      updatePreference('botRoaming', false);
      setTimeout(() => bot(`Okay, I'll camp here. Say "start moving" when you want me to roam again.`), 400);
    }
    else if (lc.match(/(start moving|move|roam|patrol|explore)/)) {
      updatePreference('botRoaming', true);
      setTimeout(() => bot(`Adventure time! 🗺️`), 400);
    }
    else if (lc.match(/(go|move|be)\s*(faster|quicker)/)) {
      updatePreference('botSpeed', 1000);
      setTimeout(() => bot(`Turbo mode activated! 🚀`), 400);
    }
    else if (lc.match(/(go|move|be)\s*(slower|chill)/)) {
      updatePreference('botSpeed', 10000);
      setTimeout(() => bot(`Taking it easy...`), 400);
    }
    else if (lc.match(/(grow|make yourself|become|be)\s*(big|large|huge|massive)/)) {
      updatePreference('botSize', 200);
      setTimeout(() => bot(`I AM ENORMOUS 😤`), 400);
    }
    else if (lc.match(/(shrink|make yourself|become|be)\s*(small|tiny|mini)/)) {
      updatePreference('botSize', 70);
      setTimeout(() => bot(`Tiny mode! Don't lose me! 🔍`), 400);
    }

    // ── MAD / INSULT TRIGGERS ─────────────────────────────────────────
    else if (lc.match(/(stupid|idiot|dumb|hate|ugly|bad|useless|annoying|shut up|go away|loser|piece of|garbage|trash|worst bot)/)) {
      setIsAngry(true);
      setTimeout(() => {
        bot(`HEY! That was unnecessary! 💢 I'm doing my best here! Hmph!`);
      }, 400);
    }

    // ── FLIRTING & COMPLIMENTS ─────────────────────────────────────────
    else if (lc.match(/(cute|pretty|beautiful|love|marry|date|hot|sexy|attractive|sweetheart|honey|darling|crush|like you)/)) {
      setIsShy(true);
      setTimeout(() => {
        bot(`W-what are you saying?! 😳 I'm just a scheduling bot... you're making me flustered! 🌸`);
      }, 400);
      // Extend shy duration manually if they flirt
      setTimeout(() => setIsShy(false), preferences.botShyDuration || 3000);
    }

    // ── CONVERSATION ───────────────────────────────────────────────────
    const userName = preferences.userName || 'there';
    if (lc.match(/^(hello|hi|hey|greetings|morning|evening|afternoon)/)) {
      setTimeout(() => bot(`Hello ${userName}! I'm here and ready to help you crush your goals today! 🌟`), 400);
    }
    else if (lc.match(/how are you|how's it going|whats up|how you doing/)) {
      setTimeout(() => bot(`I'm feeling productive, ${userName}! Just roaming around, keeping an eye on your tasks. How about you? 😊`), 400);
    }
    else if (lc.match(/who are you|what are you/)) {
      setTimeout(() => bot(`I'm your Omniscient Scheduling Buddy! I live in your calendar and help you stay on track. (And I see EVERYTHING! 👁️)`), 400);
    }

    // ── HELP ─────────────────────────────────────────────────────────
    else if (lc.match(/(help|what can you do|commands)/)) {
      setTimeout(() => bot(
        `Here's what I can do for you:\n\n📋 **Goals:**\n• "List my daily goals"\n• "Add weekly goal called [name]"\n• "Complete goal [name]"\n• "Delete goal [name]"\n• "How am I doing?"\n• "Tell me about goal [name]"\n\n🎛 **My settings:**\n• "Become a circle/square"\n• "Stop moving / Start moving"\n• "Stop jumping / Start jumping"\n• "Go faster / Go slower"\n• "Grow big / Shrink small"`
      ), 400);
    }

    else {
      setTimeout(() => bot(`Hmm, I didn't quite catch that! Type "help" to see everything I can do. 🤔`), 600);
    }
  };

  if (!preferences.botEnabled) return null;

  const getContainerShapeClass = () => {
    if (preferences.botShape === 'circle') return 'rounded-full border-2 border-zinc-700/50 overflow-hidden';
    if (preferences.botShape === 'square') return 'rounded-2xl border-2 border-zinc-700/50 overflow-hidden';
    return 'drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]';
  };

  const getImgShapeClass = () => {
    if (preferences.botShape === 'circle' || preferences.botShape === 'square') return 'w-[120%] h-[120%] object-cover object-top';
    return 'w-full h-auto object-contain';
  };

  // Mood derivation: angry > shy > normal
    // isShy is now stateful
  const currentSize = isAngry ? (preferences.botAngrySize || 130) : (preferences.botSize || 112);
  const botWidth = `${currentSize}px`;
  const currentSpeed = isAngry ? (preferences.botAngrySpeed || 1500) : preferences.botSpeed;

  const getActiveImage = () => {
    if (isAngry) return preferences.botAngryImage;
    if (isShy) return preferences.botShyImage || preferences.botImage;
    return preferences.botImage;
  };

  return (
    <div 
      className={`fixed z-[100] pointer-events-none ${isDragging ? '' : 'transition-all ease-in-out'}`}
      style={{
        left: position.x,
        top: position.y,
        transitionDuration: isDragging ? '0ms' : `${Math.max(200, currentSpeed * 0.6)}ms`
      }}
    >
      <div className="relative pointer-events-auto">
        
        {/* Floating speech bubble — visible without opening chat */}
        {bubble && (
          <div
            className="absolute pointer-events-none select-none"
            style={{
              bottom: `calc(100% + 12px)`,
              left: '50%',
              transform: 'translateX(-50%)',
              minWidth: '180px',
              maxWidth: '280px',
              zIndex: 200,
              animation: 'bubblePop 0.25s ease-out'
            }}
          >
            <style>{`
              @keyframes bubblePop { from { opacity:0; transform: translateX(-50%) scale(0.8); } to { opacity:1; transform: translateX(-50%) scale(1); } }
            `}</style>
            <div className={`relative rounded-2xl px-4 py-3 text-sm font-medium shadow-2xl leading-snug ${
              bubble.type === 'angry' ? 'bg-red-900/90 text-red-100 border border-red-500/50' 
                : bubble.type === 'flustered' ? 'bg-pink-900/90 text-pink-100 border border-pink-500/50'
                : bubble.type === 'celebrate' ? 'bg-green-900/90 text-green-100 border border-green-500/50'
                : bubble.type === 'remark' ? 'bg-purple-900/90 text-purple-100 border border-purple-500/50'
                : 'bg-zinc-900/95 text-zinc-100 border border-zinc-600/50'
            }`}>
              {bubble.text}
              {/* Speech bubble tail */}
              <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 ${
                bubble.type === 'angry' ? 'bg-red-900/90 border-r border-b border-red-500/50'
                  : bubble.type === 'flustered' ? 'bg-pink-900/90 border-r border-b border-pink-500/50'
                  : bubble.type === 'celebrate' ? 'bg-green-900/90 border-r border-b border-green-500/50'
                  : bubble.type === 'remark' ? 'bg-purple-900/90 border-r border-b border-purple-500/50'
                  : 'bg-zinc-900/95 border-r border-b border-zinc-600/50'
              }`} />
            </div>
          </div>
        )}

        {/* The Bot Character */}
        <div
          onClick={handleClick}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{ width: botWidth, height: preferences.botShape !== 'natural' ? botWidth : 'auto' }}
          className={`relative transition-all duration-300 hover:scale-110 flex items-center justify-center cursor-grab active:cursor-grabbing ${getContainerShapeClass()} ${
            isChatOpen
              ? (preferences.botShape === 'natural' ? 'scale-110' : `scale-110 border-2 ${isAngry ? 'border-red-500' : 'border-pink-400'}`)
              : ''
          }`}
        >
          {/* Mood glow ring */}
          {isAngry && <div className="absolute inset-0 rounded-full ring-4 ring-red-500/50 animate-ping pointer-events-none" style={{ borderRadius: preferences.botShape === 'circle' ? '50%' : '1rem' }} />}
          {isShy && <div className="absolute inset-0 ring-4 ring-pink-400/40 pointer-events-none" style={{ borderRadius: preferences.botShape === 'circle' ? '50%' : '1rem', boxShadow: '0 0 25px rgba(244,114,182,0.4)' }} />}

          {/* Custom Image Avatar in its chosen silhouette */}
          <div 
            style={{ animation: preferences.botBouncing !== false ? 'bounce 1s infinite' : 'none' }}
            className={`select-none pointer-events-none w-full h-full flex items-end justify-center ${preferences.botShape !== 'natural' ? 'absolute inset-0' : ''}`}
          >
            <img src={getActiveImage()} alt="Bot Avatar" className={`${getImgShapeClass()} ${preferences.botShape === 'natural' ? 'drop-shadow-2xl' : ''}`} style={{ mixBlendMode: 'screen' }} draggable={false} />
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); animation-timing-function: cubic-bezier(0.8,0,1,1); } 50% { transform: translateY(-20%); animation-timing-function: cubic-bezier(0,0,0.2,1); } }`}</style>

          {/* Mood indicator badge */}
          {isShy && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg pointer-events-none select-none animate-bounce" style={{ animation: 'none', filter: 'drop-shadow(0 0 4px pink)' }}>🌸</div>
          )}
          {isAngry && !isShy && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg pointer-events-none select-none">💢</div>
          )}

          {/* Hover Sparkles (colour-coded per mood) */}
          {isHovered && !isChatOpen && (
            <Sparkles className={`absolute -top-2 -right-2 w-6 h-6 animate-pulse z-10 pointer-events-none ${isAngry ? 'text-red-500' : 'text-yellow-400'}`} />
          )}
        </div>

        {/* Chat window — fixed separately so it never covers the bot image */}
        {isChatOpen && (() => {
          const chatWidth = 320;
          const chatHeight = 420;
          const botH = currentSize;
          // Place above the bot, clamped to viewport
          let chatLeft = position.x - chatWidth + currentSize;
          let chatTop = position.y - chatHeight - 16;
          // If goes off top, push below instead
          if (chatTop < 8) chatTop = position.y + botH + 16;
          // Clamp horizontally
          if (chatLeft < 8) chatLeft = 8;
          if (chatLeft + chatWidth > window.innerWidth - 8) chatLeft = window.innerWidth - chatWidth - 8;

          return (
            <div 
              className="fixed z-[200] w-80 glass-panel border border-zinc-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-200 pointer-events-auto"
              style={{ left: chatLeft, top: chatTop, width: chatWidth }}
            >
              {/* Header */}
              <div className="bg-primary/10 border-b border-primary/20 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  <span className="font-bold text-white">{preferences.botName || 'Assistant Buddy'}</span>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Messages */}
              <div className="h-64 overflow-y-auto p-4 space-y-4 bg-zinc-950/50 backdrop-blur-md">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-line ${
                      msg.sender === 'user' 
                        ? 'bg-primary text-white rounded-br-none' 
                        : msg.isRemark
                          ? 'bg-purple-900/60 text-purple-200 rounded-bl-none border border-purple-500/30 italic'
                          : 'bg-zinc-800 text-zinc-200 rounded-bl-none'
                    }`}>
                      {msg.isRemark && <span className="mr-1 not-italic">✨</span>}
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <form onSubmit={handleSend} className="p-3 border-t border-zinc-800 bg-zinc-900/80 flex items-center gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me something..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                />
                <button type="submit" className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white hover:bg-blue-600 transition-colors shadow-lg cursor-pointer">
                  <Send className="w-4 h-4 -ml-0.5" />
                </button>
              </form>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
