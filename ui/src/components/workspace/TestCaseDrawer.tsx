
import React, { useState } from "react";
import {
  ArchiveIcon,
  BotIcon,
  CopyIcon,
  HandIcon,
  HistoryIcon,
  PlayIcon } from
"lucide-react";
import { toast } from "sonner";
import type { TestCase, TestCycle } from "../../lib/types";
import { useApp } from "../../context/AppContext";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { ManualExecutionPanel } from "./ManualExecutionPanel";
import { EvidenceViewer } from "../runs/EvidenceViewer";
import { PRIORITY, SEVERITY, formatDuration } from "../../lib/status";
import { cn } from "../../lib/cn";

interface TestCaseDrawerProps {
  testCase: TestCase | null;
  onClose: () => void;
  onArchive: (testCase: TestCase) => void;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  cycle: TestCycle | null;
}

export function TestCaseDrawer({ testCase, onClose, onArchive, index, total, onNext, onPrev, cycle }: TestCaseDrawerProps) {
  const { viewMode, saveManualExecution, testPacks, createTestCase } = useApp();
  const [manual, setManual] = useState(false);

  if (!testCase) return null;
  const execution = cycle?.executions[testCase.id];
  const cyclePack = testPacks.find((pack) => pack.id === cycle?.packId);
  const canExecuteManually = viewMode === "qa" && !!cycle && testCase.automation === "manual" && !!cyclePack?.caseIds.includes(testCase.id);
  const footer = !manual ?
  <div className="flex flex-wrap gap-2">
      {canExecuteManually &&
    <Button variant="primary" size="sm" onClick={() => setManual(true)}>
          <PlayIcon className="h-3.5 w-3.5" /> Run manually
        </Button>
    }
      {viewMode === "qa" &&
    <>
          <Button variant="secondary" size="sm" onClick={() => {
            void createTestCase({
              ...testCase,
              id: undefined,
              code: `${testCase.code || 'TC'}-COPY-${Date.now().toString().slice(-4)}`,
              name: `${testCase.name} copy`,
              status: 'not_run',
              actual: '',
              defectId: null,
              lastRun: null,
              duration: null,
            }).then((created) => toast.success(`${created.code || created.id} created.`)).catch((error) => toast.error(error instanceof Error ? error.message : String(error)));
          }}>
            <CopyIcon className="h-3.5 w-3.5" /> Duplicate
          </Button>
          <Button variant="ghost" size="sm" className="ml-auto text-[rgb(var(--fail))]" onClick={() => onArchive(testCase)}>
            <ArchiveIcon className="h-3.5 w-3.5" /> Archive
          </Button>
        </>
    }
    </div> :
  undefined;

  return (
    <Drawer
      open
      onClose={() => {
        setManual(false);
        onClose();
      }}
      width="max-w-2xl"
      title={testCase.name}
      subtitle={`${testCase.code ?? testCase.id} · ${testCase.module} / ${testCase.feature}`}
      headerExtra={<StatusBadge status={execution?.overallStatus ?? testCase.status} />}
      footer={footer}>
      
      {manual ?
      <ManualExecutionPanel
        testCase={testCase}
        index={index}
        total={total}
        initial={execution}
        onSave={(item) => cycle && saveManualExecution(cycle.id, item)}
        onNext={onNext}
        onPrev={onPrev}
        onExit={() => setManual(false)} /> :


      <div className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Meta label="Priority" value={testCase.priority} className={PRIORITY[testCase.priority]} />
            <Meta label="Severity" value={testCase.severity} className={SEVERITY[testCase.severity]} />
            <Meta label="Type" value={testCase.type} />
            <Meta
            label="Mode"
            value={
            <span className="inline-flex items-center gap-1">
                  {testCase.automation === "automated" ? <BotIcon className="h-3.5 w-3.5" /> : <HandIcon className="h-3.5 w-3.5" />}
                  {testCase.automation === "automated" ? "Automated" : "Manual"}
                </span>
            } />
          
          </div>

          <section><Title>Objective</Title><p className="text-sm leading-relaxed text-ink-2">{testCase.objective}</p></section>
          <section><Title>Preconditions</Title><p className="text-sm leading-relaxed text-ink-2">{testCase.preconditions}</p></section>
          <section><Title>Test data</Title><pre className="whitespace-pre-wrap rounded-lg border border-line bg-surface-2 p-3 font-mono text-xs text-ink-2">{testCase.testData}</pre></section>
          <section>
            <Title>Steps</Title>
            <ol className="divide-y divide-line overflow-hidden rounded-lg border border-line">
              {testCase.steps.map((step, stepIndex) =>
            <li key={step.id} className="flex gap-3 px-3 py-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-2xs font-semibold text-ink-2">{stepIndex + 1}</span>
                  <div><p className="text-sm text-ink">{step.action}</p><p className="mt-0.5 text-xs text-ink-3">→ {step.expected}</p></div>
                </li>
            )}
            </ol>
          </section>
          <div className="grid gap-3 sm:grid-cols-2">
            <section><Title>Expected Result</Title><p className="text-sm text-ink-2">{testCase.expected}</p></section>
            <section><Title>Actual Result</Title><p className="text-sm text-ink-2">{execution?.actual || testCase.actual || "Not recorded"}</p></section>
          </div>
          <section><Title>Evidence</Title><EvidenceViewer screenshot={execution?.evidenceAttached || testCase.status === "failed"} trace={testCase.status === "failed"} /></section>
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Defect" value={execution?.defectId || testCase.defectId || "No linked defect"} />
            <Info label="Last run · duration" value={testCase.lastRun ? formatDuration(testCase.duration) : "Never run"} />
          </div>
          <section><Title><span className="inline-flex items-center gap-1.5"><HistoryIcon className="h-3.5 w-3.5" /> History</span></Title><p className="text-sm text-ink-2">Last automated result: {testCase.status.replace("_", " ")}.</p></section>
        </div>
      }
    </Drawer>);

}

function Meta({ label, value, className }: {label: string;value: React.ReactNode;className?: string;}) {
  return <div className="rounded-lg bg-surface-2 p-2.5"><div className="text-2xs text-ink-3">{label}</div><div className={cn("mt-0.5 text-sm font-medium text-ink", className)}>{value}</div></div>;
}
function Title({ children }: {children: React.ReactNode;}) {return <h3 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-3">{children}</h3>;}
function Info({ label, value }: {label: string;value: string;}) {return <div className="rounded-lg border border-line p-3"><div className="text-2xs text-ink-3">{label}</div><div className="mt-1 text-sm text-ink-2">{value}</div></div>;}


