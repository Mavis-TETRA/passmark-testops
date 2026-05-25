import { execFile } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { promisify } from 'util';
import { AuthConfig, generateSeoTest } from '../scripts/generate-seo-test';
import { createDefaultSuiteForProject, createDefaultTargetForProject, ensureDefaultData, newId, prisma } from './db';
import { getConfiguredLocalAIModel } from './local-ai-client';
import { generateSeoTestPlan } from './seo-test-plan';
import { writeSeoBasicSpec } from './seo-template-renderer';

dotenv.config();

type ApiResponse = Record<string, unknown> | Array<Record<string, unknown>>;

type ProjectEnvironment = 'dev' | 'staging' | 'production';

type Project = {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  environment: ProjectEnvironment;
  createdAt: string;
  updatedAt: string;
};

type TestSuiteType =
  | 'seo-basic'
  | 'seo-technical'
  | 'broken-links'
  | 'image-alt'
  | 'accessibility'
  | 'custom';

type TestTargetType = 'web-url' | 'local-web' | 'source-code' | 'api';

type TestSuite = {
  id: string;
  projectId: string;
  name: string;
  type: TestSuiteType;
  description: string;
  config?: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type TestTarget = {
  id: string;
  projectId: string;
  name: string;
  type: TestTargetType;
  url: string;
  localPath: string;
  config?: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type TestRun = {
  id: string;
  url: string;
  projectId?: string;
  projectName?: string;
  suiteId?: string;
  suiteName?: string;
  suiteType?: TestSuiteType;
  targetId?: string;
  targetName?: string;
  targetType?: TestTargetType;
  status: TestRunStatus;
  createdAt: string;
  durationMs: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  cases?: TestCaseDetail[];
  generatedCode?: string;
  userRequest?: string;
  stdout: string;
  stderr: string;
  errorReason?: string;
};

type TestRunSummary = Omit<TestRun, 'stdout' | 'stderr'>;

type TestRunStatus = 'queued' | 'running' | 'passed' | 'failed' | 'cancelled';

type TestCaseDetail = {
  title: string;
  status: string;
  durationMs: number;
  error?: string;
  description?: string;
  selector?: string;
  expected?: string;
  actual?: string;
  code?: string;
  steps?: TestCaseStep[];
};

type TestCaseStep = {
  title: string;
  detail: string;
  status?: string;
};

type SeoAuditValues = {
  pageUrl: string;
  title: string;
  metaDescription: string;
  canonical: string;
  h1Count: number;
  h1Text: string;
  htmlLang: string;
  viewport: string;
};

type AuthInput = AuthConfig & {
  password?: string;
};

type RunContext = {
  projectId?: string;
  projectName?: string;
  suiteId?: string;
  suiteName?: string;
  suiteType?: TestSuiteType;
  targetId?: string;
  targetName?: string;
  targetType?: TestTargetType;
  environmentId?: string;
};

type RunQueueJob = {
  runId: string;
  url: string;
  userRequest: string;
  auth: AuthInput;
  context: RunContext;
};

const execFileAsync = promisify(execFile);
const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const storageDir = path.join(rootDir, 'storage');
const runsPath = path.join(storageDir, 'seo-runs.json');
const projectsPath = path.join(storageDir, 'projects.json');
const suitesPath = path.join(storageDir, 'test-suites.json');
const port = Number(process.env.PORT || 4173);

function ensureStorage() {
  fs.mkdirSync(storageDir, { recursive: true });

  if (!fs.existsSync(runsPath)) {
    fs.writeFileSync(runsPath, '[]', 'utf-8');
  }

  if (!fs.existsSync(projectsPath)) {
    fs.writeFileSync(projectsPath, '[]', 'utf-8');
  }

  if (!fs.existsSync(suitesPath)) {
    fs.writeFileSync(suitesPath, '[]', 'utf-8');
  }
}

function readRuns(): TestRun[] {
  ensureStorage();
  return JSON.parse(fs.readFileSync(runsPath, 'utf-8')) as TestRun[];
}

function writeRuns(runs: TestRun[]) {
  ensureStorage();
  fs.writeFileSync(runsPath, JSON.stringify(runs, null, 2), 'utf-8');
}

function readProjects(): Project[] {
  ensureStorage();
  return JSON.parse(fs.readFileSync(projectsPath, 'utf-8')) as Project[];
}

function writeProjects(projects: Project[]) {
  ensureStorage();
  fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2), 'utf-8');
}

function readSuites(): TestSuite[] {
  ensureStorage();
  return JSON.parse(fs.readFileSync(suitesPath, 'utf-8')) as TestSuite[];
}

function writeSuites(suites: TestSuite[]) {
  ensureStorage();
  fs.writeFileSync(suitesPath, JSON.stringify(suites, null, 2), 'utf-8');
}

function toRunSummary(run: TestRun): TestRunSummary {
  const { stdout, stderr, ...summary } = run;
  return summary;
}

function dbRunToApiRun(run: any): TestRun {
  const results = Array.isArray(run.results) ? run.results : [];
  const supportedStatuses: TestRunStatus[] = ['queued', 'running', 'passed', 'failed', 'cancelled'];
  const status = supportedStatuses.includes(run.status) ? run.status : 'failed';
  const cases = results.map((result: any) => {
    const extra = parseJsonText(result.aiDiagnosis);

    return {
      title: `${result.caseCode} ${result.caseName}`.trim(),
      status: result.status,
      durationMs: result.durationMs,
      error: result.errorMessage || undefined,
      expected: result.expectedResult || undefined,
      actual: typeof extra.actual === 'string' ? extra.actual : result.status,
      selector: typeof extra.selector === 'string' ? extra.selector : undefined,
      code: typeof extra.code === 'string' ? extra.code : result.caseCode,
      description: typeof extra.description === 'string' ? extra.description : result.caseName,
      steps: Array.isArray(extra.steps) ? (extra.steps as TestCaseStep[]) : undefined,
    };
  });

  return {
    id: run.id,
    url: run.url,
    projectId: run.projectId || undefined,
    projectName: run.project?.name,
    suiteId: run.suiteId || undefined,
    suiteName: run.suite?.name,
    suiteType: run.suite?.type,
    targetId: run.targetId || undefined,
    targetName: run.target?.name,
    targetType: run.target?.type,
    status,
    createdAt: new Date(run.createdAt).toISOString(),
    durationMs: run.durationMs,
    summary: {
      total: run.total,
      passed: run.passed,
      failed: run.failed,
      skipped: run.skipped || 0,
    },
    cases,
    generatedCode: run.generatedCode,
    userRequest: run.userRequest,
    stdout: run.stdout,
    stderr: run.stderr,
    errorReason: deriveRunErrorReason(status, cases, run.stderr, run.stdout),
  };
}

