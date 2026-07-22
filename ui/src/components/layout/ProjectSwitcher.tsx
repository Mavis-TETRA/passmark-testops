





import React, { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, CheckIcon, FolderGitIcon, SearchIcon } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { cn } from "../../lib/cn";

export function ProjectSwitcher() {
  const { projects, currentProject, environment, setCurrentProjectId } = useApp();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = projects.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 h-9 pl-2.5 pr-2 rounded-lg border border-line hover:bg-surface-2 transition-colors max-w-[240px]">
        
        <FolderGitIcon className="w-4 h-4 text-accent shrink-0" />
        <span className="text-sm font-medium text-ink truncate">{currentProject.name}</span>
        <ChevronDownIcon className="w-4 h-4 text-ink-3 shrink-0" />
      </button>

      {open &&
      <div
        role="listbox"
        className="absolute left-0 mt-1.5 w-80 bg-elevated border border-line rounded-xl shadow-pop z-50 overflow-hidden">
        
          <div className="p-2 border-b border-line">
            <div className="flex items-center gap-2 px-2 h-8 rounded-md bg-surface-2">
              <SearchIcon className="w-3.5 h-3.5 text-ink-3" />
              <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search projects…"
              className="bg-transparent text-sm text-ink placeholder:text-ink-3 outline-none w-full"
              aria-label="Search projects" />
            
            </div>
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {filtered.map((p) =>
          <li key={p.id}>
                <button
              role="option"
              aria-selected={p.id === currentProject.id}
              onClick={() => {
                setCurrentProjectId(p.id);
                setOpen(false);
                setQ("");
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-2",
                p.id === currentProject.id && "bg-surface-2"
              )}>
              
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink truncate">{p.name}</span>
                    <span className="block text-2xs text-ink-3 truncate">
                      {environment} · {p.targets.some((target) => target.urls[environment]) ? "Target configured" : "Not configured"}
                    </span>
                  </span>
                  {p.id === currentProject.id && <CheckIcon className="w-4 h-4 text-accent shrink-0" />}
                </button>
              </li>
          )}
            {filtered.length === 0 &&
          <li className="px-3 py-6 text-center text-sm text-ink-3">No projects found</li>
          }
          </ul>
        </div>
      }
    </div>);

}


