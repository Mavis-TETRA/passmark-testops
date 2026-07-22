
import React from "react";
import { cn } from "../../lib/cn";

export function RunProgress({ passed, failed, blocked = 0, skipped, total, running = false, className, showLabels = true }: {passed: number;failed: number;blocked?: number;skipped: number;total: number;running?: boolean;className?: string;showLabels?: boolean;}) {
  const complete = passed + failed + blocked + skipped;
  const width = (value: number) => total ? `${value / total * 100}%` : "0%";
  return <div className={className}><div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={complete} aria-valuemin={0} aria-valuemax={total} aria-label={`${complete} of ${total} tests completed`}><div className="absolute inset-0 flex"><div className="h-full bg-[rgb(var(--ok))] transition-all motion-reduce:transition-none" style={{ width: width(passed) }} /><div className="h-full bg-[rgb(var(--fail))] transition-all motion-reduce:transition-none" style={{ width: width(failed) }} /><div className="h-full bg-[rgb(var(--block))] transition-all motion-reduce:transition-none" style={{ width: width(blocked) }} /><div className="h-full bg-[rgb(var(--skip))] transition-all motion-reduce:transition-none" style={{ width: width(skipped) }} /></div>{running && <div className="absolute inset-y-0 w-1/4 animate-indeterminate bg-white/20 motion-reduce:hidden" style={{ left: width(complete) }} />}</div>{showLabels && <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-ink-2"><Legend color="bg-[rgb(var(--ok))]" label={`${passed} passed`} /><Legend color="bg-[rgb(var(--fail))]" label={`${failed} failed`} /><Legend color="bg-[rgb(var(--block))]" label={`${blocked} blocked`} /><Legend color="bg-[rgb(var(--skip))]" label={`${skipped} skipped`} /><span className="ml-auto tabular-nums">{complete}/{total}</span></div>}</div>;
}
function Legend({ color, label }: {color: string;label: string;}) {return <span className="inline-flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-full", color)} />{label}</span>;}

