

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { GitCommitHorizontalIcon, InboxIcon } from "lucide-react";
import { toast } from "sonner";
import { useApp, type RunRequest } from "../../context/AppContext";
import type { TestRun } from "../../lib/types";
import { QuickRun } from "../runs/QuickRun";
import { RunDetailDrawer } from "../runs/RunDetailDrawer";
import { StatusBadge } from "../ui/StatusBadge";
import { RunProgress } from "../ui/RunProgress";
import { EmptyState } from "../ui/EmptyState";
import { formatDuration } from "../../lib/status";
import { cn } from "../../lib/cn";

export function RunsPage() {
  const { runs, smokeIntent, clearSmokeIntent, startRun, viewMode } = useApp();
  const [selected, setSelected] = useState<TestRun | null>(null);
  useEffect(() => {if (selected) setSelected(runs.find((run) => run.id === selected.id) ?? null);}, [runs, selected]);
  const begin = async (request: RunRequest) => {
    try {
      const run = await startRun(request);
      clearSmokeIntent();
      setSelected(run);
      toast.success(`${run.name} queued.`);
    } catch (runError) {
      toast.error(runError instanceof Error ? runError.message : String(runError));
    }
  };
  return <div className="mx-auto max-w-7xl px-4 py-6"><div className="mb-4"><h1 className="text-xl font-semibold text-ink">Runs</h1><p className="mt-0.5 text-sm text-ink-2">{viewMode === "quick" ? "Confirm a Smoke run, then investigate the result in one place." : "Trigger, inspect, and manage automated test runs."}</p></div><div className="mb-5"><QuickRun intent={smokeIntent} onRun={begin} /></div>{runs.length === 0 ? <div className="rounded-xl border border-line bg-surface"><EmptyState icon={InboxIcon} title="No runs yet" description="Confirm a quick run above to start your first TestOps run." /></div> : <div className="overflow-hidden rounded-xl border border-line bg-surface"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="sticky top-0 z-10 bg-surface-2 text-ink-3"><tr className="text-left text-2xs uppercase tracking-wide"><Th className="pl-4">Run</Th><Th>Pack</Th><Th className="hidden md:table-cell">Environment</Th><Th className="hidden lg:table-cell">Triggered by</Th><Th className="hidden xl:table-cell">Build</Th><Th className="min-w-[180px]">Results</Th><Th className="hidden sm:table-cell">Duration</Th><Th className="hidden lg:table-cell pr-4">Started</Th></tr></thead><tbody className="divide-y divide-line">{runs.map((run) => <RunRow key={run.id} run={run} highlight={selected?.id === run.id} onClick={() => setSelected(run)} />)}</tbody></table></div></div>}<RunDetailDrawer run={selected} onClose={() => setSelected(null)} /></div>;
}
function RunRow({ run, highlight, onClick }: {run: TestRun;highlight: boolean;onClick: () => void;}) {return <tr onClick={onClick} tabIndex={0} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && (event.preventDefault(), onClick())} className={cn("cursor-pointer hover:bg-surface-2 focus:bg-surface-2", highlight && "bg-accent-soft/40")}><Td className="pl-4"><span className="font-medium text-ink">{run.name}</span></Td><Td className="text-ink-2">{run.pack}</Td><Td className="hidden text-ink-2 md:table-cell">{run.environment}</Td><Td className="hidden text-ink-2 lg:table-cell">{run.triggeredBy}</Td><Td className="hidden xl:table-cell">{run.build ? <span className="inline-flex items-center gap-1 font-mono text-2xs text-ink-2"><GitCommitHorizontalIcon className="h-3 w-3" />{run.build}</span> : "—"}</Td><Td>{run.status === "queued" || run.status === "system_error" ? <StatusBadge status={run.status} kind="run" size="sm" /> : <div className="min-w-[160px]"><RunProgress passed={run.passed} failed={run.failed} blocked={run.blocked} skipped={run.skipped} total={run.total} running={run.status === "running"} showLabels={false} /><div className="mt-1 flex items-center gap-2"><StatusBadge status={run.status} kind="run" size="sm" /><span className="text-2xs text-ink-3">{run.passed + run.failed + run.blocked + run.skipped}/{run.total}</span></div></div>}</Td><Td className="hidden tabular-nums text-ink-2 sm:table-cell">{formatDuration(run.duration)}</Td><Td className="hidden whitespace-nowrap pr-4 text-ink-3 lg:table-cell">{format(new Date(run.startedAt), "MMM d, HH:mm")}</Td></tr>;}
function Th({ children, className }: {children: React.ReactNode;className?: string;}) {return <th className={cn("px-3 py-2.5 font-medium", className)}>{children}</th>;}
function Td({ children, className }: {children: React.ReactNode;className?: string;}) {return <td className={cn("px-3 py-2.5 align-middle", className)}>{children}</td>;}

