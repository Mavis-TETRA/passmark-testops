import type { LucideIcon } from "lucide-react";

export type Theme = "light" | "dark";
export type ViewMode = "quick" | "qa";
export type EnvironmentName = "Local" | "Development" | "Staging" | "Production";
export type TargetType = "Web URL" | "Local Web" | "Source Code" | "API";
export type EnvironmentAuthMode = "none" | "form" | "bearer" | "api_key" | "basic" | "custom_headers";

export interface EnvironmentAuthConfig {
  mode: EnvironmentAuthMode;
  loginUrl: string;
  username: string;
  usernameSelector: string;
  passwordSelector: string;
  submitSelector: string;
  successSelector: string;
  apiKeyName: string;
  apiKeyLocation: "header" | "query";
  secretConfigured: boolean;
  customHeaderNames: string[];
}

export type TestStatus =
"passed" |
"failed" |
"running" |
"blocked" |
"skipped" |
"queued" |
"cancelled" |
"not_run";

export type RunStatus =
"generated" |
"queued" |
"running" |
"passed" |
"failed" |
"partially_completed" |
"cancelled" |
"system_error";

export type RunErrorKind =
"test_failure" |
"target_unreachable" |
"authentication_failed" |
"playwright_configuration" |
"ai_generation" |
"system_database";

export type StepStatus = "pass" | "fail" | "blocked" | "skipped" | "pending";
export type Priority = "Critical" | "High" | "Medium" | "Low";
export type Severity = "Blocker" | "Critical" | "Major" | "Minor" | "Trivial";
export type TestType = "Functional" | "UI" | "API" | "Accessibility" | "SEO" | "Performance" | "Security";
export type Automation = "manual" | "automated";
export type PackKind = "system" | "saved" | "all" | "manual" | "automated";
export type CycleStatus = "draft" | "active" | "completed" | "archived";

export interface Target {
  id: string;
  name: string;
  type: TargetType;
  urls: Partial<Record<EnvironmentName, string>>;
  reachable?: boolean;
  requiresAuth?: boolean;
}

export interface Project {
  id: string;
  name: string;
  environment: EnvironmentName;
  targets: Target[];
  defaultTargetId: string | null;
  passRate: number | null;
  failing: number;
  totalCases: number;
  lastRun: string | null;
  status: TestStatus;
  description?: string;
  authByEnvironment: Partial<Record<EnvironmentName, EnvironmentAuthConfig>>;
}

export interface TestStep {
  id: string;
  action: string;
  expected: string;
  status?: StepStatus;
  actual?: string;
  evidence?: boolean;
}

export interface TestCase {
  id: string;
  code?: string;
  name: string;
  module: string;
  feature: string;
  requirementId: string;
  objective: string;
  preconditions: string;
  testData: string;
  steps: TestStep[];
  expected: string;
  actual: string;
  priority: Priority;
  severity: Severity;
  type: TestType;
  automation: Automation;
  automationKind: string;
  status: TestStatus;
  assignee: string | null;
  reviewer: string | null;
  defectId: string | null;
  lastRun: string | null;
  duration: number | null;
  notes: string;
  packIds: string[];
}

export interface LocalAIStatus {
  online: boolean;
  provider: string;
  baseUrl: string;
  model: string;
  models: Array<Record<string, unknown>>;
  message: string;
  checking?: boolean;
}

export interface TestPack {
  id: string;
  projectId: string;
  name: string;
  description: string;
  kind: PackKind;
  caseIds: string[];
  owner: string;
  updatedAt: string;
  defaultEnvironment?: EnvironmentName;
  defaultTargetId?: string;
  archived?: boolean;
}

export interface RunCaseResult {
  caseId: string;
  name: string;
  status: TestStatus;
  duration: number | null;
  failedStep?: string;
  error?: string;
  expected?: string;
  actual?: string;
  stackTrace?: string;
  generatedCode?: string;
  consoleOutput?: string;
  hasScreenshot?: boolean;
  hasVideo?: boolean;
  hasTrace?: boolean;
  hasRawArtifact?: boolean;
  evidenceUrl?: string;
}

export interface TestRun {
  id: string;
  name: string;
  projectId: string;
  packId: string | null;
  pack: string;
  environment: EnvironmentName;
  targetId: string | null;
  target: string;
  triggeredBy: string;
  build: string | null;
  status: RunStatus;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  total: number;
  manual: number;
  automated: number;
  duration: number | null;
  startedAt: string;
  results: RunCaseResult[];
  errorKind?: RunErrorKind;
  systemError?: string;
  resultCsvUrl?: string;
  resultExcelUrl?: string;
  resultDocUrl?: string;
}

export interface ManualCaseExecution {
  caseId: string;
  overallStatus: TestStatus;
  steps: Record<string, StepStatus>;
  actual: string;
  defectId: string;
  notes: string;
  evidenceAttached: boolean;
  savedAt: string | null;
  durationSeconds: number;
}

export interface TestCycle {
  id: string;
  name: string;
  projectId: string;
  packId: string;
  release: string;
  environment: EnvironmentName;
  targetId: string | null;
  owner: string;
  testers: string[];
  startDate: string;
  dueDate: string;
  status: CycleStatus;
  executions: Record<string, ManualCaseExecution>;
  linkedDefects: string[];
}

export interface StatusMeta {
  label: string;
  icon: LucideIcon;
  pill: string;
  dot: string;
  spin?: boolean;
}
