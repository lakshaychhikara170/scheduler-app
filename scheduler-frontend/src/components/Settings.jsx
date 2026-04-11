import React, { useState, useRef } from 'react';
import { usePreferences } from '../PreferencesContext';
import { Settings as SettingsIcon, Image as ImageIcon, Move, Square, Circle, User, Bot, Sparkles, Bell, Moon, Sun, Download, RefreshCcw, Camera, Trash2, X, Plus, Edit3, Check, Zap, Smartphone } from 'lucide-react';
import PresetManager from './PresetManager';
import MobileSync from './MobileSync';

export default function Settings() {
  const { preferences, updatePreference, activatePreset, savePreset, deletePreset } = usePreferences();
  const [previewImage, setPreviewImage] = useState(preferences.botImage);
  const [previewShyImage, setPreviewShyImage] = useState(preferences.botShyImage || preferences.botImage);
  const [previewAngryImage, setPreviewAngryImage] = useState(preferences.botAngryImage);
  const [previewAvatar, setPreviewAvatar] = useState(preferences.userAvatar);

  const compressImage = (file, maxWidth, maxHeight, callback) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Output as highly optimized webp/jpeg to radically reduce base64 string footprint
        callback(canvas.toDataURL('image/webp', 0.8));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      compressImage(file, 256, 256, (base64Result) => {
        setPreviewImage(base64Result);
        updatePreference('botImage', base64Result);
      });
    }
  };

  const handleShyImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      compressImage(file, 256, 256, (base64Result) => {
        setPreviewShyImage(base64Result);
        updatePreference('botShyImage', base64Result);
      });
    }
  };

  const handleAngryImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      compressImage(file, 256, 256, (base64Result) => {
        setPreviewAngryImage(base64Result);
        updatePreference('botAngryImage', base64Result);
      });
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      compressImage(file, 256, 256, (base64Result) => {
        setPreviewAvatar(base64Result);
        updatePreference('userAvatar', base64Result);
      });
    }
  };

  const exportData = () => {
    const data = JSON.stringify(preferences, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scheduler_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetApp = () => {
    if (confirm("Are you SURE you want to reset everything? This will clear ALL settings and your custom remarks!!")) {
      localStorage.removeItem('scheduler_prefs');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>Settings</h2>
          <p className="opacity-50 mt-1" style={{ color: 'var(--text-main)' }}>Customize your scheduler and virtual assistant</p>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4">

        {/* ── Theme Engine ── */}
        <div className="pb-8 border-b" style={{ borderColor: 'var(--panel-border)' }}>
          <h3 className="text-xl font-bold flex items-center gap-2 mb-6 border-b pb-3" style={{ color: 'var(--text-main)', borderColor: 'var(--panel-border)' }}>
            <Sparkles className="w-5 h-5 text-primary" />
            Theme Engine
          </h3>

          {/* Preset palettes */}
          <div className="mb-6">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-3">Color Presets</label>
            <div className="flex flex-wrap gap-3">
              {[
                { name: 'Blue',    primary: '#3b82f6', accent: '#8b5cf6' },
                { name: 'Cyan',    primary: '#06b6d4', accent: '#3b82f6' },
                { name: 'Emerald', primary: '#10b981', accent: '#06b6d4' },
                { name: 'Rose',    primary: '#f43f5e', accent: '#ec4899' },
                { name: 'Amber',   primary: '#f59e0b', accent: '#ef4444' },
                { name: 'Violet',  primary: '#8b5cf6', accent: '#ec4899' },
                { name: 'Slate',   primary: '#64748b', accent: '#8b5cf6' },
              ].map(preset => {
                const isActive = preferences.themePreset === preset.name;
                return (
                  <button
                    key={preset.name}
                    onClick={() => {
                      updatePreference('themePreset', preset.name);
                      updatePreference('themePrimary', preset.primary);
                      updatePreference('themeAccent', preset.accent);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${isActive ? 'scale-105 shadow-lg' : 'opacity-50 hover:opacity-100'}`}
                    style={{ 
                      backgroundColor: 'var(--panel-bg)',
                      borderColor: isActive ? preset.primary : 'var(--panel-border)',
                      color: 'var(--text-main)'
                    }}
                  >
                    <span className="flex gap-1">
                      <span className="w-3 h-3 rounded-full" style={{ background: preset.primary }} />
                      <span className="w-3 h-3 rounded-full -ml-1.5" style={{ background: preset.accent }} />
                    </span>
                    {preset.name}
                    {isActive && <span className="ml-1 text-[9px] opacity-70">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom color pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--panel-border)' }}>
              <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-2" style={{ color: 'var(--text-main)' }}>Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={preferences.themePrimary || '#3b82f6'}
                  onChange={(e) => {
                    updatePreference('themePrimary', e.target.value);
                    updatePreference('themePreset', 'Custom');
                  }}
                  className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent"
                />
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{preferences.themePrimary || '#3b82f6'}</p>
                  <p className="text-[10px] opacity-40" style={{ color: 'var(--text-main)' }}>Buttons, links, highlights</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-black/40 rounded-2xl border border-zinc-800">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={preferences.themeAccent || '#8b5cf6'}
                  onChange={(e) => {
                    updatePreference('themeAccent', e.target.value);
                    updatePreference('themePreset', 'Custom');
                  }}
                  className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent"
                />
                <div>
                  <p className="text-white font-bold text-sm">{preferences.themeAccent || '#8b5cf6'}</p>
                  <p className="text-[10px] text-zinc-500">Gradients, glows, backgrounds</p>
                </div>
              </div>
            </div>
          </div>

          {/* Preview swatch */}
          <div
            className="h-12 rounded-2xl mb-4 flex items-center justify-center text-white font-black text-sm uppercase tracking-widest"
            style={{ background: `linear-gradient(135deg, ${preferences.themePrimary || '#3b82f6'}, ${preferences.themeAccent || '#8b5cf6'})`, boxShadow: `0 0 30px rgba(var(--primary-rgb),0.3)` }}
          >
            {preferences.themePreset || 'Custom'} Preview
          </div>

          {/* Reset */}
          <button
            onClick={() => {
              updatePreference('themePreset', 'Blue');
              updatePreference('themePrimary', '#3b82f6');
              updatePreference('themeAccent', '#8b5cf6');
            }}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-50 hover:opacity-100 border px-4 py-2 rounded-xl transition-all cursor-pointer"
            style={{ 
              backgroundColor: 'var(--panel-bg)',
              borderColor: 'var(--panel-border)',
              color: 'var(--text-main)'
            }}
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Reset to Default (Blue)
          </button>
        </div>

        {/* ── Mobile Connectivity ── */}
        <div className="pb-8 border-b" style={{ borderColor: 'var(--panel-border)' }}>
          <h3 className="text-xl font-bold flex items-center gap-2 mb-2 border-b pb-3" style={{ color: 'var(--text-main)', borderColor: 'var(--panel-border)' }}>
            <Smartphone className="w-5 h-5 text-primary" />
            Mobile Sync & Connectivity
          </h3>
          <p className="text-xs opacity-40 mb-6" style={{ color: 'var(--text-main)' }}>
            Connect your phone to manage goals remotely and receive instant push notifications.
          </p>
          <MobileSync />
        </div>

        {/* ── User & System Identity ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b border-white/5">
            <div className="flex items-center gap-6 p-6 rounded-2xl border" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                <div className="relative group w-24 h-24 flex-shrink-0">
                    <div className="w-full h-full rounded-2xl border-2 overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--panel-border)' }}>
                        {previewAvatar ? (
                            <img src={previewAvatar} alt="User Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-10 h-10 opacity-20" style={{ color: 'var(--text-main)' }} />
                        )}
                    </div>
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity rounded-2xl">
                        <Camera className="w-5 h-5 text-white mb-1" />
                        <span className="text-[10px] text-white font-bold uppercase">Update</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </label>
                </div>
                <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest block mb-1 opacity-50" style={{ color: 'var(--text-main)' }}>Operator Name</label>
                    <input 
                        type="text"
                        value={preferences.userName ?? ''}
                        onChange={(e) => updatePreference('userName', e.target.value)}
                        onBlur={(e) => { if (!e.target.value.trim()) updatePreference('userName', ''); }}
                        className="w-full bg-transparent border-b text-lg font-bold focus:outline-none transition-all py-1"
                        style={{ color: 'var(--text-main)', borderColor: 'var(--panel-border)' }}
                        placeholder="Enter your name..."
                    />
                    <div className="flex items-center gap-2 mt-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-[10px] text-green-500 font-black uppercase tracking-widest">Active Session</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl border" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                            {preferences.appTheme === 'Light' ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-blue-400" />}
                        </div>
                        <div>
                            <span className="text-sm font-bold block" style={{ color: 'var(--text-main)' }}>App Atmosphere</span>
                            <span className="text-[10px] opacity-40 uppercase tracking-widest font-bold" style={{ color: 'var(--text-main)' }}>{preferences.appTheme} Interface</span>
                        </div>
                    </div>
                    <div className="flex rounded-lg p-1 border" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--panel-border)' }}>
                        <button onClick={() => updatePreference('appTheme', 'Dark')} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${preferences.appTheme === 'Dark' ? 'bg-primary text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`} style={{ color: preferences.appTheme === 'Dark' ? 'white' : 'var(--text-main)' }}>Dark</button>
                        <button onClick={() => updatePreference('appTheme', 'Light')} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${preferences.appTheme === 'Light' ? 'bg-primary text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`} style={{ color: preferences.appTheme === 'Light' ? 'white' : 'var(--text-main)' }}>Light</button>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Bell className={`w-4 h-4 ${preferences.notificationsEnabled ? 'text-primary' : 'opacity-20'}`} style={{ color: preferences.notificationsEnabled ? undefined : 'var(--text-main)' }} />
                        </div>
                        <div>
                            <span className="text-sm font-bold block" style={{ color: 'var(--text-main)' }}>System Alerts</span>
                            <span className="text-[10px] opacity-40 uppercase tracking-widest font-bold" style={{ color: 'var(--text-main)' }}>{preferences.notificationsEnabled ? 'Enabled' : 'Muted'}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => updatePreference('notificationsEnabled', !preferences.notificationsEnabled)}
                        className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${preferences.notificationsEnabled ? 'bg-primary' : 'bg-black/20'}`}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${preferences.notificationsEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>
            </div>
        </div>

        {/* ── Bot Personality Presets ── */}
        <div className="pt-8 border-t" style={{ borderColor: 'var(--panel-border)' }}>
          <h3 className="text-xl font-bold flex items-center gap-2 mb-2 border-b pb-3" style={{ color: 'var(--text-main)', borderColor: 'var(--panel-border)' }}>
            <Bot className="w-5 h-5 text-primary" />
            Bot Personality Presets
          </h3>
          <p className="text-xs opacity-40 mb-6" style={{ color: 'var(--text-main)' }}>
            Create and save different companion personalities with their own images, names, and dialogue. Switch between them instantly.
          </p>
          <PresetManager
            preferences={preferences}
            updatePreference={updatePreference}
            compressImage={compressImage}
          />
        </div>

        {/* Virtual Assistant Settings */}
        <div className="pt-8 border-t" style={{ borderColor: 'var(--panel-border)' }}>
          <h3 className="text-xl font-bold flex items-center gap-2 mb-6 border-b pb-3" style={{ color: 'var(--text-main)', borderColor: 'var(--panel-border)' }}>
            <Bot className="w-5 h-5 text-primary" />
            Virtual Assistant Configuration
          </h3>

          {/* ── Personality Engine ── */}
          <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20 mb-8 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="w-20 h-20 text-primary" />
            </div>
            
            <h4 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Bot className="w-4 h-4 text-primary" />
              Personality Engine
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2 block" style={{ color: 'var(--text-main)' }}>Identity Name</label>
                <input 
                  type="text"
                  value={preferences.botName ?? ''}
                  onChange={(e) => updatePreference('botName', e.target.value)}
                  className="w-full rounded-lg px-3 py-2 focus:outline-none transition-all text-sm"
                  style={{ 
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--panel-border)',
                    color: 'var(--text-main)'
                  }}
                  placeholder="Enter bot name..."
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2 block" style={{ color: 'var(--text-main)' }}>Gender Identity</label>
                <select 
                  value={preferences.botGender || 'Neutral'}
                  onChange={(e) => updatePreference('botGender', e.target.value)}
                  className="w-full rounded-lg px-3 py-2 focus:outline-none transition-all text-sm appearance-none cursor-pointer"
                  style={{ 
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--panel-border)',
                    color: 'var(--text-main)'
                  }}
                >
                  <option value="Neutral">Neutral / Non-binary</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Robot">Pure Logic (Robot)</option>
                  <option value="Mysterious">Mysterious / Hidden</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2 block" style={{ color: 'var(--text-main)' }}>Personality Type</label>
                <select 
                  value={preferences.botPersonality || 'Sweet'}
                  onChange={(e) => updatePreference('botPersonality', e.target.value)}
                  className="w-full rounded-lg px-3 py-2 focus:outline-none transition-all text-sm appearance-none cursor-pointer"
                  style={{ 
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--panel-border)',
                    color: 'var(--text-main)'
                  }}
                >
                  <option value="Sweet">Sweet & Encouraging</option>
                  <option value="Tsundere">Tsundere (Grumpy but Caring)</option>
                  <option value="Proactive">Strict & Proactive</option>
                  <option value="Lazy">Lazy & Chill</option>
                  <option value="Chaos">Absolute Chaos</option>
                </select>
              </div>
            </div>
            
            <p className="text-[10px] opacity-40 mt-4 leading-relaxed p-2 rounded-md" style={{ color: 'var(--text-main)', backgroundColor: 'var(--input-bg)' }}>
              Changing these settings will dynamically alter <span className="text-primary">{preferences.botName}</span>'s vocabulary, remark frequency, and emotional reactions across the app.
            </p>
          </div>
          
          <div className="space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Toggles */}
                <div className="space-y-6 border p-5 rounded-xl transition-colors" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                    {/* Toggle Switch */}
                    <div className="flex items-center justify-between">
                    <div>
                        <strong className="block font-medium" style={{ color: 'var(--text-main)' }}>Enable Virtual Assistant</strong>
                        <span className="text-xs opacity-50" style={{ color: 'var(--text-main)' }}>Show the floating companion on your screen</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={preferences.botEnabled}
                        onChange={(e) => updatePreference('botEnabled', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-black/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                    </div>

                    {/* Roaming Control */}
                    <div className="flex items-center justify-between">
                    <div>
                        <strong className="block font-medium" style={{ color: 'var(--text-main)' }}>Autonomous Roaming</strong>
                        <span className="text-xs opacity-50" style={{ color: 'var(--text-main)' }}>Allow the bot to move around the screen randomly</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={preferences.botRoaming}
                        onChange={(e) => updatePreference('botRoaming', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-black/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                    </div>
                </div>

                {/* Upload Custom Icon */}
                <div className="border p-5 rounded-xl space-y-4 transition-colors" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-lg border flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: 'transparent', borderColor: 'var(--panel-border)' }}>
                            <img src={previewImage} alt="Normal Preview" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <strong className="block font-medium mb-2" style={{ color: 'var(--text-main)' }}>Default Appearance</strong>
                            <label className="cursor-pointer border px-4 py-2 rounded-lg font-medium transition-colors flex items-center w-max gap-2 text-xs shadow-sm" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-main)' }}>
                            <ImageIcon className="w-3.5 h-3.5 text-primary" />
                            Replace Default Media
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        </div>
                    </div>
                    {/* Shy / Flustered Icon */}
                    <div className="flex items-center gap-6 pt-4 border-t" style={{ borderColor: 'var(--panel-border)' }}>
                        <div className="w-20 h-20 rounded-lg border flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: 'transparent', borderColor: 'var(--primary)', boxShadow: '0 0 12px rgba(var(--primary-rgb),0.2)' }}>
                            <img src={previewShyImage} alt="Shy Preview" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <strong className="block font-medium mb-1" style={{ color: 'var(--primary)' }}>🌸 "Shy" Appearance (When Chat Opens)</strong>
                            <p className="text-xs opacity-50 mb-2" style={{ color: 'var(--text-main)' }}>Shown when you click the bot to open the chat.</p>
                            <label className="cursor-pointer border px-4 py-2 rounded-lg font-medium transition-colors flex items-center w-max gap-2 text-xs shadow-sm" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-main)' }}>
                            <ImageIcon className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                            Replace Shy Media
                            <input type="file" accept="image/*" className="hidden" onChange={handleShyImageUpload} />
                            </label>
                        </div>
                    </div>
                    {/* Angry Icon */}
                    <div className="flex items-center gap-6 pt-4 border-t" style={{ borderColor: 'var(--panel-border)' }}>
                        <div className="w-20 h-20 rounded-lg border flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: 'transparent', borderColor: 'var(--panel-border)' }}>
                            <img src={previewAngryImage} alt="Angry Preview" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <strong className="text-red-500 block font-medium mb-2">"Angry" Appearance (When Dragged)</strong>
                            <label className="cursor-pointer border px-4 py-2 rounded-lg font-medium transition-colors flex items-center w-max gap-2 text-xs shadow-sm" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-main)' }}>
                            <ImageIcon className="w-3.5 h-3.5 text-red-500" />
                            Replace Angry Media
                            <input type="file" accept="image/*" className="hidden" onChange={handleAngryImageUpload} />
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Shape Selection */}
              <div>
                <strong className="block font-medium mb-3" style={{ color: 'var(--text-main)' }}>Avatar Container Shape</strong>
                <div className="flex gap-3 h-24 mb-4">
                  <button onClick={() => updatePreference('botShape', 'natural')} className={`flex-1 py-3 border-2 rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${preferences.botShape === 'natural' ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]' : 'border-black/5 text-zinc-400 hover:border-black/10'}`} style={{ backgroundColor: preferences.botShape === 'natural' ? undefined : 'var(--panel-bg)', color: preferences.botShape === 'natural' ? 'var(--primary)' : 'var(--text-main)' }}>
                     <User className="w-6 h-6" />
                     <span className="text-xs font-semibold uppercase tracking-wider">Natural</span>
                  </button>
                  <button onClick={() => updatePreference('botShape', 'circle')} className={`flex-1 py-3 border-2 rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${preferences.botShape === 'circle' ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]' : 'border-black/5 text-zinc-400 hover:border-black/10'}`} style={{ backgroundColor: preferences.botShape === 'circle' ? undefined : 'var(--panel-bg)', color: preferences.botShape === 'circle' ? 'var(--primary)' : 'var(--text-main)' }}>
                     <Circle className="w-6 h-6" />
                     <span className="text-xs font-semibold uppercase tracking-wider">Circular</span>
                  </button>
                  <button onClick={() => updatePreference('botShape', 'square')} className={`flex-1 py-3 border-2 rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${preferences.botShape === 'square' ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]' : 'border-black/5 text-zinc-400 hover:border-black/10'}`} style={{ backgroundColor: preferences.botShape === 'square' ? undefined : 'var(--panel-bg)', color: preferences.botShape === 'square' ? 'var(--primary)' : 'var(--text-main)' }}>
                     <Square className="w-6 h-6" />
                     <span className="text-xs font-semibold uppercase tracking-wider">Square</span>
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border transition-colors" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                  <div>
                    <h4 className="font-medium" style={{ color: 'var(--text-main)' }}>Bouncing Animation</h4>
                    <p className="text-xs opacity-50 mt-1" style={{ color: 'var(--text-main)' }}>Toggle whether the avatar constantly jumps.</p>
                  </div>
                  <button 
                    onClick={() => updatePreference('botBouncing', !preferences.botBouncing)}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${preferences.botBouncing ? 'bg-primary' : 'bg-black/20'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${preferences.botBouncing ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-6">
                
                {/* Size Sliders */}
                <div className="space-y-4">
                  <div>
                    <strong className="block font-medium mb-2 text-sm" style={{ color: 'var(--text-main)' }}>Base Size</strong>
                    <div className="px-4 py-3 rounded-xl border" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                      <input 
                        type="range" 
                        min="50" 
                        max="300" 
                        value={preferences.botSize}
                        onChange={(e) => updatePreference('botSize', parseInt(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary"
                        style={{ backgroundColor: 'var(--input-bg)' }}
                      />
                      <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest opacity-40 mt-2" style={{ color: 'var(--text-main)' }}>
                        <span>Small</span>
                        <span style={{ color: 'var(--primary)', opacity: 1 }}>{preferences.botSize}px</span>
                        <span>Massive</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <strong className="text-red-500 block font-medium mb-2 text-sm">"Angry" Size Shift (On Drag)</strong>
                    <div className="bg-red-500/5 px-4 py-3 rounded-xl border border-red-500/20">
                      <input 
                        type="range" 
                        min="50" 
                        max="300" 
                        value={preferences.botAngrySize || 130}
                        onChange={(e) => updatePreference('botAngrySize', parseInt(e.target.value))}
                        className="w-full h-2 bg-red-500/20 rounded-lg appearance-none cursor-pointer accent-red-500"
                      />
                      <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-red-500/50 mt-2">
                        <span>Small</span>
                        <span className="text-red-500">{preferences.botAngrySize || 130}px</span>
                        <span>Massive</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Speed Sliders */}
                <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--panel-border)' }}>
                  <div>
                    <strong className="block font-medium mb-2 text-sm" style={{ color: 'var(--text-main)' }}>Base Movement Speed</strong>
                    <div className="px-4 py-3 rounded-xl border" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                      <input 
                        type="range" 
                        min="1000" 
                        max="15000" 
                        value={preferences.botSpeed}
                        onChange={(e) => updatePreference('botSpeed', parseInt(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary"
                        style={{ backgroundColor: 'var(--input-bg)' }}
                      />
                      <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest opacity-40 mt-2" style={{ color: 'var(--text-main)' }}>
                        <span>Frantic (1s)</span>
                        <span style={{ color: 'var(--primary)', opacity: 1 }}>{Math.round(preferences.botSpeed/1000)}s</span>
                        <span>Leisurely (15s)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Frustration Cooldown Duration */}
                <div className="pt-4 border-t" style={{ borderColor: 'var(--panel-border)' }}>
                  <strong className="text-orange-500 block font-medium mb-2 text-sm">Frustration Cooldown Duration</strong>
                  <div className="bg-orange-500/5 px-4 py-3 rounded-xl border border-orange-500/20">
                    <input 
                      type="range" 
                      min="1000" 
                      max="15000" 
                      value={preferences.botAngryDuration || 4000}
                      onChange={(e) => updatePreference('botAngryDuration', parseInt(e.target.value))}
                      className="w-full h-2 bg-orange-500/20 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                    <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-orange-500/50 mt-2">
                      <span>Quick (1s)</span>
                      <span className="text-orange-500">{Math.round((preferences.botAngryDuration || 4000)/1000)}s</span>
                      <span>Stubborn (15s)</span>
                    </div>
                  </div>
                </div>

                {/* Blush/Shy Duration */}
                <div className="pt-4 border-t" style={{ borderColor: 'var(--panel-border)' }}>
                  <strong className="text-pink-500 block font-medium mb-2 text-sm">Blush Duration (When Opened)</strong>
                  <div className="bg-pink-500/5 px-4 py-3 rounded-xl border border-pink-500/20">
                    <input 
                      type="range" 
                      min="1000" 
                      max="15000" 
                      value={preferences.botShyDuration || 3000}
                      onChange={(e) => updatePreference('botShyDuration', parseInt(e.target.value))}
                      className="w-full h-2 bg-pink-500/20 rounded-lg appearance-none cursor-pointer accent-pink-500"
                    />
                    <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-pink-500/50 mt-2">
                      <span>Brief (1s)</span>
                      <span className="text-pink-500">{Math.round((preferences.botShyDuration || 3000)/1000)}s</span>
                      <span>Bashful (15s)</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ── Casual Remarks Editor ── */}
            <div className="border-t pt-8" style={{ borderColor: 'var(--panel-border)' }}>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-2" style={{ color: 'var(--text-main)' }}>
                ✨ Casual Remarks
              </h3>
              <p className="text-xs opacity-40 mb-4" style={{ color: 'var(--text-main)' }}>The bot will randomly say one of these when left idle. Edit, remove, or add new ones!</p>

              {/* Interval slider */}
              <div className="mb-6 px-4 py-3 rounded-xl border" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                <strong className="text-sm block mb-2" style={{ color: 'var(--text-main)' }}>Remark Frequency</strong>
                <input 
                  type="range" min="10000" max="300000"
                  value={preferences.botRemarkInterval || 45000}
                  onChange={(e) => updatePreference('botRemarkInterval', parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary"
                  style={{ backgroundColor: 'var(--input-bg)' }}
                />
                <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest opacity-40 mt-2" style={{ color: 'var(--text-main)' }}>
                  <span>Very often (10s)</span>
                  <span style={{ color: 'var(--primary)', opacity: 1 }}>Every {Math.round((preferences.botRemarkInterval || 45000)/1000)}s</span>
                  <span>Rarely (5min)</span>
                </div>
              </div>

              {/* Remarks list */}
              <div className="space-y-2 mb-4">
                {(preferences.botRemarks || []).map((remark, idx) => (
                  <div key={idx} className="flex items-center gap-2 border rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--panel-border)' }}>
                    <input
                      type="text"
                      value={remark}
                      onChange={(e) => {
                        const updated = [...preferences.botRemarks];
                        updated[idx] = e.target.value;
                        updatePreference('botRemarks', updated);
                      }}
                      className="flex-1 bg-transparent text-sm focus:outline-none opacity-80"
                      style={{ color: 'var(--text-main)' }}
                    />
                    <button
                      onClick={() => {
                        const updated = preferences.botRemarks.filter((_, i) => i !== idx);
                        updatePreference('botRemarks', updated);
                      }}
                      className="opacity-40 hover:opacity-100 hover:text-red-500 transition-colors cursor-pointer flex-shrink-0"
                      style={{ color: 'var(--text-main)' }}
                    >✕</button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => updatePreference('botRemarks', [...(preferences.botRemarks || []), 'New remark here...'])}
                className="w-full py-3 border-2 border-dashed font-medium text-sm transition-colors cursor-pointer rounded-xl"
                style={{ 
                  backgroundColor: 'var(--panel-bg)',
                  borderColor: 'var(--panel-border)',
                  color: 'var(--text-main)'
                }}
              >
                + Add New Remark
              </button>
            </div>

          </div>

          {/* ── Data Management & Control ── */}
          <div className="mt-12 pt-12 border-t border-white/5">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6 uppercase tracking-tighter">
              <RefreshCcw className="w-5 h-5 text-zinc-500" />
              Terminal & Data Management
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                    onClick={exportData}
                    className="group border p-6 rounded-3xl transition-all text-left flex items-center gap-6"
                    style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
                >
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors" style={{ backgroundColor: 'var(--input-bg)' }}>
                        <Download className="w-6 h-6 opacity-40 group-hover:opacity-100 group-hover:text-primary" style={{ color: 'var(--text-main)' }} />
                    </div>
                    <div>
                        <strong className="block text-sm mb-1 uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Generate Backup</strong>
                        <p className="text-xs opacity-40" style={{ color: 'var(--text-main)' }}>Download all app preferences and custom remarks to a JSON file.</p>
                    </div>
                </button>

                <button 
                    onClick={resetApp}
                    className="group bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/50 p-6 rounded-3xl transition-all text-left flex items-center gap-6"
                >
                    <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                        <Trash2 className="w-6 h-6 opacity-20 group-hover:opacity-100 group-hover:text-red-500" style={{ color: 'var(--text-main)' }} />
                    </div>
                    <div>
                        <strong className="block text-sm mb-1 uppercase tracking-widest text-red-500">Emergency Reset</strong>
                        <p className="text-xs text-red-500/60">Wipe all local settings and restore factory defaults. (Irreversible)</p>
                    </div>
                </button>
            </div>
            
            <div className="mt-8 text-center">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-black">App Instance v1.2.0 • Local Identity Active • Cloud Sync: Disabled</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
