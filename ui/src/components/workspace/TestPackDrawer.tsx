import React, { useEffect, useMemo, useState } from "react";
import { ArchiveIcon, CopyIcon, PlayIcon, SaveIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import type { TestPack } from "../../lib/types";
import { useApp } from "../../context/AppContext";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { ConfirmModal } from "../ui/ConfirmModal";
import { StatusBadge } from "../ui/StatusBadge";

export function TestPackDrawer({ pack, onClose }: {pack: TestPack | null;onClose: () => void;}) {
  const { testCases, runs, updatePack, duplicatePack, currentProject, getTargetUrl } = useApp();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [confirmArchive, setConfirmArchive] = useState(false);

  useEffect(() => {
    setName(pack?.name ?? "");
    setDescription(pack?.description ?? "");
  }, [pack]);

  const selectedCases = useMemo(
    () => pack ? testCases.filter((testCase) => pack.caseIds.includes(testCase.id)) : [],
    [pack, testCases]
  );
  const latestRun = useMemo(
    () => pack ? runs.filter((run) => run.packId === pack.id).sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt))[0] ?? null : null,
    [pack, runs]
  );

  if (!pack) return null;

  const automated = selectedCases.filter((testCase) => testCase.automation === "automated").length;
  const manual = selectedCases.length - automated;
  const passRate = latestRun && latestRun.total ? Math.round(latestRun.passed / latestRun.total * 100) : null;
  const archive = () => {
    updatePack(pack.id, { archived: true });
    toast.success(`${pack.name} archived`);
    onClose();
  };
  const removeCase = (caseId: string) => {
    updatePack(pack.id, { caseIds: pack.caseIds.filter((id) => id !== caseId) });
    toast.success("Test case removed from this pack");
  };

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title="Test Pack"
        subtitle={pack.name}
        width="max-w-lg"
        footer={
        <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={() => {updatePack(pack.id, { name: name.trim() || pack.name, description });toast.success("Test Pack saved");}}><SaveIcon className="h-3.5 w-3.5" /> Save changes</Button>
            <Button variant="secondary" size="sm" onClick={() => {const copy = duplicatePack(pack.id);if (copy) toast.success(`${copy.name} created`);}}><CopyIcon className="h-3.5 w-3.5" /> Duplicate</Button>
            <Button variant="ghost" size="sm" className="ml-auto text-[rgb(var(--fail))]" onClick={() => setConfirmArchive(true)}><ArchiveIcon className="h-3.5 w-3.5" /> Archive</Button>
          </div>
        }>
        
        <div className="space-y-5 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="pack-name">Pack name</label>
            <input id="pack-name" value={name} onChange={(event) => setName(event.target.value)} className="control" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="pack-description">Description</label>
            <textarea id="pack-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent" />
          </div>

          <section aria-labelledby="pack-coverage">
            <h3 id="pack-coverage" className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-3">Coverage</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Info label="Cases" value={String(selectedCases.length)} /><Info label="Automated" value={String(automated)} /><Info label="Manual" value={String(manual)} /><Info label="Last pass rate" value={passRate === null ? "Not run" : `${passRate}%`} /></div>
          </section>

          <section aria-labelledby="pack-defaults">
            <h3 id="pack-defaults" className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-3">Defaults</h3>
            <div className="rounded-lg border border-line p-3 text-sm text-ink-2">
              <div>Owner: <span className="font-medium text-ink">{pack.owner}</span></div>
              <div className="mt-1">Updated: <span className="font-medium text-ink">{new Date(pack.updatedAt).toLocaleDateString()}</span></div>
              <div className="mt-1">Environment: <span className="font-medium text-ink">{pack.defaultEnvironment ?? "Project default"}</span></div>
              <div className="mt-1 truncate">Target: <span className="font-mono text-xs text-ink">{pack.defaultTargetId ? getTargetUrl(currentProject.id, pack.defaultTargetId, pack.defaultEnvironment ?? currentProject.environment) ?? "Unavailable" : "Project default"}</span></div>
            </div>
          </section>

          <section aria-labelledby="pack-last-run">
            <h3 id="pack-last-run" className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-3">Latest run</h3>
            {latestRun ? <div className="flex items-center gap-3 rounded-lg border border-line p-3"><StatusBadge status={latestRun.status} kind="run" size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{latestRun.name}</p><p className="mt-0.5 text-2xs text-ink-3">{latestRun.environment} · {latestRun.passed} passed · {latestRun.failed} failed</p></div><PlayIcon className="h-4 w-4 text-ink-3" aria-hidden="true" /></div> : <p className="rounded-lg bg-surface-2 p-3 text-sm text-ink-2">This Test Pack has not been run yet. Queue it from the Workspace or Quick Run.</p>}
          </section>

          <section aria-labelledby="pack-membership">
            <h3 id="pack-membership" className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-3">Membership</h3>
            <p className="text-sm text-ink-2">A case can belong to multiple Test Packs. Remove it here without changing its other pack memberships.</p>
            <div className="mt-3 max-h-52 divide-y divide-line overflow-y-auto rounded-lg border border-line">
              {selectedCases.map((testCase) => <div key={testCase.id} className="flex items-center gap-2 px-3 py-2"><span className="font-mono text-2xs text-ink-3">{testCase.id}</span><span className="min-w-0 flex-1 truncate text-sm text-ink">{testCase.name}</span><button aria-label={`Remove ${testCase.id} from ${pack.name}`} onClick={() => removeCase(testCase.id)} className="rounded p-1 text-ink-3 hover:bg-[rgb(var(--fail-soft))] hover:text-[rgb(var(--fail))]"><XIcon className="h-3.5 w-3.5" /></button></div>)}
              {!selectedCases.length && <p className="p-4 text-center text-sm text-ink-3">This Test Pack is empty. Add cases from the Workspace table.</p>}
            </div>
          </section>
        </div>
      </Drawer>
      <ConfirmModal open={confirmArchive} onClose={() => setConfirmArchive(false)} onConfirm={archive} title="Archive Test Pack?" confirmLabel="Archive pack" destructive message="Archived packs are removed from Quick Run and the Workspace sidebar. Existing run and cycle history remains available." />
    </>);

}

function Info({ label, value }: {label: string;value: string;}) {
  return <div className="rounded-lg bg-surface-2 p-2.5"><div className="text-2xs text-ink-3">{label}</div><div className="mt-0.5 text-sm font-semibold text-ink">{value}</div></div>;
}


