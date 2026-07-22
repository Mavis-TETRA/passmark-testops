import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CameraIcon, FileTextIcon, VideoIcon, XIcon } from 'lucide-react';

interface EvidenceItem {
  type: 'screenshot' | 'video' | 'trace';
  label: string;
  url?: string;
}

const ICON = { screenshot: CameraIcon, video: VideoIcon, trace: FileTextIcon };

export function EvidenceViewer({ screenshot, video, trace }: { screenshot?: boolean | string; video?: boolean | string; trace?: boolean | string }) {
  const items: EvidenceItem[] = [];
  if (screenshot) items.push({ type: 'screenshot', label: evidenceLabel(screenshot, 'failure-screenshot.png'), url: typeof screenshot === 'string' ? screenshot : undefined });
  if (video) items.push({ type: 'video', label: evidenceLabel(video, 'run-recording.webm'), url: typeof video === 'string' ? video : undefined });
  if (trace) items.push({ type: 'trace', label: evidenceLabel(trace, 'trace.zip'), url: typeof trace === 'string' ? trace : undefined });
  const [lightbox, setLightbox] = useState<EvidenceItem | null>(null);

  if (!items.length) return <div className="text-xs italic text-ink-3">No evidence captured for this test.</div>;

  const openItem = (item: EvidenceItem) => {
    if (item.type === 'screenshot') setLightbox(item);
    else if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => {
          const Icon = ICON[item.type];
          return <button key={item.type} onClick={() => openItem(item)} className="group overflow-hidden rounded-lg border border-line text-left hover:border-line-strong"><div className="relative flex aspect-video items-center justify-center bg-surface-2">{item.type === 'screenshot' && item.url ? <img src={item.url} alt="Captured test evidence" className="h-full w-full object-cover" /> : <Icon className="h-7 w-7 text-ink-3" />}</div><div className="flex items-center gap-1.5 border-t border-line px-2 py-1.5"><Icon className="h-3 w-3 shrink-0 text-ink-3" /><span className="truncate font-mono text-2xs text-ink-2">{item.label}</span></div></button>;
        })}
      </div>

      <AnimatePresence>
        {lightbox && <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label="Evidence preview"><motion.button aria-label="Close evidence preview" className="absolute inset-0 bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightbox(null)} /><motion.div className="relative w-full max-w-3xl overflow-hidden rounded-xl border border-line bg-elevated shadow-pop" initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}><div className="flex h-11 items-center justify-between border-b border-line px-4"><span className="font-mono text-xs text-ink-2">{lightbox.label}</span><button onClick={() => setLightbox(null)} aria-label="Close preview" className="rounded p-1 text-ink-3 hover:text-ink"><XIcon className="h-4 w-4" /></button></div><div className="flex aspect-video items-center justify-center bg-surface-2">{lightbox.url ? <img src={lightbox.url} alt="Captured test evidence" className="max-h-full max-w-full object-contain" /> : <div className="flex flex-col items-center gap-2 text-ink-3"><CameraIcon className="h-9 w-9" /><span className="text-xs">Screenshot metadata was recorded, but no file URL is available.</span></div>}</div></motion.div></div>}
      </AnimatePresence>
    </>
  );
}

function evidenceLabel(value: boolean | string, fallback: string) {
  if (typeof value !== 'string') return fallback;
  try { return decodeURIComponent(value.split('/').pop() || fallback); }
  catch { return fallback; }
}
