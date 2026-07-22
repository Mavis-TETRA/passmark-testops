
import React, { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { XIcon } from "lucide-react";
import { cn } from "../../lib/cn";

const focusable = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function Drawer({
  open, onClose, title, subtitle, headerExtra, children, footer, width = "max-w-2xl"


}: {open: boolean;onClose: () => void;title?: React.ReactNode;subtitle?: React.ReactNode;headerExtra?: React.ReactNode;children: React.ReactNode;footer?: React.ReactNode;width?: string;}) {
  const panelRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const reducedMotion = useReducedMotion();
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>(focusable)?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(focusable));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {event.preventDefault();last.focus();}
      if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first.focus();}
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {window.clearTimeout(timer);document.body.style.overflow = previousOverflow;window.removeEventListener("keydown", onKeyDown);openerRef.current?.focus();};
  }, [open]);

  return (
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined}>
          <motion.button aria-label="Close panel" className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-[1px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside ref={panelRef} className={cn("absolute right-0 top-0 flex h-full w-full flex-col border-l border-line bg-elevated shadow-drawer", width)} initial={reducedMotion ? false : { x: "100%" }} animate={{ x: 0 }} exit={reducedMotion ? undefined : { x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 320 }}>
            {(title || subtitle) && <header className="flex shrink-0 items-start gap-3 border-b border-line px-5 py-4"><div className="min-w-0 flex-1">{title && <h2 id={titleId} className="truncate text-base font-semibold text-ink">{title}</h2>}{subtitle && <div className="mt-0.5 truncate text-sm text-ink-2">{subtitle}</div>}</div>{headerExtra}<button onClick={onClose} aria-label="Close panel" className="shrink-0 rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink"><XIcon className="h-4 w-4" /></button></header>}
            <div className="flex-1 overflow-y-auto">{children}</div>
            {footer && <footer className="shrink-0 border-t border-line bg-surface px-5 py-3">{footer}</footer>}
          </motion.aside>
        </div>
      }
    </AnimatePresence>);

}
