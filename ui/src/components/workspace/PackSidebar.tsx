

import React from "react";
import { BotIcon, BookmarkIcon, HandIcon, LayersIcon, MoreHorizontalIcon, PlusIcon, RefreshCwIcon, RocketIcon, ZapIcon } from "lucide-react";
import type { TestPack } from "../../lib/types";
import { cn } from "../../lib/cn";

const icons: Record<string, React.ComponentType<{className?: string;}>> = { Smoke: ZapIcon, Regression: RefreshCwIcon, Release: RocketIcon, "All Test Cases": LayersIcon, Manual: HandIcon, Automated: BotIcon };

export function PackSidebar({ packs, activeId, onSelect, onCreate, onManage, quick }: {packs: TestPack[];activeId: string;onSelect: (id: string) => void;onCreate: () => void;onManage: (pack: TestPack) => void;quick: boolean;}) {
  const primary = packs.filter((pack) => pack.kind !== "saved" && !pack.archived);
  const saved = packs.filter((pack) => pack.kind === "saved" && !pack.archived);
  return <nav className="flex h-full flex-col" aria-label="Test Packs"><div className="space-y-0.5 p-3"><Label>Test Packs</Label>{primary.map((pack) => <PackButton key={pack.id} pack={pack} active={pack.id === activeId} onSelect={() => onSelect(pack.id)} onManage={() => onManage(pack)} quick={quick} />)}</div>{!quick && <div className="space-y-0.5 border-t border-line p-3"><div className="flex items-center justify-between"><Label>Saved Packs</Label><button aria-label="Create saved Test Pack" onClick={onCreate} className="rounded p-1 text-ink-3 hover:bg-surface-2 hover:text-ink"><PlusIcon className="h-3.5 w-3.5" /></button></div>{saved.map((pack) => <PackButton key={pack.id} pack={pack} active={pack.id === activeId} onSelect={() => onSelect(pack.id)} onManage={() => onManage(pack)} quick={false} />)}{saved.length === 0 && <p className="px-2 py-2 text-2xs text-ink-3">Save a filtered result as a reusable pack.</p>}</div>}</nav>;
}
function PackButton({ pack, active, onSelect, onManage, quick }: {pack: TestPack;active: boolean;onSelect: () => void;onManage: () => void;quick: boolean;}) {const Icon = icons[pack.name] ?? BookmarkIcon;return <div className={cn("group flex h-8 items-center gap-2 rounded-lg px-2", active ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink")}><button onClick={onSelect} aria-current={active ? "page" : undefined} className="flex min-w-0 flex-1 items-center gap-2.5 text-sm"><Icon className="h-4 w-4 shrink-0" /><span className="flex-1 truncate text-left">{pack.name}</span><span className="text-2xs tabular-nums">{pack.caseIds.length}</span></button>{!quick && <button onClick={onManage} aria-label={`Manage ${pack.name}`} className="rounded p-1 text-ink-3 opacity-0 hover:bg-surface group-hover:opacity-100 focus:opacity-100"><MoreHorizontalIcon className="h-3.5 w-3.5" /></button>}</div>;}
function Label({ children }: {children: React.ReactNode;}) {return <div className="px-2 pb-1 text-2xs font-semibold uppercase tracking-wide text-ink-3">{children}</div>;}

