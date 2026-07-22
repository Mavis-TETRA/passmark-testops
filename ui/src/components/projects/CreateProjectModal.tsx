import React, { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import type { EnvironmentName } from '../../lib/types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export function CreateProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createProject } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [environment, setEnvironment] = useState<EnvironmentName>('Staging');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || !baseUrl.trim()) return;
    setSaving(true);
    try {
      await createProject({ name: name.trim(), description: description.trim(), baseUrl: baseUrl.trim(), environment });
      toast.success(`${name.trim()} created with a default target and test workspace.`);
      setName('');
      setDescription('');
      setBaseUrl('');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New project"
      subtitle="Create the target, starter suite and Smoke/Regression packs together."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={saving || !name.trim() || !baseUrl.trim()} onClick={() => void submit()}><PlusIcon className="h-4 w-4" />{saving ? 'Creating…' : 'Create project'}</Button></>}
    >
      <div className="space-y-3 p-5">
        <label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Project name</span><input className="control" value={name} onChange={(event) => setName(event.target.value)} placeholder="Checkout service" /></label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Description</span><textarea className="control min-h-20 py-2" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What the team validates in this project" /></label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Default target URL</span><input className="control font-mono" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder={environment === 'Local' ? 'http://localhost:3000' : 'https://staging.example.com'} />{environment === 'Local' && <span className="mt-1 block text-2xs text-ink-3">The Docker runner automatically reaches this URL through the host machine.</span>}</label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Environment</span><select className="control" value={environment} onChange={(event) => setEnvironment(event.target.value as EnvironmentName)}><option>Local</option><option>Development</option><option>Staging</option><option>Production</option></select></label>
      </div>
    </Modal>
  );
}
