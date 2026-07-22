import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ArrowRightIcon, CodeIcon, FolderPlusIcon, GlobeIcon, MonitorIcon, SearchIcon, ServerIcon, ZapIcon } from "lucide-react";
import { useApp } from "../../context/AppContext";
import type { EnvironmentName, Project, TargetType, TestRun, TestStatus } from "../../lib/types";
import { StatusBadge } from "../ui/StatusBadge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { cn } from "../../lib/cn";
import { CreateProjectModal } from "../projects/CreateProjectModal";

const targetIcon: Record<TargetType, typeof GlobeIcon> = { "Web URL": GlobeIcon, "Local Web": MonitorIcon, "Source Code": CodeIcon, API: ServerIcon };

export function ProjectsPage() {
  const { projects, runs, environment, setCurrentProjectId, requestSmokeRun, viewMode } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const environmentProjects = projects.filter((project) => project.targets.some((target) => Boolean(target.urls[environment])));
  const filtered = environmentProjects.filter((project) => project.name.toLowerCase().includes(normalizedQuery));
  const emptyTitle = normalizedQuery ? "No projects match" : `No projects configured for ${environment}`;
  const emptyDescription = normalizedQuery
    ? "Try another project name or clear the search."
    : `Configure a ${environment} target URL to show a project in this view.`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-ink">Projects</h1>
          <p className="mt-0.5 text-sm text-ink-2">
            {viewMode === "quick" ? `Projects ready to run in ${environment}.` : `Projects configured for ${environment}, with environment-specific quality signals.`}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <div className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-2.5">
            <SearchIcon className="h-4 w-4 text-ink-3" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" aria-label="Search projects" className="w-44 bg-transparent text-sm outline-none placeholder:text-ink-3" />
          </div>
          {viewMode === "qa" && <Button variant="primary" onClick={() => setCreateOpen(true)}>New project</Button>}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState icon={FolderPlusIcon} title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              environment={environment}
              runs={runs}
              onOpen={() => { setCurrentProjectId(project.id, { syncEnvironment: false }); navigate("/workspace"); }}
              onSmoke={() => { requestSmokeRun(project.id); navigate("/runs?smoke=confirm"); }}
            />
          ))}
        </div>
      )}
      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function ProjectCard({ project, environment, runs, onOpen, onSmoke }: { project: Project; environment: EnvironmentName; runs: TestRun[]; onOpen: () => void; onSmoke: () => void }) {
  const target = project.targets.find((item) => item.id === project.defaultTargetId && item.urls[environment]) || project.targets.find((item) => item.urls[environment]);
  const targetUrl = target?.urls[environment];
  const Icon = target ? targetIcon[target.type] : GlobeIcon;
  const latest = runs
    .filter((run) => run.projectId === project.id && run.environment === environment)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
  const handled = latest ? latest.passed + latest.failed + latest.blocked + latest.skipped : 0;
  const passRate = handled ? Math.round((latest!.passed / handled) * 100) : null;
  const status = statusForRun(latest);

  return (
    <article className="flex flex-col rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-ink">{project.name}</h2>
          <div className="mt-1 flex items-center gap-1.5 text-2xs text-ink-3">
            <span className="rounded bg-surface-2 px-1.5 py-0.5 font-medium">{environment}</span>
            <span className="inline-flex min-w-0 items-center gap-1"><Icon className="h-3 w-3 shrink-0" /><span className="truncate font-mono">{targetUrl}</span></span>
          </div>
        </div>
        <StatusBadge status={status} size="sm" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric label="Pass rate" value={passRate === null ? "—" : `${passRate}%`} tone={passRate !== null && passRate < 90 ? "fail" : "ok"} />
        <Metric label="Failing" value={String(latest?.failed || 0)} tone={latest?.failed ? "fail" : "muted"} />
        <Metric label="Last run" value={latest ? formatDistanceToNow(new Date(latest.startedAt), { addSuffix: true }) : "Never"} tone="muted" small />
      </div>
      <div className="mt-4 flex gap-2 border-t border-line pt-3">
        <Button variant="primary" size="sm" className="flex-1" title={`Confirm and run Smoke in ${environment}`} onClick={onSmoke}><ZapIcon className="h-3.5 w-3.5" /> Run Smoke</Button>
        <Button variant="secondary" size="sm" className="flex-1" onClick={onOpen}>Workspace <ArrowRightIcon className="h-3.5 w-3.5" /></Button>
      </div>
    </article>
  );
}

function statusForRun(run: TestRun | undefined): TestStatus {
  if (!run || run.status === "generated") return "not_run";
  if (run.status === "system_error") return "failed";
  if (run.status === "partially_completed") return "blocked";
  return run.status;
}

function Metric({ label, value, tone, small }: { label: string; value: string; tone: "ok" | "fail" | "muted"; small?: boolean }) {
  return <div className="rounded-lg bg-surface-2 px-2.5 py-2"><div className="mb-0.5 text-2xs text-ink-3">{label}</div><div className={cn("font-semibold", small ? "text-xs" : "text-base", tone === "fail" ? "text-[rgb(var(--fail))]" : tone === "ok" ? "text-[rgb(var(--ok))]" : "text-ink")}>{value}</div></div>;
}
