











import React, { useState } from "react";
import { ChevronRightIcon, CopyIcon, CheckIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/cn";

export function Collapsible({
  title,
  children,
  defaultOpen = false,
  count





}: {title: string;children: React.ReactNode;defaultOpen?: boolean;count?: string;}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-line rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 h-9 bg-surface-2 hover:bg-line/40 text-left">
        
        <ChevronRightIcon className={cn("w-4 h-4 text-ink-3 transition-transform", open && "rotate-90")} />
        <span className="text-xs font-medium text-ink">{title}</span>
        {count && <span className="text-2xs text-ink-3">{count}</span>}
      </button>
      {open && <div className="border-t border-line">{children}</div>}
    </div>);

}

export function CodeBlock({ code, language }: {code: string;language?: string;}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      {language &&
      <span className="absolute top-2 left-3 text-2xs text-ink-3 font-mono uppercase">{language}</span>
      }
      <button
        onClick={() => {
          navigator.clipboard?.writeText(code);
          setCopied(true);
          toast.success("Copied to clipboard");
          setTimeout(() => setCopied(false), 1500);
        }}
        aria-label="Copy code"
        className="absolute top-2 right-2 p-1.5 rounded-md bg-surface border border-line text-ink-3 hover:text-ink opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
        
        {copied ? <CheckIcon className="w-3.5 h-3.5 text-[rgb(var(--ok))]" /> : <CopyIcon className="w-3.5 h-3.5" />}
      </button>
      <pre className={cn("overflow-x-auto p-3 text-xs font-mono text-ink-2 leading-relaxed", language && "pt-7")}>
        <code>{code}</code>
      </pre>
    </div>);

}

