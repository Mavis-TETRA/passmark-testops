import React, { useEffect, useState } from 'react';
import { AlertTriangleIcon, BoxesIcon, Globe2Icon, ServerIcon, SparklesIcon } from 'lucide-react';
import type { CreateTestPackInput } from '../../context/AppContext';
import type { EnvironmentName, Project, Target } from '../../lib/types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export function CreateTestPackModal({
  open,
  onClose,
  project,
  environment,
  target,
  targetUrl,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  project: Project;
  environment: EnvironmentName;
  target: Target | null;
  targetUrl: string | null;
  onCreate: (input: CreateTestPackInput) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<CreateTestPackInput['kind']>('feature');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setKind('feature');
  }, [open]);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim(),
        kind,
        caseIds: [],
        defaultEnvironment: environment,
        defaultTargetId: target?.id,
      });
      onClose();
    } catch {
      // The caller presents the error and leaves the modal open for retry.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Test Pack"
      subtitle="Define the scope first. The pack starts empty so you can generate focused cases with Local AI."
      size="max-w-2xl"
      icon={<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft"><BoxesIcon className="h-5 w-5 text-accent" /></div>}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!name.trim() || !targetUrl || saving} title={!targetUrl ? `No target URL is configured for ${environment}.` : undefined} onClick={() => void submit()}>
          <SparklesIcon className="h-4 w-4" />
          {saving ? 'Creating…' : 'Create and generate'}
        </Button>
      </>}
    >
      <div className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-2">Pack name</span>
            <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Login and authentication" className="control" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-2">Pack type</span>
            <select value={kind} onChange={(event) => setKind(event.target.value as CreateTestPackInput['kind'])} className="control">
              <option value="feature">Feature</option>
              <option value="requirement">Requirement</option>
              <option value="release">Release</option>
              <option value="custom">Custom</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Requirement or scope</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Describe the feature, acceptance criteria, business rules or release goal. This text will be suggested to Local AI."
            className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent"
          />
        </label>

        <section aria-label="Automatic target context" className="overflow-hidden rounded-xl border border-line bg-surface-2/55">
          <div className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-2.5">
            <div>
              <div className="text-xs font-semibold text-ink">Automatic target context</div>
              <div className="mt-0.5 text-2xs text-ink-3">Taken from the current project and environment.</div>
            </div>
            <span className="rounded-md border border-line bg-surface px-2 py-1 text-2xs font-semibold text-ink-2">{environment}</span>
          </div>
          <div className="grid gap-3 p-3.5 sm:grid-cols-2">
            <div className="flex min-w-0 items-start gap-2.5">
              <ServerIcon className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
              <div className="min-w-0">
                <div className="text-2xs text-ink-3">Project</div>
                <div className="truncate text-sm font-medium text-ink">{project.name}</div>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-2.5">
              <Globe2Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
              <div className="min-w-0">
                <div className="text-2xs text-ink-3">Target</div>
                <div className="truncate text-sm font-medium text-ink">{target?.name || 'No target available'}</div>
                {target && <div className="mt-0.5 text-2xs text-ink-3">{target.type}</div>}
              </div>
            </div>
          </div>
          {targetUrl
            ? <div className="border-t border-line bg-surface px-3.5 py-2.5"><div className="text-2xs text-ink-3">URL used by AI and the test runner</div><div className="mt-1 break-all font-mono text-xs text-ink">{targetUrl}</div></div>
            : <div className="flex items-start gap-2 border-t border-[rgb(var(--block))]/20 bg-[rgb(var(--block-soft))] px-3.5 py-2.5 text-xs text-ink-2"><AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--block))]" /><span>No target URL is configured for {environment}. Change the environment in the top bar or configure the Project target first.</span></div>}
        </section>

        <div className="rounded-lg border border-accent/25 bg-accent-soft px-3 py-2.5 text-xs text-ink-2">
          After creation, the AI generator opens for this pack. Every valid batch is saved directly into it.
        </div>
      </div>
    </Modal>
  );
}
