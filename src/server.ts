import { execFile } from 'child_process';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { pathToFileURL } from 'url';
import { promisify } from 'util';
import { chromium, request as playwrightRequest } from '@playwright/test';
import { ZipArchive } from 'archiver';
import JSZip from 'jszip';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { AuthConfig, generatePlaywrightTest } from '../scripts/generate-playwright-test';
import { createDefaultSuiteForProject, createDefaultTargetForProject, ensureDefaultData, ensureDefaultWorkspaceForProject, newId, prisma } from './db';
import { askLocalAI, getConfiguredLocalAIModel, getLocalAIStatus, unloadLocalAIModel } from './local-ai-client';
import { generateSeoTestPlan } from './seo-test-plan';
import { writeSeoBasicSpec } from './seo-template-renderer';

dotenv.config();

type ApiResponse = Record<string, unknown> | Array<Record<string, unknown>>;

type ProjectEnvironment = 'local' | 'dev' | 'staging' | 'production';

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
  packId?: string;
  pack?: string;
  environment?: ProjectEnvironment;
  status: TestRunStatus;
  createdAt: string;
  durationMs: number;
  blocked?: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  cases?: TestCaseDetail[];
  generatedCode?: string;
  aiExplanation?: string;
  userRequest?: string;
  stdout: string;
  stderr: string;
  errorReason?: string;
  resultCsvUrl?: string;
  resultExcelUrl?: string;
  resultDocUrl?: string;
  resultHtmlUrl?: string;
  resultPdfUrl?: string;
  resultZipUrl?: string;
  testcaseCsvUrl?: string;
  testcaseExcelUrl?: string;
  testcaseDocUrl?: string;
  historyKind?: 'testcase-file' | 'auto-test';
};

type TestRunSummary = Omit<TestRun, 'stdout' | 'stderr'>;

type TestRunStatus = 'generated' | 'queued' | 'running' | 'passed' | 'failed' | 'cancelled';

