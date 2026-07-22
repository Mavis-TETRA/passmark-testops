import {
  BanIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  Clock3Icon,
  Loader2Icon,
  MinusCircleIcon,
  OctagonAlertIcon,
  PauseCircleIcon,
  ServerCrashIcon,
  XCircleIcon } from
"lucide-react";
import type { Priority, RunStatus, Severity, StatusMeta, StepStatus, TestStatus } from "./types";

export const TEST_STATUS: Record<TestStatus, StatusMeta> = {
  passed: { label: "Passed", icon: CheckCircle2Icon, pill: "text-[rgb(var(--ok))] bg-[rgb(var(--ok-soft))]", dot: "bg-[rgb(var(--ok))]" },
  failed: { label: "Failed", icon: XCircleIcon, pill: "text-[rgb(var(--fail))] bg-[rgb(var(--fail-soft))]", dot: "bg-[rgb(var(--fail))]" },
  running: { label: "Running", icon: Loader2Icon, pill: "text-[rgb(var(--run))] bg-[rgb(var(--run-soft))]", dot: "bg-[rgb(var(--run))]", spin: true },
  blocked: { label: "Blocked", icon: BanIcon, pill: "text-[rgb(var(--block))] bg-[rgb(var(--block-soft))]", dot: "bg-[rgb(var(--block))]" },
  skipped: { label: "Skipped", icon: MinusCircleIcon, pill: "text-[rgb(var(--skip))] bg-[rgb(var(--skip-soft))]", dot: "bg-[rgb(var(--skip))]" },
  queued: { label: "Queued", icon: Clock3Icon, pill: "text-[rgb(var(--queue))] bg-[rgb(var(--queue-soft))]", dot: "bg-[rgb(var(--queue))]" },
  cancelled: { label: "Cancelled", icon: PauseCircleIcon, pill: "text-ink-2 bg-surface-2", dot: "bg-ink-3" },
  not_run: { label: "Not Run", icon: CircleDashedIcon, pill: "text-ink-3 bg-surface-2", dot: "bg-ink-3" }
};

export const RUN_STATUS: Record<RunStatus, StatusMeta> = {
  generated: { label: "Generated", icon: CircleDashedIcon, pill: "text-ink-2 bg-surface-2", dot: "bg-ink-3" },
  queued: TEST_STATUS.queued,
  running: TEST_STATUS.running,
  passed: TEST_STATUS.passed,
  failed: TEST_STATUS.failed,
  partially_completed: { label: "Partially Completed", icon: OctagonAlertIcon, pill: "text-[rgb(var(--block))] bg-[rgb(var(--block-soft))]", dot: "bg-[rgb(var(--block))]" },
  cancelled: TEST_STATUS.cancelled,
  system_error: { label: "System Error", icon: ServerCrashIcon, pill: "text-[rgb(var(--fail))] bg-[rgb(var(--fail-soft))]", dot: "bg-[rgb(var(--fail))]" }
};

export const STEP_STATUS: Record<StepStatus, {label: string;classes: string;dot: string;}> = {
  pass: { label: "Pass", classes: "text-[rgb(var(--ok))] bg-[rgb(var(--ok-soft))]", dot: "bg-[rgb(var(--ok))]" },
  fail: { label: "Fail", classes: "text-[rgb(var(--fail))] bg-[rgb(var(--fail-soft))]", dot: "bg-[rgb(var(--fail))]" },
  blocked: { label: "Blocked", classes: "text-[rgb(var(--block))] bg-[rgb(var(--block-soft))]", dot: "bg-[rgb(var(--block))]" },
  skipped: { label: "Skipped", classes: "text-[rgb(var(--skip))] bg-[rgb(var(--skip-soft))]", dot: "bg-[rgb(var(--skip))]" },
  pending: { label: "Not Run", classes: "text-ink-3 bg-surface-2", dot: "bg-ink-3" }
};

export const PRIORITY: Record<Priority, string> = {
  Critical: "text-[rgb(var(--fail))]",
  High: "text-[rgb(var(--block))]",
  Medium: "text-ink-2",
  Low: "text-ink-3"
};

export const SEVERITY: Record<Severity, string> = {
  Blocker: "text-[rgb(var(--fail))]",
  Critical: "text-[rgb(var(--fail))]",
  Major: "text-[rgb(var(--block))]",
  Minor: "text-ink-2",
  Trivial: "text-ink-3"
};

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return remaining ? `${minutes}m ${remaining}s` : `${minutes}m`;
}

