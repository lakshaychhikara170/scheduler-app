import { useEffect, useState } from 'react';

export default function SystemOverlay() {
  const [overlay, setOverlay] = useState(null);

  useEffect(() => {
    const handleTrigger = (e) => {
      setOverlay(e.detail);
      setTimeout(() => setOverlay(null), 3000);
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
      </div>
    </div>
  );
}
