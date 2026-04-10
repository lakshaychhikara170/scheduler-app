import React, { useState } from 'react';
import { usePreferences } from '../PreferencesContext';
import { Plus, Edit3, Trash2, X, Check, Zap } from 'lucide-react';

const PERSONALITY_OPTIONS = ['Sweet', 'Tsundere', 'Proactive', 'Lazy', 'Chaos', 'Robot', 'Mysterious'];
const GENDER_OPTIONS = ['Female', 'Male', 'Neutral', 'Non-Binary', 'Robot'];

const ACCENT_SWATCHES = [
  '#a855f7', '#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#8b5cf6', '#14b8a6', '#f43f5e', '#84cc16', '#6366f1',
];

const BLANK = {
  id: null,
  name: '',
  description: '',
  gender: 'Neutral',
  personality: 'Sweet',
  botImage: '/bot-icon.png',
  botShyImage: '/bot-icon.png',
  botAngryImage: '/bot-angry-icon.jpg',
  accentColor: '#a855f7',
  remarks: ["I'm your new companion! Let's get things done! ✨"],
};

export default function PresetManager({ compressImage }) {
  const { preferences, updatePreference, activatePreset, savePreset, deletePreset } = usePreferences();
  const presets = preferences.botPresets || [];
  const activeId = preferences.activePresetId;

  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newRemark, setNewRemark] = useState('');

  const openNew = () => {
    setEditing({ ...BLANK, id: `preset_${Date.now()}` });
    setShowModal(true);
    setNewRemark('');
  };

  const openEdit = (preset) => {
    setEditing({ ...preset });
    setShowModal(true);
    setNewRemark('');
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setNewRemark('');
  };

  const handleSave = (andActivate = false) => {
    if (!editing || !editing.name.trim()) {
      alert('Please give your preset a name!');
      return;
    }
    savePreset(editing);
    if (andActivate) {
      handleActivate(editing);
    }
    closeModal();
  };

  const handleActivate = (preset) => {
    activatePreset(preset);
    updatePreference('botName', preset.name);
    updatePreference('botGender', preset.gender);
    updatePreference('botPersonality', preset.personality);
    updatePreference('botImage', preset.botImage);
    updatePreference('botShyImage', preset.botShyImage || preset.botImage);
    updatePreference('botAngryImage', preset.botAngryImage || preset.botImage);
    if (preset.remarks && preset.remarks.length > 0) {
      updatePreference('botRemarks', preset.remarks);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this personality preset? This cannot be undone.')) {
      deletePreset(id);
    }
  };

  const handleImageCompress = (file, field) => {
    if (!file || !compressImage) return;
    compressImage(file, 256, 256, (b64) => {
      setEditing(prev => ({ ...prev, [field]: b64 }));
    });
  };

  const addRemark = () => {
    if (!newRemark.trim()) return;
    setEditing(prev => ({ ...prev, remarks: [...(prev.remarks || []), newRemark.trim()] }));
    setNewRemark('');
  };

  const removeRemark = (idx) => {
    setEditing(prev => ({ ...prev, remarks: prev.remarks.filter((_, i) => i !== idx) }));
  };

  return (
    <div>
      {/* ── Preset Gallery ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {presets.map(preset => {
          const isActive = activeId === preset.id;
          return (
            <div
              key={preset.id}
              className="relative rounded-2xl border p-4 flex items-start gap-4 group transition-all duration-200"
              style={{
                backgroundColor: 'var(--panel-bg)',
                borderColor: isActive ? preset.accentColor || 'var(--primary)' : 'var(--panel-border)',
                boxShadow: isActive ? `0 0 20px ${preset.accentColor || 'var(--primary)'}44` : undefined,
              }}
            >
              {/* Avatar */}
              <div
                className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden border-2 transition-all"
                style={{ borderColor: preset.accentColor || 'var(--panel-border)' }}
              >
                <img
                  src={preset.botImage || '/bot-icon.png'}
                  alt={preset.name}
                  className="w-full h-full object-contain"
                  style={{ mixBlendMode: 'screen' }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pb-8">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-bold text-sm truncate" style={{ color: 'var(--text-main)' }}>
                    {preset.name}
                  </span>
                  {isActive && (
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white flex-shrink-0"
                      style={{ backgroundColor: preset.accentColor || 'var(--primary)' }}
                    >
                      ✓ Active
                    </span>
                  )}
                </div>
                <p className="text-[10px] opacity-50 mb-2 line-clamp-2" style={{ color: 'var(--text-main)' }}>
                  {preset.description || `${preset.personality} · ${preset.gender}`}
                </p>
                <div className="flex gap-1 flex-wrap">
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full font-black"
                    style={{
                      backgroundColor: `${preset.accentColor || 'var(--primary)'}22`,
                      color: preset.accentColor || 'var(--primary)',
                    }}
                  >
                    {preset.personality}
                  </span>
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full font-bold opacity-50"
                    style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-main)' }}
                  >
                    {preset.gender}
                  </span>
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full font-bold opacity-30"
                    style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-main)' }}
                  >
                    {(preset.remarks || []).length} lines
                  </span>
                </div>
              </div>

              {/* Hover action buttons */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(preset)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 transition-colors cursor-pointer"
                  style={{ color: 'var(--text-main)' }}
                  title="Edit preset"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(preset.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer"
                  style={{ color: 'var(--text-main)' }}
                  title="Delete preset"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Activate / Active badge */}
              <button
                className="absolute bottom-3 right-3 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1"
                style={
                  isActive
                    ? { backgroundColor: preset.accentColor || 'var(--primary)', color: '#fff' }
                    : { backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)' }
                }
                onClick={() => !isActive && handleActivate(preset)}
              >
                {isActive
                  ? <><Check className="w-3 h-3" /> Live</>
                  : <><Zap className="w-3 h-3" /> Activate</>
                }
              </button>
            </div>
          );
        })}

        {/* Create New */}
        <button
          onClick={openNew}
          className="rounded-2xl border-2 border-dashed p-4 flex flex-col items-center justify-center gap-3 min-h-[130px] transition-all cursor-pointer hover:border-primary hover:bg-primary/5"
          style={{ borderColor: 'var(--panel-border)', color: 'var(--text-main)' }}
        >
          <Plus className="w-8 h-8 opacity-30" />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-40">New Preset</span>
        </button>
      </div>

      {/* ── Modal ── */}
      {showModal && editing && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--panel-border)' }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl overflow-hidden border-2"
                  style={{ borderColor: editing.accentColor || 'var(--primary)' }}
                >
                  <img src={editing.botImage || '/bot-icon.png'} alt="preview" className="w-full h-full object-contain" style={{ mixBlendMode: 'screen' }} />
                </div>
                <div>
                  <h3 className="font-bold text-base" style={{ color: 'var(--text-main)' }}>
                    {presets.find(p => p.id === editing.id) ? 'Edit Preset' : 'Create New Preset'}
                  </h3>
                  <p className="text-[10px] opacity-40 uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>
                    Personality Configuration
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-full hover:bg-black/10 transition-colors cursor-pointer opacity-40 hover:opacity-100"
              >
                <X className="w-5 h-5" style={{ color: 'var(--text-main)' }} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[68vh] space-y-6">

              {/* Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-1.5" style={{ color: 'var(--text-main)' }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={editing.name}
                    onChange={e => setEditing(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Rem, Luna, Max..."
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)' }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-1.5" style={{ color: 'var(--text-main)' }}>
                    Description
                  </label>
                  <input
                    type="text"
                    value={editing.description}
                    onChange={e => setEditing(p => ({ ...p, description: e.target.value }))}
                    placeholder="e.g. Loyal maid from Re:Zero"
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              {/* Personality + Gender */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-1.5" style={{ color: 'var(--text-main)' }}>
                    Personality
                  </label>
                  <select
                    value={editing.personality}
                    onChange={e => setEditing(p => ({ ...p, personality: e.target.value }))}
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none appearance-none cursor-pointer"
                    style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)' }}
                  >
                    {PERSONALITY_OPTIONS.map(o => <option key={o} value={o}>{o === 'Sweet' ? 'Sweet & Encouraging' : o === 'Tsundere' ? 'Tsundere (Grumpy but Caring)' : o === 'Proactive' ? 'Strict & Proactive' : o === 'Lazy' ? 'Lazy & Chill' : o === 'Chaos' ? 'Absolute Chaos' : o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-1.5" style={{ color: 'var(--text-main)' }}>
                    Gender
                  </label>
                  <select
                    value={editing.gender}
                    onChange={e => setEditing(p => ({ ...p, gender: e.target.value }))}
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none appearance-none cursor-pointer"
                    style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)' }}
                  >
                    {GENDER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-2" style={{ color: 'var(--text-main)' }}>
                  Accent / Glow Color
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {ACCENT_SWATCHES.map(c => (
                    <button
                      key={c}
                      onClick={() => setEditing(p => ({ ...p, accentColor: c }))}
                      className="w-8 h-8 rounded-full transition-all cursor-pointer"
                      style={{
                        backgroundColor: c,
                        outline: editing.accentColor === c ? `3px solid ${c}` : '3px solid transparent',
                        outlineOffset: '2px',
                        transform: editing.accentColor === c ? 'scale(1.15)' : undefined,
                      }}
                    />
                  ))}
                  <div className="flex items-center gap-1.5 ml-1">
                    <input
                      type="color"
                      value={editing.accentColor || '#a855f7'}
                      onChange={e => setEditing(p => ({ ...p, accentColor: e.target.value }))}
                      className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-[9px] opacity-40 uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Custom</span>
                  </div>
                </div>
              </div>

              {/* Images Row */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-3" style={{ color: 'var(--text-main)' }}>
                  Appearance Images
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { field: 'botImage', label: '😊 Normal' },
                    { field: 'botShyImage', label: '🌸 Shy / Flustered' },
                    { field: 'botAngryImage', label: '💢 Angry' },
                  ].map(({ field, label }) => (
                    <label key={field} className="cursor-pointer group">
                      <div
                        className="w-full aspect-square rounded-xl flex items-center justify-center overflow-hidden border-2 transition-all group-hover:border-primary"
                        style={{ backgroundColor: 'transparent', borderColor: 'var(--panel-border)' }}
                      >
                        <img
                          src={editing[field] || '/bot-icon.png'}
                          alt={label}
                          className="w-full h-full object-contain"
                          style={{ mixBlendMode: 'screen' }}
                          onError={e => { e.target.src = '/bot-icon.png'; }}
                        />
                      </div>
                      <div
                        className="text-center text-[9px] font-black uppercase tracking-widest mt-1.5 opacity-50 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--text-main)' }}
                      >
                        {label}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleImageCompress(e.target.files[0], field)}
                      />
                    </label>
                  ))}
                </div>
                <p className="text-[9px] opacity-30 mt-2" style={{ color: 'var(--text-main)' }}>
                  Click any image to replace it. Images are compressed automatically.
                </p>
              </div>

              {/* Custom Remarks */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-3" style={{ color: 'var(--text-main)' }}>
                  Custom Dialogue Lines ({(editing.remarks || []).length})
                </label>
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto pr-1">
                  {(editing.remarks || []).map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 border"
                      style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--panel-border)' }}
                    >
                      <span className="text-[10px] opacity-30 font-black w-4 text-right flex-shrink-0" style={{ color: 'var(--text-main)' }}>
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        value={r}
                        onChange={e => {
                          const updated = [...editing.remarks];
                          updated[i] = e.target.value;
                          setEditing(p => ({ ...p, remarks: updated }));
                        }}
                        className="flex-1 bg-transparent text-sm focus:outline-none"
                        style={{ color: 'var(--text-main)' }}
                      />
                      <button
                        onClick={() => removeRemark(i)}
                        className="opacity-30 hover:opacity-100 hover:text-red-500 transition-all cursor-pointer flex-shrink-0"
                        style={{ color: 'var(--text-main)' }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRemark}
                    onChange={e => setNewRemark(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addRemark()}
                    placeholder="Type a line then press Enter or click Add..."
                    className="flex-1 rounded-xl px-4 py-2 text-sm focus:outline-none"
                    style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)' }}
                  />
                  <button
                    onClick={addRemark}
                    className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-black cursor-pointer hover:bg-primary hover:text-white transition-all border border-primary/30"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between px-6 py-4 border-t"
              style={{ borderColor: 'var(--panel-border)', backgroundColor: 'var(--panel-bg)' }}
            >
              <button
                onClick={closeModal}
                className="px-5 py-2 rounded-xl text-sm font-medium opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                style={{ color: 'var(--text-main)' }}
              >
                Cancel
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => handleSave(true)}
                  className="px-5 py-2 rounded-xl text-sm font-black uppercase tracking-widest text-white cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-2"
                  style={{ backgroundColor: editing.accentColor || 'var(--primary)' }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Save & Activate
                </button>
                <button
                  onClick={() => handleSave(false)}
                  className="px-5 py-2 rounded-xl text-sm font-black uppercase tracking-widest text-white cursor-pointer bg-primary hover:opacity-90 transition-opacity"
                >
                  Save Only
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
