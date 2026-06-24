import { useEffect, useState } from 'react';

export default function SystemOverlay() {
  const [overlay, setOverlay] = useState(null);

  useEffect(() => {
    const handleTrigger = (e) => {
      const { type, isTest } = e.detail;
      
      let stats = { successes: 0, penalties: 0 };
      try {
        const prefs = JSON.parse(localStorage.getItem('scheduler_prefs') || '{}');
        stats = prefs.rpgStats || stats;
        
        if (!isTest) {
          if (type === 'success') stats.successes += 1;
          if (type === 'fail') stats.penalties += 1;
          
          prefs.rpgStats = stats;
          localStorage.setItem('scheduler_prefs', JSON.stringify(prefs));
          // Dispatch storage event so other tabs/components know if needed
          window.dispatchEvent(new Event('storage'));
        }
      } catch (err) {}

      setOverlay({ ...e.detail, stats });
      setTimeout(() => setOverlay(null), 3500);
    };
    window.addEventListener('system-overlay', handleTrigger);
    return () => window.removeEventListener('system-overlay', handleTrigger);
  }, []);

  if (!overlay) return null;

  const isSuccess = overlay.type === 'success';

  return (
    <div className={`fixed inset-0 z-[9999] pointer-events-none flex flex-col items-center justify-center ${isSuccess ? 'animate-system-success' : 'animate-system-fail'}`}>
      <div className="text-center animate-pulse">
        <h1 className={`text-5xl md:text-8xl font-black uppercase tracking-[0.2em] ${isSuccess ? 'text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]' : 'text-red-600 system-text-glitch drop-shadow-[0_0_30px_rgba(220,38,38,1)]'}`}>
          {overlay.title || (isSuccess ? 'QUEST COMPLETED' : 'PENALTY')}
        </h1>
        {overlay.subtitle && (
          <p className={`mt-4 text-xl md:text-3xl font-bold uppercase tracking-[0.1em] ${isSuccess ? 'text-blue-200' : 'text-red-400'}`}>
            {overlay.subtitle}
          </p>
        )}
        
        {overlay.stats && (
          <div className={`mt-8 flex gap-8 justify-center opacity-80 border-t-2 pt-6 ${isSuccess ? 'border-blue-500/30' : 'border-red-500/30'}`}>
            <div className="flex flex-col items-center">
              <span className={`text-sm md:text-base tracking-widest font-bold ${isSuccess ? 'text-blue-300' : 'text-red-300'}`}>SUCCESSES</span>
              <span className={`text-3xl md:text-4xl font-black ${isSuccess ? 'text-blue-100' : 'text-red-100'}`}>{overlay.stats.successes}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className={`text-sm md:text-base tracking-widest font-bold ${isSuccess ? 'text-blue-300' : 'text-red-300'}`}>PENALTIES</span>
              <span className={`text-3xl md:text-4xl font-black ${isSuccess ? 'text-blue-100' : 'text-red-100'}`}>{overlay.stats.penalties}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
