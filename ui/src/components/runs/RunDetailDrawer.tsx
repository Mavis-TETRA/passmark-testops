

import React, { useEffect, useMemo, useState } from "react";
import { BanIcon, BugIcon, DownloadIcon, FilterIcon, LinkIcon, RefreshCwIcon, RotateCwIcon, ServerCrashIcon, WifiOffIcon } from "lucide-react";
import { toast } from "sonner";
import type { RunCaseResult, TestRun } from "../../lib/types";
import { useApp } from "../../context/AppContext";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { StatusBadge, StatusInline } from "../ui/StatusBadge";
import { RunProgress } from "../ui/RunProgress";
import { EmptyState } from "../ui/EmptyState";
import { Collapsible, CodeBlock } from "./StackTraceViewer";
import { EvidenceViewer } from "./EvidenceViewer";
import { formatDuration } from "../../lib/status";
import { cn } from "../../lib/cn";

export function RunDetailDrawer({ run, onClose }: {run: TestRun | null;onClose: () => void;}) {
  const { updateRunStatus, startRun, testCases } = useApp();
  const [failedOnly, setFailedOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {setFailedOnly(false);setExpanded(null);}, [run?.id]);
  const results = useMemo(() => run ? failedOnly ? run.results.filter((result) => result.status === "failed") : run.results : [], [failedOnly, run]);
  if (!run) return <Drawer open={false} onClose={onClose}> </Drawer>;
  const canCancel = run.status === "queued" || run.status === "running";
  const firstFailure = run.results.find((result) => result.status === "failed");
  const rerun = async (failed: boolean) => {
    const sourceResults = failed ? run.results.filter((result) => result.status === "failed") : run.results;
    const ids = sourceResults.map((result) => testCases.find((item) => item.id === result.caseId || item.code === result.caseId)?.id).filter(Boolean) as string[];
    try {
      const next = await startRun({ projectId: run.projectId, environment: run.environment, targetId: run.targetId, packId: run.packId, caseIds: ids, source: "rerun" });
      toast.success(`${failed ? "Failed tests" : "Run"} queued as ${next.name}`);
    } catch (runError) {
      toast.error(runError instanceof Error ? runError.message : String(runError));
    }
  };
  const downloadReport = () => {
    const reportUrl = run.resultCsvUrl || run.resultExcelUrl || run.resultDocUrl;
    if (!reportUrl) return toast.error("A report is available after the run finishes.");
    window.open(reportUrl, "_blank", "noopener,noreferrer");
  };
  const copyLink = () => {
    const url = `${window.location.origin}/runs?run=${encodeURIComponent(run.id)}`;
    void navigator.clipboard?.writeText(url);
    toast.success("Run link copied");
  };
  const footer = <div className="flex flex-wrap gap-2">
    <Button variant="primary" size="sm" disabled={!run.failed} onClick={() => void rerun(true)}><RotateCwIcon className="h-3.5 w-3.5" /> Rerun Failed</Button>
    <Button variant="secondary" size="sm" disabled={!run.results.length} onClick={() => void rerun(false)}><RefreshCwIcon className="h-3.5 w-3.5" /> Rerun All</Button>
    {canCancel && <Button variant="danger" size="sm" onClick={() => { updateRunStatus(run.id, "cancelled"); toast.success("Cancellation requested"); }}><BanIcon className="h-3.5 w-3.5" /> Cancel Run</Button>}
    <Button variant="ghost" size="sm" onClick={downloadReport}><DownloadIcon className="h-3.5 w-3.5" /> Report</Button>
    <Button variant="ghost" size="sm" onClick={copyLink}><LinkIcon className="h-3.5 w-3.5" /> Copy Link</Button>
  </div>;
  return <Drawer open onClose={onClose} width="max-w-3xl" title={run.name} subtitle={`${run.pack} · ${run.environment} · ${run.target}`} headerExtra={<StatusBadge status={run.status} kind="run" />} footer={footer}><div className="space-y-5 p-5"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Meta label="Pack" value={run.pack} /><Meta label="Target" value={run.target} mono /><Meta label="Triggered by" value={run.triggeredBy} /><Meta label="Duration" value={formatDuration(run.duration)} /></div>{run.systemError ? <SystemError run={run} /> : <><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Passed" value={run.passed} tone="ok" /><Stat label="Failed" value={run.failed} tone="fail" /><Stat label="Blocked" value={run.blocked} tone="block" /><Stat label="Skipped" value={run.skipped} tone="skip" /></div>{run.status === "running" && <><LiveRunStatus run={run} /><RunProgress passed={run.passed} failed={run.failed} blocked={run.blocked} skipped={run.skipped} total={run.total} running /></>}{run.status === "queued" && <EmptyState icon={RotateCwIcon} title="Run is queued" description="An available runner will start this configuration shortly. You can cancel it if the build changes." />}{firstFailure && <FailureSummary result={firstFailure} expanded />}{run.status !== "queued" && <section><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold text-ink">Test cases ({run.total})</h3><button onClick={() => setFailedOnly((value) => !value)} aria-pressed={failedOnly} className={cn("inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium", failedOnly ? "border-[rgb(var(--fail))] bg-[rgb(var(--fail-soft))] text-[rgb(var(--fail))]" : "border-line text-ink-2 hover:bg-surface-2")}><FilterIcon className="h-3.5 w-3.5" /> Failed only</button></div><div className="overflow-hidden rounded-lg border border-line divide-y divide-line">{results.map((result) => <ResultRow key={`${result.caseId}-${result.name}`} result={result} expanded={expanded === result.caseId} onToggle={() => setExpanded((value) => value === result.caseId ? null : result.caseId)} />)}{results.length === 0 && <p className="p-8 text-center text-sm text-ink-3">No matching test results.</p>}</div></section>}</>}</div></Drawer>;
}

