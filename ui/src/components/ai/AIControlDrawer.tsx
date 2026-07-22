import React, { useEffect, useState } from 'react';
import { BotIcon, CheckCircle2Icon, MemoryStickIcon, RefreshCwIcon, ServerOffIcon, UnplugIcon, ZapIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Drawer } from '../ui/Drawer';

export function AIControlDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { aiStatus, checkAI, testAI, unloadAI } = useApp();
  const [busy, setBusy] = useState<'check' | 'test' | 'unload' | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (busy !== 'test') return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [busy]);

  const action = async (kind: 'check' | 'test' | 'unload') => {
    if (kind === 'test') {
      setElapsed(0);
      setTestResult(null);
    }
    setBusy(kind);
    try {
      if (kind === 'check') await checkAI();
      if (kind === 'test') {
        const message = await testAI();
        setTestResult({ ok: true, message });
        toast.success(message);
      }
      if (kind === 'unload') {
        await unloadAI();
        toast.success('Local AI model unloaded from memory.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (kind === 'test') setTestResult({ ok: false, message });
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Local AI control" subtitle="Health, active model and memory controls" width="max-w-md">
      <div className="space-y-5 p-5">
        <section className={`rounded-xl border p-4 ${aiStatus.online ? 'border-[rgb(var(--ok))]/25 bg-[rgb(var(--ok-soft))]' : 'border-[rgb(var(--fail))]/25 bg-[rgb(var(--fail-soft))]'}`}>
          <div className="flex items-start gap-3">
            <div className={`rounded-lg p-2 ${aiStatus.online ? 'text-[rgb(var(--ok))]' : 'text-[rgb(var(--fail))]'}`}>
              {aiStatus.online ? <CheckCircle2Icon className="h-5 w-5" /> : <ServerOffIcon className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink">{aiStatus.online ? 'Local AI online' : 'Local AI offline'}</div>
              <p className="mt-1 text-xs text-ink-2">{aiStatus.message}</p>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <Info icon={BotIcon} label="Model" value={aiStatus.model} mono />
          <Info icon={ZapIcon} label="Provider" value={aiStatus.provider} />
          <Info icon={MemoryStickIcon} label="Loaded models" value={String(aiStatus.models.length)} />
          <Info icon={UnplugIcon} label="Endpoint" value={aiStatus.baseUrl || 'Not configured'} mono />
        </section>

        <div className="rounded-lg border border-line bg-surface-2 p-3 text-xs text-ink-2">
          Runtime values come from <code className="font-mono text-ink">.env</code>. Secrets are never editable or exposed in the browser. The controls below only verify the model or release Ollama memory.
        </div>

        {busy === 'test' && <AITestProgress model={aiStatus.model} elapsed={elapsed} />}
        {busy !== 'test' && testResult && <div role="status" className={`rounded-lg border px-3 py-2.5 text-xs ${testResult.ok ? 'border-[rgb(var(--ok))]/25 bg-[rgb(var(--ok-soft))] text-[rgb(var(--ok))]' : 'border-[rgb(var(--fail))]/25 bg-[rgb(var(--fail-soft))] text-[rgb(var(--fail))]'}`}>
          <div className="font-semibold">{testResult.ok ? 'AI test completed' : 'AI test failed'}</div>
          <p className="mt-0.5 text-ink-2">{testResult.message}</p>
        </div>}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button variant="secondary" disabled={busy !== null} onClick={() => action('check')}>
            <RefreshCwIcon className={`h-4 w-4 ${busy === 'check' ? 'animate-spin' : ''}`} /> Check
          </Button>
          <Button variant="primary" disabled={busy !== null || !aiStatus.online} onClick={() => action('test')}>
            {busy === 'test' ? <RefreshCwIcon className="h-4 w-4 animate-spin" /> : <ZapIcon className="h-4 w-4" />}
            {busy === 'test' ? `Testing · ${formatElapsed(elapsed)}` : 'Test'}
          </Button>
          <Button variant="ghost" disabled={busy !== null || aiStatus.provider !== 'ollama'} onClick={() => action('unload')}>
            <MemoryStickIcon className="h-4 w-4" /> Unload
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

function AITestProgress({ model, elapsed }: { model: string; elapsed: number }) {
  const detail = elapsed < 5
    ? 'Connecting to the local AI service…'
    : elapsed < 35
      ? 'The model may be loading into memory…'
      : 'Waiting for the model response. The first test after Unload can take 1–2 minutes.';
  return <div role="status" aria-live="polite" className="rounded-xl border border-accent/30 bg-accent-soft/50 p-3.5">
    <div className="flex items-start gap-3">
      <RefreshCwIcon className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-accent" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-ink">Testing local AI</span>
          <span className="font-mono text-xs tabular-nums text-accent">{formatElapsed(elapsed)}</span>
        </div>
        <p className="mt-1 truncate font-mono text-2xs text-ink-2">{model}</p>
        <p className="mt-1.5 text-xs text-ink-2">{detail}</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-accent" />
        </div>
      </div>
    </div>
  </div>;
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return minutes ? `${minutes}:${String(remaining).padStart(2, '0')}` : `${remaining}s`;
}

function Info({ icon: Icon, label, value, mono }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
      <Icon className="h-4 w-4 text-ink-3" />
      <span className="text-xs text-ink-3">{label}</span>
      <span className={`ml-auto max-w-[65%] truncate text-xs font-medium text-ink ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
