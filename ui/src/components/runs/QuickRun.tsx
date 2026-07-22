

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangleIcon, CheckCircle2Icon, PlayIcon, ShieldAlertIcon } from "lucide-react";
import type { EnvironmentName, Project } from "../../lib/types";
import type { RunRequest } from "../../context/AppContext";
import { useApp } from "../../context/AppContext";
import { Button } from "../ui/Button";

const environments: EnvironmentName[] = ["Local", "Development", "Staging", "Production"];

export function QuickRun({ intent, onRun }: {intent: RunRequest | null;onRun: (request: RunRequest) => void;}) {
  const { projects, currentProject, environment: globalEnvironment, setCurrentProjectId, setEnvironment, setLocalTargetUrl, testCases, testPacks, getTargetUrl, smokeIntent } = useApp();
  const [projectId, setProjectId] = useState(currentProject.id);
  const [environment, setSelectedEnvironment] = useState<EnvironmentName>(currentProject.environment);
  const [targetId, setTargetId] = useState<string | null>(currentProject.defaultTargetId);
  const [packId, setPackId] = useState<string | null>(null);
  const [productionConfirmed, setProductionConfirmed] = useState(false);
  const appliedIntentRef = useRef<string | null>(null);

  const project = projects.find((item) => item.id === projectId) ?? currentProject;
  const packs = useMemo(
    () => testPacks.filter((item) => item.projectId === project.id && !item.archived && ["system", "saved"].includes(item.kind)),
    [project.id, testPacks]
  );
  const pack = packs.find((item) => item.id === packId) ?? null;
  const target = project.targets.find((item) => item.id === targetId) ?? null;
  const url = getTargetUrl(project.id, targetId, environment);
  const automated = testCases.filter((testCase) => pack?.caseIds.includes(testCase.id) && testCase.automation === "automated").length;

  useEffect(() => {
    const nextIntent = intent ?? smokeIntent;
    if (!nextIntent) {
      appliedIntentRef.current = null;
      return;
    }
    const intentKey = `${nextIntent.projectId}:${nextIntent.environment}:${nextIntent.targetId ?? "none"}:${nextIntent.packId ?? "none"}`;
    if (appliedIntentRef.current === intentKey) return;
    const nextProject = projects.find((item) => item.id === nextIntent.projectId);
    if (!nextProject) return;
    const validTarget = nextProject.targets.some((item) => item.id === nextIntent.targetId && item.urls[nextIntent.environment]);
    const validPack = testPacks.some((item) => item.id === nextIntent.packId && item.projectId === nextProject.id && !item.archived);
    appliedIntentRef.current = intentKey;
    setProjectId(nextProject.id);
    setCurrentProjectId(nextProject.id);
    setSelectedEnvironment(nextIntent.environment);
    setEnvironment(nextIntent.environment);
    setTargetId(validTarget ? nextIntent.targetId : defaultTargetFor(nextProject, nextIntent.environment));
    setPackId(validPack ? nextIntent.packId : smokePackFor(nextProject.id, testPacks));
    setProductionConfirmed(false);
  }, [intent, smokeIntent, projects, setCurrentProjectId, setEnvironment, testPacks]);

  useEffect(() => {
    if (intent || smokeIntent) return;
    if (!packs.some((item) => item.id === packId)) setPackId(smokePackFor(project.id, testPacks) ?? packs[0]?.id ?? null);
    if (!project.targets.some((item) => item.id === targetId && item.urls[environment])) setTargetId(defaultTargetFor(project, environment));
  }, [environment, intent, packId, packs, project, smokeIntent, targetId, testPacks]);

  useEffect(() => {
    if (intent || smokeIntent || environment === globalEnvironment) return;
    setSelectedEnvironment(globalEnvironment);
    setTargetId(defaultTargetFor(project, globalEnvironment));
    setProductionConfirmed(false);
  }, [environment, globalEnvironment, intent, project, smokeIntent]);

  const selectProject = (nextProjectId: string) => {
    const nextProject = projects.find((item) => item.id === nextProjectId);
    if (!nextProject) return;
    const nextEnvironment = nextProject.environment;
    setProjectId(nextProject.id);
    setCurrentProjectId(nextProject.id);
    setSelectedEnvironment(nextEnvironment);
    setEnvironment(nextEnvironment);
    setTargetId(defaultTargetFor(nextProject, nextEnvironment));
    setPackId(smokePackFor(nextProject.id, testPacks));
    setProductionConfirmed(false);
  };

  const selectEnvironment = (nextEnvironment: EnvironmentName) => {
    setSelectedEnvironment(nextEnvironment);
    setEnvironment(nextEnvironment);
    setTargetId(project.targets.some((item) => item.id === targetId && item.urls[nextEnvironment]) ? targetId : defaultTargetFor(project, nextEnvironment));
    setProductionConfirmed(false);
  };

  const invalidUrl = !!url && !isRunnableUrl(url);
  const reason = project.targets.length === 0 ?
  "This project has no target. Add a target before running." :
  !target ?
  `No target is available for ${environment}. Choose another environment or configure a target URL.` :
  !url ?
  `The selected target has no ${environment} URL.` :
  invalidUrl ?
  "The target URL is invalid. Update the project target, then retry." :
  target.reachable === false ?
  "Target is unreachable. Start it or choose another target." :
  !pack ?
  "No active Smoke or saved Test Pack is available for this project." :
  pack.caseIds.length === 0 ?
  "This pack has no test cases. Add cases in QA View before running." :
  automated === 0 ?
  "This pack contains manual cases only; create a Test Cycle instead." :
  environment === "Production" && !productionConfirmed ?
  "Confirm the Production target before running." :
  null;

  return (
    <section className="rounded-xl border border-line bg-surface p-3" aria-label="Quick Run configuration">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink">Quick Run</span>
        <span className="text-2xs text-ink-3">Project → Environment → Target → Test Pack</span>
        {(intent || smokeIntent) && <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-2xs font-medium text-accent"><CheckCircle2Icon className="h-3 w-3" /> Smoke ready to confirm</span>}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Project"><select value={projectId} onChange={(event) => selectProject(event.target.value)} className="control">{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Environment"><select value={environment} onChange={(event) => selectEnvironment(event.target.value as EnvironmentName)} className="control">{environments.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Target"><select value={targetId ?? ""} onChange={(event) => {setTargetId(event.target.value || null);setProductionConfirmed(false);}} className="control" disabled={!project.targets.length}>{project.targets.filter((item) => item.urls[environment]).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.urls[environment]}</option>)}{project.targets.filter((item) => item.urls[environment]).length === 0 && <option value="">No targets configured</option>}</select></Field>
        <Field label="Test Pack"><select value={packId ?? ""} onChange={(event) => setPackId(event.target.value || null)} className="control" disabled={!packs.length}>{packs.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.caseIds.length} cases</option>)}{packs.length === 0 && <option value="">No packs available</option>}</select></Field>
        <Button variant="primary" className="mt-[1.3125rem] h-9" disabled={!!reason} title={reason ?? "Run selected pack"} onClick={() => onRun({ projectId: project.id, environment, targetId, packId: pack?.id ?? null, caseIds: pack?.caseIds ?? [], source: "smoke" })}><PlayIcon className="h-4 w-4" /> Run {pack?.name ?? "pack"}</Button>
      </div>
      {environment === "Local" && <div className="mt-3 rounded-lg border border-accent/25 bg-accent-soft/40 p-3"><label className="block"><span className="mb-1 block text-xs font-medium text-ink">Local application URL</span><input value={project.targets[0]?.urls.Local ?? ""} onChange={(event) => setLocalTargetUrl(project.id, event.target.value)} className="control font-mono" placeholder="http://localhost:3000" /></label><p className="mt-1.5 text-2xs text-ink-3">Use the URL you open on this computer. The Docker runner automatically connects through <code className="font-mono text-ink-2">host.docker.internal</code>.</p></div>}
      {environment === "Production" && <label className="mt-3 flex items-start gap-2 rounded-lg border border-[rgb(var(--block))]/30 bg-[rgb(var(--block-soft))] p-2.5 text-xs text-ink-2"><input type="checkbox" checked={productionConfirmed} onChange={(event) => setProductionConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[rgb(var(--accent))]" /><span><strong className="text-ink"><ShieldAlertIcon className="mr-1 inline h-3.5 w-3.5 text-[rgb(var(--block))]" />Production confirmation required.</strong> This run targets a live environment. Verify the target and test data before continuing.</span></label>}
      {reason ? <div className="mt-3 flex items-center gap-2 rounded-lg bg-[rgb(var(--fail-soft))] px-3 py-2 text-xs text-ink"><AlertTriangleIcon className="h-4 w-4 shrink-0 text-[rgb(var(--fail))]" />{reason}</div> : <div className="mt-3 text-2xs text-ink-3">Target: <span className="font-mono text-ink-2">{url}</span> · {pack?.caseIds.length} cases · {automated} automated</div>}
    </section>);

}

function Field({ label, children }: {label: string;children: React.ReactNode;}) {
  return <label className="block"><span className="mb-1 block text-2xs font-medium text-ink-3">{label}</span>{children}</label>;
}

function defaultTargetFor(project: Project, environment: EnvironmentName): string | null {
  if (project.targets.some((target) => target.id === project.defaultTargetId && target.urls[environment])) return project.defaultTargetId;
  return project.targets.find((target) => target.urls[environment])?.id ?? null;
}

function smokePackFor(projectId: string, packs: ReturnType<typeof useApp>["testPacks"]): string | null {
  return packs.find((item) => item.projectId === projectId && item.name === "Smoke" && !item.archived)?.id ?? null;
}

function isRunnableUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}


