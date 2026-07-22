
import React, { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { XIcon } from "lucide-react";
import { cn } from "../../lib/cn";

const focusable = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "max-w-lg",
  icon









}: {open: boolean;onClose: () => void;title: React.ReactNode;subtitle?: React.ReactNode;children: React.ReactNode;footer?: React.ReactNode;size?: string;icon?: React.ReactNode;}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const reducedMotion = useReducedMotion();
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => {
      const preferred = dialogRef.current?.querySelector<HTMLElement>("[autofocus], input:not([disabled]), textarea:not([disabled]), select:not([disabled])");
      (preferred || dialogRef.current?.querySelector<HTMLElement>(focusable))?.focus();
    }, 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusable));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
      openerRef.current?.focus();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <motion.button aria-label="Close dialog" className="fixed inset-0 cursor-default bg-black/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div ref={dialogRef} className={cn("relative my-8 flex max-h-[calc(100vh_-_4rem)] w-full flex-col rounded-xl border border-line bg-elevated shadow-pop", size)} initial={reducedMotion ? false : { opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, scale: 0.97, y: 8 }} transition={{ duration: reducedMotion ? 0 : 0.15 }}>
            <header className="flex shrink-0 items-start gap-3 border-b border-line px-5 py-4">
              {icon && <div className="mt-0.5">{icon}</div>}
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-base font-semibold text-ink">{title}</h2>
                {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
              </div>
              <button onClick={onClose} aria-label="Close dialog" className="shrink-0 rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink"><XIcon className="h-4 w-4" /></button>
            </header>
            <div className="flex-1 overflow-y-auto">{children}</div>
            {footer && <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
          </motion.div>
        </div>
      }
    </AnimatePresence>);

}
