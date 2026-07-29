

import React from "react";
import { BotIcon, BookmarkIcon, BoxesIcon, ClipboardCheckIcon, HandIcon, LayersIcon, MoreHorizontalIcon, PlusIcon, RefreshCwIcon, RocketIcon, ZapIcon } from "lucide-react";
import type { TestPack } from "../../lib/types";
import { cn } from "../../lib/cn";

const icons: Record<string, React.ComponentType<{className?: string;}>> = { Smoke: ZapIcon, Regression: RefreshCwIcon, Release: RocketIcon, "All Test Cases": LayersIcon, Manual: HandIcon, Automated: BotIcon };
const kindIcons: Record<TestPack["kind"], React.ComponentType<{className?: string;}>> = {
  system: LayersIcon, all: LayersIcon, manual: HandIcon, automated: BotIcon,
  feature: BoxesIcon, requirement: ClipboardCheckIcon, release: RocketIcon,
  custom: BookmarkIcon, saved: BookmarkIcon,
};

export function PackSidebar({ packs, activeId, onSelect, onCreate, onManage, quick }: {packs: TestPack[];activeId: string;onSelect: (id: string) => void;onCreate: () => void;onManage: (pack: TestPack) => void;quick: boolean;}) {
  const active = packs.filter((pack) => !pack.archived);
  const groups = [
    { label: "System packs", packs: active.filter((pack) => ["system", "all", "manual", "automated"].includes(pack.kind)) },
    { label: "Features", packs: active.filter((pack) => pack.kind === "feature") },
    { label: "Requirements", packs: active.filter((pack) => pack.kind === "requirement") },
    { label: "Releases", packs: active.filter((pack) => pack.kind === "release") },
    { label: "Custom packs", packs: active.filter((pack) => ["custom", "saved"].includes(pack.kind)) },
  ];
  return <nav className="flex h-full flex-col overflow-y-auto p-3" aria-label="Test Packs">
    <div className="mb-2 flex items-center justify-between px-2">
      <span className="text-2xs font-semibold uppercase tracking-wide text-ink-3">Test Packs</span>
      {!quick && <button aria-label="Create Test Pack" onClick={onCreate} className="rounded p-1 text-ink-3 hover:bg-surface-2 hover:text-ink"><PlusIcon className="h-3.5 w-3.5" /></button>}
    </div>
    {groups.map((group) => group.packs.length > 0 && <section key={group.label} className="mb-3 space-y-0.5">
      <Label>{group.label}</Label>
      {group.packs.map((pack) => <PackButton key={pack.id} pack={pack} active={pack.id === activeId} onSelect={() => onSelect(pack.id)} onManage={() => onManage(pack)} quick={quick} />)}
    </section>)}
    {!quick && active.every((pack) => ["system", "all", "manual", "automated"].includes(pack.kind)) && <p className="rounded-lg border border-dashed border-line px-3 py-2 text-2xs leading-5 text-ink-3">Create a pack for one feature, requirement or release.</p>}
  </nav>;
}
function PackButton({ pack, active, onSelect, onManage, quick }: {pack: TestPack;active: boolean;onSelect: () => void;onManage: () => void;quick: boolean;}) {const Icon = icons[pack.name] ?? kindIcons[pack.kind] ?? BookmarkIcon;return <div className={cn("group flex h-8 items-center gap-2 rounded-lg px-2", active ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink")}><button onClick={onSelect} aria-current={active ? "page" : undefined} className="flex min-w-0 flex-1 items-center gap-2.5 text-sm"><Icon className="h-4 w-4 shrink-0" /><span className="flex-1 truncate text-left">{pack.name}</span><span className="text-2xs tabular-nums">{pack.caseIds.length}</span></button>{!quick && <button onClick={onManage} aria-label={`Manage ${pack.name}`} className="rounded p-1 text-ink-3 opacity-0 hover:bg-surface group-hover:opacity-100 focus:opacity-100"><MoreHorizontalIcon className="h-3.5 w-3.5" /></button>}</div>;}
function Label({ children }: {children: React.ReactNode;}) {return <div className="px-2 pb-1 text-2xs font-semibold uppercase tracking-wide text-ink-3">{children}</div>;}
