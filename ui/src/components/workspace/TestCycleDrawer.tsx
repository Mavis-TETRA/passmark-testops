import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2Icon, PlayIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import type { TestCycle } from "../../lib/types";
import { useApp } from "../../context/AppContext";
import { Drawer } from "../ui/Drawer";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { RunProgress } from "../ui/RunProgress";
import { StatusBadge } from "../ui/StatusBadge";

export function TestCycleDrawer({ open, onClose, onStart }: {open: boolean;onClose: () => void;onStart: (cycle: TestCycle) => void;}) {
  const { cycles, currentProject, testCases, testPacks, createCycle, updateCycle } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("Release verification");
  const [packId, setPackId] = useState("");
  const [release, setRelease] = useState("v3.5.0-rc.3");
  const [dueDate, setDueDate] = useState("2026-07-20");

  const projectPacks = useMemo(() => testPacks.filter((pack) => pack.projectId === currentProject.id && !pack.archived), [currentProject.id, testPacks]);
  const projectCycles = cycles.filter((cycle) => cycle.projectId === currentProject.id && cycle.status !== "archived");
  const pack = projectPacks.find((item) => item.id === packId) ?? null;

  useEffect(() => {
    if (!projectPacks.some((item) => item.id === packId)) setPackId(projectPacks.find((item) => item.name === "Release")?.id ?? projectPacks[0]?.id ?? "");
  }, [packId, projectPacks]);

  const create = () => {
    if (!pack || pack.caseIds.length === 0) {
      toast.error("Choose a Test Pack with at least one case before creating a cycle.");
      return;
    }
    const cycle = createCycle({
      name: name.trim() || "Release verification",
      projectId: currentProject.id,
      packId: pack.id,
      release: release.trim() || "Unspecified build",
      environment: pack.defaultEnvironment ?? currentProject.environment,
      targetId: pack.defaultTargetId ?? currentProject.defaultTargetId,
      owner: "Mai Tran",
      testers: ["Mai Tran"],
      startDate: new Date().toISOString().slice(0, 10),
      dueDate
    });
    const activeCycle = { ...cycle, status: "active" as const };
    updateCycle(cycle.id, { status: "active" });
    setCreateOpen(false);
    onStart(activeCycle);
    toast.success("Test Cycle created and ready for manual execution");
  };

  const complete = (cycle: TestCycle, total: number, handled: number) => {
    if (handled < total && !window.confirm(`${total - handled} test case${total - handled === 1 ? "" : "s"} are still not run. Complete this cycle anyway?`)) return;
    updateCycle(cycle.id, { status: "completed" });
    toast.success(`${cycle.name} marked completed`);
  };

  return (
    <>
      <Drawer open={open} onClose={onClose} title="Test Cycles" subtitle="A focused manual execution layer inside Test Workspace" width="max-w-lg" footer={<Button variant="primary" size="sm" onClick={() => setCreateOpen(true)} disabled={!projectPacks.length}><PlusIcon className="h-3.5 w-3.5" /> New cycle</Button>}>
        <div className="space-y-3 p-5">
          {projectCycles.map((cycle) => <CycleRow key={cycle.id} cycle={cycle} pack={testPacks.find((item) => item.id === cycle.packId) ?? null} testCases={testCases} onStart={() => onStart(cycle)} onComplete={complete} />)}
          {!projectCycles.length && <p className="py-8 text-center text-sm text-ink-3">No active Test Cycles for this project. Create one from a Test Pack to start manual validation.</p>}
        </div>
      </Drawer>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Test Cycle" subtitle="Set a compact owner, build, environment, and Test Pack for manual validation." footer={<><Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button><Button variant="primary" onClick={create} disabled={!pack}><PlayIcon className="h-4 w-4" /> Create & start</Button></>}>
        <div className="space-y-4 p-5">
          {!projectPacks.length ? <p className="rounded-lg bg-[rgb(var(--block-soft))] p-3 text-sm text-ink-2">This project has no active Test Pack. Create or restore a pack before starting a cycle.</p> : <>
            <label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Cycle name</span><input value={name} onChange={(event) => setName(event.target.value)} className="control" /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Test Pack</span><select value={packId} onChange={(event) => setPackId(event.target.value)} className="control">{projectPacks.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.caseIds.length} cases</option>)}</select></label>
            <div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block text-xs font-medium text-ink-2">Release / build</span><input value={release} onChange={(event) => setRelease(event.target.value)} className="control" /></label><label><span className="mb-1 block text-xs font-medium text-ink-2">Due date</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="control" /></label></div>
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-line p-3 text-sm text-ink-2"><p>Owner: <strong className="text-ink">Mai Tran</strong></p><p>Tester: <strong className="text-ink">Mai Tran</strong></p><p>Environment: <strong className="text-ink">{pack?.defaultEnvironment ?? currentProject.environment}</strong></p><p>Target: <strong className="text-ink">{pack?.defaultTargetId ?? currentProject.defaultTargetId ?? "Not configured"}</strong></p></div>
          </>}
        </div>
      </Modal>
    </>);

}

function CycleRow({ cycle, pack, testCases, onStart, onComplete }: {cycle: TestCycle;pack: ReturnType<typeof useApp>["testPacks"][number] | null;testCases: ReturnType<typeof useApp>["testCases"];onStart: () => void;onComplete: (cycle: TestCycle, total: number, handled: number) => void;}) {
  const caseIds = pack?.caseIds ?? [];
  const manualIds = caseIds.filter((id) => testCases.find((testCase) => testCase.id === id)?.automation === "manual");
  const values = Object.values(cycle.executions).filter((execution) => manualIds.includes(execution.caseId));
  const passed = values.filter((item) => item.overallStatus === "passed").length;
  const failed = values.filter((item) => item.overallStatus === "failed").length;
  const blocked = values.filter((item) => item.overallStatus === "blocked").length;
  const skipped = values.filter((item) => item.overallStatus === "skipped").length;
  const total = manualIds.length;
  const handled = values.length;
  const active = cycle.status === "active";

  return <article className="rounded-xl border border-line p-3"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold text-ink">{cycle.name}</h3><p className="mt-0.5 truncate text-2xs text-ink-3">{cycle.release} · {cycle.environment} · {pack?.name ?? "Archived Test Pack"} · due {cycle.dueDate}</p></div><StatusBadge status={active ? "running" : cycle.status === "completed" ? "passed" : "not_run"} size="sm" /></div><RunProgress className="mt-3" passed={passed} failed={failed} blocked={blocked} skipped={skipped} total={total} showLabels={false} /><div className="mt-3 flex items-center gap-2"><span className="flex-1 text-2xs text-ink-3">{handled}/{total} manual cases handled · {caseIds.length - total} automated · {cycle.linkedDefects.length} linked defects</span>{active ? <><Button variant="secondary" size="sm" onClick={onStart}>{handled ? "Resume" : "Start manual"}</Button><button aria-label={`Complete ${cycle.name}`} onClick={() => onComplete(cycle, total, handled)} className="rounded p-1.5 text-[rgb(var(--ok))] hover:bg-[rgb(var(--ok-soft))]"><CheckCircle2Icon className="h-4 w-4" /></button></> : <Button variant="secondary" size="sm" onClick={onStart}>View</Button>}</div></article>;
}


