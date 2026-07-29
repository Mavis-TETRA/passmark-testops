import React from 'react';
import {
  ArrowRightIcon, BotIcon, BoxesIcon, BookmarkIcon, ClipboardCheckIcon,
  MoreHorizontalIcon, PlusIcon, RocketIcon, SparklesIcon,
} from 'lucide-react';
import type { TestCase, TestPack } from '../../lib/types';
import { Button } from '../ui/Button';

const kindIcons: Partial<Record<TestPack['kind'], React.ComponentType<{ className?: string }>>> = {
  feature: BoxesIcon,
  requirement: ClipboardCheckIcon,
  release: RocketIcon,
  custom: BookmarkIcon,
  saved: BookmarkIcon,
};

const kindLabels: Partial<Record<TestPack['kind'], string>> = {
  feature: 'Feature',
  requirement: 'Requirement',
  release: 'Release',
  custom: 'Custom',
  saved: 'Saved',
};

export function TestPackOverview({
  packs,
  testCases,
  onCreate,
  onOpen,
  onGenerate,
  onManage,
}: {
  packs: TestPack[];
  testCases: TestCase[];
  onCreate: () => void;
  onOpen: (pack: TestPack) => void;
  onGenerate: (pack: TestPack) => void;
  onManage: (pack: TestPack) => void;
}) {
  return (
    <main className="h-[calc(100vh_-_97px)] overflow-y-auto bg-canvas">
      <div className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-accent">Test Workspace</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">Test Packs</h1>
            <p className="mt-1 max-w-2xl text-sm text-ink-2">
              Create one pack for each feature, requirement or release. Then let Local AI generate focused test cases inside that pack.
            </p>
          </div>
          <Button variant="primary" onClick={onCreate}>
            <PlusIcon className="h-4 w-4" /> Create Test Pack
          </Button>
        </div>

        {packs.length ? (
          <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Your Test Packs">
            {packs.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                testCases={testCases}
                onOpen={() => onOpen(pack)}
                onGenerate={() => onGenerate(pack)}
                onManage={() => onManage(pack)}
              />
            ))}
          </section>
        ) : (
          <section className="mt-8 flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-line bg-surface">
            <div className="max-w-lg px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft">
                <BoxesIcon className="h-6 w-6 text-accent" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-ink">Create your first Test Pack</h2>
              <p className="mt-2 text-sm leading-6 text-ink-2">
                Example: Login, Checkout, User management or Release 2.0. The pack starts empty, then Local AI can generate its test cases from your requirement.
              </p>
              <Button className="mt-5" variant="primary" onClick={onCreate}>
                <PlusIcon className="h-4 w-4" /> Create first pack
              </Button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function PackCard({
  pack,
  testCases,
  onOpen,
  onGenerate,
  onManage,
}: {
  pack: TestPack;
  testCases: TestCase[];
  onOpen: () => void;
  onGenerate: () => void;
  onManage: () => void;
}) {
  const Icon = kindIcons[pack.kind] || BookmarkIcon;
  const cases = testCases.filter((testCase) => pack.caseIds.includes(testCase.id));
  const automated = cases.filter((testCase) => testCase.automation === 'automated').length;
  const manual = cases.length - automated;
  const updated = Number.isNaN(Date.parse(pack.updatedAt))
    ? 'Recently'
    : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(pack.updatedAt));

  return (
    <article className="group flex min-h-64 flex-col rounded-xl border border-line bg-surface p-4 shadow-sm transition hover:border-line-strong hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft">
          <Icon className="h-5 w-5 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-2xs font-medium text-ink-2">
              {kindLabels[pack.kind] || 'Pack'}
            </span>
            <span className="text-2xs text-ink-3">Updated {updated}</span>
          </div>
          <h2 className="mt-2 truncate text-base font-semibold text-ink">{pack.name}</h2>
        </div>
        <button
          type="button"
          aria-label={`Manage ${pack.name}`}
          onClick={onManage}
          className="rounded-lg p-2 text-ink-3 hover:bg-surface-2 hover:text-ink"
        >
          <MoreHorizontalIcon className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-3 max-h-10 min-h-10 overflow-hidden text-sm leading-5 text-ink-2">
        {pack.description || 'No description yet. Add the requirement or feature scope before generating cases.'}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric label="Cases" value={cases.length} />
        <Metric label="Automated" value={automated} icon={<BotIcon className="h-3 w-3" />} />
        <Metric label="Manual" value={manual} />
      </div>

      <div className="mt-3 flex min-h-5 items-center gap-2 text-2xs text-ink-3">
        <span>{pack.defaultEnvironment || 'Project environment'}</span>
        <span>·</span>
        <span>{pack.defaultTargetId ? 'Target configured' : 'Project target'}</span>
      </div>

      <div className="mt-auto flex gap-2 pt-4">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onOpen}>
          Open pack <ArrowRightIcon className="h-3.5 w-3.5" />
        </Button>
        <Button variant="primary" size="sm" className="flex-1" onClick={onGenerate}>
          <SparklesIcon className="h-3.5 w-3.5" /> Generate
        </Button>
      </div>
    </article>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
      <span className="flex items-center gap-1 text-2xs text-ink-3">{icon}{label}</span>
      <strong className="mt-0.5 block text-base text-ink">{value}</strong>
    </div>
  );
}