function parseJsonText(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string' || !value.trim()) {
    return {};
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function compactErrorText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  const text = value
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/\r/g, '')
    .trim();

  if (!text) {
    return '';
  }

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.slice(0, 8).join('\n').slice(0, 1200);
}

function deriveRunErrorReason(
  status: TestRunStatus,
  cases: TestCaseDetail[] = [],
  stderr = '',
  stdout = ''
): string | undefined {
  if (status !== 'failed' && status !== 'cancelled') {
    return undefined;
  }

  const failedCase = cases.find((testCase) => testCase.error?.trim());

  return (
    compactErrorText(failedCase?.error) ||
    compactErrorText(stderr) ||
    compactErrorText(stdout) ||
    'The run failed before a detailed test case result was stored.'
  );
}

function dbSuiteToApiSuite(suite: any): Record<string, unknown> {
  return {
    ...suite,
    config: parseJsonText(suite.config),
  };
}

function dbTargetToApiTarget(target: any): Record<string, unknown> {
  return {
    ...target,
    config: parseJsonText(target.config),
  };
}

function sendJson(response: http.ServerResponse, statusCode: number, body: ApiResponse) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
}

function sendError(response: http.ServerResponse, statusCode: number, message: string) {
  sendJson(response, statusCode, {
    error: message,
  });
}

function readBody(request: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        request.destroy(new Error('Request body is too large.'));
      }
    });

    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body) as Record<string, unknown>);
      } catch (error) {
        reject(error);
      }
    });

    request.on('error', reject);
  });
}

function normalizeUrl(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('URL is required.');
  }

  const url = value.trim();

  if (!url) {
    throw new Error('URL is required.');
  }

  const parsedUrl = new URL(url);

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Only http and https URLs are supported.');
  }

  return parsedUrl.toString();
}

function normalizeOptionalText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEnvironment(value: unknown): ProjectEnvironment {
  return value === 'dev' || value === 'staging' || value === 'production'
    ? value
    : 'production';
}

function normalizeSuiteType(value: unknown): TestSuiteType {
  const supportedTypes: TestSuiteType[] = [
    'seo-basic',
    'seo-technical',
    'broken-links',
    'image-alt',
    'accessibility',
    'custom',
  ];

  return supportedTypes.includes(value as TestSuiteType)
    ? (value as TestSuiteType)
    : 'seo-basic';
}

function normalizeTargetType(value: unknown): TestTargetType {
  const supportedTypes: TestTargetType[] = ['web-url', 'local-web', 'source-code', 'api'];

  return supportedTypes.includes(value as TestTargetType)
    ? (value as TestTargetType)
    : 'web-url';
}

