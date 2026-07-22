



import React from "react";
import { cn } from "../../lib/cn";

export function Skeleton({ className }: {className?: string;}) {
  return <div className={cn("animate-pulse rounded bg-surface-2", className)} />;
}

export function TableSkeleton({ rows = 6 }: {rows?: number;}) {
  return (
    <div className="divide-y divide-line" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) =>
      <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="w-16 h-4" />
          <Skeleton className="h-4 flex-1 max-w-md" />
          <Skeleton className="w-20 h-4 hidden md:block" />
          <Skeleton className="w-16 h-4 hidden lg:block" />
          <Skeleton className="w-20 h-5 rounded-full" />
        </div>
      )}
    </div>);

}