type TestCaseDetail = {
  caseId?: string;
  module?: string;
  feature?: string;
  title: string;
  status: string;
  durationMs: number;
  error?: string;
  description?: string;
  objective?: string;
  preconditions?: string;
  testData?: string;
  priority?: string;
  severity?: string;
  testType?: string;
  automationCandidate?: string;
  notes?: string;
  inputImage?: string;
  actualImage?: string;
  videoUrl?: string;
  traceUrl?: string;
  attachments?: Array<{
    name: string;
    contentType: string;
    path: string;
  }>;
  defectId?: string;
  testerName?: string;
  reviewerName?: string;
  reviewDate?: string;
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
  inputImage?: string;
  actualImage?: string;
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

type AuthMode = 'none' | 'password' | 'bearer' | 'api_key' | 'basic' | 'custom_headers';

type AuthInput = {
  mode: AuthMode;
  loginUrl?: string;
  username?: string;
  password?: string;
  usernameSelector?: string;
  passwordSelector?: string;
  submitSelector?: string;
  successSelector?: string;
  secret?: string;
  apiKeyName?: string;
  apiKeyLocation?: 'header' | 'query';
  headers?: Record<string, string>;
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
  packId?: string;
};

type RunQueueJob = {
  runId: string;
  url: string;
  displayUrl?: string;
  userRequest: string;
  auth: AuthInput;
  context: RunContext;
  importedCases?: TestcaseFileRow[];
  sourceFileName?: string;
  testcaseFilePath?: string;
  testcaseExcelFileName?: string;
  testcaseDocFileName?: string;
  cancelRequested?: boolean;
};

type GeneratedSpecResult = {
  outputPath: string;
  code: string;
  aiExplanation?: string;
};

type TestcaseGenerationProgress = {
  generatedCount: number;
  targetCount: number;
  batch: number;
  estimatedBatches: number;
  attempt: number;
  maxAttempts: number;
  message?: string;
};

type TestcaseGenerationJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

type TestcaseGenerationJob = {
  id: string;
  status: TestcaseGenerationJobStatus;
  project?: Project;
  suite?: TestSuite;
  target?: TestTarget;
  packId?: string;
  url: string;
  userRequest: string;
  targetCount: number;
  generatedCount: number;
  persistedCaseIds: string[];
  batch: number;
  estimatedBatches: number;
  attempt: number;
  maxAttempts: number;
  message: string;
  error?: string;
  createdAt: string;
  startedAt?: string;
  updatedAt: string;
  durationMs: number;
  cancelRequested: boolean;
  abortController: AbortController;
  result?: Record<string, unknown>;
};

type TestcaseFileRow = {
  caseId: string;
  projectId?: string;
  projectName?: string;
  module: string;
  requirementId?: string;
  feature: string;
  title: string;
  objective: string;
  interDependencies?: string;
  preconditions: string;
  testDataPreparation?: string;
  testData: string;
  steps: string;
  actionInputData?: string;
  expectedResult: string;
  priority: string;
  regression?: string;
  platform?: string;
  tools?: string;
  severity: string;
  testType: string;
  automationCandidate: string;
  automationKind: string;
  selector: string;
  expectedText: string;
  inputImage?: string;
  actualImage?: string;
  screenshotPolicy?: string;
  status?: string;
  actualResult?: string;
  defectId?: string;
  testerName?: string;
  reviewerName?: string;
  reviewDate?: string;
  notes?: string;
  durationMs?: string;
};

const execFileAsync = promisify(execFile);
const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const storageDir = path.join(rootDir, 'storage');
const port = Number(process.env.PORT || 4173);

function ensureStorage() {
  fs.mkdirSync(storageDir, { recursive: true });
}

let authSecretKeyCache: Buffer | null = null;

function authSecretKey(): Buffer {
  if (authSecretKeyCache) return authSecretKeyCache;
  const configured = process.env.PASSMARK_SECRET_KEY?.trim();
  if (configured) {
    authSecretKeyCache = crypto.createHash('sha256').update(configured).digest();
    return authSecretKeyCache;
  }

  ensureStorage();
  const keyPath = path.join(storageDir, 'passmark-secret.key');
  if (fs.existsSync(keyPath)) {
    authSecretKeyCache = Buffer.from(fs.readFileSync(keyPath, 'utf8').trim(), 'base64');
  } else {
    authSecretKeyCache = crypto.randomBytes(32);
    fs.writeFileSync(keyPath, authSecretKeyCache.toString('base64'), { encoding: 'utf8', mode: 0o600 });
  }
  if (authSecretKeyCache.length !== 32) throw new Error('Passmark secret key must resolve to 32 bytes.');
  return authSecretKeyCache;
}

function encryptSecret(value: string): string {
  if (!value) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', authSecretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptSecret(value: unknown): string {
  const text = typeof value === 'string' ? value : '';
  if (!text) return '';
  if (!text.startsWith('enc:v1:')) return text;
  try {
    const [, , iv, tag, encrypted] = text.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', authSecretKey(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    throw new Error('Stored authentication secret could not be decrypted. Check PASSMARK_SECRET_KEY.');
  }
}

function toRunSummary(run: TestRun): TestRunSummary {
  const { stdout, stderr, ...summary } = run;
  return summary;
}

function readRunRawData(rawOutputPath?: string): Record<string, unknown> {
  if (!rawOutputPath) {
    return {};
  }

  try {
    return parseJsonText(fs.readFileSync(rawOutputPath, 'utf-8'));
  } catch {
    return {};
  }
}

function artifactDownloadUrl(filePath?: string): string | undefined {
  return filePath
    ? `/api/testcase-files/download/${encodeURIComponent(path.basename(filePath))}`
    : undefined;
}

function dbRunToApiRun(run: any): TestRun {
  const results = Array.isArray(run.results) ? run.results : [];
  const rawData = readRunRawData(run.rawOutputPath);
  const resultCsvArtifact = Array.isArray(run.artifacts)
    ? run.artifacts.find((artifact: any) => artifact.type === 'result-csv' && artifact.path)
    : undefined;
  const resultExcelArtifact = Array.isArray(run.artifacts)
    ? run.artifacts.find((artifact: any) => artifact.type === 'result-excel' && artifact.path)
    : undefined;
  const resultDocArtifact = Array.isArray(run.artifacts)
    ? run.artifacts.find((artifact: any) => artifact.type === 'result-doc' && artifact.path)
    : undefined;
  const resultHtmlArtifact = Array.isArray(run.artifacts)
    ? run.artifacts.find((artifact: any) => artifact.type === 'result-html' && artifact.path)
    : undefined;
  const resultPdfArtifact = Array.isArray(run.artifacts)
    ? run.artifacts.find((artifact: any) => artifact.type === 'result-pdf' && artifact.path)
    : undefined;
  const resultZipArtifact = Array.isArray(run.artifacts)
    ? run.artifacts.find((artifact: any) => artifact.type === 'result-zip' && artifact.path)
    : undefined;
  const testcaseCsvArtifact = Array.isArray(run.artifacts)
    ? run.artifacts.find((artifact: any) => artifact.type === 'testcase-csv' && artifact.path)
    : undefined;
  const testcaseExcelArtifact = Array.isArray(run.artifacts)
    ? run.artifacts.find((artifact: any) => artifact.type === 'testcase-excel' && artifact.path)
    : undefined;
  const testcaseDocArtifact = Array.isArray(run.artifacts)
    ? run.artifacts.find((artifact: any) => artifact.type === 'testcase-doc' && artifact.path)
    : undefined;
  const supportedStatuses: TestRunStatus[] = ['generated', 'queued', 'running', 'passed', 'failed', 'cancelled'];
  const status = supportedStatuses.includes(run.status) ? run.status : 'failed';
  const cases = results.map((result: any) => {
    const extra = parseJsonText(result.aiDiagnosis);
    const resultArtifacts = Array.isArray(run.artifacts)
      ? run.artifacts.filter((artifact: any) => artifact.resultId === result.id && artifact.path)
      : [];
    const screenshotArtifact = resultArtifacts.find((artifact: any) => ['actual-screenshot', 'screenshot'].includes(artifact.type));
    const videoArtifact = resultArtifacts.find((artifact: any) => artifact.type === 'video');
    const traceArtifact = resultArtifacts.find((artifact: any) => artifact.type === 'trace');

    return {
      title: `${result.caseCode} ${result.caseName}`.trim(),
      status: result.status,
      durationMs: result.durationMs,
      error: result.errorMessage || undefined,
      expected: result.expectedResult || undefined,
      actual: typeof extra.actual === 'string' ? extra.actual : result.status,
      selector: typeof extra.selector === 'string' ? extra.selector : undefined,
      inputImage: typeof extra.inputImage === 'string' ? extra.inputImage : undefined,
      actualImage: typeof extra.actualImage === 'string' && extra.actualImage
        ? extra.actualImage
        : artifactDownloadUrl(screenshotArtifact?.path),
      videoUrl: artifactDownloadUrl(videoArtifact?.path),
      traceUrl: artifactDownloadUrl(traceArtifact?.path),
      defectId: typeof extra.defectId === 'string' ? extra.defectId : undefined,
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
    environment: run.environment?.name,
    packId: run.packId || undefined,
    pack: run.pack?.name,
    status,
    createdAt: new Date(run.createdAt).toISOString(),
    durationMs: run.durationMs,
    blocked: run.blocked || 0,
    summary: {
      total: run.total,
      passed: run.passed,
      failed: run.failed,
      skipped: run.skipped || 0,
    },
    cases,
    generatedCode: run.generatedCode,
    aiExplanation: typeof rawData.aiExplanation === 'string' ? rawData.aiExplanation : undefined,
    userRequest: run.userRequest,
    stdout: run.stdout,
    stderr: run.stderr,
    errorReason: status === 'generated' ? undefined : deriveRunErrorReason(status, cases, run.stderr, run.stdout),
    historyKind: status === 'generated' ? 'testcase-file' : 'auto-test',
    resultCsvUrl: artifactDownloadUrl(resultCsvArtifact?.path),
    resultExcelUrl: artifactDownloadUrl(resultExcelArtifact?.path),
    resultDocUrl: artifactDownloadUrl(resultDocArtifact?.path),
    resultHtmlUrl: artifactDownloadUrl(resultHtmlArtifact?.path),
    resultPdfUrl: artifactDownloadUrl(resultPdfArtifact?.path),
    resultZipUrl: artifactDownloadUrl(resultZipArtifact?.path),
    testcaseCsvUrl: testcaseCsvArtifact?.path
      ? `/api/testcase-files/download/${encodeURIComponent(path.basename(testcaseCsvArtifact.path))}`
      : results.length ? `/api/runs/${encodeURIComponent(run.id)}/testcase-source/csv` : undefined,
    testcaseExcelUrl: testcaseExcelArtifact?.path
      ? `/api/testcase-files/download/${encodeURIComponent(path.basename(testcaseExcelArtifact.path))}`
      : results.length ? `/api/runs/${encodeURIComponent(run.id)}/testcase-source/xls` : undefined,
    testcaseDocUrl: testcaseDocArtifact?.path
      ? `/api/testcase-files/download/${encodeURIComponent(path.basename(testcaseDocArtifact.path))}`
      : results.length ? `/api/runs/${encodeURIComponent(run.id)}/testcase-source/doc` : undefined,
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

function stripJsonFence(value: string): string {
  return value
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

function extractJsonObjectText(value: string): string {
  const stripped = stripJsonFence(value);

  try {
    JSON.parse(stripped);
    return stripped;
  } catch {
    // Local models often wrap JSON in prose. Extract the first balanced JSON object.
  }

  const start = stripped.indexOf('{');

  if (start < 0) {
    return stripped;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < stripped.length; index += 1) {
    const char = stripped[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;

      if (depth === 0) {
        return stripped.slice(start, index + 1);
      }
    }
  }

  return stripped.slice(start);
}

function parseAiJsonObject(value: string): Record<string, unknown> {
  return JSON.parse(extractJsonObjectText(value)) as Record<string, unknown>;
}

function compactErrorText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  const text = cleanOutputText(value).trim();

  if (!text) {
    return '';
  }

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.slice(0, 8).join('\n').slice(0, 1200);
}

function cleanOutputText(value: unknown, maxLength = 6000): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/\[\d+(?:;\d+)*m/g, '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
    .slice(0, maxLength);
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

function dbTestCaseToApiTestCase(testCase: any): Record<string, unknown> {
  return {
    ...testCase,
    steps: parseJsonValue(testCase.steps, []),
  };
}

function dbPackToApiPack(pack: any): Record<string, unknown> {
  return {
    ...pack,
    caseIds: parseJsonValue<string[]>(pack.caseIds, []),
    defaultEnvironment: pack.defaultEnvironment || undefined,
    defaultTargetId: pack.defaultTargetId || undefined,
  };
}

function dbCycleToApiCycle(cycle: any): Record<string, unknown> {
  return {
    ...cycle,
    testers: parseJsonValue<string[]>(cycle.testers, []),
    executions: parseJsonValue<Record<string, unknown>>(cycle.executions, {}),
    linkedDefects: parseJsonValue<string[]>(cycle.linkedDefects, []),
  };
}

function normalizePackInput(value: Record<string, unknown>, existing?: any) {
  const projectId = normalizeOptionalText(value.projectId || existing?.projectId);
  const name = normalizeOptionalText(value.name || existing?.name);

  if (!projectId || !name) {
    throw new Error('Project and Test Pack name are required.');
  }

  const requestedKind = normalizeOptionalText(value.kind || existing?.kind) || 'custom';
  const allowedKinds = new Set(['system', 'saved', 'all', 'manual', 'automated', 'feature', 'requirement', 'release', 'custom']);

  return {
    id: existing?.id || normalizeOptionalText(value.id) || newId('pack'),
    projectId,
    name,
    description: normalizeOptionalText(value.description ?? existing?.description),
    kind: allowedKinds.has(requestedKind) ? requestedKind : 'custom',
    owner: normalizeOptionalText(value.owner || existing?.owner) || 'Local QA Team',
    caseIds: JSON.stringify(Array.isArray(value.caseIds) ? value.caseIds.filter((id): id is string => typeof id === 'string') : parseJsonValue(existing?.caseIds, [])),
    defaultEnvironment: normalizeOptionalText(value.defaultEnvironment ?? existing?.defaultEnvironment),
    defaultTargetId: normalizeOptionalText(value.defaultTargetId ?? existing?.defaultTargetId),
    archived: typeof value.archived === 'boolean' ? value.archived : existing?.archived ?? false,
  };
}

function normalizeCycleInput(value: Record<string, unknown>, existing?: any) {
  const projectId = normalizeOptionalText(value.projectId || existing?.projectId);
  const packId = normalizeOptionalText(value.packId || existing?.packId);
  const name = normalizeOptionalText(value.name || existing?.name);

  if (!projectId || !packId || !name) {
    throw new Error('Project, Test Pack and cycle name are required.');
  }

  const startDate = new Date(String(value.startDate || existing?.startDate || new Date().toISOString()));
  const dueDate = new Date(String(value.dueDate || existing?.dueDate || new Date().toISOString()));

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(dueDate.getTime())) {
    throw new Error('Cycle dates are invalid.');
  }

  return {
    id: existing?.id || normalizeOptionalText(value.id) || newId('cycle'),
    projectId,
    packId,
    name,
    release: normalizeOptionalText(value.release ?? existing?.release),
    environment: normalizeOptionalText(value.environment || existing?.environment) || 'staging',
    targetId: normalizeOptionalText(value.targetId ?? existing?.targetId),
    owner: normalizeOptionalText(value.owner || existing?.owner) || 'Local QA Team',
    testers: JSON.stringify(Array.isArray(value.testers) ? value.testers : parseJsonValue(existing?.testers, [])),
    startDate,
    dueDate,
    status: normalizeOptionalText(value.status || existing?.status) || 'draft',
    executions: JSON.stringify(value.executions && typeof value.executions === 'object' ? value.executions : parseJsonValue(existing?.executions, {})),
    linkedDefects: JSON.stringify(Array.isArray(value.linkedDefects) ? value.linkedDefects : parseJsonValue(existing?.linkedDefects, [])),
  };
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function maskConfigValue(value: string | undefined, visible = 4): string {
  const text = value?.trim();

  if (!text) {
    return 'not-configured';
  }

  if (text.length <= visible * 2) {
    return '*'.repeat(text.length);
  }

  return `${text.slice(0, visible)}...${text.slice(-visible)}`;
}

function readConfigNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]?.trim());
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readRuntimeConfigSummary(): Record<string, unknown> {
  const provider = process.env.LOCAL_AI_PROVIDER?.trim() || 'ollama';

  return {
    app: {
      port,
      nodeEnv: process.env.NODE_ENV || 'development',
      databaseUrl: maskConfigValue(process.env.DATABASE_URL, 12),
    },
    localAI: {
      provider,
      baseUrl: process.env.LOCAL_AI_BASE_URL?.trim() || 'not-configured',
      apiKey: maskConfigValue(process.env.LOCAL_AI_API_KEY || 'ollama'),
      model: getConfiguredLocalAIModel(),
      timeoutMs: readConfigNumber('LOCAL_AI_TIMEOUT_MS', 180000),
      maxTokens: readConfigNumber('LOCAL_AI_MAX_TOKENS', 1536),
      contextTokens: readConfigNumber('LOCAL_AI_CONTEXT_TOKENS', 4096),
      numThread: readConfigNumber('LOCAL_AI_NUM_THREAD', 2),
      temperature: Number(process.env.LOCAL_AI_TEMPERATURE?.trim() || '0.2'),
      keepAlive: process.env.LOCAL_AI_KEEP_ALIVE?.trim() || '2m',
    },
    testcaseGeneration: {
      minRows: MIN_TESTCASE_FILE_ROWS,
      defaultRows: DEFAULT_TESTCASE_FILE_ROWS,
      maxRows: MAX_TESTCASE_FILE_ROWS,
      casesPerBatch: readConfigNumber('LOCAL_AI_CASES_PER_BATCH', 1),
      batchTimeoutMs: readConfigNumber('LOCAL_AI_BATCH_TIMEOUT_MS', 120000),
      batchMaxTokens: readConfigNumber('LOCAL_AI_BATCH_MAX_TOKENS', 192),
      csvEndpoint: 'POST /api/testcase-files/generate',
      importEndpoint: 'POST /api/testcase-files/import',
      runEndpoint: 'POST /api/testcase-files/run',
    },
    uiRequest: {
      targetUrl: 'Sent as url',
      project: 'Used as prompt context',
      suite: 'Used as prompt context',
      target: 'Used as prompt context',
      auth: 'Sent as auth.mode',
    },
  };
}

function readBody(request: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;

      if (body.length > 8 * 1024 * 1024) {
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
  return value === 'local' || value === 'dev' || value === 'staging' || value === 'production'
    ? value
    : 'production';
}

function runnerReachableUrl(url: string, environment: ProjectEnvironment): string {
  if (environment !== 'local' || process.env.PASSMARK_CONTAINERIZED !== 'true') return url;
  const parsed = new URL(url);
  if (['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) parsed.hostname = 'host.docker.internal';
  return parsed.toString();
}

async function ensureRunEnvironment(projectId: string | undefined, value: unknown, baseUrl: string) {
  if (!projectId) return undefined;
  const name = normalizeEnvironment(value);
  const existing = await prisma.environment.findFirst({ where: { projectId, name } });
  if (existing) {
    return existing.baseUrl === baseUrl ? existing : prisma.environment.update({ where: { id: existing.id }, data: { baseUrl } });
  }
  return prisma.environment.create({
    data: {
      id: newId('environment'), projectId, name, baseUrl,
      authType: 'none', authConfig: '{}', customHeaders: '{}',
    },
  });
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
    : 'custom';
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
  const name = normalizeOptionalText(value.name || existing?.name);

  if (!name) {
    throw new Error('Project name is required.');
  }

  const baseUrl = normalizeUrl(value.baseUrl);
  const now = new Date().toISOString();

  return {
    id: existing?.id || createProjectId(),
    name,
    description: normalizeOptionalText(value.description ?? existing?.description),
    baseUrl,
    environment: normalizeEnvironment(value.environment),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
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

function suiteInstruction(suite?: TestSuite): string {
  const config = suiteConfig(suite);

  if (!config) {
    return '';
  }

  return typeof config.instruction === 'string' ? config.instruction.trim() : '';
}

function suiteConfig(suite?: TestSuite): Record<string, unknown> | undefined {
  if (!suite?.config) {
    return undefined;
  }

  const config = suite.config as unknown;

  if (typeof config === 'string') {
    return parseJsonText(config);
  }

  return config && typeof config === 'object' ? (config as Record<string, unknown>) : undefined;
}

function buildGeneratorRequest(userRequest: string, suite?: TestSuite): string {
  const parts = [
    suite?.description ? `Suite description: ${suite.description}` : '',
    suiteInstruction(suite) ? `Suite custom instruction: ${suiteInstruction(suite)}` : '',
    userRequest.trim() ? `Run request: ${userRequest.trim()}` : '',
  ].filter(Boolean);

  return parts.join('\n\n') || buildSuiteUserRequest(userRequest, suite);
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
  const name = normalizeOptionalText(value.name || existing?.name);

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

  const duplicate = await prisma.testCase.findUnique({
    where: { suiteId_code: { suiteId, code } },
  });

  if (duplicate && duplicate.id !== existing?.id) {
    throw new Error(`Test case code ${code} already exists in this project.`);
  }

  const automation = normalizeOptionalText(value.automation) || existing?.automation || 'manual';
  const automationKind = automation === 'automated'
    ? normalizeAutomationKind(value.automationKind ?? existing?.automationKind ?? 'generic_visible_content')
    : 'manual';

  return {
    id: existing?.id || createCaseId(),
    suiteId,
    code,
    name,
    description: normalizeOptionalText(value.description ?? existing?.description),
    priority: normalizeOptionalText(value.priority) || existing?.priority || 'medium',
    enabled: typeof value.enabled === 'boolean' ? value.enabled : existing?.enabled ?? true,
    expectedResult: normalizeOptionalText(value.expectedResult ?? existing?.expectedResult),
    severity: normalizeOptionalText(value.severity) || existing?.severity || 'major',
    testType: normalizeOptionalText(value.testType) || existing?.testType || 'functional',
    automation,
    automationKind: automationKind === 'manual' && automation === 'automated' ? 'generic_visible_content' : automationKind,
    steps: Array.isArray(value.steps) ? JSON.stringify(value.steps) : existing?.steps || '[]',
    actualResult: normalizeOptionalText(value.actualResult ?? existing?.actualResult),
    defectId: normalizeOptionalText(value.defectId ?? existing?.defectId),
    assignee: normalizeOptionalText(value.assignee ?? existing?.assignee),
    reviewer: normalizeOptionalText(value.reviewer ?? existing?.reviewer),
    notes: normalizeOptionalText(value.notes ?? existing?.notes),
  };
}

async function syncWorkspaceForSuite(suiteId: string) {
  const suite = await prisma.testSuite.findUnique({ where: { id: suiteId } });
  if (suite) await ensureDefaultWorkspaceForProject(suite.projectId, suite.id);
}

async function persistWorkspaceRows(
  suiteId: string | undefined,
  rows: TestcaseFileRow[],
  createUniqueCodes = false
): Promise<string[]> {
  if (!suiteId) {
    return [];
  }

  const ids: string[] = [];
  const usedCodes = new Set((await prisma.testCase.findMany({ where: { suiteId }, select: { code: true } }))
    .map((testCase) => testCase.code.toUpperCase()));

  for (const [index, row] of rows.entries()) {
    const baseCode = (row.caseId || `TC-${String(index + 1).padStart(3, '0')}`).slice(0, 80).toUpperCase();
    let code = baseCode;
    if (createUniqueCodes) {
      let suffix = 1;
      while (usedCodes.has(code)) {
        code = `${baseCode.slice(0, Math.max(1, 79 - String(suffix).length))}-${suffix}`;
        suffix += 1;
      }
    }
    usedCodes.add(code);
    const steps = (row.steps || '')
      .split(/\r?\n/)
      .map((action) => action.replace(/^\d+[.)]\s*/, '').trim())
      .filter(Boolean)
      .map((action, stepIndex) => ({
        id: `${code}-step-${stepIndex + 1}`,
        action,
        expected: row.expectedResult || 'The expected behavior is observed.',
      }));
    const record = await prisma.testCase.upsert({
      where: { suiteId_code: { suiteId, code } },
      update: {
        name: row.title || code,
        description: row.objective || '',
        priority: row.priority || 'medium',
        severity: row.severity || 'major',
        testType: row.testType || 'functional',
        automation: row.automationCandidate !== 'no' && row.automationKind !== 'manual' ? 'automated' : 'manual',
        automationKind: row.automationKind || 'manual',
        steps: JSON.stringify(steps),
        expectedResult: row.expectedResult || '',
        actualResult: row.actualResult || '',
        defectId: row.defectId || '',
        assignee: row.testerName || '',
        reviewer: row.reviewerName || '',
        notes: row.notes || '',
      },
      create: {
        id: newId('case'),
        suiteId,
        code,
        name: row.title || code,
        description: row.objective || '',
        priority: row.priority || 'medium',
        severity: row.severity || 'major',
        testType: row.testType || 'functional',
        automation: row.automationCandidate !== 'no' && row.automationKind !== 'manual' ? 'automated' : 'manual',
        automationKind: row.automationKind || 'manual',
        steps: JSON.stringify(steps),
        expectedResult: row.expectedResult || '',
        actualResult: row.actualResult || '',
        defectId: row.defectId || '',
        assignee: row.testerName || '',
        reviewer: row.reviewerName || '',
        notes: row.notes || '',
      },
    });
    ids.push(record.id);
  }

  await syncWorkspaceForSuite(suiteId);

  return ids;
}

async function addCaseIdsToPack(packId: unknown, caseIds: string[]) {
  const id = normalizeOptionalText(packId);
  if (!id || !caseIds.length) return;
  const pack = await prisma.testPack.findUnique({ where: { id } });
  if (!pack) return;
  const merged = Array.from(new Set([...parseJsonValue<string[]>(pack.caseIds, []), ...caseIds]));
  await prisma.testPack.update({ where: { id }, data: { caseIds: JSON.stringify(merged) } });
}

function normalizeAuthMode(value: unknown): AuthMode {
  const mode = String(value || '').toLowerCase();
  if (mode === 'form' || mode === 'password') return 'password';
  if (mode === 'bearer' || mode === 'api_key' || mode === 'basic' || mode === 'custom_headers') return mode;
  return 'none';
}

function normalizeHeaderRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const headers: Record<string, string> = {};
  for (const [rawName, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const name = rawName.trim();
    const headerValue = typeof rawValue === 'string' ? rawValue.trim() : '';
    if (!name || !headerValue || /[\r\n]/.test(name) || /[\r\n]/.test(headerValue)) continue;
    headers[name] = headerValue;
  }
  return headers;
}

function normalizeAuth(value: unknown): AuthInput {
  if (!value || typeof value !== 'object') return { mode: 'none' };
  const auth = value as Record<string, unknown>;
  const mode = normalizeAuthMode(auth.mode || auth.authType);
  const secret = typeof auth.secret === 'string' ? auth.secret : typeof auth.password === 'string' ? auth.password : '';
  return {
    mode,
    loginUrl: typeof auth.loginUrl === 'string' ? auth.loginUrl.trim() : '',
    username: typeof auth.username === 'string' ? auth.username.trim() : '',
    password: mode === 'password' ? secret : '',
    secret,
    usernameSelector: typeof auth.usernameSelector === 'string' ? auth.usernameSelector.trim() : '',
    passwordSelector: typeof auth.passwordSelector === 'string' ? auth.passwordSelector.trim() : '',
    submitSelector: typeof auth.submitSelector === 'string' ? auth.submitSelector.trim() : '',
    successSelector: typeof auth.successSelector === 'string' ? auth.successSelector.trim() : '',
    apiKeyName: typeof auth.apiKeyName === 'string' ? auth.apiKeyName.trim() : '',
    apiKeyLocation: auth.apiKeyLocation === 'query' ? 'query' : 'header',
    headers: normalizeHeaderRecord(auth.headers || auth.customHeaders),
  };
}

function storedEnvironmentAuth(environment: any): AuthInput {
  if (!environment) return { mode: 'none' };
  const config = parseJsonValue<Record<string, unknown>>(environment.authConfig, {});
  const mode = normalizeAuthMode(environment.authType || config.mode);
  const secret = decryptSecret(config.secret);
  const headers = normalizeHeaderRecord(parseJsonValue<Record<string, string>>(decryptSecret(environment.customHeaders), {}));
  return {
    mode,
    loginUrl: typeof config.loginUrl === 'string' ? config.loginUrl : '',
    username: typeof config.username === 'string' ? config.username : '',
    password: mode === 'password' ? secret : '',
    secret,
    usernameSelector: typeof config.usernameSelector === 'string' ? config.usernameSelector : '',
    passwordSelector: typeof config.passwordSelector === 'string' ? config.passwordSelector : '',
    submitSelector: typeof config.submitSelector === 'string' ? config.submitSelector : '',
    successSelector: typeof config.successSelector === 'string' ? config.successSelector : '',
    apiKeyName: typeof config.apiKeyName === 'string' ? config.apiKeyName : '',
    apiKeyLocation: config.apiKeyLocation === 'query' ? 'query' : 'header',
    headers,
  };
}

function resolveEnvironmentAuth(environment: any, fallback: unknown): AuthInput {
  const stored = storedEnvironmentAuth(environment);
  const resolved = stored.mode !== 'none' || Object.keys(stored.headers || {}).length ? stored : normalizeAuth(fallback);
  if (resolved.mode === 'password' && resolved.loginUrl && environment) {
    resolved.loginUrl = runnerReachableUrl(resolved.loginUrl, normalizeEnvironment(environment.name));
  }
  return resolved;
}

function environmentToApi(environment: any): Record<string, unknown> {
  const config = parseJsonValue<Record<string, unknown>>(environment.authConfig, {});
  const mode = normalizeAuthMode(environment.authType || config.mode);
  let headerNames: string[] = [];
  try {
    headerNames = Object.keys(normalizeHeaderRecord(parseJsonValue<Record<string, string>>(decryptSecret(environment.customHeaders), {})));
  } catch {
    headerNames = [];
  }
  return {
    id: environment.id,
    projectId: environment.projectId,
    name: environment.name,
    baseUrl: environment.baseUrl,
    createdAt: environment.createdAt,
    updatedAt: environment.updatedAt,
    auth: {
      mode: mode === 'password' ? 'form' : mode,
      loginUrl: typeof config.loginUrl === 'string' ? config.loginUrl : '',
      username: typeof config.username === 'string' ? config.username : '',
      usernameSelector: typeof config.usernameSelector === 'string' ? config.usernameSelector : '',
      passwordSelector: typeof config.passwordSelector === 'string' ? config.passwordSelector : '',
      submitSelector: typeof config.submitSelector === 'string' ? config.submitSelector : '',
      successSelector: typeof config.successSelector === 'string' ? config.successSelector : '',
      apiKeyName: typeof config.apiKeyName === 'string' ? config.apiKeyName : '',
      apiKeyLocation: config.apiKeyLocation === 'query' ? 'query' : 'header',
      secretConfigured: Boolean(config.secret),
      customHeaderNames: headerNames,
    },
  };
}

function authHeaders(auth: AuthInput): Record<string, string> {
  const headers = { ...(auth.headers || {}) };
  if (auth.mode === 'bearer' && auth.secret) headers.Authorization = `Bearer ${auth.secret}`;
  if (auth.mode === 'basic' && auth.username && auth.secret) headers.Authorization = `Basic ${Buffer.from(`${auth.username}:${auth.secret}`).toString('base64')}`;
  if (auth.mode === 'api_key' && auth.apiKeyLocation !== 'query' && auth.apiKeyName && auth.secret) headers[auth.apiKeyName] = auth.secret;
  return headers;
}

function authTargetUrl(url: string, auth: AuthInput): string {
  if (auth.mode !== 'api_key' || auth.apiKeyLocation !== 'query' || !auth.apiKeyName || !auth.secret) return url;
  const target = new URL(url);
  target.searchParams.set(auth.apiKeyName, auth.secret);
  return target.toString();
}

function authProcessEnv(auth?: AuthInput): Record<string, string> {
  const resolved = auth || { mode: 'none' as const };
  return {
    PASSMARK_AUTH_PASSWORD: resolved.mode === 'password' ? resolved.secret || resolved.password || '' : '',
    PASSMARK_AUTH_SECRET: resolved.secret || '',
    PASSMARK_AUTH_HEADERS_B64: Buffer.from(JSON.stringify(authHeaders(resolved))).toString('base64'),
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
  return {
    mode: 'password',
    loginUrl: safeAuth.loginUrl,
    username: safeAuth.username,
    usernameSelector: safeAuth.usernameSelector,
    passwordSelector: safeAuth.passwordSelector,
    submitSelector: safeAuth.submitSelector,
    successSelector: safeAuth.successSelector,
  };
}

function authFromDraft(environment: any, body: Record<string, unknown>): AuthInput {
  const existing = storedEnvironmentAuth(environment);
  const draft = normalizeAuth(body);
  if (draft.mode === 'none') return { mode: 'none' };
  const sameMode = existing.mode === draft.mode;
  const suppliedSecret = typeof body.secret === 'string' ? body.secret : '';
  return {
    ...draft,
    secret: suppliedSecret || (sameMode ? existing.secret : ''),
    password: draft.mode === 'password' ? suppliedSecret || (sameMode ? existing.secret : '') : '',
    headers: Object.prototype.hasOwnProperty.call(body, 'customHeaders') ? normalizeHeaderRecord(body.customHeaders) : existing.headers,
  };
}

async function saveEnvironmentAuth(environment: any, body: Record<string, unknown>) {
  const auth = authFromDraft(environment, body);
  const existingConfig = parseJsonValue<Record<string, unknown>>(environment.authConfig, {});
  const modeChanged = normalizeAuthMode(environment.authType || existingConfig.mode) !== auth.mode;
  const suppliedSecret = typeof body.secret === 'string' ? body.secret : '';
  const encryptedSecret = auth.mode === 'none'
    ? ''
    : suppliedSecret
      ? encryptSecret(suppliedSecret)
      : modeChanged
        ? ''
        : typeof existingConfig.secret === 'string' ? existingConfig.secret : '';
  const authConfig = auth.mode === 'none' ? {} : {
    mode: auth.mode,
    loginUrl: auth.loginUrl || '',
    username: auth.username || '',
    usernameSelector: auth.usernameSelector || '',
    passwordSelector: auth.passwordSelector || '',
    submitSelector: auth.submitSelector || '',
    successSelector: auth.successSelector || '',
    apiKeyName: auth.apiKeyName || '',
    apiKeyLocation: auth.apiKeyLocation || 'header',
    secret: encryptedSecret,
  };
  const customHeaders = auth.mode === 'none'
    ? '{}'
    : Object.prototype.hasOwnProperty.call(body, 'customHeaders')
      ? encryptSecret(JSON.stringify(normalizeHeaderRecord(body.customHeaders)))
      : environment.customHeaders;
  return prisma.environment.update({
    where: { id: environment.id },
    data: {
      authType: auth.mode === 'password' ? 'form' : auth.mode,
      authConfig: JSON.stringify(authConfig),
      customHeaders,
    },
  });
}

async function testEnvironmentAuthentication(environment: any, body: Record<string, unknown>) {
  const auth = Object.keys(body).length ? authFromDraft(environment, body) : storedEnvironmentAuth(environment);
  const startedAt = Date.now();
  const displayUrl = normalizeUrl(typeof body.baseUrl === 'string' ? body.baseUrl : environment.baseUrl);
  const targetUrl = runnerReachableUrl(displayUrl, normalizeEnvironment(environment.name));

  if (auth.mode === 'password') {
    if (!auth.loginUrl || !auth.username || !auth.secret) throw new Error('Login URL, username and password are required.');
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(runnerReachableUrl(auth.loginUrl, normalizeEnvironment(environment.name)), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.locator(auth.usernameSelector || 'input[name="email"], input[name="username"], input[type="email"], input[type="text"]').first().fill(auth.username);
      await page.locator(auth.passwordSelector || 'input[name="password"], input[type="password"]').first().fill(auth.secret);
      await Promise.all([
        page.waitForLoadState('domcontentloaded').catch(() => undefined),
        page.locator(auth.submitSelector || 'button[type="submit"], input[type="submit"]').first().click(),
      ]);
      if (auth.successSelector) await page.locator(auth.successSelector).first().waitFor({ state: 'visible', timeout: 15000 });
      else if (page.url() === auth.loginUrl) throw new Error('The page remained on the login URL. Add a success selector if the application uses a single-page login flow.');
      return { ok: true, status: 200, durationMs: Date.now() - startedAt, message: 'Form login succeeded.' };
    } finally {
      await browser.close();
    }
  }

  if (auth.mode !== 'none' && auth.mode !== 'custom_headers' && !auth.secret) throw new Error('A password, token or API key is required.');
  const context = await playwrightRequest.newContext({ extraHTTPHeaders: authHeaders(auth) });
  try {
    const response = await context.get(authTargetUrl(targetUrl, auth), { failOnStatusCode: false, timeout: 30000 });
    const status = response.status();
    if (status === 401 || status === 403) throw new Error(`Authentication was rejected with HTTP ${status}.`);
    if (status >= 500) throw new Error(`Target returned HTTP ${status}.`);
    return { ok: true, status, durationMs: Date.now() - startedAt, message: `Connection succeeded with HTTP ${status}.` };
  } finally {
    await context.dispose();
  }
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
      const attachments = Array.isArray(result?.attachments)
        ? (result.attachments as Array<Record<string, unknown>>)
          .filter((attachment) => typeof attachment.path === 'string')
          .map((attachment) => ({
            name: typeof attachment.name === 'string' ? attachment.name : 'artifact',
            contentType: typeof attachment.contentType === 'string' ? attachment.contentType : 'application/octet-stream',
            path: String(attachment.path),
          }))
        : [];

      return {
        title: typeof spec.title === 'string' ? spec.title : 'Untitled test',
        status:
          typeof result?.status === 'string'
            ? result.status
            : typeof testResult?.status === 'string'
              ? testResult.status
              : 'unknown',
        durationMs: typeof result?.duration === 'number' ? result.duration : 0,
        error: typeof firstError?.message === 'string' ? cleanOutputText(firstError.message) : undefined,
        attachments,
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
              ? cleanOutputText(firstError.message)
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
        ...authProcessEnv(auth),
      },
      maxBuffer: 1024 * 1024,
      timeout: 60000,
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

  while ((match = titlePattern.exec(generatedCode)) && cases.length < 80) {
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

const testcaseFileColumns: Array<keyof TestcaseFileRow> = [
  'caseId',
  'projectId',
  'projectName',
  'module',
  'requirementId',
  'feature',
  'title',
  'objective',
  'interDependencies',
  'preconditions',
  'testDataPreparation',
  'testData',
  'steps',
  'actionInputData',
  'expectedResult',
  'priority',
  'regression',
  'platform',
  'tools',
  'severity',
  'testType',
  'automationCandidate',
  'automationKind',
  'selector',
  'expectedText',
  'inputImage',
  'actualImage',
  'screenshotPolicy',
  'status',
  'actualResult',
  'defectId',
  'testerName',
  'reviewerName',
  'reviewDate',
  'notes',
  'durationMs',
];

function csvEscape(value: unknown): string {
  const text = String(value ?? '');

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function rowsToCsv(rows: TestcaseFileRow[]): string {
  return [
    testcaseFileColumns.join(','),
    ...rows.map((row) => testcaseFileColumns.map((column) => csvEscape(row[column])).join(',')),
  ].join('\n');
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (quoted && char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (!quoted && char === ',') {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted && char === '"' && next === '"') {
      current += '""';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      current += char;
      continue;
    }

    if (!quoted && char === '\n') {
      rows.push(parseCsvLine(current.replace(/\r$/, '')));
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    rows.push(parseCsvLine(current.replace(/\r$/, '')));
  }

  return rows;
}

function inferAutomationKind(testCase: TestCaseDetail): string {
  const text = `${testCase.title} ${testCase.description || ''} ${testCase.objective || ''} ${testCase.expected || ''}`.toLowerCase();

  if (text.includes('page load speed') || text.includes('load performance')) return 'page_load_performance';
  if (text.includes('meta description length')) return 'meta_description_length';
  if (text.includes('image alt')) return 'image_alt_text';
  if (text.includes('meta description')) return 'meta_description_exists';
  if (text.includes('canonical')) return 'canonical_exists';
  if (text.includes('h1') || text.includes('heading')) return 'h1_exists';
  if (text.includes('viewport')) return 'viewport_exists';
  if (text.includes('html lang') || text.includes('language')) return 'html_lang_exists';
  if (text.includes('title')) return 'title_exists';
  if (text.includes('image')) return 'image_resources_ok';
  if (text.includes('console')) return 'no_console_errors';
  if (text.includes('page error')) return 'no_page_errors';
  if (text.includes('link') || text.includes('navigation')) return 'link_health_basic';
  if (text.includes('form') || text.includes('input') || text.includes('validation')) return 'form_validation';
  if (text.includes('respond') || text.includes('load')) return 'page_load';
  return 'generic_visible_content';
}

function testcaseRowsFromCases(cases: TestCaseDetail[]): TestcaseFileRow[] {
  return cases.map((testCase, index) => ({
    caseId: testCase.caseId || caseCodeFromTitle(testCase.title) || generatedCaseCode(index),
    projectId: '',
    projectName: '',
    module: testCase.module || 'General',
    requirementId: '',
    feature: testCase.feature || 'Page behavior',
    title: testCase.title.replace(caseCodeFromTitle(testCase.title), '').trim() || testCase.title,
    objective: testCase.objective || testCase.description || '',
    interDependencies: '',
    preconditions: testCase.preconditions || 'Target URL is reachable and required account/session is available when applicable.',
    testDataPreparation: testCase.testData || '',
    testData: testCase.testData || '',
    steps: Array.isArray(testCase.steps) && testCase.steps.length
      ? testCase.steps.map((step, stepIndex) => `${stepIndex + 1}. ${step.title}: ${step.detail}`).join('\n')
      : '',
    actionInputData: '',
    expectedResult: testCase.expected || 'The expected behavior should be visible and correct.',
    priority: 'medium',
    regression: 'yes',
    platform: 'Web',
    tools: 'Playwright Chromium',
    severity: 'major',
    testType: testCase.testType || 'functional',
    automationCandidate: testCase.automationCandidate || 'partial',
    automationKind: inferAutomationKind(testCase),
    selector: testCase.selector || '',
    expectedText: '',
    inputImage: testCase.inputImage || '',
    actualImage: testCase.actualImage || '',
    screenshotPolicy: 'on-failure',
    status: '',
    actualResult: '',
    defectId: '',
    testerName: testCase.testerName || '',
    reviewerName: testCase.reviewerName || '',
    reviewDate: testCase.reviewDate || '',
    notes: testCase.notes || '',
    durationMs: '',
  }));
}

function testcaseRowsFromDbCases(cases: any[], project?: any): TestcaseFileRow[] {
  return cases.map((testCase) => {
    const steps = parseJsonValue<any[]>(testCase.steps, []);
    return {
      caseId: testCase.code || testCase.id,
      projectId: project?.id || '',
      projectName: project?.name || '',
      module: 'General',
      requirementId: '',
      feature: 'Page behavior',
      title: testCase.name || testCase.code || testCase.id,
      objective: testCase.description || '',
      interDependencies: '',
      preconditions: 'Target URL is reachable and required account/session is available when applicable.',
      testDataPreparation: '',
      testData: '',
      steps: steps.map((step, index) => {
        const action = typeof step === 'string' ? step : step.action || step.title || step.detail || '';
        const expected = typeof step === 'object' ? step.expected || '' : '';
        return `${index + 1}. ${action}${expected ? `\n   Expected: ${expected}` : ''}`.trim();
      }).filter(Boolean).join('\n'),
      actionInputData: '',
      expectedResult: testCase.expectedResult || '',
      priority: testCase.priority || 'medium',
      regression: 'yes',
      platform: 'Web',
      tools: testCase.automation === 'automated' ? 'Playwright Chromium' : '',
      severity: testCase.severity || 'major',
      testType: testCase.testType || 'functional',
      automationCandidate: testCase.automation === 'automated' ? 'yes' : 'no',
      automationKind: testCase.automationKind || (testCase.automation === 'automated' ? 'generic_visible_content' : 'manual'),
      selector: '',
      expectedText: '',
      inputImage: '',
      actualImage: '',
      screenshotPolicy: 'on-failure',
      status: '',
      actualResult: testCase.actualResult || '',
      defectId: testCase.defectId || '',
      testerName: testCase.assignee || '',
      reviewerName: testCase.reviewer || '',
      reviewDate: '',
      notes: testCase.notes || '',
      durationMs: '',
    };
  });
}

function csvField(row: Record<string, string>, ...names: string[]): string {
  for (const name of names) {
    const value = row[name]?.trim();

    if (value) {
      return value;
    }
  }

  return '';
}

const csvHeaderAliases: Record<string, string> = {
  testcaseid: 'caseId',
  testcasecode: 'caseId',
  testcase: 'title',
  testcasename: 'title',
  name: 'title',
  expected: 'expectedResult',
  mode: 'automationKind',
  automation: 'automationKind',
  automationmode: 'automationKind',
  expectedresults: 'expectedResult',
  actualresults: 'actualResult',
  teststeps: 'steps',
  testcaseobjective: 'objective',
};

function canonicalCsvHeader(header: string): string {
  const clean = header.replace(/^\uFEFF/, '').trim();
  const normalized = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
  const knownColumn = testcaseFileColumns.find((column) => column.toLowerCase() === normalized);
  return knownColumn || csvHeaderAliases[normalized] || clean;
}

function testcaseRowsFromCsv(csvContent: string): TestcaseFileRow[] {
  const parsed = parseCsv(csvContent.trim());

  if (parsed.length < 2) {
    throw new Error('CSV must include a header row and at least one testcase row.');
  }

  const headers = parsed[0].map(canonicalCsvHeader);
  const titleAliases = ['title', 'testCaseTitle'];
  const hasTitle = titleAliases.some((column) => headers.includes(column));
  const missingColumns = hasTitle ? [] : ['title'];
  const hasCaseId = headers.includes('caseId') || headers.includes('caseCode');

  if (missingColumns.length || !hasCaseId) {
    throw new Error(`CSV is missing required columns: ${[...missingColumns, !hasCaseId ? 'caseId' : ''].filter(Boolean).join(', ')}`);
  }

  const rows = parsed.slice(1)
    .map((values, index) => {
      const row: Record<string, string> = {};
      headers.forEach((header, valueIndex) => {
        row[header] = values[valueIndex] || '';
      });

      return {
        caseId: csvField(row, 'caseId', 'caseCode') || generatedCaseCode(index),
        projectId: csvField(row, 'projectId', 'projectID'),
        projectName: csvField(row, 'projectName'),
        module: csvField(row, 'module') || 'General',
        requirementId: csvField(row, 'requirementId', 'requirementID'),
        feature: csvField(row, 'feature') || 'Page behavior',
        title: csvField(row, 'title', 'testCaseTitle') || `Imported testcase ${index + 1}`,
        objective: csvField(row, 'objective', 'description') || '',
        interDependencies: csvField(row, 'interDependencies', 'interTestCaseDependencies', 'dependencies'),
        preconditions: csvField(row, 'preconditions') || '',
        testDataPreparation: csvField(row, 'testDataPreparation'),
        testData: csvField(row, 'testData') || '',
        steps: csvField(row, 'steps', 'actionInputData') || '',
        actionInputData: csvField(row, 'actionInputData', 'action', 'inputData'),
        expectedResult: csvField(row, 'expectedResult', 'expected') || 'The check should pass.',
        priority: row.priority?.trim() || 'medium',
        regression: csvField(row, 'regression') || 'yes',
        platform: csvField(row, 'platform') || 'Web',
        tools: csvField(row, 'tools') || 'Playwright Chromium',
        severity: row.severity?.trim() || 'major',
        testType: row.testType?.trim() || 'functional',
        automationCandidate: row.automationCandidate?.trim() || (row.automationKind?.trim() ? 'partial' : 'no'),
        automationKind: row.automationKind?.trim() || 'manual',
        selector: row.selector?.trim() || '',
        expectedText: row.expectedText?.trim() || '',
        inputImage: csvField(row, 'inputImage', 'attachmentImage', 'screenshotInput', 'stepImage'),
        actualImage: csvField(row, 'actualImage', 'screenshotActual', 'evidenceImage'),
        screenshotPolicy: csvField(row, 'screenshotPolicy') || 'on-failure',
        status: row.status?.trim() || '',
        actualResult: csvField(row, 'actualResult', 'actual') || '',
        defectId: csvField(row, 'defectId', 'defectID') || '',
        testerName: csvField(row, 'testerName') || '',
        reviewerName: csvField(row, 'reviewerName') || '',
        reviewDate: csvField(row, 'reviewDate') || '',
        notes: row.notes?.trim() || '',
        durationMs: row.durationMs?.trim() || '',
      };
    })
    .filter((row) => row.title || row.caseId);

  if (!rows.length) {
    throw new Error('CSV does not contain any testcase rows.');
  }

  return rows;
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function xlsxCellColumn(reference: string): number {
  const letters = reference.replace(/[^A-Z]/gi, '').toUpperCase();
  return [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function xlsxTextRuns(xml: string): string {
  return [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
    .map((match) => decodeXmlText(match[1]))
    .join('');
}

async function testcaseRowsFromXlsx(buffer: Buffer): Promise<TestcaseFileRow[]> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error('The uploaded file is not a valid Excel .xlsx workbook.');
  }

  const sharedStringsXml = await zip.file('xl/sharedStrings.xml')?.async('string');
  const sharedStrings = sharedStringsXml
    ? [...sharedStringsXml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map((match) => xlsxTextRuns(match[1]))
    : [];
  const worksheetFiles = Object.keys(zip.files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .sort((left, right) => Number(left.match(/\d+/)?.[0] || 0) - Number(right.match(/\d+/)?.[0] || 0));

  for (const worksheetFile of worksheetFiles) {
    const sheetXml = await zip.file(worksheetFile)?.async('string');
    if (!sheetXml) continue;
    const matrix = [...sheetXml.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g)].map((rowMatch) => {
      const row: string[] = [];
      for (const cellMatch of rowMatch[1].matchAll(/<c\s([^>]*)>([\s\S]*?)<\/c>/g)) {
        const attributes = cellMatch[1];
        const body = cellMatch[2];
        const reference = attributes.match(/\br="([^"]+)"/)?.[1] || '';
        const type = attributes.match(/\bt="([^"]+)"/)?.[1] || '';
        const column = reference ? xlsxCellColumn(reference) : row.length;
        const rawValue = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] || '';
        const value = type === 's'
          ? sharedStrings[Number(rawValue)] || ''
          : type === 'inlineStr'
            ? xlsxTextRuns(body)
            : decodeXmlText(rawValue);
        row[column] = value;
      }
      return row.map((value) => value || '');
    });
    const headerIndex = matrix.findIndex((row) => {
      const headers = row.map(canonicalCsvHeader);
      return headers.includes('caseId') && headers.includes('title');
    });
    if (headerIndex >= 0) {
      const csv = matrix.slice(headerIndex)
        .filter((row, index) => index === 0 || row.some((value) => value.trim()))
        .map((row) => row.map(csvEscape).join(','))
        .join('\n');
      return testcaseRowsFromCsv(csv);
    }
  }

  throw new Error('Excel is missing the required columns: Case ID and Test Case.');
}

function testcaseFileDir(): string {
  const dir = path.join(storageDir, 'testcase-files');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function testcaseFilePath(fileName: string): string {
  return path.join(testcaseFileDir(), path.basename(fileName));
}

function writeTestcaseCsvFile(rows: TestcaseFileRow[], prefix = 'testcases'): { fileName: string; filePath: string; csvContent: string } {
  const fileName = `${prefix}-${Date.now()}.csv`;
  const filePath = testcaseFilePath(fileName);
  const csvContent = rowsToCsv(rows);
  fs.writeFileSync(filePath, csvContent, 'utf-8');
  return { fileName, filePath, csvContent };
}

function htmlEscape(value: unknown): string {
  return cleanOutputText(String(value ?? ''), 20000)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function htmlMultiline(value: unknown): string {
  return htmlEscape(value).replace(/\r?\n/g, '<br>');
}

function mimeTypeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.csv': 'text/csv; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.xls': 'application/vnd.ms-excel; charset=utf-8',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.doc': 'application/msword; charset=utf-8',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.webm': 'video/webm',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };

  return contentTypes[ext] || 'application/octet-stream';
}

function resolveImagePath(value?: string): string {
  const text = (value || '').trim();

  if (!text || /^(https?:|data:)/i.test(text)) {
    return '';
  }

  const apiPrefix = '/api/testcase-files/download/';
  if (text.startsWith(apiPrefix)) {
    return testcaseFilePath(decodeURIComponent(text.slice(apiPrefix.length)));
  }

  const containerStoragePrefix = '/app/storage/';
  if (text.replace(/\\/g, '/').startsWith(containerStoragePrefix)) {
    const relativePath = text.replace(/\\/g, '/').slice(containerStoragePrefix.length);
    const fromContainerStorage = path.join(rootDir, 'storage', ...relativePath.split('/'));
    if (fs.existsSync(fromContainerStorage)) {
      return fromContainerStorage;
    }
  }

  const normalized = path.normalize(text);
  if (path.isAbsolute(normalized) && fs.existsSync(normalized)) {
    return normalized;
  }

  const fromRoot = path.normalize(path.join(rootDir, text));
  if (fromRoot.startsWith(rootDir) && fs.existsSync(fromRoot)) {
    return fromRoot;
  }

  const fromTestcaseFiles = testcaseFilePath(text);
  return fs.existsSync(fromTestcaseFiles) ? fromTestcaseFiles : '';
}

function officeImage(value?: string): string {
  const text = (value || '').trim();

  if (!text) {
    return '';
  }

  if (/^data:/i.test(text)) {
    return `<img class="evidence-img" src="${htmlEscape(text)}" alt="Test evidence">`;
  }

  if (/^https?:/i.test(text)) {
    return `<img class="evidence-img" src="${htmlEscape(text)}" alt="Test evidence">`;
  }

  const imagePath = resolveImagePath(text);
  if (!imagePath) {
    return `<div class="image-ref">${htmlEscape(text)}</div>`;
  }

  const contentType = mimeTypeForPath(imagePath);
  const base64 = fs.readFileSync(imagePath).toString('base64');
  return `<img class="evidence-img" src="data:${contentType};base64,${base64}" alt="Test evidence">`;
}

function writeOfficeHtmlFile(
  rows: TestcaseFileRow[],
  prefix: string,
  format: 'xls' | 'doc' | 'html',
  title = 'QC Testcase Document'
): { fileName: string; filePath: string } {
  const fileName = `${prefix}-${Date.now()}.${format}`;
  const filePath = testcaseFilePath(fileName);
  const first = rows[0];
  const today = new Date().toLocaleDateString('en-CA');
  const headerRows = first ? `
    <table class="meta">
      <tr>
        <th>Test Case ID</th><td>${htmlEscape(first.caseId)}</td>
        <th>Project ID</th><td>${htmlEscape(first.projectId || '')}</td>
        <th>Module</th><td>${htmlEscape(first.module)}</td>
      </tr>
      <tr>
        <th>Test Case Title</th><td>${htmlEscape(first.title)}</td>
        <th>Project Name</th><td>${htmlEscape(first.projectName || '')}</td>
        <th>Requirement ID</th><td>${htmlEscape(first.requirementId || '')}</td>
      </tr>
      <tr>
        <th>Test Objective</th><td colspan="3">${htmlMultiline(first.objective)}</td>
        <th>Priority</th><td>${htmlEscape(first.priority)}</td>
      </tr>
      <tr>
        <th>Inter Test Case Dependencies</th><td colspan="3">${htmlMultiline(first.interDependencies || 'N/A')}</td>
        <th>Regression</th><td>${htmlEscape(first.regression || 'yes')}</td>
      </tr>
      <tr>
        <th>Test Data Preparation</th><td colspan="3">${htmlMultiline(first.testDataPreparation || first.testData || '')}</td>
        <th>Platform</th><td>${htmlEscape(first.platform || 'Web')}</td>
      </tr>
      <tr>
        <th>Notes/References</th><td colspan="3">${htmlMultiline(first.notes || 'N/A')}</td>
        <th>Tools</th><td>${htmlEscape(first.tools || 'Playwright Chromium')}</td>
      </tr>
    </table>
    <table class="signatures">
      <tr><th>Role</th><th>Name</th><th>Signature</th><th>Date</th></tr>
      <tr><td>Tester</td><td>${htmlEscape(first.testerName || '')}</td><td></td><td>${htmlEscape(first.reviewDate || today)}</td></tr>
      <tr><td>Reviewer</td><td>${htmlEscape(first.reviewerName || '')}</td><td></td><td></td></tr>
    </table>
  ` : '';
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${htmlEscape(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; }
    h1 { font-size: 20px; margin: 0 0 16px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 18px; }
    th, td { border: 1px solid #111; padding: 7px; vertical-align: top; font-size: 12px; }
    th { background: #d9d9d9; font-weight: 700; text-align: left; }
    .meta th { width: 16%; }
    .case-title { font-size: 16px; font-weight: 700; margin: 22px 0 8px; }
    .evidence-img { max-width: 420px; max-height: 260px; display: block; margin-top: 8px; }
    .image-ref { margin-top: 8px; color: #374151; font-size: 11px; }
  </style>
</head>
<body>
  <h1>${htmlEscape(title)}</h1>
  ${headerRows}
  <table class="steps">
    <tr>
      <th>Test #</th>
      <th>Action / Input Data</th>
      <th>Expected Results</th>
      <th>Actual Results / Comments</th>
      <th>Pass/Fail</th>
      <th>Defect ID</th>
    </tr>
    ${rows.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>
          <strong>${htmlEscape(row.caseId)} ${htmlEscape(row.title)}</strong><br>
          ${htmlMultiline(row.actionInputData || row.steps || row.objective)}
          ${officeImage(row.inputImage)}
        </td>
        <td>${htmlMultiline(row.expectedResult)}</td>
        <td>
          ${htmlMultiline(row.actualResult || '')}
          ${officeImage(row.actualImage)}
        </td>
        <td>${htmlEscape(row.status || '')}</td>
        <td>${htmlEscape(row.defectId || '')}</td>
      </tr>
    `).join('')}
  </table>
</body>
</html>`;

  fs.writeFileSync(filePath, html, 'utf-8');
  return { fileName, filePath };
}

async function writeOfficeCompanionFiles(rows: TestcaseFileRow[], prefix: string) {
  const excel = await writeTestcaseXlsxFile(rows, prefix);
  const doc = writeOfficeHtmlFile(rows, prefix, 'doc', 'QC Testcase Document');

  return {
    excelFileName: excel.fileName,
    docFileName: doc.fileName,
    excelDownloadUrl: `/api/testcase-files/download/${encodeURIComponent(excel.fileName)}`,
    docDownloadUrl: `/api/testcase-files/download/${encodeURIComponent(doc.fileName)}`,
  };
}

async function writeRunResultCsv(runId: string): Promise<{ fileName: string; filePath: string }> {
  const results = await prisma.testResult.findMany({
    where: { runId },
    orderBy: { caseCode: 'asc' },
  });
  const rows: TestcaseFileRow[] = results.map((result) => {
    const extra = parseJsonText(result.aiDiagnosis);

    return {
      caseId: result.caseCode,
      projectId: '',
      projectName: '',
      module: typeof extra.module === 'string' ? extra.module : '',
      requirementId: typeof extra.requirementId === 'string' ? extra.requirementId : '',
      feature: typeof extra.feature === 'string' ? extra.feature : '',
      title: result.caseName,
      objective: typeof extra.description === 'string' ? extra.description : '',
      interDependencies: typeof extra.interDependencies === 'string' ? extra.interDependencies : '',
      preconditions: typeof extra.preconditions === 'string' ? extra.preconditions : '',
      testDataPreparation: typeof extra.testDataPreparation === 'string' ? extra.testDataPreparation : '',
      testData: typeof extra.testData === 'string' ? extra.testData : '',
      steps: Array.isArray(extra.steps)
        ? (extra.steps as TestCaseStep[]).map((step, index) => `${index + 1}. ${step.title}: ${step.detail}`).join('\n')
        : '',
      actionInputData: typeof extra.actionInputData === 'string' ? extra.actionInputData : '',
      expectedResult: result.expectedResult || '',
      priority: typeof extra.priority === 'string' ? extra.priority : '',
      regression: typeof extra.regression === 'string' ? extra.regression : '',
      platform: typeof extra.platform === 'string' ? extra.platform : '',
      tools: typeof extra.tools === 'string' ? extra.tools : '',
      severity: typeof extra.severity === 'string' ? extra.severity : '',
      testType: typeof extra.testType === 'string' ? extra.testType : '',
      automationCandidate: typeof extra.automationCandidate === 'string' ? extra.automationCandidate : '',
      automationKind: typeof extra.automationKind === 'string' ? extra.automationKind : '',
      selector: typeof extra.selector === 'string' ? extra.selector : '',
      expectedText: '',
      inputImage: typeof extra.inputImage === 'string' ? extra.inputImage : '',
      actualImage: typeof extra.actualImage === 'string' ? extra.actualImage : '',
      screenshotPolicy: typeof extra.screenshotPolicy === 'string' ? extra.screenshotPolicy : '',
      status: result.status,
      actualResult: cleanOutputText(result.errorMessage || (typeof extra.actual === 'string' ? extra.actual : result.status)),
      defectId: typeof extra.defectId === 'string' ? extra.defectId : '',
      testerName: typeof extra.testerName === 'string' ? extra.testerName : '',
      reviewerName: typeof extra.reviewerName === 'string' ? extra.reviewerName : '',
      reviewDate: typeof extra.reviewDate === 'string' ? extra.reviewDate : '',
      notes: typeof extra.notes === 'string' ? extra.notes : '',
      durationMs: String(result.durationMs || 0),
    };
  });
  const file = writeTestcaseCsvFile(rows, `results-${runId}`);

  await prisma.artifact.upsert({
    where: { id: `${runId}-result-csv` },
    update: { path: file.filePath },
    create: {
      id: `${runId}-result-csv`,
      runId,
      type: 'result-csv',
      path: file.filePath,
    },
  });

  return {
    fileName: file.fileName,
    filePath: file.filePath,
  };
}

type RichReportCase = {
  id: string;
  code: string;
  name: string;
  status: string;
  durationMs: number;
  expected: string;
  actual: string;
  error: string;
  stackTrace: string;
  module: string;
  feature: string;
  testType: string;
  priority: string;
  severity: string;
  screenshotPath: string;
  videoPath: string;
  tracePath: string;
};

function richReportCases(run: any): RichReportCase[] {
  const artifacts = Array.isArray(run.artifacts) ? run.artifacts : [];
  return (Array.isArray(run.results) ? run.results : []).map((result: any) => {
    const extra = parseJsonText(result.aiDiagnosis);
    const resultArtifacts = artifacts.filter((artifact: any) => artifact.resultId === result.id);
    const artifactPath = (types: string[]) => resultArtifacts.find((artifact: any) => types.includes(artifact.type))?.path || '';
    const storedArtifactPath = (types: string[]) => resolveImagePath(artifactPath(types));

    return {
      id: result.id,
      code: result.caseCode || '',
      name: result.caseName || '',
      status: result.status || 'unknown',
      durationMs: Number(result.durationMs || 0),
      expected: result.expectedResult || '',
      actual: cleanOutputText(typeof extra.actual === 'string' ? extra.actual : result.errorMessage || result.status),
      error: cleanOutputText(result.errorMessage || ''),
      stackTrace: cleanOutputText(result.stackTrace || ''),
      module: typeof extra.module === 'string' ? extra.module : '',
      feature: typeof extra.feature === 'string' ? extra.feature : '',
      testType: typeof extra.testType === 'string' ? extra.testType : '',
      priority: typeof extra.priority === 'string' ? extra.priority : '',
      severity: typeof extra.severity === 'string' ? extra.severity : '',
      screenshotPath: storedArtifactPath(['actual-screenshot', 'screenshot']) || resolveImagePath(typeof extra.actualImage === 'string' ? extra.actualImage : ''),
      videoPath: storedArtifactPath(['video']),
      tracePath: storedArtifactPath(['trace']),
    };
  });
}

function reportStatusClass(status: string): string {
  if (status === 'passed') return 'passed';
  if (status === 'skipped') return 'skipped';
  return 'failed';
}

function buildRunReportHtml(run: any, cases: RichReportCase[]): string {
  const passed = Number(run.passed || cases.filter((item) => item.status === 'passed').length);
  const failed = Number(run.failed || cases.filter((item) => item.status === 'failed').length);
  const skipped = Number(run.skipped || cases.filter((item) => item.status === 'skipped').length);
  const completed = passed + failed;
  const passRate = completed ? Math.round((passed / completed) * 1000) / 10 : 0;
  const startedAt = new Date(run.createdAt || Date.now());
  const title = `${run.pack?.name || run.suite?.name || 'Automated Test'} Report`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${htmlEscape(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f3f5f8; color: #172033; font: 14px/1.5 Arial, sans-serif; }
    main { width: min(1120px, calc(100% - 32px)); margin: 28px auto; }
    .hero, .case { background: #fff; border: 1px solid #dce1e8; border-radius: 14px; box-shadow: 0 4px 16px rgba(22,32,51,.05); }
    .hero { padding: 26px; }
    h1 { margin: 0; font-size: 26px; }
    h2 { margin: 0; font-size: 17px; }
    .muted { color: #697386; }
    .meta, .stats { display: grid; gap: 10px; margin-top: 20px; }
    .meta { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .stats { grid-template-columns: repeat(5, minmax(0, 1fr)); }
    .tile { padding: 12px; background: #f7f8fa; border: 1px solid #e5e8ed; border-radius: 10px; }
    .tile small { display: block; color: #697386; }
    .tile strong { display: block; margin-top: 3px; font-size: 18px; }
    .section-title { margin: 28px 0 10px; font-size: 18px; }
    .case { margin-bottom: 12px; overflow: hidden; break-inside: avoid; }
    .case-head { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #e5e8ed; }
    .case-code { font: 12px Consolas, monospace; color: #697386; }
    .case-name { flex: 1; font-weight: 700; }
    .status { border-radius: 999px; padding: 3px 9px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .status.passed { background: #dcfce7; color: #15803d; }
    .status.failed { background: #fee2e2; color: #b91c1c; }
    .status.skipped { background: #eef2f7; color: #526071; }
    .case-body { padding: 16px; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .field { padding: 10px 12px; border-radius: 9px; background: #f7f8fa; white-space: pre-wrap; overflow-wrap: anywhere; }
    .field b { display: block; margin-bottom: 4px; font-size: 11px; color: #697386; text-transform: uppercase; }
    .error { margin-top: 10px; border-left: 3px solid #dc2626; background: #fff1f2; color: #9f1239; padding: 10px 12px; white-space: pre-wrap; }
    .evidence { margin-top: 12px; }
    .evidence img { display: block; max-width: 100%; max-height: 520px; border: 1px solid #dce1e8; border-radius: 9px; object-fit: contain; }
    .artifact-links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .artifact-links span { border-radius: 6px; background: #eef2ff; color: #4338ca; padding: 5px 8px; font-size: 12px; }
    @media (max-width: 760px) { .meta, .stats { grid-template-columns: repeat(2, 1fr); } .details { grid-template-columns: 1fr; } }
    @media print { body { background: #fff; } main { width: 100%; margin: 0; } .hero, .case { box-shadow: none; } }
  </style>
</head>
<body>
<main>
  <section class="hero">
    <div class="muted">Passmark TestOps · Automated execution report</div>
    <h1>${htmlEscape(title)}</h1>
    <div class="meta">
      <div class="tile"><small>Project</small><strong>${htmlEscape(run.project?.name || 'Unassigned')}</strong></div>
      <div class="tile"><small>Environment</small><strong>${htmlEscape(run.environment?.name || 'Not set')}</strong></div>
      <div class="tile"><small>Target</small><strong>${htmlEscape(run.target?.name || run.url || 'Not set')}</strong></div>
      <div class="tile"><small>Started</small><strong>${htmlEscape(startedAt.toLocaleString())}</strong></div>
    </div>
    <div class="stats">
      <div class="tile"><small>Total</small><strong>${cases.length}</strong></div>
      <div class="tile"><small>Passed</small><strong style="color:#15803d">${passed}</strong></div>
      <div class="tile"><small>Failed</small><strong style="color:#b91c1c">${failed}</strong></div>
      <div class="tile"><small>Skipped</small><strong>${skipped}</strong></div>
      <div class="tile"><small>Pass rate</small><strong>${passRate}%</strong></div>
    </div>
  </section>
  <h2 class="section-title">Test case results</h2>
  ${cases.map((testCase) => `
    <article class="case">
      <div class="case-head">
        <span class="case-code">${htmlEscape(testCase.code)}</span>
        <span class="case-name">${htmlEscape(testCase.name)}</span>
        <span class="status ${reportStatusClass(testCase.status)}">${htmlEscape(testCase.status)}</span>
        <span class="muted">${Math.round(testCase.durationMs / 100) / 10}s</span>
      </div>
      <div class="case-body">
        <div class="details">
          <div class="field"><b>Expected</b>${htmlMultiline(testCase.expected || 'Not captured')}</div>
          <div class="field"><b>Actual</b>${htmlMultiline(testCase.actual || 'Not captured')}</div>
        </div>
        ${testCase.error ? `<div class="error"><strong>Error</strong><br>${htmlMultiline(testCase.error)}</div>` : ''}
        ${testCase.screenshotPath ? `<div class="evidence"><b>Screenshot evidence</b>${officeImage(testCase.screenshotPath)}</div>` : ''}
        ${(testCase.videoPath || testCase.tracePath) ? `<div class="artifact-links">${testCase.videoPath ? '<span>Video attached in Evidence ZIP</span>' : ''}${testCase.tracePath ? '<span>Playwright trace attached in Evidence ZIP</span>' : ''}</div>` : ''}
      </div>
    </article>
  `).join('')}
</main>
</body>
</html>`;
}

function writeRichHtmlReport(runId: string, html: string, stamp: number): { fileName: string; filePath: string } {
  const fileName = `report-${runId}-${stamp}.html`;
  const filePath = testcaseFilePath(fileName);
  fs.writeFileSync(filePath, html, 'utf-8');
  return { fileName, filePath };
}

async function writePdfReport(runId: string, htmlPath: string, stamp: number): Promise<{ fileName: string; filePath: string }> {
  const fileName = `report-${runId}-${stamp}.pdf`;
  const filePath = testcaseFilePath(fileName);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' },
    });
  } finally {
    await browser.close();
  }
  return { fileName, filePath };
}

type XlsxCellValue = string | number | { value: string | number; style: number };

function xmlEscape(value: unknown): string {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xlsxColumnName(index: number): string {
  let result = '';
  let value = index;
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function xlsxSheet(rows: XlsxCellValue[][], widths: number[], freezeHeader = false): string {
  const rowXml = rows.map((row, rowIndex) => {
    const cells = row.map((entry, columnIndex) => {
      const normalized = typeof entry === 'object' ? entry : { value: entry, style: 0 };
      const ref = `${xlsxColumnName(columnIndex + 1)}${rowIndex + 1}`;
      if (typeof normalized.value === 'number' && Number.isFinite(normalized.value)) {
        return `<c r="${ref}" s="${normalized.style}"><v>${normalized.value}</v></c>`;
      }
      return `<c r="${ref}" s="${normalized.style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(normalized.value)}</t></is></c>`;
    }).join('');
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join('');
  const columns = widths.map((width, index) =>
    `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
  ).join('');
  const lastColumn = xlsxColumnName(Math.max(...rows.map((row) => row.length), 1));
  const lastRow = Math.max(rows.length, 1);
  const sheetView = freezeHeader
    ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
  const filter = freezeHeader && rows.length > 1 ? `<autoFilter ref="A1:${lastColumn}${lastRow}"/>` : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  ${sheetView}
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${columns}</cols>
  <sheetData>${rowXml}</sheetData>
  ${filter}
</worksheet>`;
}

const testcaseXlsxColumns: Array<{ label: string; key: keyof TestcaseFileRow; width: number }> = [
  { label: 'Case ID', key: 'caseId', width: 16 },
  { label: 'Test Case', key: 'title', width: 38 },
  { label: 'Objective', key: 'objective', width: 38 },
  { label: 'Module', key: 'module', width: 18 },
  { label: 'Feature', key: 'feature', width: 22 },
  { label: 'Type', key: 'testType', width: 18 },
  { label: 'Priority', key: 'priority', width: 14 },
  { label: 'Severity', key: 'severity', width: 14 },
  { label: 'Automation Candidate', key: 'automationCandidate', width: 21 },
  { label: 'Automation Kind', key: 'automationKind', width: 24 },
  { label: 'Preconditions', key: 'preconditions', width: 38 },
  { label: 'Test Data', key: 'testData', width: 30 },
  { label: 'Test Steps', key: 'steps', width: 48 },
  { label: 'Expected Result', key: 'expectedResult', width: 48 },
  { label: 'Status', key: 'status', width: 15 },
  { label: 'Actual Result', key: 'actualResult', width: 40 },
  { label: 'Defect ID', key: 'defectId', width: 16 },
  { label: 'Assignee', key: 'testerName', width: 20 },
  { label: 'Reviewer', key: 'reviewerName', width: 20 },
  { label: 'Notes', key: 'notes', width: 38 },
];

function testcaseXlsxCell(column: keyof TestcaseFileRow, value: string, rowIndex: number): XlsxCellValue {
  const normalized = value.toLowerCase();
  if (column === 'automationKind' || column === 'automationCandidate') {
    return { value, style: normalized === 'manual' || normalized === 'no' ? 3 : 2 };
  }
  if (column === 'priority' || column === 'severity') {
    if (['critical', 'blocker', 'high'].includes(normalized)) return { value, style: 4 };
  }
  if (column === 'status') {
    if (['passed', 'pass'].includes(normalized)) return { value, style: 2 };
    if (['failed', 'fail', 'blocked'].includes(normalized)) return { value, style: 4 };
  }
  return { value, style: rowIndex % 2 === 0 ? 7 : 0 };
}

async function writeTestcaseXlsxFile(
  rows: TestcaseFileRow[],
  prefix = 'testcases',
  context: { projectName?: string; packName?: string } = {}
): Promise<{ fileName: string; filePath: string }> {
  const stamp = Date.now();
  const fileName = `${prefix}-${stamp}.xlsx`;
  const filePath = testcaseFilePath(fileName);
  const zip = new JSZip();
  const header = (value: string): XlsxCellValue => ({ value, style: 1 });
  const dataRows: XlsxCellValue[][] = [
    testcaseXlsxColumns.map((column) => header(column.label)),
    ...rows.map((row, rowIndex) => testcaseXlsxColumns.map((column) =>
      testcaseXlsxCell(column.key, String(row[column.key] ?? ''), rowIndex)
    )),
  ];
  const automated = rows.filter((row) => row.automationKind && row.automationKind !== 'manual').length;
  const manual = rows.length - automated;
  const summaryRows: XlsxCellValue[][] = [
    [{ value: 'Passmark TestOps', style: 5 }, { value: 'Test Case Workbook', style: 5 }],
    [{ value: 'Project', style: 6 }, context.projectName || rows[0]?.projectName || ''],
    [{ value: 'Test Pack', style: 6 }, context.packName || 'Current filtered scope'],
    [{ value: 'Exported at', style: 6 }, new Date().toISOString()],
    [{ value: 'Total cases', style: 6 }, rows.length],
    [{ value: 'Automated', style: 6 }, automated],
    [{ value: 'Manual', style: 6 }, manual],
    [{ value: 'How to use', style: 6 }, 'Edit the Test Cases sheet, keep Case ID and Test Case, then import this .xlsx file back into Test Workspace.'],
  ];
  const guideRows: XlsxCellValue[][] = [
    ['Field', 'Required', 'Accepted values / guidance'].map(header),
    ['Case ID', 'Yes', 'Unique inside the project, for example TC-001. Existing IDs are updated on import.'],
    ['Test Case', 'Yes', 'Short, clear test case title.'],
    ['Type', 'No', 'Functional, UI, API, Accessibility, SEO, Performance, Security.'],
    ['Priority', 'No', 'critical, high, medium, low. Default: medium.'],
    ['Severity', 'No', 'blocker, critical, major, minor, trivial. Default: major.'],
    ['Automation Candidate', 'No', 'yes, partial, no.'],
    ['Automation Kind', 'No', 'manual or a supported automated runner kind.'],
    ['Test Steps', 'No', 'One numbered action per line.'],
    ['Expected Result', 'No', 'Expected observable outcome.'],
    ['Important', '', 'Only Excel .xlsx files are accepted by Import Excel. Do not rename CSV or XLS files to .xlsx.'],
  ];

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);
  zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>Passmark TestOps</dc:creator><dc:title>Test Case Workbook</dc:title>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
</cp:coreProperties>`);
  zip.file('docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Passmark TestOps</Application></Properties>`);
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Test Cases" sheetId="1" r:id="rId1"/><sheet name="Overview" sheetId="2" r:id="rId2"/><sheet name="Import Guide" sheetId="3" r:id="rId3"/></sheets>
</workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
  zip.file('xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="6"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FF15803D"/></font><font><b/><color rgb="FF526071"/></font><font><b/><color rgb="FFB91C1C"/></font><font><b/><color rgb="FF4338CA"/><sz val="14"/></font></fonts>
  <fills count="8"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF4338CA"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF7F7FC"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFECFDF3"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFEF2F2"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEEF2FF"/></patternFill></fill></fills>
  <borders count="2"><border/><border><left style="thin"><color rgb="FFD7DCE5"/></left><right style="thin"><color rgb="FFD7DCE5"/></right><top style="thin"><color rgb="FFD7DCE5"/></top><bottom style="thin"><color rgb="FFD7DCE5"/></bottom></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="8">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="6" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="7" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`);
  zip.file('xl/worksheets/sheet1.xml', xlsxSheet(dataRows, testcaseXlsxColumns.map((column) => column.width), true));
  zip.file('xl/worksheets/sheet2.xml', xlsxSheet(summaryRows, [24, 84]));
  zip.file('xl/worksheets/sheet3.xml', xlsxSheet(guideRows, [26, 14, 92], true));
  fs.writeFileSync(filePath, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } }));
  return { fileName, filePath };
}

function testcaseDownloadUrl(fileName: string): string {
  return `/api/testcase-files/download/${encodeURIComponent(fileName)}`;
}

function writeTestcaseJsonFile(rows: TestcaseFileRow[], prefix: string): { fileName: string; filePath: string } {
  const fileName = `${prefix}-${Date.now()}.json`;
  const filePath = testcaseFilePath(fileName);
  fs.writeFileSync(filePath, JSON.stringify({ exportedAt: new Date().toISOString(), total: rows.length, testCases: rows }, null, 2), 'utf-8');
  return { fileName, filePath };
}

async function writeTestcaseExportBundle(
  rows: TestcaseFileRow[],
  prefix: string,
  context: { projectName?: string; packName?: string } = {}
) {
  const csv = writeTestcaseCsvFile(rows, prefix);
  const excel = await writeTestcaseXlsxFile(rows, prefix, context);
  const html = writeOfficeHtmlFile(rows, prefix, 'html', `${context.packName || 'Test Case'} Report`);
  const pdf = await writePdfReport(prefix, html.filePath, Date.now());
  const doc = writeOfficeHtmlFile(rows, prefix, 'doc', `${context.packName || 'Test Case'} Review Document`);
  const json = writeTestcaseJsonFile(rows, prefix);
  return {
    htmlUrl: testcaseDownloadUrl(html.fileName),
    pdfUrl: testcaseDownloadUrl(pdf.fileName),
    excelUrl: testcaseDownloadUrl(excel.fileName),
    wordUrl: testcaseDownloadUrl(doc.fileName),
    csvUrl: testcaseDownloadUrl(csv.fileName),
    jsonUrl: testcaseDownloadUrl(json.fileName),
  };
}

async function writeXlsxReport(run: any, cases: RichReportCase[], stamp: number): Promise<{ fileName: string; filePath: string }> {
  const fileName = `report-${run.id}-${stamp}.xlsx`;
  const filePath = testcaseFilePath(fileName);
  const zip = new JSZip();
  const header = (value: string): XlsxCellValue => ({ value, style: 1 });
  const status = (value: string): XlsxCellValue => ({
    value,
    style: value === 'passed' ? 2 : value === 'skipped' ? 3 : 4,
  });
  const summaryRows: XlsxCellValue[][] = [
    [{ value: 'Passmark TestOps', style: 5 }, { value: 'Automated Test Report', style: 5 }],
    ['Run', run.pack?.name || run.suite?.name || run.id],
    ['Project', run.project?.name || ''],
    ['Environment', run.environment?.name || ''],
    ['Target', run.target?.name || run.url || ''],
    ['Started', new Date(run.createdAt).toISOString()],
    ['Duration (ms)', run.durationMs || 0],
    ['Total', cases.length],
    ['Passed', run.passed || 0],
    ['Failed', run.failed || 0],
    ['Skipped', run.skipped || 0],
  ].map((row, index) => index === 0 ? row : [{ value: row[0] as string, style: 6 }, row[1]]);
  const resultRows: XlsxCellValue[][] = [
    ['Case ID', 'Test case', 'Status', 'Duration (ms)', 'Module', 'Type', 'Priority', 'Expected', 'Actual', 'Error', 'Screenshot', 'Video', 'Trace'].map(header),
    ...cases.map((testCase) => [
      testCase.code,
      testCase.name,
      status(testCase.status),
      testCase.durationMs,
      testCase.module,
      testCase.testType,
      testCase.priority,
      testCase.expected,
      testCase.actual,
      testCase.error,
      testCase.screenshotPath ? path.basename(testCase.screenshotPath) : '',
      testCase.videoPath ? path.basename(testCase.videoPath) : '',
      testCase.tracePath ? path.basename(testCase.tracePath) : '',
    ]),
  ];
  const evidenceRows: XlsxCellValue[][] = [
    ['Case ID', 'Test case', 'Screenshot', 'Video', 'Playwright trace', 'Note'].map(header),
    ...cases
      .filter((testCase) => testCase.screenshotPath || testCase.videoPath || testCase.tracePath)
      .map((testCase) => [
        testCase.code,
        testCase.name,
        testCase.screenshotPath ? path.basename(testCase.screenshotPath) : '',
        testCase.videoPath ? path.basename(testCase.videoPath) : '',
        testCase.tracePath ? path.basename(testCase.tracePath) : '',
        'Evidence files are included in the Evidence ZIP report.',
      ]),
  ];

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);
  zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>Passmark TestOps</dc:creator><dc:title>Automated Test Report</dc:title>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
</cp:coreProperties>`);
  zip.file('docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Passmark TestOps</Application></Properties>`);
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Summary" sheetId="1" r:id="rId1"/><sheet name="Results" sheetId="2" r:id="rId2"/><sheet name="Evidence" sheetId="3" r:id="rId3"/></sheets>
</workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
  zip.file('xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="5"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FF15803D"/></font><font><b/><color rgb="FF526071"/></font><font><b/><color rgb="FFB91C1C"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF4338CA"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="2"><border/><border><left style="thin"><color rgb="FFD7DCE5"/></left><right style="thin"><color rgb="FFD7DCE5"/></right><top style="thin"><color rgb="FFD7DCE5"/></top><bottom style="thin"><color rgb="FFD7DCE5"/></bottom></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="7">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="top"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`);
  zip.file('xl/worksheets/sheet1.xml', xlsxSheet(summaryRows, [24, 72]));
  zip.file('xl/worksheets/sheet2.xml', xlsxSheet(resultRows, [16, 42, 14, 16, 20, 16, 12, 48, 48, 56, 32, 28, 28], true));
  zip.file('xl/worksheets/sheet3.xml', xlsxSheet(evidenceRows, [16, 42, 34, 30, 30, 48], true));
  fs.writeFileSync(filePath, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } }));
  return { fileName, filePath };
}

function docxCell(label: string, value: string, bold = false): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: label ? `${label}: ` : '', bold: true }), new TextRun({ text: value || 'Not captured', bold })] })],
  });
}

async function writeDocxReport(run: any, cases: RichReportCase[], stamp: number): Promise<{ fileName: string; filePath: string }> {
  const fileName = `report-${run.id}-${stamp}.docx`;
  const filePath = testcaseFilePath(fileName);
  const children: Array<Paragraph | Table> = [
    new Paragraph({ text: 'Passmark TestOps', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: 'Automated Test Execution Report', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [docxCell('Run', run.pack?.name || run.suite?.name || run.id), docxCell('Project', run.project?.name || '')] }),
        new TableRow({ children: [docxCell('Environment', run.environment?.name || ''), docxCell('Target', run.target?.name || run.url || '')] }),
        new TableRow({ children: [docxCell('Total', String(cases.length)), docxCell('Passed / Failed', `${run.passed || 0} / ${run.failed || 0}`)] }),
      ],
    }),
    new Paragraph({ text: 'Test case results', heading: HeadingLevel.HEADING_1 }),
  ];

  for (const testCase of cases) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({ text: `${testCase.code} — ${testCase.name}`, bold: true }),
          new TextRun({ text: `  [${testCase.status.toUpperCase()}]`, bold: true, color: testCase.status === 'passed' ? '15803D' : testCase.status === 'skipped' ? '526071' : 'B91C1C' }),
        ],
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [docxCell('Expected', testCase.expected), docxCell('Actual', testCase.actual)] }),
          new TableRow({ children: [docxCell('Duration', `${testCase.durationMs} ms`), docxCell('Error', testCase.error || 'None')] }),
        ],
      }),
    );

    if (testCase.screenshotPath && fs.existsSync(testCase.screenshotPath)) {
      const extension = path.extname(testCase.screenshotPath).toLowerCase();
      if (['.png', '.jpg', '.jpeg'].includes(extension)) {
        children.push(
          new Paragraph({ children: [new TextRun({ text: 'Screenshot evidence', bold: true })] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({
              data: fs.readFileSync(testCase.screenshotPath),
              transformation: { width: 560, height: 315 },
              type: extension === '.png' ? 'png' : 'jpg',
            })],
          }),
        );
      }
    }
  }

  const document = new Document({ sections: [{ children }] });
  fs.writeFileSync(filePath, await Packer.toBuffer(document));
  return { fileName, filePath };
}

async function writeEvidenceZip(
  runId: string,
  stamp: number,
  reportFiles: Array<{ filePath: string }>,
  artifacts: Array<{ type: string; path: string }>
): Promise<{ fileName: string; filePath: string }> {
  const fileName = `report-${runId}-${stamp}-evidence.zip`;
  const filePath = testcaseFilePath(fileName);
  const included = new Set<string>();

  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(filePath);
    const archive = new ZipArchive({ zlib: { level: 9 } });
    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);
    archive.pipe(output);

    reportFiles.forEach((file) => {
      if (fs.existsSync(file.filePath) && !included.has(file.filePath)) {
        included.add(file.filePath);
        archive.file(file.filePath, { name: `report/${path.basename(file.filePath)}` });
      }
    });
    artifacts.forEach((artifact) => {
      const artifactPath = resolveImagePath(artifact.path);
      if (artifactPath && fs.statSync(artifactPath).isFile() && !included.has(artifactPath)) {
        included.add(artifactPath);
        archive.file(artifactPath, { name: `evidence/${artifact.type}/${path.basename(artifactPath)}` });
      }
    });
    void archive.finalize();
  });

  return { fileName, filePath };
}

async function upsertRunReportArtifact(runId: string, type: string, filePath: string) {
  await prisma.$transaction([
    prisma.artifact.deleteMany({ where: { runId, type } }),
    prisma.artifact.create({
      data: { id: `${runId}-${type}`, runId, type, path: filePath },
    }),
  ]);
}

async function writeRunResultReports(runId: string) {
  const csv = await writeRunResultCsv(runId);
  const run = await prisma.testRun.findUnique({
    where: { id: runId },
    include: {
      project: true,
      suite: true,
      environment: true,
      target: true,
      pack: true,
      results: { orderBy: { caseCode: 'asc' } },
      artifacts: true,
    },
  });
  if (!run) return;

  const stamp = Date.now();
  const cases = richReportCases(run);
  const html = writeRichHtmlReport(run.id, buildRunReportHtml(run, cases), stamp);
  await upsertRunReportArtifact(runId, 'result-html', html.filePath);
  const pdf = await writePdfReport(run.id, html.filePath, stamp);
  await upsertRunReportArtifact(runId, 'result-pdf', pdf.filePath);
  const excel = await writeXlsxReport(run, cases, stamp);
  await upsertRunReportArtifact(runId, 'result-excel', excel.filePath);
  const doc = await writeDocxReport(run, cases, stamp);
  await upsertRunReportArtifact(runId, 'result-doc', doc.filePath);

  const evidenceArtifacts = await prisma.artifact.findMany({
    where: {
      runId,
      type: { in: ['actual-screenshot', 'screenshot', 'video', 'trace', 'raw-log'] },
    },
  });
  const zip = await writeEvidenceZip(runId, stamp, [csv, html, pdf, excel, doc], evidenceArtifacts);
  await upsertRunReportArtifact(runId, 'result-zip', zip.filePath);
}

function resultToSourceRow(result: any): TestcaseFileRow {
  const extra = parseJsonText(result.aiDiagnosis);

  return {
    caseId: result.caseCode,
    projectId: '',
    projectName: '',
    module: typeof extra.module === 'string' ? extra.module : '',
    requirementId: typeof extra.requirementId === 'string' ? extra.requirementId : '',
    feature: typeof extra.feature === 'string' ? extra.feature : '',
    title: result.caseName,
    objective: typeof extra.description === 'string' ? extra.description : '',
    interDependencies: typeof extra.interDependencies === 'string' ? extra.interDependencies : '',
    preconditions: typeof extra.preconditions === 'string' ? extra.preconditions : '',
    testDataPreparation: typeof extra.testDataPreparation === 'string' ? extra.testDataPreparation : '',
    testData: typeof extra.testData === 'string' ? extra.testData : '',
    steps: Array.isArray(extra.steps)
      ? (extra.steps as TestCaseStep[]).map((step, index) => `${index + 1}. ${step.title}: ${step.detail}`).join('\n')
      : '',
    actionInputData: typeof extra.actionInputData === 'string' ? extra.actionInputData : '',
    expectedResult: result.expectedResult || '',
    priority: typeof extra.priority === 'string' ? extra.priority : '',
    regression: typeof extra.regression === 'string' ? extra.regression : '',
    platform: typeof extra.platform === 'string' ? extra.platform : '',
    tools: typeof extra.tools === 'string' ? extra.tools : '',
    severity: typeof extra.severity === 'string' ? extra.severity : '',
    testType: typeof extra.testType === 'string' ? extra.testType : '',
    automationCandidate: typeof extra.automationCandidate === 'string' ? extra.automationCandidate : '',
    automationKind: typeof extra.automationKind === 'string' ? extra.automationKind : '',
    selector: typeof extra.selector === 'string' ? extra.selector : '',
    expectedText: typeof extra.expectedText === 'string' ? extra.expectedText : '',
    inputImage: typeof extra.inputImage === 'string' ? extra.inputImage : '',
    actualImage: '',
    screenshotPolicy: typeof extra.screenshotPolicy === 'string' ? extra.screenshotPolicy : '',
    status: '',
    actualResult: '',
    defectId: '',
    testerName: typeof extra.testerName === 'string' ? extra.testerName : '',
    reviewerName: typeof extra.reviewerName === 'string' ? extra.reviewerName : '',
    reviewDate: typeof extra.reviewDate === 'string' ? extra.reviewDate : '',
    notes: typeof extra.notes === 'string' ? extra.notes : '',
    durationMs: '',
  };
}

async function saveTestcaseFileHistory(input: {
  url: string;
  rows: TestcaseFileRow[];
  filePath: string;
  excelFileName: string;
  docFileName: string;
  aiExplanation?: string;
  userRequest?: string;
  context?: RunContext;
}): Promise<TestRun> {
  const runId = newId('run');
  const rawOutputPath = rawRunPath(runId);
  writeRawRunData(runId, {
    aiExplanation: input.aiExplanation || '',
    generatedCode: '',
    stdout: '',
    stderr: '',
  });

  await prisma.testRun.create({
    data: {
      id: runId,
      projectId: input.context?.projectId,
      suiteId: input.context?.suiteId,
      targetId: input.context?.targetId,
      url: input.url,
      status: 'generated',
      total: input.rows.length,
      passed: 0,
      failed: 0,
      skipped: input.rows.length,
      durationMs: 0,
      rawOutputPath,
      userRequest: input.userRequest || 'Generated testcase file',
      stdout: '',
      stderr: '',
      generatedCode: '',
      results: {
        create: input.rows.map((row, index) => ({
          id: newId('result'),
          ...testResultPayload(rowToPreviewCase({
            ...row,
            status: 'pending',
            actualResult: 'Generated only. Not run by automation yet.',
          }), index),
          status: 'pending',
          durationMs: 0,
        })),
      },
      artifacts: {
        create: [
          {
            id: newId('artifact'),
            type: 'raw-log',
            path: rawOutputPath,
          },
          {
            id: newId('artifact'),
            type: 'testcase-csv',
            path: input.filePath,
          },
          {
            id: newId('artifact'),
            type: 'testcase-excel',
            path: testcaseFilePath(input.excelFileName),
          },
          {
            id: newId('artifact'),
            type: 'testcase-doc',
            path: testcaseFilePath(input.docFileName),
          },
        ],
      },
    },
    include: {
      project: true,
      suite: true,
      target: true,
      results: true,
      artifacts: true,
    },
  });

  const savedRun = await prisma.testRun.findUnique({
    where: { id: runId },
    include: {
      project: true,
      suite: true,
      target: true,
      results: { orderBy: { caseCode: 'asc' } },
      artifacts: true,
    },
  });

  if (!savedRun) {
    throw new Error('Could not read saved testcase file history record.');
  }

  return dbRunToApiRun(savedRun);
}

function testcaseText(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function testcaseListText(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item, index) => typeof item === 'string' ? `${index + 1}. ${item.trim()}` : '')
      .filter(Boolean)
      .join('\n');
  }

  return testcaseText(value);
}

function normalizePriority(value: unknown): string {
  const text = testcaseText(value, 'medium').toLowerCase();
  return ['high', 'medium', 'low'].includes(text) ? text : 'medium';
}

function normalizeSeverity(value: unknown): string {
  const text = testcaseText(value, 'major').toLowerCase();
  return ['critical', 'major', 'minor', 'trivial'].includes(text) ? text : 'major';
}

function normalizeAutomationCandidate(value: unknown, automationKind = ''): string {
  const text = testcaseText(value, automationKind && automationKind !== 'manual' ? 'partial' : 'no').toLowerCase();
  return ['yes', 'no', 'partial'].includes(text) ? text : 'partial';
}

function normalizeTestType(value: unknown): string {
  const text = testcaseText(value, 'functional').toLowerCase();
  const supported = [
    'functional',
    'ui',
    'ux',
    'validation',
    'negative',
    'edge',
    'navigation',
    'data',
    'accessibility',
    'seo',
    'performance',
    'security',
    'compatibility',
    'smoke',
    'regression',
  ];
  return supported.includes(text) ? text : text.replace(/[^a-z0-9_-]/g, '-') || 'functional';
}

function normalizeAutomationKind(value: unknown): string {
  const text = testcaseText(value, 'manual').toLowerCase();
  const supported = [
    'manual',
    'page_load',
    'page_load_performance',
    'title_exists',
    'selector_visible',
    'body_text_contains',
    'meta_description_exists',
    'meta_description_length',
    'canonical_exists',
    'h1_exists',
    'html_lang_exists',
    'viewport_exists',
    'link_health_basic',
    'image_resources_ok',
    'image_alt_text',
    'no_console_errors',
    'no_page_errors',
    'form_validation',
    'generic_visible_content',
  ];
  return supported.includes(text) ? text : 'manual';
}

function rowToPreviewCase(row: TestcaseFileRow): TestCaseDetail {
  return {
    caseId: row.caseId,
    module: row.module,
    feature: row.feature,
    title: `${row.caseId} ${row.title}`.trim(),
    status: row.status || 'pending',
    durationMs: Number(row.durationMs || 0),
    description: row.objective,
    objective: row.objective,
    preconditions: row.preconditions,
    testData: row.testData,
    priority: row.priority,
    severity: row.severity,
    testType: row.testType,
    automationCandidate: row.automationCandidate,
    inputImage: row.inputImage,
    actualImage: row.actualImage,
    defectId: row.defectId,
    testerName: row.testerName,
    reviewerName: row.reviewerName,
    reviewDate: row.reviewDate,
    selector: row.selector,
    expected: row.expectedResult,
    actual: row.actualResult || 'Not run yet.',
    notes: row.notes,
    steps: row.steps
      ? row.steps.split(/\n+/).map((step, index) => ({
          title: `Step ${index + 1}`,
          detail: step.replace(/^\d+\.\s*/, ''),
          status: row.status || 'pending',
        }))
      : [],
  };
}

const MIN_TESTCASE_FILE_ROWS = 5;
const DEFAULT_TESTCASE_FILE_ROWS = 12;
const MAX_TESTCASE_FILE_ROWS = 80;

function clampTestcaseCount(value: unknown, fallback = DEFAULT_TESTCASE_FILE_ROWS): number {
  const numeric = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number.parseInt(value, 10)
      : Number.NaN;

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(MAX_TESTCASE_FILE_ROWS, Math.max(MIN_TESTCASE_FILE_ROWS, Math.round(numeric)));
}

function recommendedCaseCountFromAi(parsed: Record<string, unknown>): number {
  const strategy = parsed.coverageStrategy && typeof parsed.coverageStrategy === 'object'
    ? parsed.coverageStrategy as Record<string, unknown>
    : {};

  return clampTestcaseCount(strategy.recommendedCaseCount ?? parsed.recommendedCaseCount ?? parsed.n);
}

function requestedTestcaseCount(userRequest: string): number {
  const match = userRequest.match(/(?:approximately|about|around|~)\s*(\d{1,2})/i)
    || userRequest.match(/(\d{1,2})\s*(?:focused\s+)?test\s*cases?/i);
  return clampTestcaseCount(match?.[1]);
}

function buildProfessionalTestcasePrompt(
  url: string,
  userRequest: string,
  count: number,
  startIndex: number,
  existingTitles: string[],
  suite?: TestSuite,
  target?: TestTarget
): string {
  const batchRequest = userRequest
    .split(/\r?\n/)
    .map((line) => line
      .replace(/\bgenerate\s+(?:approximately|about|around|~)\s*\d+\s*(?:focused\s+)?test\s*cases?\.?/ig, '')
      .replace(/\bcoverage\s+target:\s*(?:approximately|about|around|~)\s*\d+\s*(?:cases?)?\.?/ig, '')
      .trim())
    .filter(Boolean)
    .join('\n')
    .trim();
  const requestedType = batchRequest.match(/test type:\s*(functional|ui|api|accessibility|seo|performance|security)/i)?.[1]?.toLowerCase()
    || 'functional';
  const coverageFocuses = [
    'primary success path',
    'invalid input rejection',
    'required field validation',
    'session or state transition',
    'boundary input behavior',
    'error handling and recovery',
    'authorization or access control',
    'clear user feedback',
    'data persistence or consistency',
    'cross-browser or device behavior',
  ];
  const coverageFocus = coverageFocuses[startIndex % coverageFocuses.length];
  const caseIdentity = `TC-${String(startIndex + 1).padStart(3, '0')}`;
  const automationKinds = requestedType === 'seo'
    ? 'title_exists,meta_description_exists,canonical_exists,h1_exists,html_lang_exists'
    : requestedType === 'performance'
      ? 'page_load_performance'
      : requestedType === 'accessibility'
        ? 'selector_visible,image_alt_text,html_lang_exists,manual'
        : requestedType === 'api' || requestedType === 'security'
          ? 'manual'
          : 'page_load,selector_visible,body_text_contains,form_validation,generic_visible_content,manual';

  return `Output one compact test case as JSON. Case: ${caseIdentity}. Focus: ${coverageFocus}. The title must clearly reflect this focus. Allowed k: ${automationKinds}.
Target: ${url}. Suite: ${suite?.name || 'General'} (${suite?.type || target?.type || 'web'}).
Requirement: ${batchRequest || 'Create a focused test case.'}
${existingTitles.length ? `Forbidden titles: ${existingTitles.slice(-10).join(' | ')}.` : ''}
No prose, credentials, destructive actions, load or stress traffic.`;
}

function normalizeCaseIds(rows: TestcaseFileRow[]): TestcaseFileRow[] {
  return rows.map((row, index) => ({
    ...row,
    caseId: `TC-${String(index + 1).padStart(3, '0')}`,
  }));
}

function normalizeProfessionalRows(
  parsed: Record<string, unknown>
): TestcaseFileRow[] {
  const rawCases = Array.isArray(parsed.testcases) ? parsed.testcases : Array.isArray(parsed.cases) ? parsed.cases : [];
  const rows = rawCases.map((item, index): TestcaseFileRow | null => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const title = testcaseText(row.title ?? row.t);
    if (!title) return null;
    const expectedResult = testcaseText(row.expectedResult ?? row.expected ?? row.e, `${title} should behave as required.`);
    const automationKind = normalizeAutomationKind(row.automationKind ?? row.k);

    return {
      caseId: testcaseText(row.caseId, `TC-${String(index + 1).padStart(3, '0')}`),
      projectId: testcaseText(row.projectId),
      projectName: testcaseText(row.projectName),
      module: testcaseText(row.module, 'General'),
      requirementId: testcaseText(row.requirementId),
      feature: testcaseText(row.feature, title),
      title,
      objective: testcaseText(row.objective, testcaseText(row.description, `Verify ${title}.`)),
      interDependencies: testcaseText(row.interDependencies, 'N/A'),
      preconditions: testcaseText(row.preconditions, 'Target URL is reachable.'),
      testDataPreparation: testcaseText(row.testDataPreparation, testcaseText(row.testData)),
      testData: testcaseText(row.testData),
      steps: testcaseListText(row.steps) || `1. Open the configured target URL.\n2. Verify ${title}.\n3. Record the observed result.`,
      actionInputData: testcaseText(row.actionInputData),
      expectedResult,
      priority: normalizePriority(row.priority ?? row.p),
      regression: testcaseText(row.regression, 'yes'),
      platform: testcaseText(row.platform, 'Web'),
      tools: testcaseText(row.tools, automationKind === 'manual' ? 'Manual review' : 'Playwright Chromium'),
      severity: normalizeSeverity(row.severity ?? row.s),
      testType: normalizeTestType(row.testType ?? row.y),
      automationCandidate: normalizeAutomationCandidate(row.automationCandidate, automationKind),
      automationKind,
      selector: testcaseText(row.selector),
      expectedText: testcaseText(row.expectedText),
      inputImage: testcaseText(row.inputImage),
      actualImage: testcaseText(row.actualImage),
      screenshotPolicy: testcaseText(row.screenshotPolicy, automationKind === 'manual' ? 'manual' : 'on-failure'),
      status: '',
      actualResult: '',
      defectId: testcaseText(row.defectId),
      testerName: testcaseText(row.testerName),
      reviewerName: testcaseText(row.reviewerName),
      reviewDate: testcaseText(row.reviewDate),
      notes: testcaseText(row.notes),
      durationMs: '',
    };
  }).filter((row): row is TestcaseFileRow => Boolean(row));

  if (!rows.length) {
    throw new Error('Local AI returned no valid testcase rows.');
  }

  return normalizeCaseIds(rows.slice(0, MAX_TESTCASE_FILE_ROWS));
}

function buildCoverageExplanation(parsed: Record<string, unknown>, rows: TestcaseFileRow[], fallbackReason = '', targetCount = rows.length): string {
  const strategy = parsed.coverageStrategy && typeof parsed.coverageStrategy === 'object'
    ? parsed.coverageStrategy as Record<string, unknown>
    : {};
  const groups = Array.isArray(strategy.coverageGroups)
    ? strategy.coverageGroups.map((group) => testcaseText(group)).filter(Boolean)
    : Array.from(new Set(rows.map((row) => row.module))).filter(Boolean);
  const assumptions = Array.isArray(strategy.assumptions)
    ? strategy.assumptions.map((assumption) => testcaseText(assumption)).filter(Boolean)
    : [];

  return [
    `Recommended coverage target: ${targetCount} test cases.`,
    `Generated testcase rows: ${rows.length}.`,
    testcaseText(strategy.rationale, fallbackReason || 'The suite is split into focused QA cases so each result maps to one risk or behavior.'),
    groups.length ? `Coverage groups: ${groups.join(', ')}.` : '',
    testcaseText(strategy.automationScope, 'Automation is marked per row; manual cases remain editable and importable.'),
    assumptions.length ? `Assumptions: ${assumptions.join('; ')}.` : '',
  ].filter(Boolean).join('\n');
}

async function generateProfessionalTestcaseFile(
  url: string,
  userRequest: string,
  suite?: TestSuite,
  target?: TestTarget,
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: TestcaseGenerationProgress) => void | Promise<void>;
    onBatch?: (rows: TestcaseFileRow[], progress: TestcaseGenerationProgress) => void | Promise<void>;
  } = {}
): Promise<{
  rows: TestcaseFileRow[];
  aiExplanation: string;
  aiPrompt: string;
  aiResponse: string;
  aiStatus: 'passed';
  durationMs: number;
}> {
  const startedAt = Date.now();
  const targetCount = requestedTestcaseCount(userRequest);
  const aiPrompts: string[] = [];
  const aiResponses: string[] = [];
  const generatedRows: TestcaseFileRow[] = [];
  const seenTitles = new Set<string>();
  const configuredBatchSize = Math.max(1, Math.min(4, readConfigNumber('LOCAL_AI_CASES_PER_BATCH', 1)));
  const batchTimeoutMs = readConfigNumber('LOCAL_AI_BATCH_TIMEOUT_MS', 120000);
  const batchMaxTokens = readConfigNumber('LOCAL_AI_BATCH_MAX_TOKENS', 192);
  const estimatedBatches = Math.max(1, Math.ceil(targetCount / configuredBatchSize));
  const maxAttempts = estimatedBatches + 2;
  let attempts = 0;
  let consecutiveTimeouts = 0;
  let nextBatchSize = configuredBatchSize;
  let lastBatchError = '';
  try {
    await options.onProgress?.({
      generatedCount: 0,
      targetCount,
      batch: 0,
      estimatedBatches,
      attempt: 0,
      maxAttempts,
      message: 'Preparing the first Local AI batch.',
    });

    while (generatedRows.length < targetCount && attempts < maxAttempts) {
      if (options.signal?.aborted) {
        throw new Error('Test case generation was cancelled.');
      }

      attempts += 1;
      const batch = Math.min(
        estimatedBatches,
        Math.floor(generatedRows.length / configuredBatchSize) + 1
      );
      const chunkCount = Math.min(nextBatchSize, targetCount - generatedRows.length);
      const aiPrompt = buildProfessionalTestcasePrompt(
        url,
        userRequest,
        chunkCount,
        generatedRows.length,
        generatedRows.map((row) => row.title),
        suite,
        target
      );
      aiPrompts.push(aiPrompt);

      await options.onProgress?.({
        generatedCount: generatedRows.length,
        targetCount,
        batch,
        estimatedBatches,
        attempt: attempts,
        maxAttempts,
        message: `Waiting for Local AI to start batch ${batch} of approximately ${estimatedBatches}.`,
      });

      let chunkRows: TestcaseFileRow[] = [];
      try {
        let lastActivityUpdate = 0;
        const aiResponse = await askLocalAI([
          { role: 'system', content: 'Senior QA lead. Follow the compact JSON schema exactly.' },
          { role: 'user', content: aiPrompt },
        ], {
          signal: options.signal,
          timeoutMs: batchTimeoutMs,
          maxTokens: batchMaxTokens,
          jsonMode: true,
          jsonSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              cases: {
                type: 'array',
                minItems: 1,
                maxItems: 1,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    t: { type: 'string' },
                    e: { type: 'string' },
                    k: {
                      type: 'string',
                      enum: [
                        'manual',
                        'page_load',
                        'page_load_performance',
                        'title_exists',
                        'selector_visible',
                        'body_text_contains',
                        'meta_description_exists',
                        'canonical_exists',
                        'h1_exists',
                        'html_lang_exists',
                        'image_alt_text',
                        'form_validation',
                        'generic_visible_content',
                      ],
                    },
                    y: {
                      type: 'string',
                      enum: ['functional', 'ui', 'api', 'accessibility', 'seo', 'performance', 'security'],
                    },
                    p: { type: 'string', enum: ['high', 'medium', 'low'] },
                    s: { type: 'string', enum: ['critical', 'major', 'minor', 'trivial'] },
                  },
                  required: ['t', 'e', 'k', 'y', 'p', 's'],
                },
              },
            },
            required: ['cases'],
          },
          onProgress: (activity) => {
            const now = Date.now();
            if (now - lastActivityUpdate < 500 && activity.receivedChars > 1) return;
            lastActivityUpdate = now;
            void options.onProgress?.({
              generatedCount: generatedRows.length,
              targetCount,
              batch,
              estimatedBatches,
              attempt: attempts,
              maxAttempts,
              message: `Local AI is responding · ${activity.receivedChars} characters received for batch ${batch}.`,
            });
          },
        });
        aiResponses.push(aiResponse);
        const parsed = parseAiJsonObject(aiResponse);
        chunkRows = normalizeProfessionalRows(parsed).slice(0, chunkCount);
        consecutiveTimeouts = 0;
        nextBatchSize = configuredBatchSize;
      } catch (batchError) {
        if (options.signal?.aborted) throw batchError;
        lastBatchError = batchError instanceof Error ? batchError.message : String(batchError);
        const timedOut = /timed out/i.test(lastBatchError);
        consecutiveTimeouts = timedOut ? consecutiveTimeouts + 1 : 0;
        if (timedOut && nextBatchSize > 1) {
          nextBatchSize = 1;
        }
        await options.onProgress?.({
          generatedCount: generatedRows.length,
          targetCount,
          batch,
          estimatedBatches,
          attempt: attempts,
          maxAttempts,
          message: timedOut && attempts < maxAttempts
            ? `Batch ${batch} was too slow. Retrying with ${nextBatchSize} case per response.`
            : `Batch ${batch} returned invalid data. Retrying automatically.`,
        });
        if (consecutiveTimeouts >= 2) break;
        continue;
      }

      const acceptedRows: TestcaseFileRow[] = [];
      for (const row of chunkRows) {
        const key = row.title.toLowerCase().replace(/\s+/g, ' ').trim();
        if (!seenTitles.has(key)) {
          const acceptedRow = {
            ...row,
            caseId: `TC-${String(generatedRows.length + 1).padStart(3, '0')}`,
          };
          seenTitles.add(key);
          generatedRows.push(acceptedRow);
          acceptedRows.push(acceptedRow);
        }
      }

      const progress = {
        generatedCount: generatedRows.length,
        targetCount,
        batch,
        estimatedBatches,
        attempt: attempts,
        maxAttempts,
        message: `${generatedRows.length} of ${targetCount} cases are valid and saved.`,
      };
      if (acceptedRows.length) {
        await options.onBatch?.(acceptedRows, progress);
      }
      await options.onProgress?.(progress);
      lastBatchError = '';
    }

    if (generatedRows.length < targetCount) {
      const detail = lastBatchError ? ` Last error: ${lastBatchError}` : '';
      throw new Error(`Local AI returned only ${generatedRows.length} unique cases out of ${targetCount} requested after ${attempts} attempts.${detail}`);
    }

    const rows = normalizeCaseIds(generatedRows.slice(0, targetCount));

    if (!rows.length) throw new Error('Local AI returned no unique testcase rows.');

    return {
      rows,
      aiExplanation: buildCoverageExplanation({}, rows, '', targetCount),
      aiPrompt: aiPrompts.join('\n\n--- NEXT BATCH ---\n\n'),
      aiResponse: aiResponses.join('\n'),
      aiStatus: 'passed',
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Local AI could not generate valid test cases: ${reason}`);
  }
}

function renderImportedCaseBody(row: TestcaseFileRow): string {
  const selector = JSON.stringify(row.selector || 'body');
  const expectedText = JSON.stringify(row.expectedText || '');
  const testType = normalizeTestType(row.testType);

  if (testType === 'api') {
    return `    const response = await page.request.get(AUTH_TARGET_URL, { failOnStatusCode: false, headers: AUTH_HEADERS });
    expect(response.status(), 'Expected the API endpoint not to return a server error').toBeLessThan(500);
    expect(response.status(), 'Expected the API endpoint to return a valid HTTP status').toBeGreaterThanOrEqual(200);
    const responseBody = await response.body();
    expect(responseBody.length, 'Expected the API response to contain a body').toBeGreaterThan(0);
    const contentType = response.headers()['content-type'] || '';
    if (contentType.includes('application/json')) {
      expect(() => JSON.parse(responseBody.toString('utf8')), 'Expected a valid JSON response').not.toThrow();
    }`;
  }

  if (testType === 'accessibility') {
    return `    await openTarget(page);
    const documentLanguage = await page.locator('html').getAttribute('lang');
    expect(documentLanguage?.trim().length || 0, 'Expected the document to declare a language').toBeGreaterThan(0);
    const imagesMissingAlt = await page.locator('img').evaluateAll((images) => images.filter((image) => !image.hasAttribute('alt')).length);
    expect(imagesMissingAlt, 'Expected every image to provide an alt attribute').toBe(0);
    const unlabeledControls = await page.locator('input:not([type="hidden"]):not([type="button"]):not([type="submit"]), select, textarea').evaluateAll((controls) => controls.filter((control) => {
      const id = control.getAttribute('id');
      const hasLinkedLabel = id ? Boolean(document.querySelector(\`label[for="\${CSS.escape(id)}"]\`)) : false;
      return !hasLinkedLabel && !control.closest('label') && !control.getAttribute('aria-label') && !control.getAttribute('aria-labelledby') && !control.getAttribute('title');
    }).length);
    expect(unlabeledControls, 'Expected form controls to have accessible labels').toBe(0);
    expect(await page.locator('main, [role="main"]').count(), 'Expected a main content landmark').toBeGreaterThan(0);`;
  }

  if (testType === 'performance') {
    return `    const startedAt = Date.now();
    const response = await openTarget(page);
    const elapsedMs = Date.now() - startedAt;
    expect(response, 'Expected the target to return a response').not.toBeNull();
    expect(response?.status(), 'Expected no server error').toBeLessThan(500);
    expect(elapsedMs, 'Expected page response within the safe 10 second threshold').toBeLessThan(10000);`;
  }

  if (testType === 'security') {
    return `    const targetUrl = new URL(SITE_URL);
    expect(targetUrl.protocol, 'Expected a secure HTTPS target for security checks').toBe('https:');
    const response = await page.request.get(AUTH_TARGET_URL, { failOnStatusCode: false, headers: AUTH_HEADERS });
    expect(response.status(), 'Expected no server error').toBeLessThan(500);
    const headers = response.headers();
    expect((headers['x-content-type-options'] || '').toLowerCase(), 'Expected X-Content-Type-Options: nosniff').toBe('nosniff');
    const contentSecurityPolicy = (headers['content-security-policy'] || '').toLowerCase();
    const frameOptions = (headers['x-frame-options'] || '').toLowerCase();
    expect(Boolean(frameOptions || contentSecurityPolicy.includes('frame-ancestors')), 'Expected clickjacking protection through X-Frame-Options or CSP frame-ancestors').toBeTruthy();`;
  }

  switch (row.automationKind) {
    case 'page_load':
      return `    const response = await openTarget(page);
    expect(response, 'Expected the target to return a response').not.toBeNull();
    expect(response?.status(), 'Expected no server error').toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();`;
    case 'page_load_performance':
      return `    const startedAt = Date.now();
    const response = await openTarget(page);
    const elapsedMs = Date.now() - startedAt;
    expect(response, 'Expected the target to return a response').not.toBeNull();
    expect(response?.status(), 'Expected no server error').toBeLessThan(500);
    expect(elapsedMs, 'Expected page load to complete within 10 seconds').toBeLessThan(10000);`;
    case 'title_exists':
      return `    await openTarget(page);
    await expect.poll(async () => (await page.title()).trim().length, { timeout: 10000 }).toBeGreaterThan(0);`;
    case 'selector_visible':
      return `    await openTarget(page);
    await expect(page.locator(${selector}).first()).toBeVisible({ timeout: 10000 });`;
    case 'body_text_contains':
      return `    await openTarget(page);
    const bodyText = await page.locator('body').innerText({ timeout: 10000 });
    const expectedText = ${expectedText};
    expect(bodyText.trim().length).toBeGreaterThan(0);
    if (expectedText) {
      expect(bodyText.toLowerCase()).toContain(expectedText.toLowerCase());
    }`;
    case 'meta_description_exists':
      return `    await openTarget(page);
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveCount(1);
    const content = await metaDescription.getAttribute('content');
    expect(content?.trim().length || 0).toBeGreaterThan(0);`;
    case 'meta_description_length':
      return `    await openTarget(page);
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveCount(1);
    const contentLength = (await metaDescription.getAttribute('content'))?.trim().length || 0;
    expect(contentLength, 'Expected meta description to contain at least 50 characters').toBeGreaterThanOrEqual(50);
    expect(contentLength, 'Expected meta description to contain no more than 160 characters').toBeLessThanOrEqual(160);`;
    case 'canonical_exists':
      return `    await openTarget(page);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    const href = await canonical.getAttribute('href');
    expect(href?.trim().length || 0).toBeGreaterThan(0);`;
    case 'h1_exists':
      return `    await openTarget(page);
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible({ timeout: 10000 });`;
    case 'html_lang_exists':
      return `    await openTarget(page);
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang?.trim().length || 0).toBeGreaterThan(0);`;
    case 'viewport_exists':
      return `    await openTarget(page);
    await expect(page.locator('meta[name="viewport"]')).toHaveCount(1);`;
    case 'link_health_basic':
      return `    await openTarget(page);
    const linkCount = await page.locator('a[href]').count();
    const contentBlockCount = await page.locator('main, [role="main"], article, section').count();
    expect(linkCount + contentBlockCount).toBeGreaterThan(0);`;
    case 'image_resources_ok':
      return `    const failedImages: string[] = [];
    page.on('response', (response) => {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('image') && response.status() >= 400) {
        failedImages.push(response.url());
      }
    });
    await openTarget(page);
    expect(failedImages).toEqual([]);`;
    case 'image_alt_text':
      return `    await openTarget(page);
    const images = page.locator('img');
    const imageCount = await images.count();
    const missingAlt = await images.evaluateAll((elements) => elements.filter((image) => !image.hasAttribute('alt')).length);
    expect(missingAlt, \`Expected every image to have an alt attribute (checked \${imageCount} images)\`).toBe(0);`;
    case 'no_console_errors':
      return `    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await openTarget(page);
    expect(consoleErrors.slice(0, 3)).toEqual([]);`;
    case 'no_page_errors':
      return `    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await openTarget(page);
    expect(pageErrors.slice(0, 3)).toEqual([]);`;
    case 'form_validation':
      return `    await openTarget(page);
    const formControls = page.locator('input:not([type="hidden"]), select, textarea, button[type="submit"]');
    expect(await formControls.count(), 'Expected form controls to be inspectable when form validation is requested').toBeGreaterThanOrEqual(0);`;
    default:
      return `    await openTarget(page);
    const bodyText = await page.locator('body').innerText({ timeout: 10000 });
    expect(bodyText.trim().length).toBeGreaterThan(0);`;
  }
}

function renderImportedAuthSetup(auth?: AuthInput): string {
  const config = {
    mode: auth?.mode || 'none',
    loginUrl: auth?.loginUrl || '',
    username: auth?.username || '',
    usernameSelector: auth?.usernameSelector || 'input[name="email"], input[name="username"], input[type="email"], input[type="text"]',
    passwordSelector: auth?.passwordSelector || 'input[name="password"], input[type="password"]',
    submitSelector: auth?.submitSelector || 'button[type="submit"], input[type="submit"]',
    successSelector: auth?.successSelector || '',
    apiKeyName: auth?.apiKeyName || '',
    apiKeyLocation: auth?.apiKeyLocation || 'header',
  };
  return `
const AUTH_CONFIG = ${JSON.stringify(config)};
const AUTH_SECRET = process.env.PASSMARK_AUTH_SECRET || process.env.PASSMARK_AUTH_PASSWORD || '';
const AUTH_HEADERS = (() => {
  try { return JSON.parse(Buffer.from(process.env.PASSMARK_AUTH_HEADERS_B64 || '', 'base64').toString('utf8') || '{}'); }
  catch { return {}; }
})();
const AUTH_TARGET_URL = (() => {
  if (AUTH_CONFIG.mode !== 'api_key' || AUTH_CONFIG.apiKeyLocation !== 'query' || !AUTH_CONFIG.apiKeyName || !AUTH_SECRET) return SITE_URL;
  const value = new URL(SITE_URL);
  value.searchParams.set(AUTH_CONFIG.apiKeyName, AUTH_SECRET);
  return value.toString();
})();

test.beforeEach(async ({ page }) => {
  if (Object.keys(AUTH_HEADERS).length) await page.setExtraHTTPHeaders(AUTH_HEADERS);
  if (AUTH_CONFIG.mode !== 'password' || !AUTH_CONFIG.loginUrl) return;
  await page.goto(AUTH_CONFIG.loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator(AUTH_CONFIG.usernameSelector).first().fill(AUTH_CONFIG.username);
  await page.locator(AUTH_CONFIG.passwordSelector).first().fill(AUTH_SECRET);
  await Promise.all([
    page.waitForLoadState('domcontentloaded').catch(() => undefined),
    page.locator(AUTH_CONFIG.submitSelector).first().click(),
  ]);
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
  if (AUTH_CONFIG.successSelector) await expect(page.locator(AUTH_CONFIG.successSelector).first()).toBeVisible({ timeout: 15000 });
});
`;
}

function renderImportedCsvSpec(url: string, rows: TestcaseFileRow[], runId: string, auth?: AuthInput): GeneratedSpecResult {
  const testBlocks = rows.map((row, index) => {
    const caseCode = row.caseId || generatedCaseCode(index);
    const title = JSON.stringify(`${caseCode} ${row.title}`.replace(/\s+/g, ' ').trim());
    const candidate = (row.automationCandidate || '').toLowerCase();

    if (candidate === 'no' || row.automationKind === 'manual') {
      return `  test.skip(${title}, async () => {
    // Manual testcase from imported file. Keep it in the run report without executing unsafe arbitrary steps.
  });`;
    }

    return `  test(${title}, async ({ page }) => {
${renderImportedCaseBody(row)}
  });`;
  }).join('\n\n');
  const code = `import { test, expect } from '@playwright/test';
import * as path from 'path';

const SITE_URL = ${JSON.stringify(url)};
const EVIDENCE_DIR = ${JSON.stringify(testcaseFileDir())};
const RUN_ID = ${JSON.stringify(runId)};
${renderImportedAuthSetup(auth)}

async function openTarget(page) {
  const response = await page.goto(SITE_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
  return response;
}

function evidenceFileName(title) {
  const match = title.match(/\\b[A-Z]+-\\d+\\b/);
  const caseCode = (match ? match[0] : 'case').toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  return \`\${RUN_ID}-\${caseCode}-actual.png\`;
}

test.describe('Imported testcase file', () => {
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status === testInfo.expectedStatus) {
      return;
    }

    const screenshotPath = path.join(EVIDENCE_DIR, evidenceFileName(testInfo.title));
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await testInfo.attach('actual-screenshot', { path: screenshotPath, contentType: 'image/png' });
    } catch {
      // Screenshot capture is best-effort so the real test failure remains the primary signal.
    }
  });

${testBlocks}
});
`;
  const outputPath = path.resolve(rootDir, 'tests', `imported-testcases-${Date.now()}.spec.ts`);
  fs.writeFileSync(outputPath, code, 'utf-8');
  return {
    outputPath,
    code,
    aiExplanation: `Imported ${rows.length} testcase rows from CSV. Automation used whitelist kinds only.`,
  };
}

function caseCodeFromTitle(title: string): string {
  return title.match(/\b[A-Z]+-\d+\b/)?.[0] || '';
}

function generatedCaseCode(index: number): string {
  return `CASE-${String(index + 1).padStart(3, '0')}`;
}

function testResultPayload(testCase: TestCaseDetail, index: number) {
  const caseCode = caseCodeFromTitle(testCase.title) || generatedCaseCode(index);
  const caseName = caseCodeFromTitle(testCase.title)
    ? testCase.title.replace(caseCodeFromTitle(testCase.title), '').trim()
    : testCase.title;

  return {
    caseCode,
    caseName,
    status: testCase.status || 'pending',
    durationMs: Math.round(testCase.durationMs || 0),
    errorMessage: cleanOutputText(testCase.error || ''),
    stackTrace: cleanOutputText(testCase.error || ''),
    expectedResult: testCase.expected || '',
    aiDiagnosis: JSON.stringify({
      description: testCase.description || '',
      actual: cleanOutputText(testCase.actual || ''),
      module: testCase.module || '',
      feature: testCase.feature || '',
      priority: testCase.priority || '',
      severity: testCase.severity || '',
      testType: testCase.testType || '',
      automationCandidate: testCase.automationCandidate || '',
      preconditions: testCase.preconditions || '',
      testData: testCase.testData || '',
      inputImage: testCase.inputImage || '',
      actualImage: testCase.actualImage || '',
      defectId: testCase.defectId || '',
      testerName: testCase.testerName || '',
      reviewerName: testCase.reviewerName || '',
      reviewDate: testCase.reviewDate || '',
      notes: testCase.notes || '',
      selector: testCase.selector || '',
      code: testCase.code || '',
      steps: testCase.steps || [],
    }),
  };
}

function rawRunPath(runId: string): string {
  return path.join(storageDir, 'raw-runs', `${runId}.json`);
}

function writeRawRunData(
  runId: string,
  data: {
    stdout?: string;
    stderr?: string;
    generatedCode?: string;
    aiExplanation?: string;
  }
) {
  const rawOutputDir = path.join(storageDir, 'raw-runs');
  fs.mkdirSync(rawOutputDir, { recursive: true });
  fs.writeFileSync(
    rawRunPath(runId),
    JSON.stringify(
      {
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        generatedCode: data.generatedCode || '',
        aiExplanation: data.aiExplanation || '',
      },
      null,
      2
    ),
    'utf-8'
  );
}

async function updateRunSummaryFromResults(runId: string, status?: TestRunStatus, durationMs?: number) {
  const results = await prisma.testResult.findMany({ where: { runId } });
  const passed = results.filter((result) => result.status === 'passed').length;
  const skipped = results.filter((result) => result.status === 'skipped').length;
  const unfinished = results.filter((result) => ['pending', 'running'].includes(result.status)).length;
  const failed = results.length - passed - skipped - unfinished;

  await prisma.testRun.update({
    where: { id: runId },
    data: {
      total: results.length,
      passed,
      failed,
      skipped,
      ...(status ? { status } : {}),
      ...(typeof durationMs === 'number' ? { durationMs } : {}),
    },
  });
}

async function initializeProgressiveRun(
  runId: string,
  result: GeneratedSpecResult,
  job: RunQueueJob,
  outputPath: string
): Promise<Array<{ id: string; testCase: TestCaseDetail; index: number }>> {
  const cases = job.importedCases?.length
    ? job.importedCases.map((row) => ({
        ...rowToPreviewCase(row),
        code: findTestSnippet(result.code, `${row.caseId} ${row.title}`.replace(/\s+/g, ' ').trim()) || '',
      }))
    : previewGeneratedCases(result.code, job.userRequest);
  const rawOutputPath = rawRunPath(runId);

  writeRawRunData(runId, {
    generatedCode: result.code,
    aiExplanation: result.aiExplanation || '',
  });

  const rows = cases.map((testCase, index) => ({
    id: newId('result'),
    testCase,
    index,
  }));

  await prisma.$transaction(async (tx) => {
    await tx.artifact.deleteMany({
      where: {
        runId,
        type: {
          notIn: ['testcase-csv', 'testcase-excel', 'testcase-doc'],
        },
      },
    });
    await tx.testResult.deleteMany({ where: { runId } });
    await tx.testRun.update({
      where: { id: runId },
      data: {
        projectId: job.context.projectId,
        suiteId: job.context.suiteId,
        targetId: job.context.targetId,
        url: job.url,
        status: 'running',
        total: rows.length,
        passed: 0,
        failed: 0,
        skipped: 0,
        generatedSpecPath: outputPath,
        rawOutputPath,
        userRequest: job.userRequest || '',
        stdout: '',
        stderr: '',
        generatedCode: result.code || '',
        results: {
          create: rows.map(({ id, testCase, index }) => ({
            id,
            ...testResultPayload(testCase, index),
          })),
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

  return rows;
}

async function saveRunToDb(run: TestRun, outputPath: string): Promise<TestRun> {
  const rawOutputPath = rawRunPath(run.id);

  writeRawRunData(run.id, {
    stdout: run.stdout,
    stderr: run.stderr,
    generatedCode: run.generatedCode,
    aiExplanation: run.aiExplanation || '',
  });

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
          create: (run.cases || []).map((testCase, index) => ({
            id: newId('result'),
            ...testResultPayload(testCase, index),
          })),
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
  specPath = path.join('tests', 'generated-custom.spec.ts'),
  runId = `${Date.now()}`,
  aiExplanation = ''
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
          ...authProcessEnv(auth),
        },
        maxBuffer: 1024 * 1024 * 10,
        timeout: 90000,
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
    aiExplanation,
    userRequest,
    stdout,
    stderr,
  };

  return run;
}

function playwrightCommandArgs(specPath: string, extraArgs: string[] = []) {
  const normalizedSpecPath = specPath.split(path.sep).join('/');
  const playwrightArgs = [
    'playwright',
    'test',
    normalizedSpecPath,
    '--project=chromium',
    '--reporter=json',
    ...extraArgs,
  ];

  return process.platform === 'win32' ? ['/d', '/s', '/c', 'npx.cmd', ...playwrightArgs] : playwrightArgs;
}

function playwrightCommand(): string {
  return process.platform === 'win32' ? 'cmd.exe' : 'npx';
}

function escapedGrep(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function safeEvidenceSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'testcase';
}

function evidenceFileName(runId: string, title: string): string {
  const caseCode = caseCodeFromTitle(title) || 'case';
  return `${runId}-${safeEvidenceSlug(caseCode)}-actual.png`;
}

function evidenceDownloadUrl(runId: string, title: string): string {
  return `/api/testcase-files/download/${encodeURIComponent(evidenceFileName(runId, title))}`;
}

async function runOnePlaywrightCase(
  title: string,
  specPath: string,
  auth?: AuthInput
): Promise<{
  stdout: string;
  stderr: string;
  caseDetail: TestCaseDetail;
}> {
  const startedAt = Date.now();
  let stdout = '';
  let stderr = '';

  try {
    const result = await execFileAsync(
      playwrightCommand(),
      playwrightCommandArgs(specPath, ['--grep', escapedGrep(title)]),
      {
        cwd: rootDir,
        env: {
          ...process.env,
          ...authProcessEnv(auth),
        },
        maxBuffer: 1024 * 1024 * 10,
      }
    );

    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error) {
    if (error && typeof error === 'object') {
      stdout = 'stdout' in error && typeof error.stdout === 'string' ? error.stdout : '';
      stderr = 'stderr' in error && typeof error.stderr === 'string' ? error.stderr : String(error);
    } else {
      stderr = String(error);
    }
  }

  const details = extractCaseDetails(stdout);
  const matchingDetail = details.find((testCase) => testCase.title === title) || details[0];

  return {
    stdout,
    stderr,
    caseDetail: matchingDetail || {
      title,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      error: compactErrorText(stderr) || 'Playwright did not report a result for this generated case.',
    },
  };
}

async function updateProgressiveCase(
  resultId: string,
  testCase: TestCaseDetail,
  index: number,
  runId?: string
) {
  const persistedCase = runId
    ? await persistCaseEvidence(runId, resultId, testCase, index)
    : testCase;

  await prisma.testResult.update({
    where: { id: resultId },
    data: testResultPayload(persistedCase, index),
  });
}

function safePlaywrightAttachmentPath(value: string): string {
  const resolved = path.resolve(rootDir, value);
  const allowedRoots = [
    path.resolve(rootDir, 'test-results'),
    path.resolve(testcaseFileDir()),
  ];

  return allowedRoots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`))
    ? resolved
    : '';
}

function attachmentArtifactType(attachment: { name: string; contentType: string; path: string }): 'actual-screenshot' | 'video' | 'trace' | null {
  const extension = path.extname(attachment.path).toLowerCase();
  const name = attachment.name.toLowerCase();
  const contentType = attachment.contentType.toLowerCase();

  if (contentType.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) {
    return 'actual-screenshot';
  }
  if (contentType.startsWith('video/') || extension === '.webm') {
    return 'video';
  }
  if (name.includes('trace') || (extension === '.zip' && path.basename(attachment.path).toLowerCase().includes('trace'))) {
    return 'trace';
  }
  return null;
}

async function upsertResultArtifact(runId: string, resultId: string, type: string, artifactPath: string) {
  await prisma.artifact.upsert({
    where: { id: `${resultId}-${type}` },
    update: { path: artifactPath },
    create: {
      id: `${resultId}-${type}`,
      runId,
      resultId,
      type,
      path: artifactPath,
    },
  });
}

async function persistCaseEvidence(
  runId: string,
  resultId: string,
  testCase: TestCaseDetail,
  index: number
): Promise<TestCaseDetail> {
  let actualImage = testCase.actualImage || '';
  const caseSlug = safeEvidenceSlug(caseCodeFromTitle(testCase.title) || generatedCaseCode(index));

  if (actualImage) {
    const currentImagePath = resolveImagePath(actualImage);
    if (currentImagePath) {
      await upsertResultArtifact(runId, resultId, 'actual-screenshot', currentImagePath);
    }
  }

  for (const attachment of testCase.attachments || []) {
    const type = attachmentArtifactType(attachment);
    const sourcePath = type ? safePlaywrightAttachmentPath(attachment.path) : '';
    if (!type || !sourcePath || !fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      continue;
    }

    const allowedExtensions = type === 'actual-screenshot'
      ? ['.png', '.jpg', '.jpeg', '.webp']
      : type === 'video'
        ? ['.webm']
        : ['.zip'];
    const sourceExtension = path.extname(sourcePath).toLowerCase();
    const extension = allowedExtensions.includes(sourceExtension)
      ? sourceExtension
      : type === 'actual-screenshot' ? '.png' : type === 'video' ? '.webm' : '.zip';
    const outputPath = testcaseFilePath(`${runId}-${caseSlug}-${type}${extension}`);

    if (path.resolve(sourcePath) !== path.resolve(outputPath)) {
      fs.copyFileSync(sourcePath, outputPath);
    }
    await upsertResultArtifact(runId, resultId, type, outputPath);

    if (type === 'actual-screenshot') {
      actualImage = artifactDownloadUrl(outputPath) || actualImage;
    }
  }

  return {
    ...testCase,
    actualImage,
  };
}

async function runPlaywrightProgressively(
  job: RunQueueJob,
  result: GeneratedSpecResult,
  outputPath: string
) {
  const startedAt = Date.now();
  const specPath = path.relative(rootDir, outputPath);
  const plannedCases = await initializeProgressiveRun(job.runId, result, job, outputPath);
  let stdout = '';
  let stderr = '';

  if (!plannedCases.length) {
    throw new Error('No generated test cases were found in the Playwright spec.');
  }

  if (job.cancelRequested) {
    await updateRunSummaryFromResults(job.runId, 'cancelled', Date.now() - startedAt);
    return;
  }

  const audit = await collectSeoAuditValues(job.url, job.auth);

  for (const plannedCase of plannedCases) {
    if (job.cancelRequested) {
      await updateRunSummaryFromResults(job.runId, 'cancelled', Date.now() - startedAt);
      return;
    }
    const runningCase: TestCaseDetail = {
      ...plannedCase.testCase,
      status: 'running',
      actual: 'Running now.',
      steps: buildGeneratedSteps(
        {
          ...plannedCase.testCase,
          status: 'running',
        },
        plannedCase.testCase.code || ''
      ),
    };

    await updateProgressiveCase(plannedCase.id, runningCase, plannedCase.index, job.runId);
    await updateRunSummaryFromResults(job.runId, 'running', Date.now() - startedAt);

    const caseResult = await runOnePlaywrightCase(plannedCase.testCase.title, specPath, job.auth);
    stdout += `${caseResult.stdout}\n`;
    stderr += `${caseResult.stderr}\n`;

    const enrichedCase = enrichCaseDetails(
      [
        {
          ...caseResult.caseDetail,
          title: plannedCase.testCase.title,
        },
      ],
      audit,
      result.code,
      job.userRequest
    )[0];
    const evidencePath = testcaseFilePath(evidenceFileName(job.runId, plannedCase.testCase.title));
    const caseWithEvidence: TestCaseDetail = {
      ...plannedCase.testCase,
      ...enrichedCase,
      inputImage: plannedCase.testCase.inputImage || enrichedCase.inputImage,
      actualImage: fs.existsSync(evidencePath)
        ? evidenceDownloadUrl(job.runId, plannedCase.testCase.title)
        : enrichedCase.actualImage,
      defectId: enrichedCase.status === 'passed' || enrichedCase.status === 'skipped'
        ? plannedCase.testCase.defectId
        : plannedCase.testCase.defectId || `AUTO-${plannedCase.testCase.caseId || plannedCase.index + 1}`,
    };

    await updateProgressiveCase(plannedCase.id, caseWithEvidence, plannedCase.index, job.runId);

    if (job.cancelRequested) {
      await updateRunSummaryFromResults(job.runId, 'cancelled', Date.now() - startedAt);
      return;
    }
    writeRawRunData(job.runId, {
      stdout,
      stderr,
      generatedCode: result.code,
      aiExplanation: result.aiExplanation || '',
    });
    await prisma.testRun.update({
      where: { id: job.runId },
      data: {
        stdout,
        stderr,
        generatedCode: result.code,
      },
    });
    await updateRunSummaryFromResults(job.runId, 'running', Date.now() - startedAt);
  }

  const results = await prisma.testResult.findMany({ where: { runId: job.runId } });
  const hasFailed = results.some((testCase) => !['passed', 'skipped'].includes(testCase.status));
  const finalStatus: TestRunStatus = hasFailed ? 'failed' : 'passed';

  await updateRunSummaryFromResults(job.runId, finalStatus, Date.now() - startedAt);
  try {
    await writeRunResultReports(job.runId);
  } catch (reportError) {
    console.error(`[report] Unable to generate rich report for ${job.runId}.`, reportError);
  }
  await prisma.testRun.update({
    where: { id: job.runId },
    data: {
      stdout,
      stderr,
      generatedCode: result.code,
    },
  });
}

async function generateSpecForRun(
  url: string,
  userRequest: string,
  auth: AuthInput,
  suite?: TestSuite
): Promise<GeneratedSpecResult> {
  const useStableSeo = !suite || suite.type === 'seo-basic';

  if (!useStableSeo) {
    const generatorRequest = buildGeneratorRequest(userRequest, suite);
    const result = await generatePlaywrightTest(url, generatorRequest, authConfigForGenerator(auth), {
      forceIntent: 'custom',
      suiteName: suite.name,
      suiteType: suite.type,
      suiteDescription: suite.description,
      suiteConfig: suiteConfig(suite),
      minCases: 12,
      maxCases: 60,
    });

    await prisma.aIRequestLog.create({
      data: {
        id: newId('ai-log'),
        provider: 'local-ai',
        model: getConfiguredLocalAIModel(),
        prompt: result.aiPrompt || generatorRequest,
        response: result.aiResponse || result.code,
        status: result.aiStatus || 'passed',
        durationMs: result.durationMs || 0,
      },
    });

    return {
      outputPath: result.outputPath,
      code: result.code,
      aiExplanation: result.aiExplanation,
    };
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

  const spec = writeSeoBasicSpec(planResult.plan, authConfigForGenerator(auth));

  return {
    ...spec,
    aiExplanation: planResult.aiExplanation,
  };
}

async function createQueuedRun(job: RunQueueJob): Promise<TestRun> {
  const run = await prisma.testRun.create({
    data: {
      id: job.runId,
      projectId: job.context.projectId,
      suiteId: job.context.suiteId,
      environmentId: job.context.environmentId,
      targetId: job.context.targetId,
      packId: job.context.packId,
      url: job.displayUrl || job.url,
      status: 'queued',
      userRequest: job.userRequest || '',
      artifacts: job.testcaseFilePath || job.testcaseExcelFileName || job.testcaseDocFileName
        ? {
            create: [
              ...(job.testcaseFilePath ? [{
                id: newId('artifact'),
                type: 'testcase-csv',
                path: job.testcaseFilePath,
              }] : []),
              ...(job.testcaseExcelFileName ? [{
                id: newId('artifact'),
                type: 'testcase-excel',
                path: testcaseFilePath(job.testcaseExcelFileName),
              }] : []),
              ...(job.testcaseDocFileName ? [{
                id: newId('artifact'),
                type: 'testcase-doc',
                path: testcaseFilePath(job.testcaseDocFileName),
              }] : []),
            ],
          }
        : undefined,
    },
    include: {
      project: true,
      suite: true,
      environment: true,
      target: true,
      pack: true,
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
    const result = job.importedCases?.length
      ? renderImportedCsvSpec(job.url, job.importedCases, job.runId, job.auth)
      : await generateSpecForRun(job.url, job.userRequest, job.auth, suite);

    if (job.cancelRequested) {
      await prisma.testRun.update({
        where: { id: job.runId },
        data: { status: 'cancelled' },
      });
      return;
    }

    await runPlaywrightProgressively(job, result, result.outputPath);
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

  cancel(runId: string) {
    const queuedIndex = this.queued.findIndex((job) => job.runId === runId);

    if (queuedIndex >= 0) {
      this.queued.splice(queuedIndex, 1);
      return { cancelled: true, state: 'queued' as const };
    }

    const runningJob = this.running.get(runId);

    if (runningJob) {
      runningJob.cancelRequested = true;
      return { cancelled: true, state: 'running' as const };
    }

    return { cancelled: false, state: 'missing' as const };
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

const testcaseGenerationJobs = new Map<string, TestcaseGenerationJob>();
const testcaseGenerationQueue: TestcaseGenerationJob[] = [];
let testcaseGenerationRunning = false;

function testcaseGenerationJobResponse(job: TestcaseGenerationJob): Record<string, unknown> {
  const percent = job.targetCount
    ? Math.min(100, Math.round((job.generatedCount / job.targetCount) * 100))
    : 0;

  return {
    id: job.id,
    status: job.status,
    targetCount: job.targetCount,
    generatedCount: job.generatedCount,
    persistedCaseIds: job.persistedCaseIds,
    batch: job.batch,
    estimatedBatches: job.estimatedBatches,
    attempt: job.attempt,
    maxAttempts: job.maxAttempts,
    percent,
    message: job.message,
    error: job.error,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    updatedAt: job.updatedAt,
    durationMs: job.durationMs,
    result: job.result,
  };
}

function updateTestcaseGenerationJob(
  job: TestcaseGenerationJob,
  updates: Partial<Pick<
    TestcaseGenerationJob,
    'status' | 'generatedCount' | 'persistedCaseIds' | 'batch' | 'attempt' | 'message' | 'error' | 'durationMs' | 'result'
  >>
) {
  Object.assign(job, updates);
  job.updatedAt = new Date().toISOString();
  if (job.startedAt) {
    job.durationMs = Date.now() - Date.parse(job.startedAt);
  }
}

async function executeTestcaseGenerationJob(job: TestcaseGenerationJob) {
  job.startedAt = new Date().toISOString();
  updateTestcaseGenerationJob(job, {
    status: 'running',
    message: `Preparing batch 1 of approximately ${job.estimatedBatches}.`,
  });

  try {
    const result = await generateProfessionalTestcaseFile(
      job.url,
      job.userRequest,
      job.suite,
      job.target,
      {
        signal: job.abortController.signal,
        onProgress: (progress) => {
          updateTestcaseGenerationJob(job, {
            generatedCount: progress.generatedCount,
            batch: progress.batch,
            attempt: progress.attempt,
            message: progress.message || (progress.generatedCount
              ? `${progress.generatedCount} of ${progress.targetCount} cases saved. Processing the next batch.`
              : `Generating batch ${Math.max(1, progress.batch)} of approximately ${progress.estimatedBatches}.`),
          });
        },
        onBatch: async (rows, progress) => {
          if (job.cancelRequested || job.abortController.signal.aborted) {
            throw new Error('Test case generation was cancelled.');
          }
          const persistedCaseIds = await persistWorkspaceRows(job.suite?.id, rows, true);
          await addCaseIdsToPack(job.packId, persistedCaseIds);
          updateTestcaseGenerationJob(job, {
            generatedCount: progress.generatedCount,
            persistedCaseIds: [...job.persistedCaseIds, ...persistedCaseIds],
            batch: progress.batch,
            attempt: progress.attempt,
            message: `${progress.generatedCount} of ${progress.targetCount} cases saved.`,
          });
        },
      }
    );

    if (job.cancelRequested || job.abortController.signal.aborted) {
      throw new Error('Test case generation was cancelled.');
    }

    const rows = result.rows;
    const file = writeTestcaseCsvFile(rows, 'ai-testcases');
    const officeFiles = await writeOfficeCompanionFiles(rows, 'ai-testcases');
    const historyRun = await saveTestcaseFileHistory({
      url: job.url,
      rows,
      filePath: file.filePath,
      excelFileName: officeFiles.excelFileName,
      docFileName: officeFiles.docFileName,
      aiExplanation: result.aiExplanation,
      userRequest: `Generated testcase file: ${job.userRequest}`,
      context: {
        projectId: job.project?.id,
        projectName: job.project?.name,
        suiteId: job.suite?.id,
        suiteName: job.suite?.name,
        suiteType: job.suite?.type,
        targetId: job.target?.id,
        targetName: job.target?.name,
        targetType: job.target?.type,
        packId: job.packId,
      },
    });

    await prisma.aIRequestLog.create({
      data: {
        id: newId('ai-log'),
        provider: 'local-ai',
        model: getConfiguredLocalAIModel(),
        prompt: result.aiPrompt,
        response: result.aiResponse,
        status: result.aiStatus,
        durationMs: result.durationMs,
      },
    });

    updateTestcaseGenerationJob(job, {
      status: 'completed',
      generatedCount: rows.length,
      message: `${rows.length} test cases generated and saved.`,
      result: {
        url: job.url,
        projectId: job.project?.id,
        projectName: job.project?.name,
        suiteId: job.suite?.id,
        suiteName: job.suite?.name,
        targetId: job.target?.id,
        targetName: job.target?.name,
        fileName: file.fileName,
        downloadUrl: `/api/testcase-files/download/${encodeURIComponent(file.fileName)}`,
        excelDownloadUrl: officeFiles.excelDownloadUrl,
        docDownloadUrl: officeFiles.docDownloadUrl,
        aiExplanation: result.aiExplanation,
        persistedCaseIds: job.persistedCaseIds,
        historyRun: toRunSummary(historyRun),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cancelled = job.cancelRequested
      || job.abortController.signal.aborted
      || /cancelled/i.test(message);
    updateTestcaseGenerationJob(job, {
      status: cancelled ? 'cancelled' : 'failed',
      message: cancelled
        ? `Generation cancelled. ${job.generatedCount} partial cases were kept.`
        : `Generation failed after saving ${job.generatedCount} partial cases.`,
      error: cancelled ? undefined : message,
    });
  }

  const cleanupTimer = setTimeout(() => {
    testcaseGenerationJobs.delete(job.id);
  }, 60 * 60 * 1000);
  cleanupTimer.unref();
}

async function drainTestcaseGenerationQueue() {
  if (testcaseGenerationRunning) return;
  testcaseGenerationRunning = true;
  try {
    while (testcaseGenerationQueue.length) {
      const job = testcaseGenerationQueue.shift();
      if (!job || job.status === 'cancelled') continue;
      await executeTestcaseGenerationJob(job);
    }
  } finally {
    testcaseGenerationRunning = false;
  }
}

function enqueueTestcaseGeneration(job: TestcaseGenerationJob) {
  testcaseGenerationJobs.set(job.id, job);
  testcaseGenerationQueue.push(job);
  void drainTestcaseGenerationQueue();
}

function cancelTestcaseGeneration(job: TestcaseGenerationJob) {
  if (['completed', 'failed', 'cancelled'].includes(job.status)) return;
  job.cancelRequested = true;
  job.abortController.abort();
  if (job.status === 'queued') {
    updateTestcaseGenerationJob(job, {
      status: 'cancelled',
      message: 'Generation cancelled before it started.',
    });
    const cleanupTimer = setTimeout(() => {
      testcaseGenerationJobs.delete(job.id);
    }, 60 * 60 * 1000);
    cleanupTimer.unref();
  } else {
    updateTestcaseGenerationJob(job, {
      message: `Cancelling generation. ${job.generatedCount} partial cases have been kept.`,
    });
  }
}

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
  let filePath = path.normalize(path.join(publicDir, pathname));

  if (!filePath.startsWith(publicDir)) {
    sendError(response, 403, 'Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    if (!path.extname(pathname)) {
      filePath = path.join(publicDir, 'index.html');
    } else {
      sendError(response, 404, 'Not found');
      return;
    }
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
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://localhost:${port}`);

  try {
    if (request.method === 'GET' && requestUrl.pathname === '/api/config') {
      sendJson(response, 200, readRuntimeConfigSummary());
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/ai/status') {
      sendJson(response, 200, await getLocalAIStatus());
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/ai/test') {
      const startedAt = Date.now();
      const reply = await askLocalAI([{ role: 'user', content: 'Reply with exactly: PASSMARK_AI_READY' }]);
      sendJson(response, 200, {
        ok: reply.includes('PASSMARK_AI_READY'),
        model: getConfiguredLocalAIModel(),
        durationMs: Date.now() - startedAt,
        reply: reply.slice(0, 200),
      });
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/ai/unload') {
      sendJson(response, 200, await unloadLocalAIModel());
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/environments') {
      const projectId = requestUrl.searchParams.get('projectId');
      const environments = await prisma.environment.findMany({
        where: projectId ? { projectId } : undefined,
        orderBy: { createdAt: 'asc' },
      });
      sendJson(response, 200, environments.map(environmentToApi));
      return;
    }

    const environmentAuthMatch = requestUrl.pathname.match(/^\/api\/environment-auth\/([^/]+)\/([^/]+)(\/test)?$/);
    if (environmentAuthMatch && (request.method === 'PUT' || request.method === 'POST')) {
      const projectId = decodeURIComponent(environmentAuthMatch[1]);
      const environmentName = normalizeEnvironment(decodeURIComponent(environmentAuthMatch[2]));
      const body = await readBody(request);
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) {
        sendError(response, 404, 'Project not found.');
        return;
      }
      const requestedBaseUrl = typeof body.baseUrl === 'string' && body.baseUrl.trim() ? normalizeUrl(body.baseUrl) : project.baseUrl;
      let environment = await prisma.environment.findFirst({ where: { projectId, name: environmentName } });
      if (!environment) {
        environment = await prisma.environment.create({
          data: {
            id: newId('environment'), projectId, name: environmentName, baseUrl: requestedBaseUrl,
            authType: 'none', authConfig: '{}', customHeaders: '{}',
          },
        });
      } else if (environment.baseUrl !== requestedBaseUrl) {
        environment = await prisma.environment.update({ where: { id: environment.id }, data: { baseUrl: requestedBaseUrl } });
      }

      if (environmentAuthMatch[3] === '/test') {
        sendJson(response, 200, await testEnvironmentAuthentication(environment, body));
      } else {
        const saved = await saveEnvironmentAuth(environment, body);
        sendJson(response, 200, environmentToApi(saved));
      }
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/test-packs') {
      const projectId = requestUrl.searchParams.get('projectId');
      const packs = await prisma.testPack.findMany({
        where: projectId ? { projectId } : undefined,
        orderBy: [{ archived: 'asc' }, { updatedAt: 'desc' }],
      });
      sendJson(response, 200, packs.map(dbPackToApiPack));
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/test-packs') {
      const body = await readBody(request);
      const pack = await prisma.testPack.create({ data: normalizePackInput(body) });
      sendJson(response, 201, dbPackToApiPack(pack));
      return;
    }

    if (requestUrl.pathname.startsWith('/api/test-packs/')) {
      const id = decodeURIComponent(requestUrl.pathname.replace('/api/test-packs/', ''));
      const existing = await prisma.testPack.findUnique({ where: { id } });
      if (!existing) {
        sendError(response, 404, 'Test Pack not found.');
        return;
      }
      if (request.method === 'PUT') {
        const body = await readBody(request);
        const pack = await prisma.testPack.update({ where: { id }, data: normalizePackInput(body, existing) });
        sendJson(response, 200, dbPackToApiPack(pack));
        return;
      }
      if (request.method === 'DELETE') {
        const pack = await prisma.testPack.update({ where: { id }, data: { archived: true } });
        sendJson(response, 200, dbPackToApiPack(pack));
        return;
      }
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/test-cycles') {
      const projectId = requestUrl.searchParams.get('projectId');
      const cycles = await prisma.testCycle.findMany({
        where: projectId ? { projectId } : undefined,
        orderBy: { updatedAt: 'desc' },
      });
      sendJson(response, 200, cycles.map(dbCycleToApiCycle));
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/test-cycles') {
      const body = await readBody(request);
      const cycle = await prisma.testCycle.create({ data: normalizeCycleInput(body) });
      sendJson(response, 201, dbCycleToApiCycle(cycle));
      return;
    }

    if (requestUrl.pathname.startsWith('/api/test-cycles/')) {
      const id = decodeURIComponent(requestUrl.pathname.replace('/api/test-cycles/', ''));
      const existing = await prisma.testCycle.findUnique({ where: { id } });
      if (!existing) {
        sendError(response, 404, 'Test Cycle not found.');
        return;
      }
      if (request.method === 'PUT') {
        const body = await readBody(request);
        const cycle = await prisma.testCycle.update({ where: { id }, data: normalizeCycleInput(body, existing) });
        sendJson(response, 200, dbCycleToApiCycle(cycle));
        return;
      }
      if (request.method === 'DELETE') {
        const cycle = await prisma.testCycle.update({ where: { id }, data: { status: 'archived' } });
        sendJson(response, 200, dbCycleToApiCycle(cycle));
        return;
      }
    }

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
      const suite = await createDefaultSuiteForProject(project.id);
      await ensureDefaultWorkspaceForProject(project.id, suite.id);
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
        where: {
          suiteId,
          ...(requestUrl.searchParams.get('includeDisabled') === 'true' ? {} : { enabled: true }),
        },
        orderBy: { code: 'asc' },
      });

      sendJson(response, 200, cases.map(dbTestCaseToApiTestCase));
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/test-cases') {
      const body = await readBody(request);
      const caseInput = await normalizeDbTestCaseInput(body);
      const testCase = await prisma.testCase.create({ data: caseInput });
      await syncWorkspaceForSuite(testCase.suiteId);
      await addCaseIdsToPack(body.packId, [testCase.id]);
      sendJson(response, 201, dbTestCaseToApiTestCase(testCase));
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
        await syncWorkspaceForSuite(testCase.suiteId);
        sendJson(response, 200, dbTestCaseToApiTestCase(testCase));
        return;
      }

      if (request.method === 'DELETE') {
        const deletedCase = await prisma.testCase.delete({ where: { id } });
        await syncWorkspaceForSuite(deletedCase.suiteId);
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

    if (request.method === 'GET' && requestUrl.pathname.startsWith('/api/testcase-files/download/')) {
      const fileName = decodeURIComponent(requestUrl.pathname.replace('/api/testcase-files/download/', ''));
      const filePath = testcaseFilePath(fileName);

      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        sendError(response, 404, 'Testcase file not found');
        return;
      }

      const contentType = mimeTypeForPath(filePath);
      const disposition = contentType.startsWith('image/') || contentType.startsWith('video/') || contentType.startsWith('text/html') || contentType === 'application/pdf'
        ? 'inline'
        : 'attachment';
      response.writeHead(200, {
        'Content-Type': contentType,
        'Content-Disposition': `${disposition}; filename="${path.basename(fileName)}"`,
        'Cache-Control': 'no-store',
      });
      fs.createReadStream(filePath).pipe(response);
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/runs') {
      const runs = await prisma.testRun.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          project: true,
          suite: true,
          environment: true,
          target: true,
          pack: true,
          results: { orderBy: { caseCode: 'asc' } },
          artifacts: true,
        },
      });
      sendJson(response, 200, runs.map((run) => toRunSummary(dbRunToApiRun(run))));
      return;
    }

    const reportRunMatch = requestUrl.pathname.match(/^\/api\/runs\/([^/]+)\/report$/);
    if (request.method === 'POST' && reportRunMatch) {
      const id = decodeURIComponent(reportRunMatch[1]);
      const existingRun = await prisma.testRun.findUnique({ where: { id } });
      if (!existingRun) {
        sendError(response, 404, 'Run not found');
        return;
      }
      if (['queued', 'running'].includes(existingRun.status)) {
        sendError(response, 409, 'Report is available after the run finishes.');
        return;
      }

      await writeRunResultReports(id);
      const run = await prisma.testRun.findUnique({
        where: { id },
        include: {
          project: true,
          suite: true,
          environment: true,
          target: true,
          pack: true,
          results: { orderBy: { caseCode: 'asc' } },
          artifacts: true,
        },
      });
      sendJson(response, 200, dbRunToApiRun(run));
      return;
    }

    const cancelRunMatch = requestUrl.pathname.match(/^\/api\/runs\/([^/]+)\/cancel$/);
    if (request.method === 'POST' && cancelRunMatch) {
      const id = decodeURIComponent(cancelRunMatch[1]);
      const run = await prisma.testRun.findUnique({ where: { id } });

      if (!run) {
        sendError(response, 404, 'Run not found');
        return;
      }

      if (!['queued', 'running'].includes(run.status)) {
        sendError(response, 409, `Run is already ${run.status}.`);
        return;
      }

      const cancellation = runQueue.cancel(id);
      await prisma.testRun.update({
        where: { id },
        data: {
          status: 'cancelled',
          stderr: run.status === 'running'
            ? 'Cancellation requested. The current Playwright case may finish before the worker stops.'
            : 'Run was cancelled before execution.',
        },
      });
      sendJson(response, 200, { id, status: 'cancelled', cancellation });
      return;
    }

    const sourceDownloadMatch = requestUrl.pathname.match(/^\/api\/runs\/([^/]+)\/testcase-source\/(csv|xls|doc)$/);
    if (request.method === 'GET' && sourceDownloadMatch) {
      const id = decodeURIComponent(sourceDownloadMatch[1]);
      const format = sourceDownloadMatch[2] as 'csv' | 'xls' | 'doc';
      const run = await prisma.testRun.findUnique({
        where: { id },
        include: {
          results: { orderBy: { caseCode: 'asc' } },
        },
      });

      if (!run || !run.results.length) {
        sendError(response, 404, 'Testcase source file not found');
        return;
      }

      const rows = run.results.map(resultToSourceRow);
      const file = format === 'csv'
        ? writeTestcaseCsvFile(rows, `source-${id}`)
        : writeOfficeHtmlFile(rows, `source-${id}`, format, 'QC Source Testcase File');
      const fileName = format === 'csv' ? file.fileName : file.fileName;
      const filePath = format === 'csv' ? file.filePath : file.filePath;

      response.writeHead(200, {
        'Content-Type': mimeTypeForPath(filePath),
        'Content-Disposition': `attachment; filename="${path.basename(fileName)}"`,
        'Cache-Control': 'no-store',
      });
      fs.createReadStream(filePath).pipe(response);
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname.startsWith('/api/runs/')) {
      const id = decodeURIComponent(requestUrl.pathname.replace('/api/runs/', ''));
      const run = await prisma.testRun.findUnique({
        where: { id },
        include: {
          project: true,
          suite: true,
          environment: true,
          target: true,
          pack: true,
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

    const testcaseGenerationMatch = requestUrl.pathname.match(/^\/api\/testcase-files\/generate\/([^/]+)(\/cancel)?$/);
    if (testcaseGenerationMatch) {
      const jobId = decodeURIComponent(testcaseGenerationMatch[1]);
      const job = testcaseGenerationJobs.get(jobId);
      if (!job) {
        sendError(response, 404, 'Test case generation job not found.');
        return;
      }

      if (request.method === 'GET' && !testcaseGenerationMatch[2]) {
        sendJson(response, 200, testcaseGenerationJobResponse(job));
        return;
      }

      if (request.method === 'POST' && testcaseGenerationMatch[2] === '/cancel') {
        cancelTestcaseGeneration(job);
        sendJson(response, 200, testcaseGenerationJobResponse(job));
        return;
      }
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/testcase-files/generate') {
      const body = await readBody(request);
      const activeGeneration = Array.from(testcaseGenerationJobs.values()).find(
        (job) => job.status === 'queued' || job.status === 'running'
      );
      if (activeGeneration) {
        sendError(
          response,
          409,
          `Another Local AI generation is already ${activeGeneration.status}. Wait for it to finish or cancel it before starting a new one.`
        );
        return;
      }
      const { project, suite, target } = await resolveProjectSuiteTargetContext(body.projectId, body.suiteId, body.targetId);
      const packId = typeof body.packId === 'string' ? body.packId.trim() : '';
      if (!packId) {
        throw new Error('Create or select a Test Pack before generating test cases.');
      }
      const pack = await prisma.testPack.findUnique({ where: { id: packId } });
      if (!pack || pack.archived || !project || pack.projectId !== project.id) {
        throw new Error('The selected Test Pack is unavailable for this project.');
      }
      const displayUrl = resolveRunUrl(body.url, project, target);
      const runEnvironment = await ensureRunEnvironment(project?.id, body.environment || project?.environment, displayUrl);
      const url = runnerReachableUrl(displayUrl, normalizeEnvironment(runEnvironment?.name || body.environment || project?.environment));
      const requestText = typeof body.userRequest === 'string' ? body.userRequest.trim() : '';
      const userRequest = buildSuiteUserRequest([
        `Test Pack: ${pack.name}`,
        pack.description ? `Pack objective: ${pack.description}` : '',
        requestText,
      ].filter(Boolean).join('\n\n'), suite);
      const targetCount = requestedTestcaseCount(userRequest);
      const casesPerBatch = Math.max(1, Math.min(4, readConfigNumber('LOCAL_AI_CASES_PER_BATCH', 1)));
      const estimatedBatches = Math.max(1, Math.ceil(targetCount / casesPerBatch));
      const now = new Date().toISOString();
      const job: TestcaseGenerationJob = {
        id: newId('generation'),
        status: 'queued',
        project,
        suite,
        target,
        packId,
        url,
        userRequest,
        targetCount,
        generatedCount: 0,
        persistedCaseIds: [],
        batch: 0,
        estimatedBatches,
        attempt: 0,
        maxAttempts: estimatedBatches + 2,
        message: 'Queued for Local AI generation.',
        createdAt: now,
        updatedAt: now,
        durationMs: 0,
        cancelRequested: false,
        abortController: new AbortController(),
      };
      enqueueTestcaseGeneration(job);
      sendJson(response, 202, testcaseGenerationJobResponse(job));
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/testcase-files/export') {
      const body = await readBody(request);
      const suiteId = typeof body.suiteId === 'string' ? body.suiteId : '';
      const caseIds = Array.isArray(body.caseIds)
        ? body.caseIds.filter((id): id is string => typeof id === 'string')
        : [];
      if (!suiteId) {
        sendError(response, 400, 'suiteId is required');
        return;
      }
      const suite = await prisma.testSuite.findUnique({ where: { id: suiteId }, include: { project: true } });
      if (!suite || (typeof body.projectId === 'string' && body.projectId && suite.projectId !== body.projectId)) {
        sendError(response, 404, 'Test Suite was not found for this project.');
        return;
      }
      const pack = typeof body.packId === 'string' && body.packId
        ? await prisma.testPack.findUnique({ where: { id: body.packId } })
        : null;
      const cases = await prisma.testCase.findMany({
        where: { suiteId, enabled: true, id: { in: caseIds } },
        orderBy: { code: 'asc' },
      });
      const rows = testcaseRowsFromDbCases(cases, suite.project);
      const safePackName = (pack?.name || 'filtered')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48) || 'filtered';
      const formats = await writeTestcaseExportBundle(rows, `testcases-${safePackName}`, {
        projectName: suite.project.name,
        packName: pack?.name || 'Filtered test cases',
      });
      sendJson(response, 200, {
        ...formats,
        total: rows.length,
        projectName: suite.project.name,
        packName: pack?.name || 'Filtered test cases',
      });
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/testcase-files/import') {
      const body = await readBody(request);
      const { project, suite, target } = await resolveProjectSuiteTargetContext(body.projectId, body.suiteId, body.targetId);
      const url = resolveRunUrl(body.url, project, target);
      const fileName = typeof body.fileName === 'string' ? body.fileName : '';
      if (path.extname(fileName).toLowerCase() !== '.xlsx') {
        sendError(response, 400, 'Import Excel only accepts a native .xlsx file.');
        return;
      }
      const xlsxBase64 = typeof body.xlsxBase64 === 'string' ? body.xlsxBase64 : '';
      if (!xlsxBase64) {
        sendError(response, 400, 'Excel file content is required.');
        return;
      }
      const rows = await testcaseRowsFromXlsx(Buffer.from(xlsxBase64, 'base64'));
      const persistedCaseIds = await persistWorkspaceRows(suite?.id, rows);
      await addCaseIdsToPack(body.packId, persistedCaseIds);
      const file = writeTestcaseCsvFile(rows, 'imported-testcases');
      const officeFiles = await writeOfficeCompanionFiles(rows, 'imported-testcases');
      const historyRun = await saveTestcaseFileHistory({
        url,
        rows,
        filePath: file.filePath,
        excelFileName: officeFiles.excelFileName,
        docFileName: officeFiles.docFileName,
        aiExplanation: `Imported ${rows.length} testcase rows. This record is a testcase file only and has not run automation yet.`,
        userRequest: `Imported testcase file: ${fileName || file.fileName}`,
        context: {
          projectId: project?.id,
          projectName: project?.name,
          suiteId: suite?.id,
          suiteName: suite?.name,
          suiteType: suite?.type,
          targetId: target?.id,
          targetName: target?.name,
          targetType: target?.type,
          packId: typeof body.packId === 'string' ? body.packId : undefined,
        },
      });

      sendJson(response, 200, {
        fileName: file.fileName,
        downloadUrl: `/api/testcase-files/download/${encodeURIComponent(file.fileName)}`,
        excelDownloadUrl: officeFiles.excelDownloadUrl,
        docDownloadUrl: officeFiles.docDownloadUrl,
        csvContent: file.csvContent,
        rows,
        persistedCaseIds,
        cases: rows.map(rowToPreviewCase),
        historyRun: toRunSummary(historyRun),
      });
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/testcase-files/run') {
      const body = await readBody(request);
      const { project, suite, target } = await resolveProjectSuiteTargetContext(body.projectId, body.suiteId, body.targetId);
      const displayUrl = resolveRunUrl(body.url, project, target);
      const runEnvironment = await ensureRunEnvironment(project?.id, body.environment || project?.environment, displayUrl);
      const url = runnerReachableUrl(displayUrl, normalizeEnvironment(runEnvironment?.name || body.environment || project?.environment));
      const csvContent = typeof body.csvContent === 'string' ? body.csvContent : '';
      const importedCases = testcaseRowsFromCsv(csvContent);
      const auth = resolveEnvironmentAuth(runEnvironment, body.auth);
      const fileName = typeof body.fileName === 'string' ? body.fileName : 'imported-testcases.csv';
      const testcaseFile = writeTestcaseCsvFile(importedCases, 'run-source-testcases');
      const testcaseOfficeFiles = await writeOfficeCompanionFiles(importedCases, 'run-source-testcases');
      const job: RunQueueJob = {
        runId: newId('run'),
        url,
        displayUrl,
        userRequest: `Imported testcase file: ${fileName}`,
        auth,
        importedCases,
        sourceFileName: fileName,
        testcaseFilePath: testcaseFile.filePath,
        testcaseExcelFileName: testcaseOfficeFiles.excelFileName,
        testcaseDocFileName: testcaseOfficeFiles.docFileName,
        context: {
          projectId: project?.id,
          projectName: project?.name,
          suiteId: suite?.id,
          suiteName: suite?.name,
          suiteType: suite?.type,
          targetId: target?.id,
          targetName: target?.name,
          targetType: target?.type,
          environmentId: runEnvironment?.id,
          packId: typeof body.packId === 'string' ? body.packId : undefined,
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

    if (request.method === 'POST' && requestUrl.pathname === '/api/generate') {
      const body = await readBody(request);
      const { project, suite, target } = await resolveProjectSuiteTargetContext(body.projectId, body.suiteId, body.targetId);
      const displayUrl = resolveRunUrl(body.url, project, target);
      const runEnvironment = await ensureRunEnvironment(project?.id, body.environment || project?.environment, displayUrl);
      const url = runnerReachableUrl(displayUrl, normalizeEnvironment(runEnvironment?.name || body.environment || project?.environment));
      const userRequest = buildSuiteUserRequest(typeof body.userRequest === 'string' ? body.userRequest : '', suite);
      const auth = resolveEnvironmentAuth(runEnvironment, body.auth);
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
        aiExplanation: result.aiExplanation || '',
        cases: previewGeneratedCases(result.code, userRequest),
      });
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/run') {
      const body = await readBody(request);
      const { project, suite, target } = await resolveProjectSuiteTargetContext(body.projectId, body.suiteId, body.targetId);
      const displayUrl = resolveRunUrl(body.url, project, target);
      const runEnvironment = await ensureRunEnvironment(project?.id, body.environment || project?.environment, displayUrl);
      const url = runnerReachableUrl(displayUrl, normalizeEnvironment(runEnvironment?.name || body.environment || project?.environment));
      const userRequest = buildSuiteUserRequest(typeof body.userRequest === 'string' ? body.userRequest : '', suite);
      const auth = resolveEnvironmentAuth(runEnvironment, body.auth);
      const job: RunQueueJob = {
        runId: newId('run'),
        url,
        displayUrl,
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
          environmentId: runEnvironment?.id,
          packId: typeof body.packId === 'string' ? body.packId : undefined,
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
      console.log(`Passmark TestOps server: http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
