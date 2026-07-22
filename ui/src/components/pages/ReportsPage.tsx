import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ActivityIcon, AlertCircleIcon, DownloadIcon, TrendingDownIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import type { TestRun } from '../../lib/types';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { cn } from '../../lib/cn';

const axisTick = { fill: 'rgb(var(--ink-3))', fontSize: 11 };

function passRate(run: TestRun) {
  const handled = run.passed + run.failed + run.blocked;
  return handled ? Math.round((run.passed / handled) * 1000) / 10 : 0;
}

export function ReportsPage() {
  const { currentProject, environment, runs, testCases, testPacks, viewMode } = useApp();
  const [range, setRange] = useState('30');

  const projectRuns = useMemo(() => {
    const cutoff = range === 'all' ? 0 : Date.now() - Number(range) * 86_400_000;
    return runs.filter((run) => run.projectId === currentProject.id && run.environment === environment && (cutoff === 0 || new Date(run.startedAt).getTime() >= cutoff));
  }, [currentProject.id, environment, range, runs]);

  const projectCases = useMemo(() => {
    const caseIds = new Set(testPacks.filter((pack) => pack.projectId === currentProject.id).flatMap((pack) => pack.caseIds));
    return testCases.filter((testCase) => caseIds.has(testCase.id));
  }, [currentProject.id, testCases, testPacks]);

  const completedRuns = projectRuns.filter((run) => ['passed', 'failed', 'partially_completed'].includes(run.status));
  const totalPassed = completedRuns.reduce((sum, run) => sum + run.passed, 0);
  const totalFailed = completedRuns.reduce((sum, run) => sum + run.failed, 0);
  const totalHandled = completedRuns.reduce((sum, run) => sum + run.passed + run.failed + run.blocked, 0);
  const overallRate = totalHandled ? Math.round((totalPassed / totalHandled) * 1000) / 10 : 0;
  const averageDuration = completedRuns.length
    ? Math.round(completedRuns.reduce((sum, run) => sum + (run.duration || 0), 0) / completedRuns.length)
    : 0;
  const currentFailures = [...completedRuns].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0]?.failed || 0;

  const trend = [...completedRuns]
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .slice(-12)
    .map((run) => ({ date: format(new Date(run.startedAt), 'MMM d'), rate: passRate(run), pack: run.pack }));

  const environmentResults = [{
    env: environment.replace('Development', 'Dev').replace('Production', 'Prod'),
    passed: projectRuns.reduce((sum, run) => sum + run.passed, 0),
    failed: projectRuns.reduce((sum, run) => sum + run.failed, 0),
    skipped: projectRuns.reduce((sum, run) => sum + run.skipped + run.blocked, 0),
  }];

  const automation = [
    { name: 'Automated', value: projectCases.filter((item) => item.automation === 'automated').length, color: 'rgb(var(--accent))' },
    { name: 'Manual', value: projectCases.filter((item) => item.automation === 'manual').length, color: 'rgb(var(--block))' },
  ];
  const caseStatus = [
    { name: 'Passed', value: totalPassed, color: 'rgb(var(--ok))' },
    { name: 'Failed', value: totalFailed, color: 'rgb(var(--fail))' },
    { name: 'Blocked', value: completedRuns.reduce((sum, run) => sum + run.blocked, 0), color: 'rgb(var(--block))' },
    { name: 'Skipped', value: completedRuns.reduce((sum, run) => sum + run.skipped, 0), color: 'rgb(var(--skip))' },
  ];

  const topFailing = useMemo(() => {
    const failures = new Map<string, { id: string; name: string; count: number }>();
    for (const run of projectRuns) {
      for (const result of run.results.filter((item) => item.status === 'failed')) {
        const current = failures.get(result.caseId) || { id: result.caseId, name: result.name, count: 0 };
        current.count += 1;
        failures.set(result.caseId, current);
      }
    }
    return [...failures.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  }, [projectRuns]);

  const exportCsv = () => {
    const lines = [
      ['Run', 'Pack', 'Environment', 'Status', 'Passed', 'Failed', 'Blocked', 'Skipped', 'Pass rate', 'Started'],
      ...projectRuns.map((run) => [run.name, run.pack, run.environment, run.status, run.passed, run.failed, run.blocked, run.skipped, passRate(run), run.startedAt]),
    ];
    const csv = lines.map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `${currentProject.name.replace(/\W+/g, '-').toLowerCase()}-quality-report.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Quality report exported');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-ink">Reports</h1>
          <p className="mt-0.5 text-sm text-ink-2">
            {viewMode === 'quick' ? `The ${environment} signals a developer needs before and after a Smoke run.` : `Live ${environment} quality trends for ${currentProject.name}.`}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <select value={range} onChange={(event) => setRange(event.target.value)} className="control w-auto">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="all">All runs</option>
          </select>
          <Button variant="secondary" onClick={exportCsv} disabled={!projectRuns.length}>
            <DownloadIcon className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Pass rate" value={`${overallRate}%`} tone={overallRate >= 90 ? 'up' : 'down'} />
        <Kpi label="Current failures" value={String(currentFailures)} tone={currentFailures ? 'down' : 'up'} />
        <Kpi label="Completed runs" value={String(completedRuns.length)} tone="up" />
        <Kpi label="Avg run time" value={averageDuration ? `${Math.round(averageDuration / 60)}m` : '—'} tone="up" />
      </div>

      {!projectRuns.length ? (
        <EmptyState icon={ActivityIcon} title={`No ${environment} run data yet`} description="Queue a Smoke or Regression run, or select another environment." />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Card title="Pass-rate trend" className="lg:col-span-2">
            <ChartBox height="h-64">
              <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" />
                <XAxis dataKey="date" tick={axisTick} stroke="rgb(var(--line))" />
                <YAxis domain={[0, 100]} tick={axisTick} stroke="rgb(var(--line))" />
                <ChartTooltip />
                <Legend />
                <Line type="monotone" dataKey="rate" name="Pass rate %" stroke="rgb(var(--accent))" strokeWidth={2} dot />
              </LineChart>
            </ChartBox>
          </Card>

          {viewMode === 'qa' && (
            <Card title={`Results in ${environment}`}>
              <ChartBox>
                <BarChart data={environmentResults} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
                  <XAxis dataKey="env" tick={axisTick} stroke="rgb(var(--line))" />
                  <YAxis tick={axisTick} stroke="rgb(var(--line))" />
                  <ChartTooltip />
                  <Bar dataKey="passed" stackId="a" name="Passed" fill="rgb(var(--ok))" />
                  <Bar dataKey="failed" stackId="a" name="Failed" fill="rgb(var(--fail))" />
                  <Bar dataKey="skipped" stackId="a" name="Other" fill="rgb(var(--skip))" />
                </BarChart>
              </ChartBox>
            </Card>
          )}

          <Card title="Execution results"><Donut data={caseStatus} /></Card>
          {viewMode === 'qa' && <Card title="Manual vs automated"><Donut data={automation} /></Card>}
          <Card title="Top failing test cases" icon={AlertCircleIcon} className={viewMode === 'quick' ? 'lg:col-span-1' : ''}>
            {topFailing.length ? <RankList items={topFailing} /> : <p className="text-sm text-ink-3">No failed test cases in this range.</p>}
          </Card>
        </div>
      )}
    </div>
  );
}

function ChartBox({ children, height = 'h-56' }: { children: React.ReactElement; height?: string }) {
  return <div className={height}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;
}

function Donut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart><Pie data={data} dataKey="value" innerRadius={48} outerRadius={70} paddingAngle={2} stroke="none">{data.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><ChartTooltip /></PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-xl font-semibold text-ink">{total}</span><span className="text-2xs text-ink-3">total</span></div>
      </div>
      <ul className="flex-1 space-y-1.5">{data.map((item) => <li key={item.name} className="flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} /><span className="text-ink-2">{item.name}</span><span className="ml-auto font-medium text-ink">{item.value}</span></li>)}</ul>
    </div>
  );
}

function RankList({ items }: { items: { id: string; name: string; count: number }[] }) {
  return <ul className="-mx-4 -mb-4 divide-y divide-line">{items.map((item, index) => <li key={item.id} className="flex items-center gap-3 px-4 py-2.5"><span className="w-4 font-mono text-2xs text-ink-3">{index + 1}</span><div className="min-w-0 flex-1"><div className="truncate text-sm text-ink">{item.name}</div><div className="font-mono text-2xs text-ink-3">{item.id}</div></div><span className="rounded bg-[rgb(var(--fail-soft))] px-1.5 py-0.5 text-xs font-semibold text-[rgb(var(--fail))]">{item.count} failed</span></li>)}</ul>;
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: 'up' | 'down' }) {
  return <div className="rounded-xl border border-line bg-surface px-4 py-3"><div className="text-2xs text-ink-3">{label}</div><div className="mt-1 flex items-center gap-2"><span className="text-2xl font-semibold tabular-nums text-ink">{value}</span><TrendingDownIcon className={cn('h-3.5 w-3.5', tone === 'up' ? 'rotate-180 text-[rgb(var(--ok))]' : 'text-[rgb(var(--fail))]')} /></div></div>;
}

function Card({ title, children, className, icon: Icon }: { title: string; children: React.ReactNode; className?: string; icon?: React.ComponentType<{ className?: string }> }) {
  return <section className={cn('rounded-xl border border-line bg-surface p-4', className)}><div className="mb-4 flex items-center gap-2">{Icon && <Icon className="h-4 w-4 text-ink-3" />}<h2 className="text-sm font-semibold text-ink">{title}</h2></div>{children}</section>;
}
