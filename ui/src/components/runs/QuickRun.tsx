import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangleIcon, CheckCircle2Icon, ChevronDownIcon, GaugeIcon, PlayIcon,
  Settings2Icon, ShieldAlertIcon, ShieldCheckIcon,
} from 'lucide-react';
import type { EnvironmentName, Project, TestCase, TestPack } from '../../lib/types';
import type { RunProfile, RunRequest, RunTestType } from '../../context/AppContext';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { cn } from '../../lib/cn';
import { AuthenticationModal } from './AuthenticationModal';

const environments: EnvironmentName[] = ['Local', 'Development', 'Staging', 'Production'];
const RUN_TYPES: Array<{ value: RunTestType; label: string; short: string }> = [
  { value: 'all', label: 'All automated', short: 'All compatible automated cases' },
  { value: 'web_ui', label: 'Web UI / Functional', short: 'Browser and end-to-end flows' },
  { value: 'api', label: 'API', short: 'HTTP response and payload checks' },
  { value: 'accessibility', label: 'Accessibility', short: 'Basic semantic accessibility checks' },
  { value: 'seo', label: 'SEO', short: 'Metadata and search-readiness checks' },
  { value: 'performance', label: 'Performance', short: 'Page response-time checks' },
  { value: 'security', label: 'Security', short: 'Safe passive security checks' },
];
const PROFILES: Array<{ value: RunProfile; label: string; description: string }> = [
  { value: 'quick', label: 'Quick', description: 'Up to 8 prioritized cases' },
  { value: 'standard', label: 'Standard', description: 'Up to 30 matching cases' },
  { value: 'comprehensive', label: 'Comprehensive', description: 'Every matching case' },
];

