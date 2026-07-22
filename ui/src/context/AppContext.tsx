import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { get, post, put } from '../lib/api';
import type {
  EnvironmentName,
  LocalAIStatus,
  ManualCaseExecution,
  Project,
  RunStatus,
  Target,
  TestCase,
  TestCycle,
  TestPack,
  TestRun,
  Theme,
  ViewMode,
} from '../lib/types';

export interface RunRequest {
  projectId: string;
  environment: EnvironmentName;
  targetId: string | null;
  packId: string | null;
  caseIds: string[];
  source: 'smoke' | 'workspace' | 'rerun';
}

interface AppState {
  theme: Theme;
  toggleTheme: () => void;
  viewMode: ViewMode;
  setViewMode: (value: ViewMode) => void;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  projects: Project[];
  createProject: (input: { name: string; description: string; baseUrl: string; environment: EnvironmentName }) => Promise<void>;
  currentProject: Project;
  setCurrentProjectId: (id: string) => void;
  environment: EnvironmentName;
  setEnvironment: (environment: EnvironmentName) => void;
  setLocalTargetUrl: (projectId: string, url: string) => void;
  getTarget: (projectId: string, targetId: string | null) => Target | null;
  getTargetUrl: (projectId: string, targetId: string | null, environment: EnvironmentName) => string | null;
  testCases: TestCase[];
  testPacks: TestPack[];
  runs: TestRun[];
  cycles: TestCycle[];
  smokeIntent: RunRequest | null;
  requestSmokeRun: (projectId: string) => void;
  clearSmokeIntent: () => void;
  startRun: (request: RunRequest) => Promise<TestRun>;
  updateRunStatus: (id: string, status: RunStatus) => void;
  createSavedPack: (name: string, description: string, caseIds: string[]) => TestPack;
  updatePack: (id: string, updates: Partial<Pick<TestPack, 'name' | 'description' | 'caseIds' | 'archived'>>) => void;
  duplicatePack: (id: string) => TestPack | null;
  addCasesToPack: (packId: string, caseIds: string[]) => void;
  addGeneratedCases: (packId: string, count: number, request?: string) => Promise<number>;
  createTestCase: (input: Partial<TestCase>, packId?: string | null) => Promise<TestCase>;
  updateTestCase: (id: string, input: Partial<TestCase>) => Promise<TestCase>;
  importCases: (csvContent: string, fileName: string, packId: string | null) => Promise<number>;
  archiveTestCase: (id: string) => Promise<void>;
  createCycle: (cycle: Omit<TestCycle, 'id' | 'executions' | 'linkedDefects' | 'status'>) => TestCycle;
  updateCycle: (id: string, updates: Partial<TestCycle>) => void;
  saveManualExecution: (cycleId: string, execution: ManualCaseExecution) => void;
  aiStatus: LocalAIStatus;
  checkAI: () => Promise<void>;
  testAI: () => Promise<string>;
  unloadAI: () => Promise<void>;
}

type RawRecord = Record<string, any>;

const AppContext = createContext<AppState | null>(null);
const LOCAL_TARGET_URLS_KEY = 'passmark-local-target-urls';
const defaultAI: LocalAIStatus = { online: false, provider: 'ollama', baseUrl: '', model: 'not-configured', models: [], message: 'Checking local AI…', checking: true };
const emptyProject: Project = {
  id: '',
  name: 'No project selected',
  description: '',
  environment: 'Staging',
  targets: [],
  defaultTargetId: null,
  passRate: null,
  failing: 0,
  totalCases: 0,
  lastRun: null,
  status: 'not_run',
};

function environmentName(value: unknown): EnvironmentName {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'local') return 'Local';
  if (normalized.startsWith('dev')) return 'Development';
  if (normalized.startsWith('prod')) return 'Production';
  return 'Staging';
}

function environmentValue(value: EnvironmentName): string {
  return value === 'Local' ? 'local' : value === 'Development' ? 'dev' : value === 'Production' ? 'production' : 'staging';
}

