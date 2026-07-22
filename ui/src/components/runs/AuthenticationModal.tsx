import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangleIcon, CheckCircle2Icon, KeyRoundIcon, LoaderCircleIcon, ShieldCheckIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { EnvironmentAuthConfig, EnvironmentAuthMode, EnvironmentName, Project } from '../../lib/types';
import { post, put } from '../../lib/api';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

const MODES: Array<{ value: EnvironmentAuthMode; label: string; description: string }> = [
  { value: 'none', label: 'No authentication', description: 'Public target without credentials.' },
  { value: 'form', label: 'Web form login', description: 'Sign in through a login page before browser tests.' },
  { value: 'bearer', label: 'Bearer token', description: 'Send an Authorization: Bearer header.' },
  { value: 'api_key', label: 'API key', description: 'Send a key through a header or query parameter.' },
  { value: 'basic', label: 'Basic authentication', description: 'Send an HTTP Basic Authorization header.' },
  { value: 'custom_headers', label: 'Custom headers', description: 'Send one or more private request headers.' },
];

const emptyConfig: EnvironmentAuthConfig = {
  mode: 'none', loginUrl: '', username: '', usernameSelector: '', passwordSelector: '', submitSelector: '', successSelector: '',
  apiKeyName: 'X-API-Key', apiKeyLocation: 'header', secretConfigured: false, customHeaderNames: [],
};

