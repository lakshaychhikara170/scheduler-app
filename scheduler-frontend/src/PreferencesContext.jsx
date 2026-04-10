import React, { createContext, useContext, useState, useEffect } from 'react';

const PreferencesContext = createContext();

const DEFAULT_PRESETS = [
  {
    id: 'default',
    name: 'Assistant Buddy',
    gender: 'Neutral',
    personality: 'Sweet',
    botImage: '/bot-icon.png',
    botShyImage: '/bot-icon.png',
    botAngryImage: '/bot-angry-icon.jpg',
    accentColor: '#a855f7',
    description: 'The original helpful companion.',
    remarks: [
      "Psst... have you checked your daily goals today? 👀",
      "You know, completing tasks makes me happy dance 🕺",
      "I'm watching your productivity levels. They're... interesting.",
      "Friendly reminder that deadlines don't care about your mood.",
      "Plot twist: the productive version of you is just one task away.",
    ],
  }
];

export const PreferencesProvider = ({ children }) => {
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('scheduler_prefs');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed) {
        // Ensure botPresets always exists for old saves
        if (!parsed.botPresets) parsed.botPresets = DEFAULT_PRESETS;
        if (!parsed.activePresetId) parsed.activePresetId = null;
        return parsed;
      }
    } catch(e) {
      console.error('Failed to parse preferences', e);
    }
    return {
      botEnabled: true,
      botRoaming: true,
      botSpeed: 5000,
      botSize: 112,
      botShape: 'natural',
      botName: 'Assistant Buddy',
      botGender: 'Neutral',
      botPersonality: 'Sweet',
      botImage: '/bot-icon.png',
      botShyImage: '/bot-icon.png',
      botAngryImage: '/bot-angry-icon.jpg',
      botAngrySize: 130,
      botAngrySpeed: 1500,
      botAngryDuration: 4000,
      botShyDuration: 3000,
      botBouncing: true,
      userName: 'User',
      userAvatar: null,
      appTheme: 'Dark',
      glassIntensity: 20,
      notificationsEnabled: true,
      themePreset: 'Blue',
      themePrimary: '#3b82f6',
      themeAccent: '#8b5cf6',
      botRemarkInterval: 45000,
      botRemarks: [
        "Psst... have you checked your daily goals today? 👀",
        "You know, completing tasks makes me happy dance 🕺",
        "I'm watching your productivity levels. They're... interesting.",
        "Did you forget something? I won't say what. But check your tasks 👀",
        "I could use a snack break. Do AIs eat? Asking for a friend.",
        "Wow, look at all these goals. Very ambitious of you!",
        "I believe in you! ...Mostly.",
        "Fun fact: you're more productive when you actually do things 🙃",
        "I noticed you haven't done much today. Just an observation. 🍵",
        "You ever just... stare at your goals and not do them? Me neither.",
        "Your future self is either going to thank you or blame you. Your call!",
        "I'm not saying you're procrastinating. But I'm also not NOT saying that.",
        "Friendly reminder that deadlines don't care about your mood.",
        "Big stretch energy today! Maybe channel it into a task? 🧘",
        "I've been walking around the screen for a while. How are YOU doing?",
        "Plot twist: the productive version of you is just one task away.",
        "You seem focused today! Or maybe you're just pretending. Either way, hi! 👋"
      ],
      botPresets: DEFAULT_PRESETS,
      activePresetId: null,
      ntfyTopic: `scheduler_${Math.random().toString(36).substring(7)}`,
      mobileSyncEnabled: false,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('scheduler_prefs', JSON.stringify(preferences));
    } catch (e) {
      console.error('Failed to save preferences (Quota possibly exceeded!):', e);
      alert('Local storage limit reached. Please upload a smaller image file!');
    }
  }, [preferences]);

  const updatePreference = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  // Activate a preset: apply its settings to the live bot config
  const activatePreset = (preset) => {
    setPreferences(prev => ({
      ...prev,
      activePresetId: preset.id,
      botName: preset.name,
      botGender: preset.gender,
      botPersonality: preset.personality,
      botImage: preset.botImage,
      botShyImage: preset.botShyImage || preset.botImage,
      botAngryImage: preset.botAngryImage || preset.botImage,
      botRemarks: preset.remarks && preset.remarks.length > 0 ? preset.remarks : prev.botRemarks,
    }));
  };

  // Save/update a preset
  const savePreset = (preset) => {
    setPreferences(prev => {
      const existing = (prev.botPresets || []).findIndex(p => p.id === preset.id);
      let newPresets;
      if (existing >= 0) {
        newPresets = prev.botPresets.map(p => p.id === preset.id ? preset : p);
      } else {
        newPresets = [...(prev.botPresets || []), preset];
      }
      return { ...prev, botPresets: newPresets };
    });
  };

  // Delete a preset
  const deletePreset = (presetId) => {
    setPreferences(prev => ({
      ...prev,
      botPresets: (prev.botPresets || []).filter(p => p.id !== presetId),
      activePresetId: prev.activePresetId === presetId ? null : prev.activePresetId,
    }));
  };

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreference, activatePreset, savePreset, deletePreset }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => useContext(PreferencesContext);