export function QuickRun({ intent, onRun }: { intent: RunRequest | null; onRun: (request: RunRequest) => void }) {
  const {
    projects, currentProject, environment: globalEnvironment, setCurrentProjectId, setEnvironment,
    setLocalTargetUrl, testCases, testPacks, getTargetUrl, smokeIntent, viewMode, refresh,
  } = useApp();
  const [projectId, setProjectId] = useState(currentProject.id);
  const [environment, setSelectedEnvironment] = useState<EnvironmentName>(globalEnvironment);
  const [targetId, setTargetId] = useState<string | null>(() => defaultTargetFor(currentProject, globalEnvironment));
  const [packId, setPackId] = useState<string | null>(null);
  const [runType, setRunType] = useState<RunTestType>('all');
  const [profile, setProfile] = useState<RunProfile>('standard');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [productionConfirmed, setProductionConfirmed] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const appliedIntentRef = useRef<string | null>(null);

  const project = projects.find((item) => item.id === projectId) ?? currentProject;
  const packs = useMemo(() => testPacks.filter((item) => {
    if (item.projectId !== project.id || item.archived) return false;
    if (viewMode === 'quick') return ['smoke', 'regression'].includes(item.name.toLowerCase());
    return item.kind !== 'manual';
  }), [project.id, testPacks, viewMode]);
  const pack = packs.find((item) => item.id === packId) ?? null;
  const target = project.targets.find((item) => item.id === targetId) ?? null;
  const url = getTargetUrl(project.id, targetId, environment);
  const authConfig = project.authByEnvironment[environment];
  const packCases = testCases.filter((testCase) => pack?.caseIds.includes(testCase.id));
  const matchingCases = packCases.filter((testCase) => testCase.automation === 'automated' && matchesRunType(testCase, runType));
  const runCases = applyProfile(matchingCases, profile);
  const typeCounts = useMemo(() => Object.fromEntries(RUN_TYPES.map((type) => [type.value, packCases.filter((testCase) => testCase.automation === 'automated' && matchesRunType(testCase, type.value)).length])) as Record<RunTestType, number>, [packCases]);

  useEffect(() => {
    const nextIntent = intent ?? smokeIntent;
    if (!nextIntent) {
      appliedIntentRef.current = null;
      return;
    }
    const intentKey = `${nextIntent.projectId}:${nextIntent.environment}:${nextIntent.targetId ?? 'none'}:${nextIntent.packId ?? 'none'}`;
    if (appliedIntentRef.current === intentKey) return;
    const nextProject = projects.find((item) => item.id === nextIntent.projectId);
    if (!nextProject) return;
    const validTarget = nextProject.targets.some((item) => item.id === nextIntent.targetId && item.urls[nextIntent.environment]);
    const validPack = testPacks.some((item) => item.id === nextIntent.packId && item.projectId === nextProject.id && !item.archived);
    appliedIntentRef.current = intentKey;
    setProjectId(nextProject.id);
    setCurrentProjectId(nextProject.id, { syncEnvironment: false });
    setSelectedEnvironment(nextIntent.environment);
    setEnvironment(nextIntent.environment);
    setTargetId(validTarget ? nextIntent.targetId : defaultTargetFor(nextProject, nextIntent.environment));
    setPackId(validPack ? nextIntent.packId : smokePackFor(nextProject.id, testPacks));
    setRunType(nextIntent.testType || 'all');
    setProfile(nextIntent.profile || 'standard');
    setProductionConfirmed(false);
  }, [intent, smokeIntent, projects, setCurrentProjectId, setEnvironment, testPacks]);

  useEffect(() => {
    if (intent || smokeIntent) return;
    if (!packs.some((item) => item.id === packId)) setPackId(smokePackFor(project.id, testPacks) ?? packs[0]?.id ?? null);
    if (!project.targets.some((item) => item.id === targetId && item.urls[environment])) setTargetId(defaultTargetFor(project, environment));
  }, [environment, intent, packId, packs, project, smokeIntent, targetId, testPacks]);

  useEffect(() => {
    if (intent || smokeIntent || projectId === currentProject.id) return;
    setProjectId(currentProject.id);
    setSelectedEnvironment(globalEnvironment);
    setTargetId(defaultTargetFor(currentProject, globalEnvironment));
    setPackId(smokePackFor(currentProject.id, testPacks));
    setProductionConfirmed(false);
  }, [currentProject, globalEnvironment, intent, projectId, smokeIntent, testPacks]);

  useEffect(() => {
    if (intent || smokeIntent || environment === globalEnvironment) return;
    setSelectedEnvironment(globalEnvironment);
    setTargetId(defaultTargetFor(project, globalEnvironment));
    setProductionConfirmed(false);
  }, [environment, globalEnvironment, intent, project, smokeIntent]);

  useEffect(() => {
    if (viewMode === 'quick') {
      setRunType('all');
      setProfile('standard');
      setAdvancedOpen(false);
    }
  }, [viewMode]);

  const selectProject = (nextProjectId: string) => {
    const nextProject = projects.find((item) => item.id === nextProjectId);
    if (!nextProject) return;
    const nextEnvironment = nextProject.environment;
    setProjectId(nextProject.id);
    setCurrentProjectId(nextProject.id);
    setSelectedEnvironment(nextEnvironment);
    setEnvironment(nextEnvironment);
    setTargetId(defaultTargetFor(nextProject, nextEnvironment));
    setPackId(smokePackFor(nextProject.id, testPacks));
    setProductionConfirmed(false);
  };

  const selectEnvironment = (nextEnvironment: EnvironmentName) => {
    setSelectedEnvironment(nextEnvironment);
    setEnvironment(nextEnvironment);
    setTargetId(project.targets.some((item) => item.id === targetId && item.urls[nextEnvironment]) ? targetId : defaultTargetFor(project, nextEnvironment));
    setProductionConfirmed(false);
  };

  const invalidUrl = !!url && !isRunnableUrl(url);
  const selectedType = RUN_TYPES.find((type) => type.value === runType) || RUN_TYPES[0];
  const reason = project.targets.length === 0
    ? 'This project has no target. Add a target before running.'
    : !target
      ? `No target is available for ${environment}. Choose another environment or configure a target URL.`
      : !url
        ? `The selected target has no ${environment} URL.`
        : invalidUrl
          ? 'The target URL is invalid. Update the project target, then retry.'
          : target.reachable === false
            ? 'Target is unreachable. Start it or choose another target.'
            : !pack
              ? 'No active Test Pack is available for this project.'
              : pack.caseIds.length === 0
                ? 'This pack has no test cases. Add cases in QA View before running.'
                : matchingCases.length === 0
                  ? `This pack has no automated ${selectedType.label} cases.`
                  : environment === 'Production' && !productionConfirmed
                    ? 'Confirm the Production target before running.'
                    : null;

  return (
    <section className="rounded-xl border border-line bg-surface p-3" aria-label="Quick Run configuration">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink">Quick Run</span>
        <span className="text-2xs text-ink-3">Project → Environment → Target {viewMode === 'qa' ? '→ Test Type' : ''} → Test Pack</span>
        {(intent || smokeIntent) && <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-2xs font-medium text-accent"><CheckCircle2Icon className="h-3 w-3" /> Smoke ready to confirm</span>}
      </div>

      <div className={cn('grid grid-cols-1 gap-2 sm:grid-cols-2', viewMode === 'qa' ? 'xl:grid-cols-7' : 'lg:grid-cols-6')}>
        <Field label="Project"><select aria-label="Project" value={projectId} onChange={(event) => selectProject(event.target.value)} className="control">{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Environment"><select aria-label="Environment" value={environment} onChange={(event) => selectEnvironment(event.target.value as EnvironmentName)} className="control">{environments.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Target" className={viewMode === 'qa' ? 'xl:col-span-2' : 'lg:col-span-2'}><div className="flex min-w-0 gap-1.5"><select aria-label="Target" title={target && url ? `${target.name} · ${url}` : `No target configured for ${environment}`} value={targetId ?? ''} onChange={(event) => { setTargetId(event.target.value || null); setProductionConfirmed(false); }} className="control min-w-0 flex-1" disabled={!project.targets.length}>{project.targets.filter((item) => item.urls[environment]).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.urls[environment]}</option>)}{project.targets.filter((item) => item.urls[environment]).length === 0 && <option value="">No targets configured</option>}</select><button type="button" aria-label="Configure authentication" title={`Authentication: ${authLabel(authConfig?.mode)}`} onClick={() => setAuthOpen(true)} disabled={!url} className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium', authConfig && authConfig.mode !== 'none' ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink-2 hover:bg-surface-2', !url && 'cursor-not-allowed opacity-50')}><ShieldCheckIcon className="h-4 w-4" /><span className="hidden 2xl:inline">{authLabel(authConfig?.mode)}</span></button></div></Field>
        {viewMode === 'qa' && <Field label="Test Type"><select aria-label="Test Type" value={runType} onChange={(event) => setRunType(event.target.value as RunTestType)} className="control">{RUN_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label} · {typeCounts[item.value] || 0}</option>)}</select></Field>}
        <Field label="Test Pack"><select aria-label="Test Pack" value={packId ?? ''} onChange={(event) => setPackId(event.target.value || null)} className="control" disabled={!packs.length}>{packOptions(packs)}{packs.length === 0 && <option value="">No packs available</option>}</select></Field>
        <Button variant="primary" className="mt-[1.3125rem] h-9" disabled={!!reason} title={reason ?? 'Run selected scope'} onClick={() => onRun({ projectId: project.id, environment, targetId, packId: pack?.id ?? null, caseIds: runCases.map((testCase) => testCase.id), source: 'smoke', testType: runType, profile })}><PlayIcon className="h-4 w-4" /> Run {pack?.name ?? 'pack'}</Button>
      </div>

      {viewMode === 'qa' && <>
        <button type="button" aria-expanded={advancedOpen} onClick={() => setAdvancedOpen((value) => !value)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-2 hover:bg-surface-2"><Settings2Icon className="h-3.5 w-3.5" /> Advanced testing <ChevronDownIcon className={cn('h-3.5 w-3.5 transition-transform', advancedOpen && 'rotate-180')} /></button>
        {advancedOpen && <div className="mt-2 grid gap-3 rounded-xl border border-line bg-surface-2/60 p-3 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <span className="mb-1.5 block text-2xs font-medium uppercase tracking-wide text-ink-3">Coverage profile</span>
            <div className="grid gap-2 sm:grid-cols-3">{PROFILES.map((item) => <button key={item.value} type="button" aria-pressed={profile === item.value} onClick={() => setProfile(item.value)} className={cn('rounded-lg border p-2.5 text-left', profile === item.value ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:bg-surface-2')}><div className="text-xs font-semibold text-ink">{item.label}</div><div className="mt-0.5 text-2xs text-ink-3">{item.description}</div></button>)}</div>
          </div>
          <div className="rounded-lg border border-line bg-surface p-3">
            <div className="flex items-center gap-2"><GaugeIcon className="h-4 w-4 text-accent" /><span className="text-xs font-semibold text-ink">{selectedType.label}</span><span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-2xs text-ink-2">{runCases.length} cases</span></div>
            <p className="mt-1.5 text-2xs text-ink-3">{selectedType.short}. {runnerDescription(runType)}</p>
            <p className="mt-2 text-2xs text-ink-3">Manual and exploratory cases continue through <a href="/workspace" className="font-medium text-accent hover:underline">Test Cycles</a>.</p>
          </div>
        </div>}
      </>}

      {environment === 'Local' && <div className="mt-3 rounded-lg border border-accent/25 bg-accent-soft/40 p-3"><label className="block"><span className="mb-1 block text-xs font-medium text-ink">Local application URL</span><input value={project.targets[0]?.urls.Local ?? ''} onChange={(event) => setLocalTargetUrl(project.id, event.target.value)} className="control font-mono" placeholder="http://localhost:3000" /></label><p className="mt-1.5 text-2xs text-ink-3">Use the URL you open on this computer. The Docker runner automatically connects through <code className="font-mono text-ink-2">host.docker.internal</code>.</p></div>}
      {environment === 'Production' && <label className="mt-3 flex items-start gap-2 rounded-lg border border-[rgb(var(--block))]/30 bg-[rgb(var(--block-soft))] p-2.5 text-xs text-ink-2"><input type="checkbox" checked={productionConfirmed} onChange={(event) => setProductionConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[rgb(var(--accent))]" /><span><strong className="text-ink"><ShieldAlertIcon className="mr-1 inline h-3.5 w-3.5 text-[rgb(var(--block))]" />Production confirmation required.</strong> This run targets a live environment. Verify the target and test data before continuing.</span></label>}
      {reason ? <div className="mt-3 flex items-center gap-2 rounded-lg bg-[rgb(var(--fail-soft))] px-3 py-2 text-xs text-ink"><AlertTriangleIcon className="h-4 w-4 shrink-0 text-[rgb(var(--fail))]" />{reason}</div> : <div className="mt-3 text-2xs text-ink-3">Target: <span className="font-mono text-ink-2">{url}</span> · {pack?.caseIds.length} cases in pack · {matchingCases.length} matching · <span className="font-medium text-ink-2">{runCases.length} will run</span></div>}
      <AuthenticationModal open={authOpen} onClose={() => setAuthOpen(false)} project={project} environment={environment} baseUrl={url} onSaved={refresh} />
    </section>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={cn('block min-w-0', className)}><span className="mb-1 block text-2xs font-medium text-ink-3">{label}</span>{children}</label>;
}

function packOptions(packs: TestPack[]) {
  const groups = [
    { label: 'System packs', items: packs.filter((pack) => pack.kind === 'system') },
    { label: 'Saved packs', items: packs.filter((pack) => pack.kind === 'saved') },
    { label: 'Dynamic scope', items: packs.filter((pack) => !['system', 'saved'].includes(pack.kind)) },
  ].filter((group) => group.items.length);
  return groups.map((group) => <optgroup key={group.label} label={group.label}>{group.items.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.caseIds.length} cases</option>)}</optgroup>);
}

function matchesRunType(testCase: TestCase, type: RunTestType): boolean {
  if (type === 'all') return true;
  if (type === 'web_ui') return testCase.type === 'Functional' || testCase.type === 'UI';
  return testCase.type.toLowerCase() === type;
}

function applyProfile(cases: TestCase[], profile: RunProfile): TestCase[] {
  const priority = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;
  const sorted = [...cases].sort((a, b) => priority[a.priority] - priority[b.priority] || (a.code || a.id).localeCompare(b.code || b.id));
  if (profile === 'quick') return sorted.slice(0, 8);
  if (profile === 'standard') return sorted.slice(0, 30);
  return sorted;
}

function runnerDescription(type: RunTestType): string {
  if (type === 'api') return 'Uses Playwright HTTP request checks; no browser interaction is required.';
  if (type === 'accessibility') return 'Checks image alternatives, form labels, document language and page landmarks.';
  if (type === 'seo') return 'Runs metadata, canonical, heading and crawl-readiness browser checks.';
  if (type === 'performance') return 'Measures page response time with a safe single-user check; this is not a load test.';
  if (type === 'security') return 'Checks HTTPS and common response security headers without attacking the target.';
  if (type === 'web_ui') return 'Runs isolated Chromium browser checks with failure evidence.';
  return 'Each case is routed to its compatible safe runner.';
}

function authLabel(mode?: string): string {
  if (mode === 'form') return 'Form login';
  if (mode === 'bearer') return 'Bearer';
  if (mode === 'api_key') return 'API key';
  if (mode === 'basic') return 'Basic';
  if (mode === 'custom_headers') return 'Headers';
  return 'No auth';
}

function defaultTargetFor(project: Project, environment: EnvironmentName): string | null {
  if (project.targets.some((target) => target.id === project.defaultTargetId && target.urls[environment])) return project.defaultTargetId;
  return project.targets.find((target) => target.urls[environment])?.id ?? null;
}

function smokePackFor(projectId: string, packs: ReturnType<typeof useApp>['testPacks']): string | null {
  return packs.find((item) => item.projectId === projectId && item.name.toLowerCase() === 'smoke' && !item.archived)?.id ?? null;
}

function isRunnableUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
