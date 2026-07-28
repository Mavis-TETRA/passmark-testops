import React, { useEffect, useState } from 'react';
import { BoxesIcon, SparklesIcon } from 'lucide-react';
import type { CreateTestPackInput } from '../../context/AppContext';
import type { EnvironmentName, Project } from '../../lib/types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

const environments: EnvironmentName[] = ['Local', 'Development', 'Staging', 'Production'];

export function CreateTestPackModal({
  open,
  onClose,
  project,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  project: Project;
  onCreate: (input: CreateTestPackInput) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<CreateTestPackInput['kind']>('feature');
  const [defaultEnvironment, setDefaultEnvironment] = useState<EnvironmentName | ''>('');
  const [defaultTargetId, setDefaultTargetId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setKind('feature');
    setDefaultEnvironment('');
    setDefaultTargetId('');
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
        defaultEnvironment: defaultEnvironment || undefined,
        defaultTargetId: defaultTargetId || undefined,
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
        <Button variant="primary" disabled={!name.trim() || saving} onClick={() => void submit()}>
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

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-2">Default environment</span>
            <select value={defaultEnvironment} onChange={(event) => setDefaultEnvironment(event.target.value as EnvironmentName | '')} className="control">
              <option value="">Use project default ({project.environment})</option>
              {environments.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-2">Default target</span>
            <select value={defaultTargetId} onChange={(event) => setDefaultTargetId(event.target.value)} className="control">
              <option value="">Use project default</option>
              {project.targets.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}
            </select>
          </label>
        </div>

        <div className="rounded-lg border border-accent/25 bg-accent-soft px-3 py-2.5 text-xs text-ink-2">
          After creation, the AI generator opens for this pack. Every valid batch is saved directly into it.
        </div>
      </div>
    </Modal>
  );
}
