import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BarChart3Icon, BeakerIcon, BotIcon, ChevronRightIcon, FolderIcon, MoonIcon, PlayIcon, SunIcon, ZapIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cn } from '../../lib/cn';
import { AIControlDrawer } from '../ai/AIControlDrawer';
import { Tooltip } from '../ui/Tooltip';
import { EnvironmentSwitcher } from './EnvironmentSwitcher';
import { ProjectSwitcher } from './ProjectSwitcher';

const navigation = [
  { to: '/projects', label: 'Projects', icon: FolderIcon },
  { to: '/workspace', label: 'Test Workspace', icon: BeakerIcon },
  { to: '/runs', label: 'Runs', icon: PlayIcon },
  { to: '/reports', label: 'Reports', icon: BarChart3Icon },
];

export function AppHeader() {
  const { theme, toggleTheme, viewMode, setViewMode, aiStatus } = useApp();
  const { pathname } = useLocation();
  const [aiOpen, setAIOpen] = useState(false);
  const isProjectsPage = pathname === '/projects' || pathname === '/';

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4">
          <NavLink to="/projects" className="flex shrink-0 items-center gap-2" aria-label="Passmark TestOps home">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shadow-sm"><ZapIcon className="h-4 w-4 text-accent-fg" /></div>
            <span className="hidden text-sm font-semibold text-ink md:block">Passmark <span className="font-normal text-ink-3">TestOps</span></span>
          </NavLink>
          <div className="mx-1 hidden h-6 w-px bg-line sm:block" />
          {!isProjectsPage && <>
            <ProjectSwitcher />
            <ChevronRightIcon className="hidden h-4 w-4 text-ink-3 lg:block" />
          </>}
          <div className="hidden lg:block"><EnvironmentSwitcher /></div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center rounded-lg border border-line bg-surface-2 p-0.5 sm:inline-flex" role="radiogroup" aria-label="View mode">
              {(['quick', 'qa'] as const).map((mode) => (
                <button key={mode} role="radio" aria-checked={viewMode === mode} onClick={() => setViewMode(mode)} className={cn('h-7 rounded-md px-3 text-xs font-medium', viewMode === mode ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink')}>
                  {mode === 'quick' ? 'Dev View' : 'QA View'}
                </button>
              ))}
            </div>
            <Tooltip label="Local AI control">
              <button onClick={() => setAIOpen(true)} aria-label="Open Local AI control" className="relative flex h-9 items-center gap-2 rounded-lg border border-line px-2.5 text-xs font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
                <BotIcon className="h-4 w-4" /><span className="hidden xl:inline">{aiStatus.model}</span>
                <span className={cn('h-2 w-2 rounded-full', aiStatus.checking ? 'animate-pulse bg-[rgb(var(--block))]' : aiStatus.online ? 'bg-[rgb(var(--ok))]' : 'bg-[rgb(var(--fail))]')} />
              </button>
            </Tooltip>
            <Tooltip label={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
              <button onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-2 hover:bg-surface-2 hover:text-ink">
                {theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
              </button>
            </Tooltip>
          </div>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto border-t border-line px-2">
          <nav className="flex flex-1 items-center gap-1" aria-label="Primary">
            {navigation.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => cn('relative inline-flex h-10 items-center gap-2 whitespace-nowrap px-3 text-sm font-medium', isActive ? 'text-ink' : 'text-ink-3 hover:text-ink')}>
                {({ isActive }) => <><item.icon className="h-4 w-4" />{item.label}{isActive && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-accent" />}</>}
              </NavLink>
            ))}
          </nav>
          <div className="py-1.5 lg:hidden"><EnvironmentSwitcher /></div>
        </div>
      </header>
      <AIControlDrawer open={aiOpen} onClose={() => setAIOpen(false)} />
    </>
  );
}