function LiveRunStatus({ run }: {run: TestRun;}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const completed = run.passed + run.failed + run.blocked + run.skipped;
  const current = run.results.find((result) => result.status === "running");
  const startedAt = new Date(run.startedAt).getTime();
  const wallTime = Number.isFinite(startedAt) ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const elapsed = Math.max(run.duration ?? 0, wallTime);
  return <div aria-live="polite" className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent-soft/50 px-3 py-2.5">
    <RefreshCwIcon className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-accent" />
    <div className="min-w-0 flex-1">
      <div className="text-xs font-semibold text-ink">Processing {Math.min(run.total, completed + 1)} of {run.total} · {formatDuration(elapsed)} elapsed</div>
      <div className="mt-0.5 truncate text-2xs text-ink-2">{current ? `Current: ${current.caseId} — ${current.name}` : "Preparing the next test case…"}</div>
    </div>
    <span className="shrink-0 text-2xs text-ink-3">Live · 2s</span>
  </div>;
}

function FailureSummary({ result, expanded }: {result: RunCaseResult;expanded?: boolean;}) {const copyDefectDraft = () => {const draft = [`Test: ${result.caseId} ${result.name}`, `Error: ${result.error || 'Not captured'}`, `Expected: ${result.expected || 'Not captured'}`, `Actual: ${result.actual || 'Not captured'}`].join('\n');void navigator.clipboard?.writeText(draft);toast.success('Defect draft copied');};return <div className="space-y-3 rounded-xl border border-[rgb(var(--fail))]/20 bg-[rgb(var(--fail-soft))] p-4"><div><div className="text-2xs font-semibold uppercase tracking-wide text-[rgb(var(--fail))]">Error summary</div><p className="mt-1 text-sm text-ink">{result.error}</p></div><div className="grid gap-2 sm:grid-cols-3"><Field label="Failed step">{result.failedStep ?? "Not captured"}</Field><Field label="Expected">{result.expected}</Field><Field label="Actual" fail>{result.actual}</Field></div><div><div className="mb-1.5 text-2xs font-medium text-ink-3">Evidence</div><EvidenceViewer screenshot={result.evidenceUrl || result.hasScreenshot} video={result.hasVideo} trace={result.hasTrace} /></div>{expanded && <div className="space-y-2"><Collapsible title="Stack trace"><CodeBlock code={result.stackTrace ?? "No stack trace captured."} /></Collapsible><Collapsible title="Generated Playwright code" count="TypeScript"><CodeBlock code={result.generatedCode ?? "No generated code captured."} language="ts" /></Collapsible><Collapsible title="Console output"><CodeBlock code={result.consoleOutput ?? "No console output captured."} /></Collapsible></div>}<Button variant="secondary" size="sm" onClick={copyDefectDraft}><BugIcon className="h-3.5 w-3.5" /> Copy defect draft</Button></div>;}
function ResultRow({ result, expanded, onToggle }: {result: RunCaseResult;expanded: boolean;onToggle: () => void;}) {const failed = result.status === "failed";return <div><button onClick={failed ? onToggle : undefined} className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-left", failed && "cursor-pointer hover:bg-surface-2")} aria-expanded={failed ? expanded : undefined}><span className="w-16 shrink-0 font-mono text-2xs text-ink-3">{result.caseId}</span><span className="flex-1 truncate text-sm text-ink">{result.name}</span><span className="hidden text-2xs text-ink-3 sm:block">{formatDuration(result.duration)}</span><StatusInline status={result.status} /></button>{failed && expanded && <div className="border-t border-line bg-surface-2/50 p-3"><FailureSummary result={result} /></div>}</div>;}
function SystemError({ run }: {run: TestRun;}) {const unreachable = run.errorKind === "target_unreachable";return <div className="rounded-xl border border-[rgb(var(--fail))]/25 bg-[rgb(var(--fail-soft))] p-4"><div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fail))]">{unreachable ? <WifiOffIcon className="h-4 w-4" /> : <ServerCrashIcon className="h-4 w-4" />}{unreachable ? "Target unreachable" : "System error"}</div><p className="mt-1 text-sm text-ink-2">{run.systemError}</p><p className="mt-2 text-xs text-ink-3">Next step: {unreachable ? "check the target URL and service availability, then retry." : "retry once; if it persists, check runner configuration or backend health."}</p></div>;}
function Meta({ label, value, mono }: {label: string;value: string;mono?: boolean;}) {return <div className="rounded-lg border border-line p-2.5"><div className="text-2xs text-ink-3">{label}</div><div className={cn("mt-0.5 truncate text-sm font-medium text-ink", mono && "font-mono text-xs")}>{value}</div></div>;}
function Field({ label, children, fail }: {label: string;children?: React.ReactNode;fail?: boolean;}) {return <div className="rounded-lg border border-line bg-surface/60 p-2.5"><div className="text-2xs font-medium text-ink-3">{label}</div><div className={cn("mt-1 text-xs leading-relaxed", fail ? "text-[rgb(var(--fail))]" : "text-ink-2")}>{children ?? "Not captured"}</div></div>;}
function Stat({ label, value, tone }: {label: string;value: number;tone: "ok" | "fail" | "block" | "skip";}) {const color = tone === "ok" ? "text-[rgb(var(--ok))]" : tone === "fail" ? "text-[rgb(var(--fail))]" : tone === "block" ? "text-[rgb(var(--block))]" : "text-[rgb(var(--skip))]";return <div className="rounded-lg border border-line bg-surface p-3"><div className="text-2xs text-ink-3">{label}</div><div className={cn("mt-0.5 text-xl font-semibold tabular-nums", color)}>{value}</div></div>;}