function readLocalTargetUrls(): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_TARGET_URLS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeTestStatus(value: unknown): TestCase['status'] {
  const status = String(value || '').toLowerCase();
  if (status === 'passed' || status === 'failed' || status === 'running' || status === 'blocked' || status === 'skipped' || status === 'queued' || status === 'cancelled') return status;
  return 'not_run';
}

function normalizeRunStatus(value: unknown): RunStatus {
  const status = String(value || '').toLowerCase();
  if (status === 'generated' || status === 'queued' || status === 'running' || status === 'passed' || status === 'failed' || status === 'partially_completed' || status === 'cancelled' || status === 'system_error') return status;
  return 'failed';
}

function mapCase(raw: RawRecord): TestCase {
  return {
    id: String(raw.id),
    code: String(raw.code || raw.id),
    name: String(raw.name || raw.title || 'Untitled test case'),
    module: String(raw.module || raw.description || 'General'),
    feature: String(raw.feature || 'Core flow'),
    requirementId: String(raw.requirementId || ''),
    objective: String(raw.description || raw.objective || ''),
    preconditions: String(raw.preconditions || 'The configured target is reachable.'),
    testData: String(raw.testData || ''),
    steps: Array.isArray(raw.steps) ? raw.steps : [],
    expected: String(raw.expectedResult || raw.expected || ''),
    actual: String(raw.actualResult || raw.actual || ''),
    priority: titleCase(raw.priority || 'Medium') as TestCase['priority'],
    severity: titleCase(raw.severity || 'Major') as TestCase['severity'],
    type: titleCase(raw.testType || 'Functional') as TestCase['type'],
    automation: String(raw.automation).toLowerCase() === 'automated' ? 'automated' : 'manual',
    automationKind: String(raw.automationKind || (String(raw.automation).toLowerCase() === 'automated' ? 'generic_visible_content' : 'manual')),
    status: normalizeTestStatus(raw.status),
    assignee: raw.assignee || null,
    reviewer: raw.reviewer || null,
    defectId: raw.defectId || null,
    lastRun: raw.updatedAt || null,
    duration: raw.durationMs ? Math.round(Number(raw.durationMs) / 1000) : null,
    notes: String(raw.notes || ''),
    packIds: [],
  };
}

function mapRun(raw: RawRecord): TestRun {
  const summary = raw.summary || raw;
  const results = Array.isArray(raw.cases) ? raw.cases : Array.isArray(raw.results) ? raw.results : [];
  const runStatus = normalizeRunStatus(raw.status);
  return {
    id: String(raw.id || raw.runId),
    name: String(raw.name || `${raw.suiteName || 'Test run'} · ${String(raw.id || '').slice(-6)}`),
    projectId: String(raw.projectId || ''),
    packId: raw.packId || null,
    pack: String(raw.pack || raw.suiteName || 'Custom'),
    environment: environmentName(raw.environment?.name || raw.environment || 'staging'),
    targetId: raw.targetId || null,
    target: String(raw.url || raw.target || ''),
    triggeredBy: String(raw.triggeredBy || 'Local user'),
    build: raw.build || null,
    status: runStatus,
    passed: Number(summary.passed || 0),
    failed: Number(summary.failed || 0),
    blocked: Number(summary.blocked || raw.blocked || 0),
    skipped: Number(summary.skipped || 0),
    total: Number(summary.total || 0),
    manual: Number(raw.manual || 0),
    automated: Number(raw.automated || summary.total || 0),
    duration: raw.durationMs ? Math.round(Number(raw.durationMs) / 1000) : raw.duration || null,
    startedAt: String(raw.createdAt || raw.startedAt || new Date().toISOString()),
    results: results.map((result: RawRecord) => {
      const name = String(result.title || result.caseName || result.name || 'Test case');
      const spacedCaseCode = name.match(/\b([A-Z]+-\d+)\s+(-\d+)\b/);
      const caseCode = spacedCaseCode ? `${spacedCaseCode[1]}${spacedCaseCode[2]}` : name.match(/\b[A-Z]+-\d+(?:-\d+)?\b/)?.[0];
      return {
        caseId: String(result.caseId || result.caseCode || result.testCaseId || caseCode || name),
        name,
        status: normalizeTestStatus(result.status),
        duration: result.durationMs ? Math.round(Number(result.durationMs) / 1000) : result.duration || null,
        failedStep: result.failedStep,
        error: result.error || result.errorMessage,
        expected: result.expected || result.expectedResult,
        actual: result.actual || result.actualResult,
        stackTrace: result.stackTrace,
        generatedCode: result.generatedCode || result.code,
        consoleOutput: result.consoleOutput,
        hasScreenshot: Boolean(result.actualImage || result.hasScreenshot),
        hasVideo: Boolean(result.hasVideo),
        hasTrace: Boolean(result.hasTrace),
        hasRawArtifact: Boolean(result.hasRawArtifact),
        evidenceUrl: typeof result.actualImage === 'string' ? result.actualImage : undefined,
      };
    }),
    errorKind: raw.errorKind,
    systemError: runStatus === 'system_error' ? raw.errorReason || raw.systemError || undefined : undefined,
    resultCsvUrl: raw.resultCsvUrl || undefined,
    resultExcelUrl: raw.resultExcelUrl || undefined,
    resultDocUrl: raw.resultDocUrl || undefined,
  };
}

