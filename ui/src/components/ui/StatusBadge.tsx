
import React from "react";
import { RUN_STATUS, TEST_STATUS } from "../../lib/status";
import type { RunStatus, TestStatus } from "../../lib/types";
import { cn } from "../../lib/cn";

type Status = TestStatus | RunStatus;

function getMeta(status: Status, kind: "test" | "run") {
  return kind === "run" ? RUN_STATUS[status as RunStatus] : TEST_STATUS[status as TestStatus];
}

export function StatusBadge({ status, kind = "test", size = "md", className }: {status: Status;kind?: "test" | "run";size?: "sm" | "md";className?: string;}) {
  const meta = getMeta(status, kind);
  const Icon = meta.icon;
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full font-medium", size === "sm" ? "px-1.5 py-0.5 text-2xs" : "px-2 py-0.5 text-xs", meta.pill, className)}><Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5", meta.spin && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />{meta.label}</span>;
}

export function StatusInline({ status, kind = "test" }: {status: Status;kind?: "test" | "run";}) {
  const meta = getMeta(status, kind);
  const Icon = meta.icon;
  return <span className={cn("inline-flex items-center gap-1.5 text-xs", meta.pill.split(" ")[0])}><Icon className={cn("h-3.5 w-3.5", meta.spin && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />{meta.label}</span>;
}

