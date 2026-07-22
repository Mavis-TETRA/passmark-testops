import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import {
  ArchiveIcon, BotIcon, BugIcon, CheckSquareIcon, CopyIcon, EyeIcon, HandIcon,
  MoreHorizontalIcon, PencilIcon, RefreshCwIcon, ZapIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TestCase } from '../../lib/types';
import { StatusInline } from '../ui/StatusBadge';
import { PRIORITY, SEVERITY } from '../../lib/status';
import { cn } from '../../lib/cn';

interface TestCaseTableProps {
  cases: TestCase[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onOpen: (testCase: TestCase) => void;
  onEdit?: (testCase: TestCase) => void;
  onDuplicate?: (testCase: TestCase) => void;
  onAddToSmoke?: (testCase: TestCase) => void;
  onAddToRegression?: (testCase: TestCase) => void;
  onArchive?: (testCase: TestCase) => void;
  selectable: boolean;
}

interface OpenMenu {
  testCase: TestCase;
  left: number;
  top: number;
}

export function TestCaseTable({
  cases, selected, onToggle, onToggleAll, onOpen, onEdit, onDuplicate,
  onAddToSmoke, onAddToRegression, onArchive, selectable,
}: TestCaseTableProps) {
  const all = cases.length > 0 && cases.every((testCase) => selected.has(testCase.id));
  const partial = cases.some((testCase) => selected.has(testCase.id));
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return undefined;
    const closeOnPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!menuRef.current?.contains(target) && !target?.closest('[data-case-menu-trigger]')) setMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null);
    };
    const close = () => setMenu(null);
    document.addEventListener('pointerdown', closeOnPointerDown);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    const focusTimer = window.setTimeout(() => menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus(), 0);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('pointerdown', closeOnPointerDown);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [menu]);

  const openActions = (event: React.MouseEvent<HTMLButtonElement>, testCase: TestCase) => {
    event.stopPropagation();
    if (menu?.testCase.id === testCase.id) {
      setMenu(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const width = 224;
    const estimatedHeight = selectable ? 326 : 104;
    const margin = 8;
    const left = Math.min(window.innerWidth - width - margin, Math.max(margin, rect.right - width));
    const below = rect.bottom + 6;
    const top = below + estimatedHeight > window.innerHeight - margin
      ? Math.max(margin, rect.top - estimatedHeight - 6)
      : below;
    setMenu({ testCase, left, top });
  };

  const runAction = (action: (testCase: TestCase) => void) => {
    if (!menu) return;
    const target = menu.testCase;
    setMenu(null);
    action(target);
  };

  const copyId = async (testCase: TestCase) => {
    try {
      await navigator.clipboard.writeText(testCase.code || testCase.id);
      toast.success('Case ID copied.');
    } catch {
      toast.error('Could not copy the Case ID.');
    }
  };

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-2xs uppercase tracking-wide text-ink-3">
            {selectable && <Th className="w-10 pl-4"><input type="checkbox" checked={all} ref={(element) => { if (element) element.indeterminate = !all && partial; }} onChange={onToggleAll} aria-label="Select all visible cases" className="h-4 w-4 accent-[rgb(var(--accent))]" /></Th>}
            <Th>Case ID</Th><Th className="min-w-[240px]">Test case</Th><Th className="hidden md:table-cell">Priority</Th><Th className="hidden xl:table-cell">Severity</Th><Th className="hidden sm:table-cell">Mode</Th><Th>Status</Th><Th className="hidden lg:table-cell">Assignee</Th><Th className="hidden xl:table-cell">Last run</Th><Th className="w-10 pr-4" />
          </tr>
        </thead>
        <tbody>
          {cases.map((testCase) => (
            <tr
              key={testCase.id}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(testCase); }
              }}
              onClick={() => onOpen(testCase)}
              className={cn('group cursor-pointer hover:bg-surface-2 focus:bg-surface-2', selected.has(testCase.id) && 'bg-accent-soft/40')}
            >
              {selectable && <Td className="pl-4" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selected.has(testCase.id)} onChange={() => onToggle(testCase.id)} aria-label={`Select ${testCase.id}`} className="h-4 w-4 accent-[rgb(var(--accent))]" /></Td>}
              <Td><span className="font-mono text-2xs text-ink-3">{testCase.code ?? testCase.id}</span></Td>
              <Td><div className="flex max-w-[320px] items-center gap-1.5 truncate font-medium text-ink">{testCase.name}{testCase.defectId && <BugIcon className="h-3 w-3 shrink-0 text-[rgb(var(--fail))]" />}</div><div className="text-2xs text-ink-3">{testCase.module}</div></Td>
              <Td className="hidden md:table-cell"><span className={PRIORITY[testCase.priority]}>{testCase.priority}</span></Td>
              <Td className="hidden xl:table-cell"><span className={SEVERITY[testCase.severity]}>{testCase.severity}</span></Td>
              <Td className="hidden sm:table-cell"><span className="inline-flex items-center gap-1 text-2xs text-ink-2">{testCase.automation === 'automated' ? <BotIcon className="h-3.5 w-3.5" /> : <HandIcon className="h-3.5 w-3.5" />}{testCase.automation === 'automated' ? 'Auto' : 'Manual'}</span></Td>
              <Td><StatusInline status={testCase.status} /></Td>
              <Td className="hidden lg:table-cell text-xs text-ink-2">{testCase.assignee ?? 'Unassigned'}</Td>
              <Td className="hidden whitespace-nowrap xl:table-cell"><span className="text-2xs text-ink-3">{testCase.lastRun ? format(new Date(testCase.lastRun), 'MMM d, HH:mm') : '—'}</span></Td>
              <Td className="pr-4" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  data-case-menu-trigger
                  aria-label={`Actions for ${testCase.code || testCase.id}`}
                  aria-haspopup="menu"
                  aria-expanded={menu?.testCase.id === testCase.id}
                  onClick={(event) => openActions(event, testCase)}
                  className={cn('rounded-md p-1.5 text-ink-3 opacity-0 hover:bg-surface hover:text-ink focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent group-hover:opacity-100', menu?.testCase.id === testCase.id && 'bg-surface text-ink opacity-100')}
                ><MoreHorizontalIcon className="h-4 w-4" /></button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>

      {menu && createPortal(
        <div ref={menuRef} role="menu" aria-label={`Actions for ${menu.testCase.code || menu.testCase.id}`} style={{ left: menu.left, top: menu.top }} className="fixed z-[80] w-56 rounded-xl border border-line bg-surface p-1.5 shadow-pop">
          <MenuItem icon={EyeIcon} label="Open details" onClick={() => runAction(onOpen)} />
          {selectable && <>
            <MenuItem icon={PencilIcon} label="Edit case" onClick={() => onEdit && runAction(onEdit)} disabled={!onEdit} />
            <MenuItem icon={CheckSquareIcon} label={selected.has(menu.testCase.id) ? 'Clear selection' : 'Select case'} onClick={() => runAction((testCase) => onToggle(testCase.id))} />
            <div className="my-1 border-t border-line" />
            <MenuItem icon={ZapIcon} label="Add to Smoke" onClick={() => onAddToSmoke && runAction(onAddToSmoke)} disabled={!onAddToSmoke} />
            <MenuItem icon={RefreshCwIcon} label="Add to Regression" onClick={() => onAddToRegression && runAction(onAddToRegression)} disabled={!onAddToRegression} />
            <MenuItem icon={CopyIcon} label="Duplicate case" onClick={() => onDuplicate && runAction(onDuplicate)} disabled={!onDuplicate} />
          </>}
          <MenuItem icon={CopyIcon} label="Copy Case ID" onClick={() => runAction((testCase) => { void copyId(testCase); })} />
          {selectable && <><div className="my-1 border-t border-line" /><MenuItem icon={ArchiveIcon} label="Archive case" destructive onClick={() => onArchive && runAction(onArchive)} disabled={!onArchive} /></>}
        </div>,
        document.body,
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, disabled = false, destructive = false }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; disabled?: boolean; destructive?: boolean }) {
  return <button type="button" role="menuitem" disabled={disabled} onClick={onClick} className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium outline-none hover:bg-surface-2 focus:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40', destructive ? 'text-[rgb(var(--fail))]' : 'text-ink-2')}><Icon className="h-4 w-4 shrink-0" />{label}</button>;
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn('sticky top-0 z-10 border-b border-line bg-surface-2 px-3 py-2.5 font-medium', className)}>{children}</th>;
}

function Td({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: (event: React.MouseEvent) => void }) {
  return <td onClick={onClick} className={cn('border-b border-line px-3 py-2.5 align-middle', className)}>{children}</td>;
}