function titleCase(value: unknown): string {
  const text = String(value || '');
  return text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : text;
}

function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function casesToCsv(cases: TestCase[]): string {
  const headers = ['caseId', 'title', 'objective', 'steps', 'expectedResult', 'priority', 'severity', 'testType', 'automationCandidate', 'automationKind'];
  const rows = cases.map((testCase) => [
    testCase.code || testCase.id,
    testCase.name,
    testCase.objective,
    testCase.steps.map((step, index) => `${index + 1}. ${step.action}`).join('\n'),
    testCase.expected,
    testCase.priority,
    testCase.severity,
    testCase.type,
    testCase.automation === 'automated' ? 'yes' : 'no',
    testCase.automation === 'automated' ? testCase.automationKind || 'generic_visible_content' : 'manual',
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem('passmark-theme') === 'light' ? 'light' : 'dark');
  const [viewMode, setViewMode] = useState<ViewMode>(() => localStorage.getItem('passmark-view') === 'quick' ? 'quick' : 'qa');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectIdState] = useState('');
  const [environment, setEnvironment] = useState<EnvironmentName>('Staging');
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testPacks, setTestPacks] = useState<TestPack[]>([]);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [cycles, setCycles] = useState<TestCycle[]>([]);
  const [smokeIntent, setSmokeIntent] = useState<RunRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiStatus, setAIStatus] = useState<LocalAIStatus>(defaultAI);
  const suitesByProject = useRef<Record<string, string>>({});

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('passmark-theme', theme);
  }, [theme]);

  useEffect(() => localStorage.setItem('passmark-view', viewMode), [viewMode]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [rawProjects, rawTargets, rawEnvironments, rawSuites, rawPacks, rawRuns, rawCycles, rawAI] = await Promise.all([
        get<RawRecord[]>('/api/projects'),
        get<RawRecord[]>('/api/test-targets'),
        get<RawRecord[]>('/api/environments'),
        get<RawRecord[]>('/api/test-suites'),
        get<RawRecord[]>('/api/test-packs'),
        get<RawRecord[]>('/api/runs'),
        get<RawRecord[]>('/api/test-cycles'),
        get<LocalAIStatus>('/api/ai/status').catch(() => defaultAI),
      ]);
      const caseGroups = await Promise.all(rawSuites.map(async (suite) => {
        suitesByProject.current[String(suite.projectId)] ||= String(suite.id);
        return get<RawRecord[]>(`/api/test-cases?suiteId=${encodeURIComponent(String(suite.id))}`);
      }));
      const mappedRuns = rawRuns.map(mapRun);
      const localTargetUrls = readLocalTargetUrls();
      const mappedProjects = rawProjects.map((project): Project => {
        const projectTargets = rawTargets.filter((target) => target.projectId === project.id);
        const environments = rawEnvironments.filter((item) => item.projectId === project.id);
        const targets: Target[] = projectTargets.map((target, index) => {
          const urls: Target['urls'] = {};
          for (const item of environments) urls[environmentName(item.name)] = String(item.baseUrl || target.url || '');
          if (!Object.keys(urls).length && target.url) urls[environmentName(project.environment)] = String(target.url);
          if (index === 0 && localTargetUrls[String(project.id)]) urls.Local = localTargetUrls[String(project.id)];
          return { id: String(target.id), name: String(target.name), type: targetType(target.type), urls, reachable: target.enabled !== false };
        });
        const projectRuns = mappedRuns.filter((run) => run.projectId === project.id);
        const latest = projectRuns[0];
        const completed = latest ? latest.passed + latest.failed + latest.blocked + latest.skipped : 0;
        return {
          id: String(project.id), name: String(project.name), description: String(project.description || ''),
          environment: environmentName(project.environment), targets,
          defaultTargetId: targets[0]?.id || null,
          passRate: completed ? Math.round(latest.passed / completed * 100) : null,
          failing: latest?.failed || 0,
          totalCases: rawPacks.filter((pack) => pack.projectId === project.id).reduce((max, pack) => Math.max(max, pack.caseIds?.length || 0), 0),
          lastRun: latest?.startedAt || null,
          status: latest ? normalizeTestStatus(latest.status) : 'not_run',
        };
      });
      const mappedCases = caseGroups.flat().map(mapCase);
      setProjects(mappedProjects);
      setTestCases(mappedCases);
      setTestPacks(rawPacks.map((pack) => ({
        ...pack,
        id: String(pack.id),
        projectId: String(pack.projectId),
        name: String(pack.name),
        description: String(pack.description || ''),
        owner: String(pack.owner || 'Local QA Team'),
        kind: pack.kind || 'saved',
        caseIds: Array.isArray(pack.caseIds) ? pack.caseIds.map(String) : [],
        defaultEnvironment: pack.defaultEnvironment ? environmentName(pack.defaultEnvironment) : undefined,
        defaultTargetId: pack.defaultTargetId || undefined,
        updatedAt: String(pack.updatedAt || new Date().toISOString()),
      })) as TestPack[]);
      setRuns(mappedRuns);
      setCycles(rawCycles.map((cycle) => ({ ...cycle, environment: environmentName(cycle.environment), startDate: String(cycle.startDate), dueDate: String(cycle.dueDate) })) as TestCycle[]);
      setAIStatus({ ...rawAI, checking: false });
      setCurrentProjectIdState((current) => mappedProjects.some((project) => project.id === current) ? current : mappedProjects[0]?.id || '');
      setError(null);
    } catch (loadError) {
      setProjects([]);
      setTestCases([]);
      setTestPacks([]);
      setRuns([]);
      setCycles([]);
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const refreshRuns = useCallback(async () => {
    try {
      const rawRuns = await get<RawRecord[]>('/api/runs');
      setRuns(rawRuns.map(mapRun));
    } catch (pollError) {
      setError(pollError instanceof Error ? pollError.message : String(pollError));
    }
  }, []);

  const hasActiveRuns = runs.some((run) => run.status === 'queued' || run.status === 'running');
  useEffect(() => {
    if (!hasActiveRuns) return;
    const timer = window.setInterval(() => { void refreshRuns(); }, 2000);
    return () => window.clearInterval(timer);
  }, [hasActiveRuns, refreshRuns]);

  const currentProject = useMemo(() => projects.find((project) => project.id === currentProjectId) || projects[0] || emptyProject, [currentProjectId, projects]);

  const setCurrentProjectId = (id: string) => {
    const project = projects.find((item) => item.id === id);
    if (!project) return;
    setCurrentProjectIdState(id);
    setEnvironment(project.environment);
  };

  const createProject = async (input: { name: string; description: string; baseUrl: string; environment: EnvironmentName }) => {
    await post('/api/projects', {
      ...input,
      environment: environmentValue(input.environment),
    });
    await refresh();
  };

  const getTarget = (projectId: string, targetId: string | null) => projects.find((item) => item.id === projectId)?.targets.find((target) => target.id === targetId) || null;
  const getTargetUrl = (projectId: string, targetId: string | null, selectedEnvironment: EnvironmentName) => getTarget(projectId, targetId)?.urls[selectedEnvironment] || null;
  const setLocalTargetUrl = (projectId: string, url: string) => {
    const saved = readLocalTargetUrls();
    const normalized = url.trim();
    if (normalized) saved[projectId] = normalized;
    else delete saved[projectId];
    localStorage.setItem(LOCAL_TARGET_URLS_KEY, JSON.stringify(saved));
    setProjects((items) => items.map((project) => project.id !== projectId ? project : {
      ...project,
      targets: project.targets.map((target, index) => index !== 0 ? target : {
        ...target,
        urls: { ...target.urls, Local: normalized || undefined },
      }),
    }));
  };

  const requestSmokeRun = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    const smoke = testPacks.find((pack) => pack.projectId === projectId && pack.name.toLowerCase() === 'smoke' && !pack.archived) || null;
    const targetId = smoke?.defaultTargetId || project.defaultTargetId;
    setCurrentProjectId(projectId);
    setSmokeIntent({ projectId, environment: smoke?.defaultEnvironment || project.environment, targetId, packId: smoke?.id || null, caseIds: smoke?.caseIds || [], source: 'smoke' });
  };

  const startRun = async (request: RunRequest): Promise<TestRun> => {
    const pack = testPacks.find((item) => item.id === request.packId);
    const selectedCases = testCases.filter((testCase) => request.caseIds.includes(testCase.id));
    const targetUrl = getTargetUrl(request.projectId, request.targetId, request.environment) || '';
    const suiteId = suitesByProject.current[request.projectId];
    if (!suiteId) throw new Error('The project has no Test Suite.');
    if (!targetUrl) throw new Error('No valid target URL is configured for this environment.');
    if (!selectedCases.length) throw new Error('Select at least one test case before running.');
    if (!selectedCases.some((item) => item.automation === 'automated')) throw new Error('The selected scope has no automated test cases.');

    const created = await post<RawRecord>('/api/testcase-files/run', {
      projectId: request.projectId, suiteId, targetId: request.targetId, url: targetUrl,
      environment: environmentValue(request.environment), fileName: `${pack?.name || 'selected-cases'}.csv`, csvContent: casesToCsv(selectedCases), auth: { mode: 'none' }, packId: request.packId,
    });
    const run = {
      ...mapRun(created),
      projectId: request.projectId,
      packId: request.packId,
      pack: pack?.name || 'Selected cases',
      environment: request.environment,
      targetId: request.targetId,
      target: targetUrl,
      manual: selectedCases.filter((item) => item.automation === 'manual').length,
      automated: selectedCases.filter((item) => item.automation === 'automated').length,
      total: selectedCases.length,
    };
    setRuns((items) => [run, ...items.filter((item) => item.id !== run.id)]);
    void refresh();
    return run;
  };

  const updateRunStatus = (id: string, status: RunStatus) => {
    const previous = runs.find((run) => run.id === id)?.status;
    setRuns((items) => items.map((run) => run.id === id ? { ...run, status } : run));

    if (status === 'cancelled' && !id.startsWith('pending-')) {
      void post(`/api/runs/${encodeURIComponent(id)}/cancel`, {})
        .then(() => refresh())
        .catch((cancelError) => {
          if (previous) setRuns((items) => items.map((run) => run.id === id ? { ...run, status: previous } : run));
          setError(cancelError instanceof Error ? cancelError.message : String(cancelError));
        });
    }
  };

  const createSavedPack = (name: string, description: string, caseIds: string[]): TestPack => {
    const pack: TestPack = { id: `pack-${Date.now()}`, projectId: currentProject.id, name, description, kind: 'saved', caseIds, owner: 'Local QA Team', updatedAt: new Date().toISOString() };
    setTestPacks((items) => [...items, pack]);
    void post('/api/test-packs', pack).catch((saveError) => setError(saveError instanceof Error ? saveError.message : String(saveError)));
    return pack;
  };

  const updatePack = (id: string, updates: Partial<Pick<TestPack, 'name' | 'description' | 'caseIds' | 'archived'>>) => {
    const existing = testPacks.find((pack) => pack.id === id);
    if (!existing) return;
    const next = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    setTestPacks((items) => items.map((pack) => pack.id === id ? next : pack));
    void put(`/api/test-packs/${encodeURIComponent(id)}`, next).catch((saveError) => setError(saveError instanceof Error ? saveError.message : String(saveError)));
  };

  const duplicatePack = (id: string) => {
    const source = testPacks.find((pack) => pack.id === id);
    return source ? createSavedPack(`${source.name} copy`, source.description, [...source.caseIds]) : null;
  };

  const addCasesToPack = (packId: string, caseIds: string[]) => {
    const pack = testPacks.find((item) => item.id === packId);
    if (pack) updatePack(packId, { caseIds: Array.from(new Set([...pack.caseIds, ...caseIds])) });
  };

  const addGeneratedCases = async (packId: string, count: number, request = 'Generate professional test cases for the selected Test Pack.'): Promise<number> => {
    const pack = testPacks.find((item) => item.id === packId);
    const targetId = pack?.defaultTargetId || currentProject.defaultTargetId;
    const result = await post<{ persistedCaseIds?: string[] }>('/api/testcase-files/generate', {
      projectId: currentProject.id, suiteId: suitesByProject.current[currentProject.id], targetId, packId,
      url: getTargetUrl(currentProject.id, targetId, pack?.defaultEnvironment || environment),
      userRequest: `${request}\nCoverage target: approximately ${count} cases.`,
    });
    await refresh();
    return result.persistedCaseIds?.length || 0;
  };

  const createTestCase = async (input: Partial<TestCase>, packId?: string | null): Promise<TestCase> => {
    const suiteId = suitesByProject.current[currentProject.id];
    if (!suiteId) throw new Error('The project has no Test Suite.');
    const created = await post<RawRecord>('/api/test-cases', {
      suiteId,
      code: input.code || `TC-${Date.now().toString().slice(-6)}`,
      name: input.name || 'New test case',
      description: input.objective || '',
      priority: String(input.priority || 'Medium').toLowerCase(),
      severity: String(input.severity || 'Major').toLowerCase(),
      testType: input.type || 'Functional',
      automation: input.automation || 'manual',
      automationKind: input.automation === 'automated' ? input.automationKind || 'generic_visible_content' : 'manual',
      expectedResult: input.expected || '',
      steps: input.steps || [],
      notes: input.notes || '',
      packId,
    });
    const mapped = mapCase(created);
    await refresh();
    return mapped;
  };

  const updateTestCase = async (id: string, input: Partial<TestCase>): Promise<TestCase> => {
    const updated = await put<RawRecord>(`/api/test-cases/${encodeURIComponent(id)}`, {
      code: input.code,
      name: input.name,
      description: input.objective,
      priority: input.priority ? String(input.priority).toLowerCase() : undefined,
      severity: input.severity ? String(input.severity).toLowerCase() : undefined,
      testType: input.type,
      automation: input.automation,
      automationKind: input.automation === 'automated' ? input.automationKind || 'generic_visible_content' : input.automation === 'manual' ? 'manual' : undefined,
      expectedResult: input.expected,
      steps: input.steps,
      actualResult: input.actual,
      defectId: input.defectId,
      assignee: input.assignee,
      reviewer: input.reviewer,
      notes: input.notes,
    });
    const mapped = mapCase(updated);
    await refresh();
    return mapped;
  };

  const importCases = async (csvContent: string, fileName: string, packId: string | null): Promise<number> => {
    const targetId = currentProject.defaultTargetId;
    const result = await post<{ persistedCaseIds?: string[] }>('/api/testcase-files/import', {
      projectId: currentProject.id,
      suiteId: suitesByProject.current[currentProject.id],
      targetId,
      packId,
      url: getTargetUrl(currentProject.id, targetId, environment),
      csvContent,
      fileName,
    });
    await refresh();
    return result.persistedCaseIds?.length || 0;
  };

  const archiveTestCase = async (id: string) => {
    await put(`/api/test-cases/${encodeURIComponent(id)}`, { enabled: false });
    setTestCases((items) => items.filter((testCase) => testCase.id !== id));
    setTestPacks((items) => items.map((pack) => ({ ...pack, caseIds: pack.caseIds.filter((caseId) => caseId !== id) })));
  };

  const createCycle = (cycle: Omit<TestCycle, 'id' | 'executions' | 'linkedDefects' | 'status'>): TestCycle => {
    const next: TestCycle = { ...cycle, id: `cycle-${Date.now()}`, status: 'draft', executions: {}, linkedDefects: [] };
    setCycles((items) => [next, ...items]);
    void post('/api/test-cycles', next).catch((cycleError) => setError(cycleError instanceof Error ? cycleError.message : String(cycleError)));
    return next;
  };

  const updateCycle = (id: string, updates: Partial<TestCycle>) => {
    const existing = cycles.find((cycle) => cycle.id === id);
    if (!existing) return;
    const next = { ...existing, ...updates };
    setCycles((items) => items.map((cycle) => cycle.id === id ? next : cycle));
    void put(`/api/test-cycles/${encodeURIComponent(id)}`, next).catch((cycleError) => setError(cycleError instanceof Error ? cycleError.message : String(cycleError)));
  };

  const saveManualExecution = (cycleId: string, execution: ManualCaseExecution) => {
    const cycle = cycles.find((item) => item.id === cycleId);
    if (cycle) updateCycle(cycleId, { executions: { ...cycle.executions, [execution.caseId]: execution } });
  };

  const checkAI = async () => {
    setAIStatus((status) => ({ ...status, checking: true }));
    try { setAIStatus({ ...(await get<LocalAIStatus>('/api/ai/status')), checking: false }); }
    catch (aiError) { setAIStatus((status) => ({ ...status, online: false, checking: false, message: aiError instanceof Error ? aiError.message : String(aiError) })); }
  };
  const testAI = async () => {
    const result = await post<{ ok: boolean; durationMs: number; reply: string }>('/api/ai/test', {});
    await checkAI();
    return result.ok ? `AI responded in ${result.durationMs} ms.` : result.reply;
  };
  const unloadAI = async () => { await post('/api/ai/unload', {}); await checkAI(); };

  const value: AppState = {
    theme, toggleTheme: () => setTheme((value) => value === 'dark' ? 'light' : 'dark'), viewMode, setViewMode,
    loading, error, refresh, projects, createProject, currentProject, setCurrentProjectId, environment, setEnvironment,
    getTarget, getTargetUrl, setLocalTargetUrl, testCases, testPacks, runs, cycles, smokeIntent, requestSmokeRun,
    clearSmokeIntent: () => setSmokeIntent(null), startRun, updateRunStatus, createSavedPack, updatePack, duplicatePack,
    addCasesToPack, addGeneratedCases, createTestCase, updateTestCase, importCases, archiveTestCase, createCycle, updateCycle, saveManualExecution,
    aiStatus, checkAI, testAI, unloadAI,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function targetType(value: unknown): Target['type'] {
  const type = String(value || '').toLowerCase();
  if (type === 'api') return 'API';
  if (type === 'source-code') return 'Source Code';
  if (type === 'local-web') return 'Local Web';
  return 'Web URL';
}

export function useApp(): AppState {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

