import React from "react";
import { BoxIcon, type LucideIcon } from "lucide-react";
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral"






}: {icon: LucideIcon;title: string;description?: React.ReactNode;action?: React.ReactNode;tone?: "neutral" | "error" | "warning";}) {
  const toneClass = tone === "error" ? "bg-[rgb(var(--fail-soft))] text-[rgb(var(--fail))]" : tone === "warning" ? "bg-[rgb(var(--block-soft))] text-[rgb(var(--block))]" : "bg-surface-2 text-ink-3";
  return <div className="flex flex-col items-center justify-center px-6 py-16 text-center"><div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${toneClass}`}><Icon className="h-6 w-6" aria-hidden="true" /></div><h3 className="text-sm font-semibold text-ink">{title}</h3>{description && <p className="mt-1.5 max-w-sm text-sm text-ink-2">{description}</p>}{action && <div className="mt-5">{action}</div>}</div>;
}