function createProjectId(): string {
  return `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createSuiteId(): string {
  return `suite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createTargetId(): string {
  return `target-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createCaseId(): string {
  return `case-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeProjectInput(value: Record<string, unknown>, existing?: Project): Project {
  const name = normalizeOptionalText(value.name);

  if (!name) {
    throw new Error('Project name is required.');
  }

  const baseUrl = normalizeUrl(value.baseUrl);
  const now = new Date().toISOString();

  return {
    id: existing?.id || createProjectId(),
    name,
    description: normalizeOptionalText(value.description),
    baseUrl,
    environment: normalizeEnvironment(value.environment),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

function normalizeSuiteInput(value: Record<string, unknown>, existing?: TestSuite): TestSuite {
  const name = normalizeOptionalText(value.name);
  const projectId = normalizeOptionalText(value.projectId || existing?.projectId);

  if (!name) {
    throw new Error('Test suite name is required.');
  }

  if (!projectId) {
    throw new Error('Project is required for this test suite.');
  }

  if (!readProjects().some((project) => project.id === projectId)) {
    throw new Error('Project not found for this test suite.');
  }

  const now = new Date().toISOString();

  return {
    id: existing?.id || createSuiteId(),
    projectId,
    name,
    type: normalizeSuiteType(value.type),
    description: normalizeOptionalText(value.description),
    config: value.config && typeof value.config === 'object'
      ? (value.config as Record<string, unknown>)
      : existing?.config || {},
    enabled: typeof value.enabled === 'boolean' ? value.enabled : existing?.enabled ?? true,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

async function resolveProjectSuiteContext(projectIdValue: unknown, suiteIdValue: unknown): Promise<{
  project?: Project;
  suite?: TestSuite;
}> {
  const projectId = normalizeOptionalText(projectIdValue);
  const suiteId = normalizeOptionalText(suiteIdValue);
  const suite = suiteId
    ? ((await prisma.testSuite.findUnique({ where: { id: suiteId } })) as unknown as TestSuite | undefined)
    : undefined;
  const project = suite
    ? ((await prisma.project.findUnique({ where: { id: suite.projectId } })) as unknown as Project | undefined)
    : projectId
      ? ((await prisma.project.findUnique({ where: { id: projectId } })) as unknown as Project | undefined)
      : undefined;

  if (suiteId && !suite) {
    throw new Error('Test suite not found.');
  }

  if (suite && !suite.enabled) {
    throw new Error('Selected test suite is disabled.');
  }

  if (suite && projectId && suite.projectId !== projectId) {
    throw new Error('Selected test suite does not belong to this project.');
  }

  return { project, suite };
}

async function resolveProjectSuiteTargetContext(
  projectIdValue: unknown,
  suiteIdValue: unknown,
  targetIdValue: unknown
): Promise<{
  project?: Project;
  suite?: TestSuite;
  target?: TestTarget;
}> {
  const projectId = normalizeOptionalText(projectIdValue);
  const suiteId = normalizeOptionalText(suiteIdValue);
  const targetId = normalizeOptionalText(targetIdValue);
  const suite = suiteId
    ? ((await prisma.testSuite.findUnique({ where: { id: suiteId } })) as unknown as TestSuite | undefined)
    : undefined;
  const target = targetId
    ? ((await prisma.testTarget.findUnique({ where: { id: targetId } })) as unknown as TestTarget | undefined)
    : undefined;
  const project = suite
    ? ((await prisma.project.findUnique({ where: { id: suite.projectId } })) as unknown as Project | undefined)
    : target
      ? ((await prisma.project.findUnique({ where: { id: target.projectId } })) as unknown as Project | undefined)
      : projectId
        ? ((await prisma.project.findUnique({ where: { id: projectId } })) as unknown as Project | undefined)
        : undefined;

  if (suiteId && !suite) {
    throw new Error('Test suite not found.');
  }

  if (targetId && !target) {
    throw new Error('Test target not found.');
  }

  if (suite && !suite.enabled) {
    throw new Error('Selected test suite is disabled.');
  }

  if (target && !target.enabled) {
    throw new Error('Selected test target is disabled.');
  }

  if (suite && projectId && suite.projectId !== projectId) {
    throw new Error('Selected test suite does not belong to this project.');
  }

  if (target && projectId && target.projectId !== projectId) {
    throw new Error('Selected test target does not belong to this project.');
  }

  if (suite && target && suite.projectId !== target.projectId) {
    throw new Error('Selected test target does not belong to the same project as this suite.');
  }

  return { project, suite, target };
}

function resolveRunUrl(urlValue: unknown, project?: Project, target?: TestTarget): string {
  if (target && ['web-url', 'local-web', 'api'].includes(target.type) && target.url) {
    return normalizeUrl(target.url);
  }

  const bodyUrl = normalizeOptionalText(urlValue);

  if (bodyUrl) {
    return normalizeUrl(bodyUrl);
  }

  if (project?.baseUrl) {
    return normalizeUrl(project.baseUrl);
  }

  throw new Error('URL is required.');
}

function buildSuiteUserRequest(userRequest: string, suite?: TestSuite): string {
  const request = userRequest.trim();

  if (!suite) {
    return request;
  }

  if (request) {
    return request;
  }

  if (suite.type === 'seo-basic') {
    return suite.description || 'Test SEO cho trang web';
  }

  return suite.description || suite.name;
}

function normalizeDbProjectInput(value: Record<string, unknown>, existing?: any) {
  const project = normalizeProjectInput(value, existing);

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    baseUrl: project.baseUrl,
    environment: project.environment,
  };
}

function normalizeDbSuiteInput(value: Record<string, unknown>, existing?: any) {
  const name = normalizeOptionalText(value.name);
  const projectId = normalizeOptionalText(value.projectId || existing?.projectId);

  if (!name) {
    throw new Error('Test suite name is required.');
  }

  if (!projectId) {
    throw new Error('Project is required for this test suite.');
  }

  return {
    id: existing?.id || createSuiteId(),
    projectId,
    name,
    type: normalizeSuiteType(value.type),
    description: normalizeOptionalText(value.description),
    config: value.config && typeof value.config === 'object'
      ? JSON.stringify(value.config)
      : existing?.config || '{}',
    enabled: typeof value.enabled === 'boolean' ? value.enabled : existing?.enabled ?? true,
  };
}

async function normalizeDbTargetInput(value: Record<string, unknown>, existing?: any) {
  const name = normalizeOptionalText(value.name);
  const projectId = normalizeOptionalText(value.projectId || existing?.projectId);
  const type = normalizeTargetType(value.type || existing?.type);
  const url = normalizeOptionalText(value.url);
  const localPath = normalizeOptionalText(value.localPath);

  if (!name) {
    throw new Error('Test target name is required.');
  }

  if (!projectId) {
    throw new Error('Project is required for this test target.');
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    throw new Error('Project not found for this test target.');
  }

  if ((type === 'web-url' || type === 'local-web' || type === 'api') && !url) {
    throw new Error('URL is required for this target type.');
  }

  if ((type === 'web-url' || type === 'local-web' || type === 'api') && url) {
    normalizeUrl(url);
  }

  if (type === 'source-code' && !localPath) {
    throw new Error('Local path is required for source-code targets.');
  }

  return {
    id: existing?.id || createTargetId(),
    projectId,
    name,
    type,
    url: url ? normalizeUrl(url) : '',
    localPath,
    config: value.config && typeof value.config === 'object'
      ? JSON.stringify(value.config)
      : existing?.config || '{}',
    enabled: typeof value.enabled === 'boolean' ? value.enabled : existing?.enabled ?? true,
  };
}

async function normalizeDbTestCaseInput(value: Record<string, unknown>, existing?: any) {
  const suiteId = normalizeOptionalText(value.suiteId || existing?.suiteId);
  const code = normalizeOptionalText(value.code || existing?.code).toUpperCase();
  const name = normalizeOptionalText(value.name);

  if (!suiteId) {
    throw new Error('Test suite is required for this test case.');
  }

  if (!code) {
    throw new Error('Test case code is required.');
  }

  if (!name) {
    throw new Error('Test case name is required.');
  }

  const suite = await prisma.testSuite.findUnique({ where: { id: suiteId } });

  if (!suite) {
    throw new Error('Test suite not found for this test case.');
  }

  return {
    id: existing?.id || createCaseId(),
    suiteId,
    code,
    name,
    description: normalizeOptionalText(value.description),
    priority: normalizeOptionalText(value.priority) || existing?.priority || 'medium',
    enabled: typeof value.enabled === 'boolean' ? value.enabled : existing?.enabled ?? true,
    expectedResult: normalizeOptionalText(value.expectedResult),
  };
}

function normalizeAuth(value: unknown): AuthInput {
  if (!value || typeof value !== 'object') {
    return { mode: 'none' };
  }

  const auth = value as Record<string, unknown>;
  const mode = auth.mode === 'password' ? 'password' : 'none';

  if (mode === 'none') {
    return { mode };
  }

  return {
    mode,
    loginUrl: typeof auth.loginUrl === 'string' ? auth.loginUrl.trim() : '',
    username: typeof auth.username === 'string' ? auth.username.trim() : '',
    password: typeof auth.password === 'string' ? auth.password : '',
    usernameSelector: typeof auth.usernameSelector === 'string' ? auth.usernameSelector.trim() : '',
    passwordSelector: typeof auth.passwordSelector === 'string' ? auth.passwordSelector.trim() : '',
    submitSelector: typeof auth.submitSelector === 'string' ? auth.submitSelector.trim() : '',
    successSelector: typeof auth.successSelector === 'string' ? auth.successSelector.trim() : '',
  };
}

function isPasswordAuthEnabled(auth?: AuthInput): boolean {
  return auth?.mode === 'password' && Boolean(auth.loginUrl?.trim());
}

function authConfigForGenerator(auth?: AuthInput): AuthConfig {
  if (!isPasswordAuthEnabled(auth)) {
    return { mode: 'none' };
  }

  const { password, ...safeAuth } = auth;
  return safeAuth;
}

function summarizeJsonReport(stdout: string): TestRun['summary'] {
  try {
    const report = JSON.parse(stdout) as {
      stats?: {
        expected?: number;
        unexpected?: number;
        skipped?: number;
      };
      errors?: Array<unknown>;
      suites?: Array<{
        specs?: Array<{
          tests?: Array<{ status?: string }>;
        }>;
      }>;
    };

    if (report.stats) {
      const passed = report.stats.expected || 0;
      const failed = report.stats.unexpected || 0;
      const skipped = report.stats.skipped || 0;
      const globalErrors = Array.isArray(report.errors) ? report.errors.length : 0;
      const normalizedFailed = failed || globalErrors;

      return {
        total: passed + normalizedFailed + skipped,
        passed,
        failed: normalizedFailed,
        skipped,
      };
    }
  } catch {
    // Fall through to a conservative summary.
  }

  return {
    total: 0,
    passed: 0,
    failed: 1,
    skipped: 0,
  };
}

function collectSpecs(suites: Array<Record<string, unknown>> = []): Array<Record<string, unknown>> {
  const specs: Array<Record<string, unknown>> = [];

  for (const suite of suites) {
    if (Array.isArray(suite.specs)) {
      specs.push(...(suite.specs as Array<Record<string, unknown>>));
    }

    if (Array.isArray(suite.suites)) {
      specs.push(...collectSpecs(suite.suites as Array<Record<string, unknown>>));
    }
  }

  return specs;
}

function extractCaseDetails(stdout: string): TestCaseDetail[] {
  try {
    const report = JSON.parse(stdout) as {
      suites?: Array<Record<string, unknown>>;
      errors?: Array<Record<string, unknown>>;
    };
    const specs = collectSpecs(report.suites);

    const caseDetails = specs.map((spec) => {
      const tests = Array.isArray(spec.tests) ? (spec.tests as Array<Record<string, unknown>>) : [];
      const testResult = tests[0];
      const results = Array.isArray(testResult?.results)
        ? (testResult.results as Array<Record<string, unknown>>)
        : [];
      const result = results[0];
      const errors = Array.isArray(result?.errors) ? (result.errors as Array<Record<string, unknown>>) : [];
      const firstError = errors[0];

      return {
        title: typeof spec.title === 'string' ? spec.title : 'Untitled test',
        status:
          typeof result?.status === 'string'
            ? result.status
            : typeof testResult?.status === 'string'
              ? testResult.status
              : 'unknown',
        durationMs: typeof result?.duration === 'number' ? result.duration : 0,
        error: typeof firstError?.message === 'string' ? firstError.message : undefined,
      };
    });

    if (!caseDetails.length && Array.isArray(report.errors) && report.errors.length) {
      const firstError = report.errors[0];

      return [
        {
          title: 'Playwright run failed',
          status: 'failed',
          durationMs: 0,
          error:
            typeof firstError?.message === 'string'
              ? firstError.message
              : 'Playwright failed before running any test case.',
        },
      ];
    }

    return caseDetails;
  } catch {
    return [];
  }
}

function findTestSnippet(source: string, title: string): string | undefined {
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startPattern = new RegExp(`test\\s*\\(\\s*['"]${escapedTitle}['"]`);
  const match = startPattern.exec(source);

  if (!match) {
    return undefined;
  }

  const start = match.index;
  const nextTest = source.slice(start + 5).search(/\n\s*test\s*\(/);
  const end = nextTest >= 0 ? start + 5 + nextTest : source.indexOf('\n});', start);

  return source.slice(start, end > start ? end : undefined).trim();
}

function caseStatusLabel(status: string): string {
  return status === 'passed' ? 'passed' : status === 'timedOut' ? 'timedOut' : status || 'unknown';
}

function assertStepStatus(testCase: TestCaseDetail): string {
  return caseStatusLabel(testCase.status);
}

function timeoutDetail(testCase: TestCaseDetail): string | undefined {
  if (testCase.status !== 'timedOut') {
    return undefined;
  }

  return 'This case reached the Playwright per-test timeout before the final assertion completed. It usually means the target page was slow, blocked automation, kept loading background requests, or the checked element/value never became ready.';
}

function buildSeoSteps(
  testCase: TestCaseDetail,
  audit?: SeoAuditValues,
  selector = '',
  actual = ''
): TestCaseStep[] {
  const durationText = `${(testCase.durationMs / 1000).toFixed(1)}s`;
  const finalUrl = audit?.pageUrl || actual || 'The final URL was not captured.';
  const steps: TestCaseStep[] = [
    {
      title: 'Open target page',
      detail: `Chromium opens the target URL and waits for the first HTML response. Final URL: ${finalUrl}`,
      status: 'passed',
    },
    {
      title: 'Wait for page readiness',
      detail: 'The test waits for DOMContentLoaded, then briefly waits for network idle. If the site keeps background requests open, that wait is skipped safely.',
      status: testCase.status === 'timedOut' ? 'timedOut' : 'passed',
    },
    {
      title: selector ? `Read ${selector}` : 'Read page state',
      detail: actual || audit?.pageUrl || 'The value was not captured for this run.',
      status: testCase.status === 'passed' ? 'passed' : 'unknown',
    },
    {
      title: 'Check assertion',
      detail: timeoutDetail(testCase) || testCase.error || `The captured value is compared with the expected rule. Result: ${testCase.status} in ${durationText}.`,
      status: assertStepStatus(testCase),
    },
  ];

  return steps;
}

function humanizeCodeLine(line: string): TestCaseStep | undefined {
  const trimmedLine = line.trim();

  if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine === '{' || trimmedLine === '});') {
    return undefined;
  }

  if (trimmedLine.includes('page.goto')) {
    return {
      title: 'Open target page',
      detail: 'Navigate Chromium to SITE_URL and wait for the configured load condition.',
      status: 'pending',
    };
  }

  if (trimmedLine.includes('waitForLoadState')) {
    return {
      title: 'Wait for page readiness',
      detail: 'Wait for DOM/network state so later assertions read a stable page.',
      status: 'pending',
    };
  }

  if (trimmedLine.includes('locator(')) {
    return {
      title: 'Find element',
      detail: trimmedLine,
      status: 'pending',
    };
  }

  if (trimmedLine.includes('expect(') || trimmedLine.includes('expect.')) {
    return {
      title: 'Validate expectation',
      detail: trimmedLine,
      status: 'pending',
    };
  }

  if (trimmedLine.includes('request.get') || trimmedLine.includes('response')) {
    return {
      title: 'Check HTTP response',
      detail: trimmedLine,
      status: 'pending',
    };
  }

  if (trimmedLine.includes('page.on')) {
    return {
      title: 'Watch browser errors',
      detail: trimmedLine,
      status: 'pending',
    };
  }

  return undefined;
}

function buildGeneratedSteps(testCase: TestCaseDetail, codeSnippet = ''): TestCaseStep[] {
  const steps = codeSnippet
    .split(/\r?\n/)
    .map(humanizeCodeLine)
    .filter(Boolean)
    .slice(0, 8) as TestCaseStep[];

  if (!steps.length) {
    steps.push({
      title: 'Run generated Playwright case',
      detail: 'The generated case is executed in Chromium using the current Website URL and AI request.',
      status: 'pending',
    });
  }

  return steps.map((step, index) => ({
    ...step,
    status: index === steps.length - 1 ? assertStepStatus(testCase) : 'passed',
  }));
}

async function collectSeoAuditValues(url: string, auth?: AuthInput): Promise<SeoAuditValues | undefined> {
  const script = `
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const auth = ${JSON.stringify(authConfigForGenerator(auth))};

  if (auth.mode === 'password' && auth.loginUrl) {
    await page.goto(auth.loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator(auth.usernameSelector || 'input[name="email"], input[name="username"], input[type="email"], input[type="text"]').first().fill(auth.username || '');
    await page.locator(auth.passwordSelector || 'input[name="password"], input[type="password"]').first().fill(process.env.PASSMARK_AUTH_PASSWORD || '');
    await Promise.all([
      page.waitForLoadState('domcontentloaded').catch(() => undefined),
      page.locator(auth.submitSelector || 'button[type="submit"], input[type="submit"]').first().click(),
    ]);
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
    if (auth.successSelector) {
      await page.locator(auth.successSelector).first().waitFor({ state: 'visible', timeout: 15000 });
    }
  }

  await page.goto(${JSON.stringify(url)}, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);

  const values = await page.evaluate(() => {
    const firstH1 = document.querySelector('h1');
    return {
      pageUrl: location.href,
      title: document.title || '',
      metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
      h1Count: document.querySelectorAll('h1').length,
      h1Text: firstH1?.textContent?.trim() || '',
      htmlLang: document.documentElement.getAttribute('lang') || '',
      viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content') || '',
    };
  });

  console.log(JSON.stringify(values));
  await browser.close();
})().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
`;

  try {
    const result = await execFileAsync(process.execPath, ['-e', script], {
      cwd: rootDir,
      env: {
        ...process.env,
        PASSMARK_AUTH_PASSWORD: auth?.password || '',
      },
      maxBuffer: 1024 * 1024,
    });

    return JSON.parse(result.stdout.trim()) as SeoAuditValues;
  } catch {
    return undefined;
  }
}

function enrichCaseDetails(
  cases: TestCaseDetail[],
  audit?: SeoAuditValues,
  generatedCode = '',
  userRequest = ''
): TestCaseDetail[] {
  return cases.map((testCase) => {
    const title = testCase.title.toLowerCase();
    const codeSnippet = findTestSnippet(generatedCode, testCase.title);

    if (title.includes('page loads successfully')) {
      const actual = audit?.pageUrl || 'Not captured';
      return {
        ...testCase,
        description: 'Checks that the browser can open the URL and stays on a valid page.',
        expected: 'The page URL should exist after navigation.',
        actual,
        code: "await page.goto(SITE_URL, { waitUntil: 'domcontentloaded' });\nawait expect(page).toHaveURL(/.+/);",
        steps: buildSeoSteps(testCase, audit, 'page.url()', actual),
      };
    }

    if (title === 'has title' || title.includes('has title')) {
      const actual = audit?.title ? `Title: ${audit.title}` : 'Title was empty or not captured';
      return {
        ...testCase,
        description: 'Checks that the document title is not empty after the page finishes loading.',
        expected: 'Title length should be greater than 0.',
        actual,
        selector: 'document.title',
        code:
          "await expect\n  .poll(async () => (await page.title()).trim().length)\n  .toBeGreaterThan(0);",
        steps: buildSeoSteps(testCase, audit, 'document.title', actual),
      };
    }

    if (title.includes('meta description')) {
      const actual = audit?.metaDescription
        ? `Meta description: ${audit.metaDescription}`
        : 'Meta description was empty or not captured';
      return {
        ...testCase,
        description: 'Checks that exactly one meta description exists and has content.',
        expected: 'One meta description tag with non-empty content.',
        actual,
        selector: 'meta[name="description"]',
        code:
          "const metaDescription = page.locator('meta[name=\"description\"]');\nawait expect(metaDescription).toHaveCount(1);",
        steps: buildSeoSteps(testCase, audit, 'meta[name="description"]', actual),
      };
    }

    if (title.includes('canonical')) {
      const actual = audit?.canonical ? `Canonical: ${audit.canonical}` : 'Canonical URL was empty or not captured';
      return {
        ...testCase,
        description: 'Checks that the page declares a canonical URL.',
        expected: 'One canonical link with a non-empty href.',
        actual,
        selector: 'link[rel="canonical"]',
        code:
          "const canonical = page.locator('link[rel=\"canonical\"]');\nawait expect(canonical).toHaveCount(1);",
        steps: buildSeoSteps(testCase, audit, 'link[rel="canonical"]', actual),
      };
    }

    if (title.includes('h1')) {
      const actual = audit
        ? `H1 count: ${audit.h1Count}; H1 text: ${audit.h1Text || 'empty'}`
        : 'H1 data was not captured';
      return {
        ...testCase,
        description: 'Checks that the page has exactly one H1 and that it contains text.',
        expected: 'Exactly one H1 with non-empty text.',
        actual,
        selector: 'h1',
        code: "const h1 = page.locator('h1');\nawait expect(h1).toHaveCount(1);",
        steps: buildSeoSteps(testCase, audit, 'h1', actual),
      };
    }

    if (title.includes('html lang') || title.includes('viewport')) {
      const actual = audit
        ? `Lang: ${audit.htmlLang || 'empty'}; Viewport: ${audit.viewport || 'empty'}`
        : 'Lang/viewport data was not captured';
      return {
        ...testCase,
        description: 'Checks that html lang and viewport meta are present.',
        expected: 'html lang and viewport content should be non-empty.',
        actual,
        selector: 'html[lang], meta[name="viewport"]',
        code:
          "const lang = await page.locator('html').getAttribute('lang');\nconst viewport = page.locator('meta[name=\"viewport\"]');",
        steps: buildSeoSteps(testCase, audit, 'html[lang], meta[name="viewport"]', actual),
      };
    }

    const actual = `${testCase.status.toUpperCase()} in ${Math.round(testCase.durationMs)}ms${
      audit?.pageUrl ? `; final URL: ${audit.pageUrl}` : ''
    }`;

    return {
      ...testCase,
      description: userRequest
        ? `Runs the generated Playwright check for: ${userRequest}`
        : 'Runs a generated Playwright check for this website.',
      expected: 'All assertions in this generated test case should pass.',
      actual: timeoutDetail(testCase) || actual,
      code: codeSnippet,
      steps: buildGeneratedSteps(testCase, codeSnippet),
    };
  });
}

function previewGeneratedCases(generatedCode = '', userRequest = ''): TestCaseDetail[] {
  const titlePattern = /test\s*\(\s*['"]([^'"]+)['"]/g;
  const cases: TestCaseDetail[] = [];
  let match: RegExpExecArray | null;

  while ((match = titlePattern.exec(generatedCode)) && cases.length < 12) {
    const title = match[1];
    const codeSnippet = findTestSnippet(generatedCode, title) || '';

    cases.push({
      title,
      status: 'pending',
      durationMs: 0,
      description: userRequest
        ? `Generated case for: ${userRequest}`
        : 'Generated Playwright case that will run in Chromium.',
      expected: 'This case should pass when executed.',
      actual: 'Not run yet.',
      code: codeSnippet,
      steps: buildGeneratedSteps(
        {
          title,
          status: 'pending',
          durationMs: 0,
        },
        codeSnippet
      ),
    });
  }

  return cases;
}

function caseCodeFromTitle(title: string): string {
  return title.match(/\b[A-Z]+-\d+\b/)?.[0] || '';
}

async function saveRunToDb(run: TestRun, outputPath: string): Promise<TestRun> {
  const rawOutputDir = path.join(storageDir, 'raw-runs');
  fs.mkdirSync(rawOutputDir, { recursive: true });
  const rawOutputPath = path.join(rawOutputDir, `${run.id}.json`);

  fs.writeFileSync(
    rawOutputPath,
    JSON.stringify(
      {
        stdout: run.stdout,
        stderr: run.stderr,
        generatedCode: run.generatedCode,
      },
      null,
      2
    ),
    'utf-8'
  );

  await prisma.$transaction(async (tx) => {
    await tx.artifact.deleteMany({ where: { runId: run.id } });
    await tx.testResult.deleteMany({ where: { runId: run.id } });
    await tx.testRun.update({
      where: { id: run.id },
      data: {
        projectId: run.projectId,
        suiteId: run.suiteId,
        targetId: run.targetId,
        url: run.url,
        status: run.status,
        total: run.summary.total,
        passed: run.summary.passed,
        failed: run.summary.failed,
        skipped: run.summary.skipped,
        durationMs: run.durationMs,
        generatedSpecPath: outputPath,
        rawOutputPath,
        userRequest: run.userRequest || '',
        stdout: run.stdout,
        stderr: run.stderr,
        generatedCode: run.generatedCode || '',
        results: {
          create: (run.cases || []).map((testCase) => {
            const caseCode = caseCodeFromTitle(testCase.title);
            const caseName = caseCode ? testCase.title.replace(caseCode, '').trim() : testCase.title;

            return {
              id: newId('result'),
              caseCode,
              caseName,
              status: testCase.status === 'passed' ? 'passed' : testCase.status === 'skipped' ? 'skipped' : 'failed',
              durationMs: Math.round(testCase.durationMs || 0),
              errorMessage: testCase.error || '',
              stackTrace: testCase.error || '',
              expectedResult: testCase.expected || '',
              aiDiagnosis: JSON.stringify({
                description: testCase.description || '',
                actual: testCase.actual || '',
                selector: testCase.selector || '',
                code: testCase.code || '',
                steps: testCase.steps || [],
              }),
            };
          }),
        },
        artifacts: {
          create: [
            {
              id: newId('artifact'),
              type: 'raw-log',
              path: rawOutputPath,
            },
          ],
        },
      },
    });
  });

  return run;
}

async function runPlaywright(
  url: string,
  generatedCode = '',
  userRequest = '',
  auth?: AuthInput,
  context: RunContext = {},
  specPath = path.join('tests', 'generated-seo.spec.ts'),
  runId = `${Date.now()}`
): Promise<TestRun> {
  const startedAt = Date.now();
  const npxCommand = process.platform === 'win32' ? 'cmd.exe' : 'npx';
  const normalizedSpecPath = specPath.split(path.sep).join('/');
  const playwrightArgs = ['playwright', 'test', normalizedSpecPath, '--project=chromium', '--reporter=json'];
  const commandArgs = process.platform === 'win32' ? ['/d', '/s', '/c', 'npx.cmd', ...playwrightArgs] : playwrightArgs;
  let stdout = '';
  let stderr = '';
  let status: TestRun['status'] = 'passed';

  try {
    const result = await execFileAsync(
      npxCommand,
      commandArgs,
      {
        cwd: rootDir,
        env: {
          ...process.env,
          PASSMARK_AUTH_PASSWORD: auth?.password || '',
        },
        maxBuffer: 1024 * 1024 * 10,
      }
    );

    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error) {
    status = 'failed';

    if (error && typeof error === 'object') {
      stdout = 'stdout' in error && typeof error.stdout === 'string' ? error.stdout : '';
      stderr = 'stderr' in error && typeof error.stderr === 'string' ? error.stderr : String(error);
    } else {
      stderr = String(error);
    }
  }

  const summary = summarizeJsonReport(stdout);
  const audit = await collectSeoAuditValues(url, auth);
  const cases = enrichCaseDetails(extractCaseDetails(stdout), audit, generatedCode, userRequest);

  if (summary.failed > 0) {
    status = 'failed';
  }

  const run: TestRun = {
    id: runId,
    url,
    projectId: context.projectId,
    projectName: context.projectName,
    suiteId: context.suiteId,
    suiteName: context.suiteName,
    suiteType: context.suiteType,
    targetId: context.targetId,
    targetName: context.targetName,
    targetType: context.targetType,
    status,
    createdAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    summary,
    cases,
    generatedCode,
    userRequest,
    stdout,
    stderr,
  };

  return run;
}

async function generateSpecForRun(
  url: string,
  userRequest: string,
  auth: AuthInput,
  suite?: TestSuite
): Promise<{
  outputPath: string;
  code: string;
}> {
  const useStableSeo = !suite || suite.type === 'seo-basic';

  if (!useStableSeo) {
    return generateSeoTest(url, userRequest, authConfigForGenerator(auth));
  }

  const enabledCases = suite?.id
    ? await prisma.testCase.findMany({
        where: { suiteId: suite.id, enabled: true },
        orderBy: { code: 'asc' },
      })
    : [];
  const planResult = await generateSeoTestPlan(url, userRequest, enabledCases);
  await prisma.aIRequestLog.create({
    data: {
      id: newId('ai-log'),
      provider: 'local-ai',
      model: getConfiguredLocalAIModel(),
      prompt: planResult.aiPrompt,
      response: planResult.aiResponse,
      status: planResult.aiStatus,
      durationMs: planResult.durationMs,
    },
  });

  return writeSeoBasicSpec(planResult.plan, authConfigForGenerator(auth));
}

async function createQueuedRun(job: RunQueueJob): Promise<TestRun> {
  const run = await prisma.testRun.create({
    data: {
      id: job.runId,
      projectId: job.context.projectId,
      suiteId: job.context.suiteId,
      targetId: job.context.targetId,
      url: job.url,
      status: 'queued',
      userRequest: job.userRequest || '',
    },
    include: {
      project: true,
      suite: true,
      target: true,
      results: true,
    },
  });

  return dbRunToApiRun(run);
}

async function failRun(runId: string, error: unknown) {
  await prisma.testRun.update({
    where: { id: runId },
    data: {
      status: 'failed',
      failed: 1,
      total: 1,
      stderr: error instanceof Error ? error.stack || error.message : String(error),
    },
  });
}

async function executeRunQueueJob(job: RunQueueJob) {
  await prisma.testRun.update({
    where: { id: job.runId },
    data: { status: 'running' },
  });

  try {
    const suite = job.context.suiteId
      ? ((await prisma.testSuite.findUnique({ where: { id: job.context.suiteId } })) as unknown as TestSuite | undefined)
      : undefined;
    const result = await generateSpecForRun(job.url, job.userRequest, job.auth, suite);
    const run = await runPlaywright(
      job.url,
      result.code,
      job.userRequest,
      job.auth,
      job.context,
      path.relative(rootDir, result.outputPath),
      job.runId
    );
    await saveRunToDb(run, result.outputPath);
  } catch (error) {
    await failRun(job.runId, error);
  }
}

class InMemoryRunQueue {
  private queued: RunQueueJob[] = [];
  private running = new Map<string, RunQueueJob>();

  constructor(
    private readonly worker: (job: RunQueueJob) => Promise<void>,
    private readonly concurrency = Number(process.env.RUN_QUEUE_CONCURRENCY || 1)
  ) {}

  enqueue(job: RunQueueJob) {
    this.queued.push(job);
    this.drain();
  }

  status() {
    return {
      queued: this.queued.length,
      running: this.running.size,
      count: this.queued.length + this.running.size,
      concurrency: this.concurrency,
    };
  }

  private drain() {
    while (this.running.size < this.concurrency && this.queued.length > 0) {
      const job = this.queued.shift();

      if (!job) {
        return;
      }

      this.running.set(job.runId, job);
      this.worker(job)
        .catch((error) => {
          console.error('[queue] Run job failed unexpectedly.', error);
        })
        .finally(() => {
          this.running.delete(job.runId);
          this.drain();
        });
    }
  }
}

const runQueue = new InMemoryRunQueue(executeRunQueueJob);

async function cancelInterruptedRuns() {
  await prisma.testRun.updateMany({
    where: {
      status: {
        in: ['queued', 'running'],
      },
    },
    data: {
      status: 'cancelled',
      stderr: 'Run was interrupted because the server restarted before the in-memory queue finished it.',
    },
  });
}

function serveStatic(request: http.IncomingMessage, response: http.ServerResponse) {
  const requestUrl = new URL(request.url || '/', `http://localhost:${port}`);
  const pathname = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const filePath = path.normalize(path.join(publicDir, pathname));

  if (!filePath.startsWith(publicDir)) {
    sendError(response, 403, 'Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendError(response, 404, 'Not found');
    return;
  }

  const ext = path.extname(filePath);
  const contentTypes: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
  };

  response.writeHead(200, {
    'Content-Type': contentTypes[ext] || 'application/octet-stream',
  });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://localhost:${port}`);

  try {
    if (request.method === 'GET' && requestUrl.pathname === '/api/projects') {
      sendJson(response, 200, await prisma.project.findMany({ orderBy: { createdAt: 'desc' } }));
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/projects') {
      const body = await readBody(request);
      const projectInput = normalizeDbProjectInput(body);
      const project = await prisma.project.create({ data: projectInput });
      await prisma.environment.create({
        data: {
          id: newId('environment'),
          projectId: project.id,
          name: project.environment,
          baseUrl: project.baseUrl,
          authType: 'none',
          authConfig: '{}',
          customHeaders: '{}',
        },
      });
      await createDefaultTargetForProject(project);
      await createDefaultSuiteForProject(project.id);
      sendJson(response, 201, project);
      return;
    }

    if (requestUrl.pathname.startsWith('/api/projects/')) {
      const id = decodeURIComponent(requestUrl.pathname.replace('/api/projects/', ''));
      const existingProject = await prisma.project.findUnique({ where: { id } });

      if (!existingProject) {
        sendError(response, 404, 'Project not found');
        return;
      }

      if (request.method === 'PUT') {
        const body = await readBody(request);
        const projectInput = normalizeDbProjectInput(body, existingProject);
        const project = await prisma.project.update({
          where: { id },
          data: projectInput,
        });
        sendJson(response, 200, project);
        return;
      }

      if (request.method === 'DELETE') {
        const deletedProject = await prisma.project.delete({ where: { id } });
        sendJson(response, 200, deletedProject);
        return;
      }
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/test-suites') {
      const projectId = requestUrl.searchParams.get('projectId');
      const suites = await prisma.testSuite.findMany({
        where: projectId ? { projectId } : undefined,
        orderBy: { createdAt: 'desc' },
        include: { testCases: { orderBy: { code: 'asc' } } },
      });

      sendJson(response, 200, suites.map(dbSuiteToApiSuite));
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/test-suites') {
      const body = await readBody(request);
      const suiteInput = normalizeDbSuiteInput(body);
      const suite = await prisma.testSuite.create({ data: suiteInput });
      sendJson(response, 201, dbSuiteToApiSuite(suite));
      return;
    }

    if (requestUrl.pathname.startsWith('/api/test-suites/')) {
      const id = decodeURIComponent(requestUrl.pathname.replace('/api/test-suites/', ''));
      const existingSuite = await prisma.testSuite.findUnique({ where: { id } });

      if (!existingSuite) {
        sendError(response, 404, 'Test suite not found');
        return;
      }

      if (request.method === 'PUT') {
        const body = await readBody(request);
        const suiteInput = normalizeDbSuiteInput(body, existingSuite);
        const suite = await prisma.testSuite.update({
          where: { id },
          data: suiteInput,
        });
        sendJson(response, 200, dbSuiteToApiSuite(suite));
        return;
      }

      if (request.method === 'DELETE') {
        const deletedSuite = await prisma.testSuite.delete({ where: { id } });
        sendJson(response, 200, dbSuiteToApiSuite(deletedSuite));
        return;
      }
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/test-cases') {
      const suiteId = requestUrl.searchParams.get('suiteId');

      if (!suiteId) {
        sendError(response, 400, 'suiteId is required');
        return;
      }

      const cases = await prisma.testCase.findMany({
        where: { suiteId },
        orderBy: { code: 'asc' },
      });

      sendJson(response, 200, cases);
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/test-cases') {
      const body = await readBody(request);
      const caseInput = await normalizeDbTestCaseInput(body);
      const testCase = await prisma.testCase.create({ data: caseInput });
      sendJson(response, 201, testCase);
      return;
    }

    if (requestUrl.pathname.startsWith('/api/test-cases/')) {
      const id = decodeURIComponent(requestUrl.pathname.replace('/api/test-cases/', ''));
      const existingCase = await prisma.testCase.findUnique({ where: { id } });

      if (!existingCase) {
        sendError(response, 404, 'Test case not found');
        return;
      }

      if (request.method === 'PUT') {
        const body = await readBody(request);
        const caseInput = await normalizeDbTestCaseInput(body, existingCase);
        const testCase = await prisma.testCase.update({
          where: { id },
          data: caseInput,
        });
        sendJson(response, 200, testCase);
        return;
      }

      if (request.method === 'DELETE') {
        const deletedCase = await prisma.testCase.delete({ where: { id } });
        sendJson(response, 200, deletedCase);
        return;
      }
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/test-targets') {
      const projectId = requestUrl.searchParams.get('projectId');
      const targets = await prisma.testTarget.findMany({
        where: projectId ? { projectId } : undefined,
        orderBy: { createdAt: 'desc' },
      });

      sendJson(response, 200, targets.map(dbTargetToApiTarget));
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/test-targets') {
      const body = await readBody(request);
      const targetInput = await normalizeDbTargetInput(body);
      const target = await prisma.testTarget.create({ data: targetInput });
      sendJson(response, 201, dbTargetToApiTarget(target));
      return;
    }

    if (requestUrl.pathname.startsWith('/api/test-targets/')) {
      const id = decodeURIComponent(requestUrl.pathname.replace('/api/test-targets/', ''));
      const existingTarget = await prisma.testTarget.findUnique({ where: { id } });

      if (!existingTarget) {
        sendError(response, 404, 'Test target not found');
        return;
      }

      if (request.method === 'PUT') {
        const body = await readBody(request);
        const targetInput = await normalizeDbTargetInput(body, existingTarget);
        const target = await prisma.testTarget.update({
          where: { id },
          data: targetInput,
        });
        sendJson(response, 200, dbTargetToApiTarget(target));
        return;
      }

      if (request.method === 'DELETE') {
        const deletedTarget = await prisma.testTarget.delete({ where: { id } });
        sendJson(response, 200, dbTargetToApiTarget(deletedTarget));
        return;
      }
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/queue/status') {
      sendJson(response, 200, runQueue.status());
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/runs') {
      const runs = await prisma.testRun.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          project: true,
          suite: true,
          target: true,
          results: { orderBy: { caseCode: 'asc' } },
        },
      });
      sendJson(response, 200, runs.map((run) => toRunSummary(dbRunToApiRun(run))));
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname.startsWith('/api/runs/')) {
      const id = decodeURIComponent(requestUrl.pathname.replace('/api/runs/', ''));
      const run = await prisma.testRun.findUnique({
        where: { id },
        include: {
          project: true,
          suite: true,
          target: true,
          results: { orderBy: { caseCode: 'asc' } },
          artifacts: true,
        },
      });

      if (!run) {
        sendError(response, 404, 'Run not found');
        return;
      }

      sendJson(response, 200, dbRunToApiRun(run));
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/generate') {
      const body = await readBody(request);
      const { project, suite, target } = await resolveProjectSuiteTargetContext(body.projectId, body.suiteId, body.targetId);
      const url = resolveRunUrl(body.url, project, target);
      const userRequest = buildSuiteUserRequest(typeof body.userRequest === 'string' ? body.userRequest : '', suite);
      const auth = normalizeAuth(body.auth);
      const result = await generateSpecForRun(url, userRequest, auth, suite);

      sendJson(response, 200, {
        url,
        projectId: project?.id,
        projectName: project?.name,
        suiteId: suite?.id,
        suiteName: suite?.name,
        suiteType: suite?.type,
        targetId: target?.id,
        targetName: target?.name,
        targetType: target?.type,
        outputPath: result.outputPath,
        code: result.code,
        cases: previewGeneratedCases(result.code, userRequest),
      });
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/run') {
      const body = await readBody(request);
      const { project, suite, target } = await resolveProjectSuiteTargetContext(body.projectId, body.suiteId, body.targetId);
      const url = resolveRunUrl(body.url, project, target);
      const userRequest = buildSuiteUserRequest(typeof body.userRequest === 'string' ? body.userRequest : '', suite);
      const auth = normalizeAuth(body.auth);
      const job: RunQueueJob = {
        runId: newId('run'),
        url,
        userRequest,
        auth,
        context: {
          projectId: project?.id,
          projectName: project?.name,
          suiteId: suite?.id,
          suiteName: suite?.name,
          suiteType: suite?.type,
          targetId: target?.id,
          targetName: target?.name,
          targetType: target?.type,
        },
      };
      const run = await createQueuedRun(job);
      runQueue.enqueue(job);

      sendJson(response, 200, {
        ...toRunSummary(run),
        runId: run.id,
        queue: runQueue.status(),
      });
      return;
    }

    if (request.method === 'GET') {
      serveStatic(request, response);
      return;
    }

    sendError(response, 405, 'Method not allowed');
  } catch (error) {
    sendError(response, 400, error instanceof Error ? error.message : String(error));
  }
});

ensureStorage();
ensureDefaultData()
  .then(cancelInterruptedRuns)
  .then(() => {
    server.listen(port, () => {
      console.log(`Passmark AI web UI: http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
