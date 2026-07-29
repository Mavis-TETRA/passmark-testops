import React from 'react';
import { ChevronUpIcon, Loader2Icon, SparklesIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export function AIGenerationProgressDock() {
  const navigate = useNavigate();
  const {
    testcaseGeneration,
    testcaseGenerationActive,
    generationPanelVisible,
    setCurrentProjectId,
    requestGenerationPanel,
  } = useApp();

  if (!testcaseGeneration || !testcaseGenerationActive || generationPanelVisible) return null;

  const progress = testcaseGeneration.progress;
  const generated = progress?.generatedCount || 0;
  const target = progress?.targetCount || testcaseGeneration.targetCount;
  const percent = progress?.percent || 0;
  const cancelling = testcaseGeneration.phase === 'cancelling';

  const openProgress = () => {
    setCurrentProjectId(testcaseGeneration.projectId, { syncEnvironment: false });
    requestGenerationPanel();
    navigate('/workspace');
  };

  return (
    <button
      type="button"
      onClick={openProgress}
      className="fixed bottom-5 right-5 z-50 w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-accent/40 bg-elevated text-left shadow-pop transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-accent"
      aria-label="Open AI generation progress and cancellation controls"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          {cancelling ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SparklesIcon className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-sm font-semibold text-ink">
              {cancelling ? 'Cancelling AI generation…' : `Generating · ${testcaseGeneration.packName}`}
            </span>
            <span className="shrink-0 text-xs font-semibold text-accent">{generated}/{target}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-ink-3">
            {progress?.message || 'Starting Local AI generation…'}
          </p>
        </div>
        <ChevronUpIcon className="h-4 w-4 shrink-0 text-ink-3" />
      </div>
      <div className="h-1.5 bg-surface-2">
        <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>
      <div className="border-t border-line px-4 py-1.5 text-2xs text-ink-3">
        Click to view details or cancel
      </div>
    </button>
  );
}
