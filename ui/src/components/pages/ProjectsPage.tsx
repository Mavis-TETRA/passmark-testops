

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ArrowRightIcon, CodeIcon, FolderPlusIcon, GlobeIcon, MonitorIcon, SearchIcon, ServerIcon, ZapIcon } from "lucide-react";
import { useApp } from "../../context/AppContext";
import type { Project, TargetType } from "../../lib/types";
import { StatusBadge } from "../ui/StatusBadge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { cn } from "../../lib/cn";
import { CreateProjectModal } from "../projects/CreateProjectModal";

const targetIcon: Record<TargetType, typeof GlobeIcon> = { "Web URL": GlobeIcon, "Local Web": MonitorIcon, "Source Code": CodeIcon, API: ServerIcon };

export function ProjectsPage() {
  const { projects, setCurrentProjectId, requestSmokeRun, viewMode } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const filtered = projects.filter((project) => project.name.toLowerCase().includes(query.toLowerCase()));
  return <div className="mx-auto max-w-7xl px-4 py-6"><div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center"><div><h1 className="text-xl font-semibold text-ink">Projects</h1><p className="mt-0.5 text-sm text-ink-2">{viewMode === "quick" ? "Run a Smoke pack or inspect the latest failure." : "Choose a project to run, author, or manage test coverage."}</p></div><div className="ml-auto flex gap-2"><div className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-2.5"><SearchIcon className="h-4 w-4 text-ink-3" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" aria-label="Search projects" className="w-44 bg-transparent text-sm outline-none placeholder:text-ink-3" /></div>{viewMode === "qa" && <Button variant="primary" onClick={() => setCreateOpen(true)}>New project</Button>}</div></div>{filtered.length === 0 ? <div className="rounded-xl border border-line bg-surface"><EmptyState icon={FolderPlusIcon} title="No projects match" description="Try another project name or clear the search." /></div> : <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">{filtered.map((project) => <ProjectCard key={project.id} project={project} onOpen={() => {setCurrentProjectId(project.id);navigate("/workspace");}} onSmoke={() => {requestSmokeRun(project.id);navigate("/runs?smoke=confirm");}} />)}</div>}<CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} /></div>;
}

function ProjectCard({ project, onOpen, onSmoke }: {project: Project;onOpen: () => void;onSmoke: () => void;}) {const target = project.targets.find((item) => item.id === project.defaultTargetId);const Icon = target ? targetIcon[target.type] : GlobeIcon;const noTarget = !target;return <article className="flex flex-col rounded-xl border border-line bg-surface p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h2 className="truncate text-sm font-semibold text-ink">{project.name}</h2><div className="mt-1 flex items-center gap-1.5 text-2xs text-ink-3"><span className="rounded bg-surface-2 px-1.5 py-0.5 font-medium">{project.environment}</span><span className="inline-flex min-w-0 items-center gap-1"><Icon className="h-3 w-3 shrink-0" /><span className="truncate font-mono">{target?.urls[project.environment] ?? "No target configured"}</span></span></div></div><StatusBadge status={project.status} size="sm" /></div><div className="mt-4 grid grid-cols-3 gap-2"><Metric label="Pass rate" value={project.passRate === null ? "—" : `${project.passRate}%`} tone={project.passRate !== null && project.passRate < 90 ? "fail" : "ok"} /><Metric label="Failing" value={String(project.failing)} tone={project.failing ? "fail" : "muted"} /><Metric label="Last run" value={project.lastRun ? formatDistanceToNow(new Date(project.lastRun)) : "Never"} tone="muted" small /></div>{noTarget && <p className="mt-3 rounded-lg bg-[rgb(var(--block-soft))] px-2.5 py-2 text-2xs text-ink-2">No target configured. Add a valid target to enable runs.</p>}<div className="mt-4 flex gap-2 border-t border-line pt-3"><Button variant="primary" size="sm" className="flex-1" disabled={noTarget} title={noTarget ? "Project has no target" : "Confirm and run Smoke"} onClick={onSmoke}><ZapIcon className="h-3.5 w-3.5" /> Run Smoke</Button><Button variant="secondary" size="sm" className="flex-1" onClick={onOpen}>Workspace <ArrowRightIcon className="h-3.5 w-3.5" /></Button></div></article>;}
function Metric({ label, value, tone, small }: {label: string;value: string;tone: "ok" | "fail" | "muted";small?: boolean;}) {return <div className="rounded-lg bg-surface-2 px-2.5 py-2"><div className="mb-0.5 text-2xs text-ink-3">{label}</div><div className={cn("font-semibold", small ? "text-xs" : "text-base", tone === "fail" ? "text-[rgb(var(--fail))]" : tone === "ok" ? "text-[rgb(var(--ok))]" : "text-ink")}>{value}</div></div>;}

