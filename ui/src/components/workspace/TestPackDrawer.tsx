import React, { useEffect, useMemo, useState } from "react";
import { ArchiveIcon, CopyIcon, PlayIcon, PlusIcon, SaveIcon, SearchIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import type { EnvironmentName, PackKind, TestPack } from "../../lib/types";
import { useApp } from "../../context/AppContext";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { ConfirmModal } from "../ui/ConfirmModal";
import { StatusBadge } from "../ui/StatusBadge";

const environments: EnvironmentName[] = ["Local", "Development", "Staging", "Production"];
const protectedKinds: PackKind[] = ["system", "all", "manual", "automated"];
const computedMembershipKinds: PackKind[] = ["all", "manual", "automated"];

export function TestPackDrawer({ pack, onClose, onRun }: {pack: TestPack | null;onClose: () => void;onRun: (pack: TestPack) => void;}) {
  const { testCases, testPacks, runs, updatePack, duplicatePack, currentProject } = useApp();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<PackKind>("custom");
  const [defaultEnvironment, setDefaultEnvironment] = useState<EnvironmentName | "">("");
  const [defaultTargetId, setDefaultTargetId] = useState("");
  const [search, setSearch] = useState("");
  const [pendingAdd, setPendingAdd] = useState<Set<string>>(new Set());
  const [confirmArchive, setConfirmArchive] = useState(false);

  useEffect(() => {
    setName(pack?.name ?? "");
    setDescription(pack?.description ?? "");
    setKind(pack?.kind ?? "custom");
    setDefaultEnvironment(pack?.defaultEnvironment ?? "");
    setDefaultTargetId(pack?.defaultTargetId ?? "");
    setSearch("");
    setPendingAdd(new Set());
  }, [pack]);

  const projectCases = useMemo(() => {
    const allPack = testPacks.find((item) => item.projectId === currentProject.id && item.kind === "all");
    return allPack ? testCases.filter((testCase) => allPack.caseIds.includes(testCase.id)) : testCases;
  }, [currentProject.id, testCases, testPacks]);
  const selectedCases = useMemo(
    () => pack ? projectCases.filter((testCase) => pack.caseIds.includes(testCase.id)) : [],
    [pack, projectCases]
  );
  const availableCases = useMemo(() => {
    if (!pack) return [];
    const query = search.trim().toLowerCase();
    return projectCases.filter((testCase) => !pack.caseIds.includes(testCase.id) && (!query || `${testCase.code || testCase.id} ${testCase.name} ${testCase.module} ${testCase.requirementId}`.toLowerCase().includes(query)));
  }, [pack, projectCases, search]);
  const latestRun = useMemo(
    () => pack ? runs.filter((run) => run.packId === pack.id).sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt))[0] ?? null : null,
    [pack, runs]
  );

  if (!pack) return null;

  const metadataLocked = protectedKinds.includes(pack.kind);
  const membershipLocked = computedMembershipKinds.includes(pack.kind);
  const automated = selectedCases.filter((testCase) => testCase.automation === "automated").length;
  const manual = selectedCases.length - automated;
  const passRate = latestRun && latestRun.total ? Math.round(latestRun.passed / latestRun.total * 100) : null;
  const archive = () => {
    updatePack(pack.id, { archived: true });
    toast.success(`${pack.name} archived`);
    onClose();
  };
  const save = () => {
    updatePack(pack.id, {
      name: metadataLocked ? pack.name : name.trim() || pack.name,
      description,
      kind: metadataLocked ? pack.kind : kind,
      defaultEnvironment: defaultEnvironment || undefined,
      defaultTargetId: defaultTargetId || undefined,
    });
    toast.success("Test Pack saved");
  };
  const removeCase = (caseId: string) => {
    updatePack(pack.id, { caseIds: pack.caseIds.filter((id) => id !== caseId) });
    toast.success("Test case removed from this pack");
  };
  const addSelected = () => {
    if (!pendingAdd.size) return;
    updatePack(pack.id, { caseIds: Array.from(new Set([...pack.caseIds, ...pendingAdd])) });
    toast.success(`${pendingAdd.size} cases added to ${pack.name}`);
    setPendingAdd(new Set());
  };
  const togglePending = (caseId: string) => setPendingAdd((previous) => {
    const next = new Set(previous);
    next.has(caseId) ? next.delete(caseId) : next.add(caseId);
    return next;
  });

  return <>
    <Drawer
      open
      onClose={onClose}
      title="Test Pack"
      subtitle={pack.name}
      width="max-w-xl"
      footer={<div className="flex w-full flex-wrap gap-2">
        <Button variant="primary" size="sm" disabled={!automated} onClick={() => onRun(pack)}><PlayIcon className="h-3.5 w-3.5" /> Run pack</Button>
        <Button variant="secondary" size="sm" onClick={save}><SaveIcon className="h-3.5 w-3.5" /> Save</Button>
        <Button variant="ghost" size="sm" onClick={async () => {const copy = await duplicatePack(pack.id);if (copy) toast.success(`${copy.name} created`);}}><CopyIcon className="h-3.5 w-3.5" /> Duplicate</Button>
        {!metadataLocked && <Button variant="ghost" size="sm" className="ml-auto text-[rgb(var(--fail))]" onClick={() => setConfirmArchive(true)}><ArchiveIcon className="h-3.5 w-3.5" /> Archive</Button>}
      </div>}>
      <div className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Pack name</span><input id="pack-name" value={name} disabled={metadataLocked} onChange={(event) => setName(event.target.value)} className="control" /></label>
          <label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Pack type</span><select value={kind} disabled={metadataLocked} onChange={(event) => setKind(event.target.value as PackKind)} className="control"><option value="feature">Feature</option><option value="requirement">Requirement</option><option value="release">Release</option><option value="custom">Custom</option></select></label>
        </div>
        <label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent" /></label>

        <section aria-labelledby="pack-coverage">
          <h3 id="pack-coverage" className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-3">Coverage</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Info label="Cases" value={String(selectedCases.length)} /><Info label="Automated" value={String(automated)} /><Info label="Manual" value={String(manual)} /><Info label="Last pass rate" value={passRate === null ? "Not run" : `${passRate}%`} /></div>
        </section>

        <section aria-labelledby="pack-defaults">
          <h3 id="pack-defaults" className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-3">Run defaults</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Environment</span><select value={defaultEnvironment} onChange={(event) => setDefaultEnvironment(event.target.value as EnvironmentName | "")} className="control"><option value="">Project default ({currentProject.environment})</option>{environments.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Target</span><select value={defaultTargetId} onChange={(event) => setDefaultTargetId(event.target.value)} className="control"><option value="">Project default</option>{currentProject.targets.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}</select></label>
          </div>
          <p className="mt-2 text-2xs text-ink-3">Owner: {pack.owner} · Updated {new Date(pack.updatedAt).toLocaleDateString()}</p>
        </section>

        <section aria-labelledby="pack-last-run">
          <h3 id="pack-last-run" className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-3">Latest run</h3>
          {latestRun ? <div className="flex items-center gap-3 rounded-lg border border-line p-3"><StatusBadge status={latestRun.status} kind="run" size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{latestRun.name}</p><p className="mt-0.5 text-2xs text-ink-3">{latestRun.environment} · {latestRun.passed} passed · {latestRun.failed} failed</p></div></div> : <p className="rounded-lg bg-surface-2 p-3 text-sm text-ink-2">This Test Pack has not been run yet.</p>}
        </section>

        <section aria-labelledby="pack-membership">
          <h3 id="pack-membership" className="mb-1 text-2xs font-semibold uppercase tracking-wide text-ink-3">Membership</h3>
          <p className="mb-3 text-sm text-ink-2">{membershipLocked ? "Membership is calculated automatically for this system pack." : "A case can belong to multiple packs without being duplicated."}</p>
          {!membershipLocked && <>
            <div className="mb-2 flex gap-2"><label className="relative min-w-0 flex-1"><SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find cases to add…" className="control pl-9" /></label><Button size="sm" variant="secondary" disabled={!pendingAdd.size} onClick={addSelected}><PlusIcon className="h-3.5 w-3.5" /> Add {pendingAdd.size || ""}</Button></div>
            {search && <div className="mb-3 max-h-40 divide-y divide-line overflow-y-auto rounded-lg border border-line">{availableCases.map((testCase) => <label key={testCase.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-surface-2"><input type="checkbox" checked={pendingAdd.has(testCase.id)} onChange={() => togglePending(testCase.id)} className="accent-[rgb(var(--accent))]" /><span className="w-20 shrink-0 font-mono text-2xs text-ink-3">{testCase.code || testCase.id}</span><span className="min-w-0 flex-1 truncate text-sm text-ink">{testCase.name}</span></label>)}{!availableCases.length && <p className="p-3 text-center text-xs text-ink-3">No available cases found.</p>}</div>}
          </>}
          <div className="max-h-56 divide-y divide-line overflow-y-auto rounded-lg border border-line">
            {selectedCases.map((testCase) => <div key={testCase.id} className="flex items-center gap-2 px-3 py-2"><span className="w-20 shrink-0 font-mono text-2xs text-ink-3">{testCase.code || testCase.id}</span><span className="min-w-0 flex-1 truncate text-sm text-ink">{testCase.name}</span>{!membershipLocked && <button aria-label={`Remove ${testCase.code || testCase.id} from ${pack.name}`} onClick={() => removeCase(testCase.id)} className="rounded p-1 text-ink-3 hover:bg-[rgb(var(--fail-soft))] hover:text-[rgb(var(--fail))]"><XIcon className="h-3.5 w-3.5" /></button>}</div>)}
            {!selectedCases.length && <p className="p-4 text-center text-sm text-ink-3">This Test Pack is empty.</p>}
          </div>
        </section>
      </div>
    </Drawer>
    <ConfirmModal open={confirmArchive} onClose={() => setConfirmArchive(false)} onConfirm={archive} title="Archive Test Pack?" confirmLabel="Archive pack" destructive message="Archived packs are removed from Quick Run and the Workspace sidebar. Existing run and cycle history remains available." />
  </>;
}

function Info({ label, value }: {label: string;value: string;}) {
  return <div className="rounded-lg bg-surface-2 p-2.5"><div className="text-2xs text-ink-3">{label}</div><div className="mt-0.5 text-sm font-semibold text-ink">{value}</div></div>;
}