export function AuthenticationModal({ open, onClose, project, environment, baseUrl, onSaved }: {
  open: boolean;
  onClose: () => void;
  project: Project;
  environment: EnvironmentName;
  baseUrl: string | null;
  onSaved: () => Promise<void>;
}) {
  const saved = project.authByEnvironment[environment] || emptyConfig;
  const [mode, setMode] = useState<EnvironmentAuthMode>('none');
  const [loginUrl, setLoginUrl] = useState('');
  const [username, setUsername] = useState('');
  const [secret, setSecret] = useState('');
  const [usernameSelector, setUsernameSelector] = useState('');
  const [passwordSelector, setPasswordSelector] = useState('');
  const [submitSelector, setSubmitSelector] = useState('');
  const [successSelector, setSuccessSelector] = useState('');
  const [apiKeyName, setApiKeyName] = useState('X-API-Key');
  const [apiKeyLocation, setApiKeyLocation] = useState<'header' | 'query'>('header');
  const [customHeadersText, setCustomHeadersText] = useState('');
  const [headersTouched, setHeadersTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    const next = project.authByEnvironment[environment] || emptyConfig;
    setMode(next.mode);
    setLoginUrl(next.loginUrl || (next.mode === 'form' ? baseUrl || '' : ''));
    setUsername(next.username);
    setSecret('');
    setUsernameSelector(next.usernameSelector);
    setPasswordSelector(next.passwordSelector);
    setSubmitSelector(next.submitSelector);
    setSuccessSelector(next.successSelector);
    setApiKeyName(next.apiKeyName || 'X-API-Key');
    setApiKeyLocation(next.apiKeyLocation || 'header');
    setCustomHeadersText('');
    setHeadersTouched(false);
    setTestResult(null);
  }, [baseUrl, environment, open, project.authByEnvironment]);

  const selectedMode = useMemo(() => MODES.find((item) => item.value === mode) || MODES[0], [mode]);
  const configuredHeaders = saved.customHeaderNames;
  const secretLabel = mode === 'form' || mode === 'basic' ? 'Password' : mode === 'bearer' ? 'Bearer token' : 'API key';

  const payload = () => ({
    mode,
    baseUrl,
    loginUrl,
    username,
    secret,
    usernameSelector,
    passwordSelector,
    submitSelector,
    successSelector,
    apiKeyName,
    apiKeyLocation,
    customHeaders: headersTouched ? parseHeaders(customHeadersText) : undefined,
  });

  const validate = () => {
    if (!baseUrl) throw new Error(`Configure a ${environment} target URL first.`);
    if (mode === 'form' && (!loginUrl.trim() || !username.trim())) throw new Error('Login URL and username are required.');
    if (mode === 'api_key' && !apiKeyName.trim()) throw new Error('API key name is required.');
    if (!['none', 'custom_headers'].includes(mode) && !secret && !saved.secretConfigured) throw new Error(`${secretLabel} is required.`);
    if (mode === 'custom_headers' && !headersTouched && !configuredHeaders.length) throw new Error('Add at least one custom header.');
    if (headersTouched) parseHeaders(customHeadersText);
  };

  const save = async () => {
    try {
      validate();
      setSaving(true);
      await put(`/api/environment-auth/${encodeURIComponent(project.id)}/${environmentValue(environment)}`, payload());
      await onSaved();
      toast.success(`${environment} authentication saved.`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    try {
      validate();
      setTesting(true);
      setTestResult(null);
      const result = await post<{ ok: boolean; status: number; durationMs: number; message: string }>(`/api/environment-auth/${encodeURIComponent(project.id)}/${environmentValue(environment)}/test`, payload());
      setTestResult({ ok: result.ok, message: `${result.message} ${result.durationMs} ms` });
    } catch (error) {
      setTestResult({ ok: false, message: error instanceof Error ? error.message : String(error) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Authentication · ${environment}`} subtitle={`${project.name} · ${baseUrl || 'No target URL configured'}`} size="max-w-2xl" icon={<KeyRoundIcon className="h-5 w-5 text-accent" />} footer={<><Button variant="secondary" disabled={saving || testing} onClick={() => void test()}>{testing ? <LoaderCircleIcon className="h-4 w-4 animate-spin" /> : <ShieldCheckIcon className="h-4 w-4" />} Test connection</Button><Button variant="primary" disabled={saving || testing} onClick={() => void save()}>{saving ? 'Saving…' : 'Save authentication'}</Button></>}>
      <div className="space-y-4 p-5">
        <label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Authentication method</span><select aria-label="Authentication method" className="control" value={mode} onChange={(event) => { const nextMode = event.target.value as EnvironmentAuthMode; setMode(nextMode); if (nextMode === 'form' && !loginUrl) setLoginUrl(baseUrl || ''); setSecret(''); setTestResult(null); }}>{MODES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><span className="mt-1 block text-2xs text-ink-3">{selectedMode.description}</span></label>

        {mode === 'form' && <div className="space-y-3 rounded-xl border border-line bg-surface-2/50 p-3">
          <label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Login URL</span><input className="control font-mono" value={loginUrl} onChange={(event) => setLoginUrl(event.target.value)} placeholder="https://staging.example.com/login" /></label>
          <div className="grid gap-3 sm:grid-cols-2"><TextField label="Username" value={username} onChange={setUsername} /><SecretField label="Password" value={secret} onChange={setSecret} configured={saved.secretConfigured && saved.mode === mode} /></div>
          <details className="rounded-lg border border-line bg-surface p-3"><summary className="cursor-pointer text-xs font-medium text-ink">Advanced selectors</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><TextField label="Username selector" value={usernameSelector} onChange={setUsernameSelector} placeholder={'input[name="email"]'} mono /><TextField label="Password selector" value={passwordSelector} onChange={setPasswordSelector} placeholder={'input[name="password"]'} mono /><TextField label="Submit selector" value={submitSelector} onChange={setSubmitSelector} placeholder={'button[type="submit"]'} mono /><TextField label="Success selector" value={successSelector} onChange={setSuccessSelector} placeholder="[data-testid=dashboard]" mono /></div></details>
        </div>}

        {mode === 'bearer' && <SecretField label="Bearer token" value={secret} onChange={setSecret} configured={saved.secretConfigured && saved.mode === mode} />}
        {mode === 'basic' && <div className="grid gap-3 sm:grid-cols-2"><TextField label="Username" value={username} onChange={setUsername} /><SecretField label="Password" value={secret} onChange={setSecret} configured={saved.secretConfigured && saved.mode === mode} /></div>}
        {mode === 'api_key' && <div className="grid gap-3 sm:grid-cols-3"><TextField label="Key name" value={apiKeyName} onChange={setApiKeyName} placeholder="X-API-Key" mono /><label><span className="mb-1 block text-xs font-medium text-ink-2">Send in</span><select className="control" value={apiKeyLocation} onChange={(event) => setApiKeyLocation(event.target.value as 'header' | 'query')}><option value="header">Header</option><option value="query">Query parameter</option></select></label><SecretField label="API key" value={secret} onChange={setSecret} configured={saved.secretConfigured && saved.mode === mode} /></div>}

        {mode !== 'none' && <label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Additional custom headers</span><textarea className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs outline-none focus:border-accent" rows={3} value={customHeadersText} onChange={(event) => { setCustomHeadersText(event.target.value); setHeadersTouched(true); }} placeholder={'X-Tenant-ID: qa\nX-Test-Mode: true'} />{configuredHeaders.length > 0 && !headersTouched && <span className="mt-1 block text-2xs text-ink-3">Saved headers: {configuredHeaders.join(', ')}. Leave blank to keep them.</span>}</label>}

        <div className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-2xs text-ink-2">Secrets are encrypted on the server and are never returned to the browser or included in generated test code.</div>
        {testResult && <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${testResult.ok ? 'bg-[rgb(var(--ok-soft))] text-[rgb(var(--ok))]' : 'bg-[rgb(var(--fail-soft))] text-[rgb(var(--fail))]'}`}>{testResult.ok ? <CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />}<span>{testResult.message}</span></div>}
      </div>
    </Modal>
  );
}

function TextField({ label, value, onChange, placeholder, mono }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; mono?: boolean }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">{label}</span><input className={`control ${mono ? 'font-mono text-xs' : ''}`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function SecretField({ label, value, onChange, configured }: { label: string; value: string; onChange: (value: string) => void; configured: boolean }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">{label}</span><input type="password" autoComplete="new-password" className="control font-mono" value={value} onChange={(event) => onChange(event.target.value)} placeholder={configured ? 'Saved · leave blank to keep' : `Enter ${label.toLowerCase()}`} /></label>;
}

function parseHeaders(value: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
    const separator = line.indexOf(':');
    if (separator <= 0) throw new Error(`Invalid header line: ${line}`);
    const name = line.slice(0, separator).trim();
    const headerValue = line.slice(separator + 1).trim();
    if (!name || !headerValue) throw new Error(`Invalid header line: ${line}`);
    result[name] = headerValue;
  }
  return result;
}

function environmentValue(value: EnvironmentName): string {
  return value === 'Local' ? 'local' : value === 'Development' ? 'dev' : value === 'Production' ? 'production' : 'staging';
}
