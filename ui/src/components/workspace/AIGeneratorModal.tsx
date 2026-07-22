import React, { useEffect, useState } from 'react';
import { Loader2Icon, SparklesIcon, WifiOffIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

type Coverage = 'Quick' | 'Standard' | 'Comprehensive';
type Scope = 'Smoke' | 'Regression' | 'Full';

const COVERAGE: Array<{ key: Coverage; description: string; count: number }> = [
  { key: 'Quick', description: 'Critical paths only', count: 8 },
  { key: 'Standard', description: 'Core flows and common edge cases', count: 22 },
  { key: 'Comprehensive', description: 'Broad negative and edge coverage', count: 44 },
];

export function AIGeneratorModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (count: number, request: string) => Promise<number>;
}) {
  const { aiStatus, checkAI } = useApp();
  const [source, setSource] = useState('');
  const [coverage, setCoverage] = useState<Coverage>('Quick');
  const [scope, setScope] = useState<Scope>('Smoke');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suggestedCount = COVERAGE.find((item) => item.key === coverage)?.count || 8;

  useEffect(() => {
    if (open) void checkAI();
  }, [open]);

  const close = () => {
    if (saving) return;
    setSource('');
    setError(null);
    onClose();
  };

  const generate = async () => {
    setSaving(true);
    setError(null);
    try {
      const request = [
        source.trim(),
        `Classification: ${scope}.`,
        `Coverage level: ${coverage}.`,
        `Generate approximately ${suggestedCount} focused test cases.`,
      ].join('\n');
      const saved = await onConfirm(suggestedCount, request);
      toast.success(`${saved} AI-generated test cases saved.`);
      setSource('');
      onClose();
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : String(generateError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="max-w-2xl"
      icon={<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft"><SparklesIcon className="h-5 w-5 text-accent" /></div>}
      title="Generate test cases"
      subtitle="Generate and save real cases with the configured local AI."
      footer={<>
        <Button variant="ghost" onClick={close} disabled={saving}>Cancel</Button>
        <Button variant="primary" onClick={() => void generate()} disabled={saving || !source.trim() || !aiStatus.online}>
          {saving ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SparklesIcon className="h-4 w-4" />}
          {saving ? 'Generating…' : `Generate ~${suggestedCount}`}
        </Button>
      </>}
    >
      <div className="space-y-4 px-5 py-4">
        <div className={cn('flex items-start gap-2 rounded-lg border p-3 text-xs', aiStatus.online ? 'border-[rgb(var(--ok))]/25 bg-[rgb(var(--ok-soft))]' : 'border-[rgb(var(--fail))]/25 bg-[rgb(var(--fail-soft))]')}>
          {aiStatus.checking ? <Loader2Icon className="h-4 w-4 shrink-0 animate-spin" /> : <WifiOffIcon className="h-4 w-4 shrink-0" />}
          <div><span className="font-medium text-ink">{aiStatus.checking ? 'Checking local AI…' : aiStatus.online ? `Local AI ready · ${aiStatus.model}` : 'Local AI unavailable'}</span><p className="mt-0.5 text-ink-2">{aiStatus.message}</p></div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-2">Task, bug report, or acceptance criteria</label>
          <textarea
            autoFocus
            value={source}
            onChange={(event) => setSource(event.target.value)}
            rows={5}
            placeholder="Paste the real requirement to generate cases from…"
            className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent"
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-2">Coverage</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {COVERAGE.map((item) => <button key={item.key} type="button" onClick={() => setCoverage(item.key)} aria-pressed={coverage === item.key} className={cn('rounded-lg border p-3 text-left transition-colors', coverage === item.key ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-2')}><div className="text-sm font-medium text-ink">{item.key}</div><div className="mt-0.5 text-2xs text-ink-3">{item.description}</div><div className="mt-1.5 text-2xs font-medium text-accent">~{item.count} cases</div></button>)}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-2">Classification</span>
          <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
            {(['Smoke', 'Regression', 'Full'] as Scope[]).map((item) => <button key={item} type="button" onClick={() => setScope(item)} aria-pressed={scope === item} className={cn('h-8 rounded-md px-4 text-sm font-medium transition-colors', scope === item ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink')}>{item}</button>)}
          </div>
        </div>

        {error && <div role="alert" className="rounded-lg border border-[rgb(var(--fail))]/25 bg-[rgb(var(--fail-soft))] p-3 text-sm text-[rgb(var(--fail))]">{error}</div>}
        <p className="text-xs text-ink-3">Cases are saved only after the backend receives valid output from local AI. No demo or fallback cases are inserted.</p>
      </div>
    </Modal>
  );
}
