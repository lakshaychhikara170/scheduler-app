import React, { useState, useEffect } from 'react';
import { usePreferences } from '../PreferencesContext';
import { Smartphone, Globe, Bell, CheckCircle, ExternalLink, QrCode, ShieldCheck, Zap } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function MobileSync() {
  const { preferences, updatePreference } = usePreferences();
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [copyStatus, setCopyStatus] = useState(false);

  // We'll use localtunnel URL if available, otherwise fallback to local IP
  const localIp = '192.168.0.105'; // This was discovered earlier
  const publicUrl = `https://omniscient-scheduler.loca.lt`; 
  
  const displayUrl = preferences.mobileSyncEnabled ? publicUrl : `http://${localIp}:5173`;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayUrl);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const ntfyLink = `https://ntfy.sh/${preferences.ntfyTopic}`;

  return (
    <div className="space-y-6">
      <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20 relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Smartphone className="w-32 h-32 text-primary" />
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>Public Access Tunnel</h4>
              <p className="text-xs opacity-50" style={{ color: 'var(--text-main)' }}>Access your scheduler from anywhere in the world</p>
            </div>
          </div>
          <button 
            onClick={() => updatePreference('mobileSyncEnabled', !preferences.mobileSyncEnabled)}
            className={`w-14 h-7 rounded-full transition-all relative cursor-pointer ${preferences.mobileSyncEnabled ? 'bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)]' : 'bg-black/20'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${preferences.mobileSyncEnabled ? 'left-8' : 'left-1'}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-white/5 bg-black/20">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">Target URL</label>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={displayUrl}
                  className="bg-transparent text-sm font-mono w-full focus:outline-none"
                  style={{ color: 'var(--text-main)' }}
                />
                <button 
                  onClick={handleCopy}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-primary"
                >
                  {copyStatus ? <CheckCircle className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-500/5 rounded-xl border border-blue-500/20">
              <ShieldCheck className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-400">Security Note</p>
                <p className="text-[10px] opacity-60 leading-normal" style={{ color: 'var(--text-main)' }}>
                  This creates a temporary tunnel to your local machine. Ensure your desktop stays awake for the link to remain active.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border-4 border-primary/20 shadow-2xl">
            <QRCodeSVG value={displayUrl} size={150} level="H" includeMargin={true} />
            <p className="text-[10px] font-black uppercase tracking-tighter mt-4 text-black">Scan to Sync Mobile</p>
          </div>
        </div>
      </div>

      <div className="bg-orange-500/5 p-6 rounded-2xl border border-orange-500/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Bell className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h4 className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>Mobile Push Notifications</h4>
            <p className="text-xs opacity-50" style={{ color: 'var(--text-main)' }}>Get alerts on your phone via ntfy.sh</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-white/5 bg-black/10">
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-main)' }}>1. Install ntfy App</p>
              <p className="text-[10px] opacity-60 mb-3" style={{ color: 'var(--text-main)' }}>Search for "ntfy" on Google Play or App Store.</p>
              <a href="https://ntfy.sh/#subscribe" target="_blank" className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1">
                Install Link <ExternalLink className="w-2 h-2" />
              </a>
            </div>
            <div className="p-4 rounded-xl border border-white/5 bg-black/10">
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-main)' }}>2. Subscribe to Topic</p>
              <p className="text-[10px] opacity-60 mb-2" style={{ color: 'var(--text-main)' }}>Open the app and subscribe to:</p>
              <code className="text-[10px] bg-black/30 px-2 py-1 rounded text-orange-400 font-mono block w-full text-center">
                {preferences.ntfyTopic}
              </code>
            </div>
          </div>

          <button 
            onClick={async () => {
              try {
                await fetch(`https://ntfy.sh/${preferences.ntfyTopic}`, {
                  method: 'POST',
                  body: "Test notification from Omniscient Scheduler! 🚀",
                  headers: { 'Title': 'Sync Success!', 'Priority': 'high', 'Tags': 'tada' }
                });
                alert('Test notification sent!');
              } catch (e) {
                alert('Failed to send test. Check your internet connection.');
              }
            }}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Send Test Notification
          </button>
        </div>
      </div>
    </div>
  );
}
