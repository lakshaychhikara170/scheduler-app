import React, { useState, useEffect } from 'react';
import api from '../api';
import { Clock, X, Image as ImageIcon, FileText, Trash2 } from 'lucide-react';

export default function GoalModal({ goal, onClose, onSave }) {
  const [notes, setNotes] = useState(goal.description || '');
  const [media, setMedia] = useState([]);
  const [expandedMedia, setExpandedMedia] = useState(null);

  const openPdf = (src) => {
    const pdfWindow = window.open("");
    if (pdfWindow) {
      pdfWindow.document.write(`<iframe width='100%' height='100%' style='border:none;margin:0;padding:0;' src='${src}'></iframe>`);
      pdfWindow.document.body.style.margin = '0';
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadMedia = async () => {
      try {
        const res = await api.get(`/events/${goal.id}`);
        if (isMounted && res.data.attachments && res.data.attachments !== '[]') {
          setMedia(typeof res.data.attachments === 'string' ? JSON.parse(res.data.attachments) : res.data.attachments);
        }
      } catch (e) {
        console.error('Failed to load media', e);
      }
    };

    if (goal.attachments === undefined) {
      loadMedia();
    } else {
      try {
        if (goal.attachments !== '[]') {
          setMedia(typeof goal.attachments === 'string' ? JSON.parse(goal.attachments) : goal.attachments);
        }
      } catch (e) { console.error('Media parse error', e); }
    }
    return () => { isMounted = false; };
  }, [goal]);

  const handleMediaUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => setMedia(prev => [...prev, event.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveMedia = (index) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {expandedMedia && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setExpandedMedia(null)}>
          <button type="button" className="absolute top-6 right-6 text-white hover:text-zinc-300 z-[70] cursor-pointer" onClick={() => setExpandedMedia(null)}>
            <X className="w-8 h-8" />
          </button>
          {expandedMedia.type === 'video' ? (
            <video src={expandedMedia.src} controls autoPlay className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
          ) : (
            <img src={expandedMedia.src} alt="enlarged" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
          )}
        </div>
      )}
      <div className="glass-panel w-full max-w-2xl rounded-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--panel-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>{goal.title}</h2>
              <p className="text-sm opacity-50 font-medium flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <Clock className="w-3.5 h-3.5" />
                {new Date(goal.start_time).toLocaleString()}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer opacity-40 hover:opacity-100">
            <X className="w-5 h-5" style={{ color: 'var(--text-main)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2 opacity-70" style={{ color: 'var(--text-main)' }}>Notepad / Details</label>
            <textarea
              className="w-full glass-input min-h-[150px] resize-y placeholder:opacity-30 focus:ring-primary/50"
              style={{ 
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--panel-border)',
                color: 'var(--text-main)'
              }}
              placeholder="Further clarify your goal, document your progress, or write notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold opacity-70" style={{ color: 'var(--text-main)' }}>Media Attachments</label>
              <label className="cursor-pointer flex items-center gap-2 text-primary hover:text-white transition-colors text-sm font-medium bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 hover:bg-primary">
                <ImageIcon className="w-4 h-4" />
                Add Media
                <input type="file" multiple accept="image/*,video/*,application/pdf" className="hidden" onChange={handleMediaUpload} />
              </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {media.map((imgSrc, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden border bg-black/5 aspect-video flex-shrink-0 cursor-pointer hover:border-primary/50 transition-colors" style={{ borderColor: 'var(--panel-border)' }}>
                  {imgSrc.startsWith('data:video') ? (
                    <video src={imgSrc} className="w-full h-full object-cover" onClick={() => setExpandedMedia({type: 'video', src: imgSrc})} />
                  ) : imgSrc.startsWith('data:application/pdf') ? (
                    <div onClick={() => openPdf(imgSrc)} className="w-full h-full flex flex-col items-center justify-center bg-black/10 text-red-400">
                      <FileText className="w-8 h-8 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">PDF Document</span>
                    </div>
                  ) : (
                    <img src={imgSrc} alt="attachment" className="w-full h-full object-cover" onClick={() => setExpandedMedia({type: 'image', src: imgSrc})} />
                  )}
                  <button 
                    type="button"
                    onClick={() => handleRemoveMedia(idx)}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {media.length === 0 && (
                <div className="col-span-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center opacity-30" style={{ borderColor: 'var(--panel-border)', color: 'var(--text-main)' }}>
                  <ImageIcon className="w-8 h-8 mb-2" />
                  <p className="text-sm font-bold uppercase tracking-widest">No media attached </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end gap-3 transition-colors" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg font-medium hover:bg-black/5 transition-colors cursor-pointer opacity-70 hover:opacity-100" style={{ color: 'var(--text-main)' }}>
            Cancel
          </button>
          <button type="button" onClick={() => onSave(goal.id, notes, media)} className="bg-primary hover:opacity-90 text-white px-6 py-2 rounded-lg font-bold uppercase tracking-widest text-xs transition-all shadow-lg hover:scale-105 cursor-pointer">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
