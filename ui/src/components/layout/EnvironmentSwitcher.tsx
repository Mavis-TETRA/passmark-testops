






import React from "react";
import { useApp } from "../../context/AppContext";
import type { EnvironmentName } from "../../lib/types";
import { cn } from "../../lib/cn";

const ENVS: EnvironmentName[] = ["Local", "Development", "Staging", "Production"];
const SHORT: Record<EnvironmentName, string> = {
  Local: "Local",
  Development: "Dev",
  Staging: "Staging",
  Production: "Prod"
};
const DOT: Record<EnvironmentName, string> = {
  Local: "bg-accent",
  Development: "bg-[rgb(var(--skip))]",
  Staging: "bg-[rgb(var(--block))]",
  Production: "bg-[rgb(var(--ok))]"
};

export function EnvironmentSwitcher() {
  const { environment, setEnvironment } = useApp();
  return (
    <div
      className="inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-line bg-surface-2"
      role="radiogroup"
      aria-label="Filter by environment"
      title={`Filter data and use ${environment} as the default run environment`}>
      
      {ENVS.map((env) => {
        const active = env === environment;
        return (
          <button
            key={env}
            role="radio"
            aria-checked={active}
            aria-label={`Use ${env} environment`}
            title={`Show ${env} data and use it for the next run`}
            onClick={() => setEnvironment(env)}
            className={cn(
              "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors",
              active ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"
            )}>
            
            <span className={cn("w-1.5 h-1.5 rounded-full", DOT[env])} aria-hidden="true" />
            <span className="hidden sm:inline">{env}</span>
            <span className="sm:hidden">{SHORT[env]}</span>
          </button>);

      })}
    </div>);

}
