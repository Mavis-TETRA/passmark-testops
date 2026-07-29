import React, { useEffect, useState } from 'react';
import { Clock3Icon, Loader2Icon, SparklesIcon, SquareIcon, WifiOffIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { TestcaseGenerationOptions } from '../../context/AppContext';
import { cn } from '../../lib/cn';
import type { TestType } from '../../lib/types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

type Coverage = 'Quick' | 'Standard' | 'Comprehensive';
type Scope = 'Smoke' | 'Regression' | 'Full';

const COVERAGE: Array<{ key: Coverage; description: string; count: number }> = [
  { key: 'Quick', description: 'Critical paths only', count: 8 },
  { key: 'Standard', description: 'Core flows and common edge cases', count: 22 },
  { key: 'Comprehensive', description: 'Broad negative and edge coverage', count: 44 },
];

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${String(seconds).padStart(2, '0')}s` : `${seconds}s`;
}

export function AIGeneratorModal({
  open,
  onClose,
  onConfirm,
  packName,
  initialSource = '',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (count: number, request: string, options?: TestcaseGenerationOptions) => Promise<number>;
  packName?: string;
  initialSource?: string;
}) {
  const {
    aiStatus,
    checkAI,
    testcaseGeneration,
    testcaseGenerationActive,
    cancelTestcaseGeneration,
  } = useApp();
  const [source, setSource] = useState('');
  const [coverage, setCoverage] = useState<Coverage>('Quick');
  const [scope, setScope] = useState<Scope>('Smoke');
  const [testType, setTestType] = useState<TestType>('Functional');
  const [starting, setStarting] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const suggestedCount = COVERAGE.find((item) => item.key === coverage)?.count || 8;
  const saving = starting || testcaseGenerationActive;
  const cancelling = testcaseGeneration?.phase === 'cancelling';
  const progress = testcaseGenerationActive ? testcaseGeneration?.progress || null : null;
  const displayPackName = testcaseGenerationActive ? testcaseGeneration?.packName : packName;
  const targetTotal = testcaseGenerationActive ? testcaseGeneration?.targetCount || suggestedCount : suggestedCount;

  useEffect(() => {
    if (!open) return;
    void checkAI();
    if (!testcaseGenerationActive) setSource(initialSource);
  }, [open, initialSource, testcaseGenerationActive]);

  useEffect(() => {
    if (!saving) return;
    const startedAt = testcaseGeneration?.startedAt
      ? Date.parse(testcaseGeneration.startedAt)
      : Date.now() - (progress?.durationMs || 0);
    const updateElapsed = () => setElapsedMs(Date.now() - startedAt);
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [saving, testcaseGeneration?.startedAt]);

  const cancelGeneration = () => {
    if (!saving || cancelling) return;
    cancelTestcaseGeneration();
  };

  const close = () => {
    if (!saving) {
      setSource('');
      setElapsedMs(0);
      setError(null);
    }
    onClose();
  };

  const generate = async () => {
    if (saving) return;
    setStarting(true);
    setElapsedMs(0);
    setError(null);
    try {
      const request = [
        source.trim(),
        `Classification: ${scope}.`,
        `Test type: ${testType}.`,
        `Coverage level: ${coverage}.`,
        `Generate approximately ${suggestedCount} focused test cases.`,
      ].join('\n');
      await onConfirm(suggestedCount, request);
      setSource('');
      onClose();
    } catch (generateError) {
      const message = generateError instanceof Error ? generateError.message : String(generateError);
      if (!/cancelled|canceled/i.test(message)) setError(message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="max-w-2xl"
      icon={<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft"><SparklesIcon className="h-5 w-5 text-accent" /></div>}
      title="Generate test cases"
      subtitle={displayPackName ? `Generate and save cases directly into “${displayPackName}”.` : 'Generate and save real cases with the configured local AI.'}
      footer={<>
        {saving
          ? <Button variant="danger" onClick={cancelGeneration} disabled={cancelling}><SquareIcon className="h-3.5 w-3.5" />{cancelling ? 'Cancelling…' : 'Cancel generation'}</Button>
          : <Button variant="ghost" onClick={close}>{progress?.status === 'cancelled' ? 'Close' : 'Cancel'}</Button>}
        <Button variant="primary" onClick={() => void generate()} disabled={saving || !source.trim() || !aiStatus.online}>
          {saving ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SparklesIcon className="h-4 w-4" />}
          {saving ? `${progress?.generatedCount || 0}/${progress?.targetCount || targetTotal} generated` : `Generate ~${suggestedCount}`}
        </Button>
      </>}
    >
      <div className="space-y-4 px-5 py-4">
        <div className={cn('flex items-start gap-2 rounded-lg border p-3 text-xs', aiStatus.online ? 'border-[rgb(var(--ok))]/25 bg-[rgb(var(--ok-soft))]' : 'border-[rgb(var(--fail))]/25 bg-[rgb(var(--fail-soft))]')}>
          {aiStatus.checking ? <Loader2Icon className="h-4 w-4 shrink-0 animate-spin" /> : <WifiOffIcon className="h-4 w-4 shrink-0" />}
          <div><span className="font-medium text-ink">{aiStatus.checking ? 'Checking local AI…' : aiStatus.online ? `Local AI ready · ${aiStatus.model}` : 'Local AI unavailable'}</span><p className="mt-0.5 text-ink-2">{aiStatus.message}</p></div>
        </div>

        {(saving || progress) && <div aria-live="polite" className="rounded-lg border border-accent/30 bg-accent-soft p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {saving && <Loader2Icon className="h-4 w-4 shrink-0 animate-spin text-accent" />}
              <span className="truncate text-sm font-medium text-ink">
                {cancelling ? 'Cancelling generation…' : progress?.message || 'Starting Local AI generation…'}
              </span>
            </div>
            <span className="shrink-0 text-sm font-semibold text-accent">
              {progress?.generatedCount || 0}/{progress?.targetCount || targetTotal}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${progress?.percent || 0}%` }} />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-2xs text-ink-3">
            <span>Batch <strong className="text-ink-2">{Math.max(1, progress?.batch || 1)}/{progress?.estimatedBatches || suggestedCount}</strong></span>
            <span>Attempt <strong className="text-ink-2">{progress?.attempt || 0}/{progress?.maxAttempts || suggestedCount + 2}</strong></span>
            <span className="flex items-center justify-end gap-1"><Clock3Icon className="h-3 w-3" /><strong className="text-ink-2">{formatDuration(Math.max(elapsedMs, progress?.durationMs || 0))}</strong></span>
          </div>
          {saving && (progress?.generatedCount || 0) === 0 && elapsedMs >= 30000 && <p className="mt-2 text-2xs text-ink-3">The model is still working. Incoming response activity is shown above; you can cancel safely at any time.</p>}
          {(progress?.generatedCount || 0) > 0 && <p className="mt-2 text-2xs text-ink-3">Valid cases are already saved in this Test Pack. Cancelling keeps these partial results.</p>}
        </div>}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-2">Task, bug report, or acceptance criteria</label>
          <textarea
            autoFocus
            disabled={saving}
            value={source}
            onChange={(event) => setSource(event.target.value)}
            rows={5}
            placeholder="Paste the real requirement to generate cases from…"
            className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-2" htmlFor="ai-test-type">Test type</label>
          <select id="ai-test-type" disabled={saving} value={testType} onChange={(event) => setTestType(event.target.value as TestType)} className="control disabled:cursor-not-allowed disabled:opacity-60">
            <option>Functional</option><option>UI</option><option>API</option><option>Accessibility</option><option>SEO</option><option>Performance</option><option>Security</option>
          </select>
          <p className="mt-1 text-2xs text-ink-3">The generated cases are classified so QA can run them with the matching runner.</p>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-2">Coverage</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {COVERAGE.map((item) => <button key={item.key} type="button" disabled={saving} onClick={() => setCoverage(item.key)} aria-pressed={coverage === item.key} className={cn('rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60', coverage === item.key ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-2')}><div className="text-sm font-medium text-ink">{item.key}</div><div className="mt-0.5 text-2xs text-ink-3">{item.description}</div><div className="mt-1.5 text-2xs font-medium text-accent">~{item.count} cases</div></button>)}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-2">Classification</span>
          <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
            {(['Smoke', 'Regression', 'Full'] as Scope[]).map((item) => <button key={item} type="button" disabled={saving} onClick={() => setScope(item)} aria-pressed={scope === item} className={cn('h-8 rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60', scope === item ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink')}>{item}</button>)}
          </div>
        </div>

        {error && <div role="alert" className="rounded-lg border border-[rgb(var(--fail))]/25 bg-[rgb(var(--fail-soft))] p-3 text-sm text-[rgb(var(--fail))]">{error}</div>}
        <p className="text-xs text-ink-3">Each valid batch is saved immediately. No demo or fallback cases are inserted.</p>
      </div>
    </Modal>
  );
}
