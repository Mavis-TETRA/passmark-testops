import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangleIcon, ArrowLeftIcon, BracesIcon, DownloadIcon, EyeIcon, FileSpreadsheetIcon, FileTextIcon,
  LayersIcon, PanelLeftIcon, PlayIcon, PlusIcon, RefreshCwIcon, SparklesIcon, UploadIcon, XIcon, ZapIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp, type TestcaseExportBundle } from '../../context/AppContext';
import type { TestCase, TestCycle, TestPack } from '../../lib/types';
import { AIGeneratorModal } from '../workspace/AIGeneratorModal';
import { FilterBar, EMPTY_FILTERS, type Filters } from '../workspace/FilterBar';
import { PackSidebar } from '../workspace/PackSidebar';
import { TestCaseDrawer } from '../workspace/TestCaseDrawer';
import { TestCaseTable } from '../workspace/TestCaseTable';
import { TestCycleDrawer } from '../workspace/TestCycleDrawer';
import { CreateTestPackModal } from '../workspace/CreateTestPackModal';
import { TestPackDrawer } from '../workspace/TestPackDrawer';
import { TestPackOverview } from '../workspace/TestPackOverview';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';

export function WorkspacePage() {
  const {
    viewMode, currentProject, environment, getTargetUrl, testCases, testPacks, cycles,
    addCasesToPack, addGeneratedCases, createTestPack, createTestCase, importCases,
    exportTestCases, updateTestCase, archiveTestCase, startRun,
    testcaseGeneration, testcaseGenerationActive, generationPanelRequest, requestGenerationPanel,
    setGenerationPanelVisible, setCurrentProjectId,
  } = useApp();
  const packs = useMemo(() => testPacks.filter((pack) => pack.projectId === currentProject.id && !pack.archived), [currentProject.id, testPacks]);
  const workspacePacks = useMemo(
    () => packs.filter((pack) => ['feature', 'requirement', 'release', 'custom', 'saved'].includes(pack.kind)),
    [packs]
  );
  const [activePackId, setActivePackId] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openCase, setOpenCase] = useState<TestCase | null>(null);
  const [editTarget, setEditTarget] = useState<TestCase | null>(null);
  const [packOpen, setPackOpen] = useState<TestPack | null>(null);
  const [activeCycle, setActiveCycle] = useState<TestCycle | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<TestCase | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [cycleOpen, setCycleOpen] = useState(false);
  const [createPackOpen, setCreatePackOpen] = useState(false);
  const [addToPackOpen, setAddToPackOpen] = useState(false);
  const [runConfirm, setRunConfirm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportBundle, setExportBundle] = useState<TestcaseExportBundle | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const handledGenerationPanelRequest = useRef(0);

  useEffect(() => {
    setActivePackId('');
    setSelected(new Set());
    setOpenCase(null);
    setFilters(EMPTY_FILTERS);
  }, [currentProject.id]);

  useEffect(() => {
    if (activePackId && !workspacePacks.some((pack) => pack.id === activePackId)) {
      setActivePackId('');
    }
  }, [activePackId, workspacePacks]);

  useEffect(() => {
    setSelected(new Set());
    setOpenCase(null);
    setFilters(EMPTY_FILTERS);
  }, [activePackId]);

  const activePack = workspacePacks.find((pack) => pack.id === activePackId) || null;

  useEffect(() => {
    setGenerationPanelVisible(aiOpen && Boolean(activePack));
    return () => setGenerationPanelVisible(false);
  }, [activePack, aiOpen, setGenerationPanelVisible]);

  useEffect(() => {
    if (!generationPanelRequest || generationPanelRequest === handledGenerationPanelRequest.current) return;
    if (!testcaseGeneration || testcaseGeneration.projectId !== currentProject.id) return;
    const runningPack = workspacePacks.find((pack) => pack.id === testcaseGeneration.packId);
    if (!runningPack) return;
    handledGenerationPanelRequest.current = generationPanelRequest;
    setActivePackId(runningPack.id);
    setAiOpen(true);
  }, [currentProject.id, generationPanelRequest, testcaseGeneration?.packId, testcaseGeneration?.projectId, workspacePacks]);

  const openGenerator = (pack: TestPack | null = activePack) => {
    if (testcaseGenerationActive && testcaseGeneration) {
      if (testcaseGeneration.projectId !== currentProject.id) {
        setCurrentProjectId(testcaseGeneration.projectId, { syncEnvironment: false });
        requestGenerationPanel();
        return;
      }
      const runningPack = workspacePacks.find((item) => item.id === testcaseGeneration.packId);
      if (runningPack) setActivePackId(runningPack.id);
      setAiOpen(true);
      return;
    }
    if (pack) setActivePackId(pack.id);
    setAiOpen(true);
  };

  const visible = useMemo(() => testCases.filter((testCase) => {
    if (!activePack || !activePack.caseIds.includes(testCase.id)) return false;
    const haystack = `${testCase.code || testCase.id} ${testCase.name} ${testCase.module}`.toLowerCase();
    if (filters.search && !haystack.includes(filters.search.toLowerCase())) return false;
    if (filters.module !== 'All' && testCase.module !== filters.module) return false;
    if (filters.type !== 'All' && testCase.type !== filters.type) return false;
    if (filters.priority !== 'All' && testCase.priority !== filters.priority) return false;
    if (filters.severity !== 'All' && testCase.severity !== filters.severity) return false;
    if (filters.status !== 'All' && testCase.status !== filters.status) return false;
    if (filters.automation !== 'All' && testCase.automation !== filters.automation) return false;
    return true;
  }), [activePack, filters, testCases]);
  const selectedCases = visible.filter((testCase) => selected.has(testCase.id));
  const runCases = selectedCases.length ? selectedCases : visible;
  const automated = runCases.filter((testCase) => testCase.automation === 'automated').length;
  const runEnvironment = activePack?.defaultEnvironment || environment;
  const preferredTargetId = activePack?.defaultTargetId || currentProject.defaultTargetId;
  const targetId = currentProject.targets.some((target) => target.id === preferredTargetId && target.urls[runEnvironment])
    ? preferredTargetId
    : currentProject.targets.find((target) => target.urls[runEnvironment])?.id || null;
  const targetUrl = getTargetUrl(currentProject.id, targetId, runEnvironment);
  const projectDefaultTarget = currentProject.targets.find((target) => target.id === currentProject.defaultTargetId)
    || currentProject.targets[0]
    || null;
  const createPackTarget = currentProject.targets.find((target) => target.id === currentProject.defaultTargetId && target.urls[environment])
    || currentProject.targets.find((target) => target.urls[environment])
    || projectDefaultTarget;
  const createPackTargetUrl = createPackTarget?.urls[environment] || null;
  const smokePack = packs.find((pack) => pack.name.toLowerCase() === 'smoke');
  const regressionPack = packs.find((pack) => pack.name.toLowerCase() === 'regression');
  const openIndex = openCase ? visible.findIndex((testCase) => testCase.id === openCase.id) : -1;
  const currentCycle = activeCycle || cycles.find((cycle) => cycle.projectId === currentProject.id && cycle.status === 'active') || null;
  const managedPack = packOpen ? packs.find((pack) => pack.id === packOpen.id) || packOpen : null;

  const toggle = (id: string) => setSelected((previous) => {
    const next = new Set(previous);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAll = () => setSelected(visible.every((testCase) => selected.has(testCase.id)) ? new Set() : new Set(visible.map((testCase) => testCase.id)));
  const queueRun = async () => {
    try {
      const run = await startRun({ projectId: currentProject.id, environment: runEnvironment, targetId, packId: activePack?.id || null, caseIds: runCases.map((testCase) => testCase.id), source: 'workspace' });
      setRunConfirm(false);
      toast.success(`${run.name} queued.`);
    } catch (runError) {
      toast.error(runError instanceof Error ? runError.message : String(runError));
    }
  };
  const chooseCycle = (cycle: TestCycle) => {
    const pack = testPacks.find((item) => item.id === cycle.packId);
    const first = testCases.find((testCase) => pack?.caseIds.includes(testCase.id) && testCase.automation === 'manual') || null;
    setActiveCycle(cycle);
    setCycleOpen(false);
    if (first) setOpenCase(first); else toast.info('This cycle has no manual cases.');
  };
  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Import Excel only accepts a native .xlsx file.');
      event.target.value = '';
      return;
    }
    setImporting(true);
    try {
      const count = await importCases(arrayBufferToBase64(await file.arrayBuffer()), file.name, activePack?.id || null);
      toast.success(`${count} cases imported and saved.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };
  const openExport = async () => {
    setExportOpen(true);
    setExporting(true);
    setExportBundle(null);
    try {
      const bundle = await exportTestCases(visible.map((testCase) => testCase.id), activePack?.id || null);
      setExportBundle(bundle);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      setExportOpen(false);
    } finally {
      setExporting(false);
    }
  };
  const addCaseToPack = (pack: TestPack | undefined, testCase: TestCase) => {
    if (!pack) return;
    if (pack.caseIds.includes(testCase.id)) {
      toast.info(`${testCase.code || testCase.id} is already in ${pack.name}.`);
      return;
    }
    addCasesToPack(pack.id, [testCase.id]);
    toast.success(`${testCase.code || testCase.id} added to ${pack.name}.`);
  };
  const duplicateCase = async (testCase: TestCase) => {
    try {
      const created = await createTestCase({
        ...testCase,
        id: undefined,
        code: `${testCase.code || 'TC'}-COPY-${Date.now().toString().slice(-4)}`,
        name: `${testCase.name} copy`,
        status: 'not_run',
        actual: '',
        defectId: null,
        lastRun: null,
        duration: null,
      }, activePack && activePack.kind !== 'all' ? activePack.id : null);
      toast.success(`${created.code || created.id} created.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };
  const confirmArchive = async () => {
    const target = archiveTarget;
    if (!target) return;
    try {
      await archiveTestCase(target.id);
      if (openCase?.id === target.id) setOpenCase(null);
      toast.success(`${target.code || target.id} archived.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <>
      {!activePack ? (
        <TestPackOverview
          packs={workspacePacks}
          testCases={testCases}
          onCreate={() => setCreatePackOpen(true)}
          onOpen={(pack) => setActivePackId(pack.id)}
          onGenerate={(pack) => openGenerator(pack)}
          onManage={setPackOpen}
        />
      ) : (
        <div className="flex h-[calc(100vh_-_97px)]">
          <aside className="hidden w-60 shrink-0 overflow-y-auto border-r border-line bg-surface md:block">
            <PackSidebar packs={workspacePacks} activeId={activePackId} onSelect={setActivePackId} onCreate={() => setCreatePackOpen(true)} onManage={setPackOpen} quick={viewMode === 'quick'} />
          </aside>
          {sidebarOpen && <div className="fixed inset-0 z-40 md:hidden"><button className="absolute inset-0 bg-black/40" aria-label="Close Test Pack drawer" onClick={() => setSidebarOpen(false)} /><div className="absolute left-0 top-0 h-full w-72 border-r border-line bg-surface"><PackSidebar packs={workspacePacks} activeId={activePackId} onSelect={(id) => { setActivePackId(id); setSidebarOpen(false); }} onCreate={() => { setSidebarOpen(false); setCreatePackOpen(true); }} onManage={setPackOpen} quick={viewMode === 'quick'} /></div></div>}

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface px-4 py-2.5">
              <Button variant="ghost" size="sm" onClick={() => setActivePackId('')}><ArrowLeftIcon className="h-3.5 w-3.5" /> All packs</Button>
              <span className="hidden h-5 w-px bg-line sm:block" />
              <button onClick={() => setSidebarOpen(true)} aria-label="Open Test Packs" className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-2 md:hidden"><PanelLeftIcon className="h-4 w-4" /></button>
              <span className="max-w-56 truncate text-sm font-semibold text-ink">{activePack.name}</span>
              {viewMode === 'qa' ? <>
                <Button variant="primary" size="sm" onClick={() => openGenerator()}><SparklesIcon className="h-3.5 w-3.5" /> Generate with AI</Button>
                <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}><PlusIcon className="h-3.5 w-3.5" /> Create Case</Button>
                <input ref={fileInput} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={importFile} />
                <Button variant="ghost" size="sm" disabled={importing} onClick={() => fileInput.current?.click()}><UploadIcon className={`h-3.5 w-3.5 ${importing ? 'animate-pulse' : ''}`} /> {importing ? 'Importing…' : 'Import Excel'}</Button>
                <Button variant="ghost" size="sm" disabled={exporting} onClick={() => void openExport()}><DownloadIcon className={`h-3.5 w-3.5 ${exporting ? 'animate-pulse' : ''}`} /> {exporting ? 'Preparing…' : 'Export'}</Button>
                <Button variant="ghost" size="sm" onClick={() => setCycleOpen(true)}>Test Cycles</Button>
              </> : <span className="text-xs text-ink-3">Dev View · inspect cases and run the current pack</span>}
              <div className="ml-auto"><Button variant="secondary" size="sm" disabled={!runCases.length || !automated || !targetUrl} title={!targetUrl ? 'No valid target' : !automated ? 'No automated cases in scope' : undefined} onClick={() => setRunConfirm(true)}><PlayIcon className="h-3.5 w-3.5" />{selectedCases.length ? `Run ${selectedCases.length} selected` : `Run ${visible.length} cases`}</Button></div>
            </div>
            <div className="shrink-0 border-b border-line bg-surface px-4 py-2.5"><FilterBar filters={filters} setFilters={setFilters} quick={viewMode === 'quick'} /></div>
            {!targetUrl && <div className="flex items-center gap-2 border-b border-[rgb(var(--block))]/20 bg-[rgb(var(--block-soft))] px-4 py-2 text-xs text-ink-2"><AlertTriangleIcon className="h-4 w-4 text-[rgb(var(--block))]" />No target URL is configured for {runEnvironment}. Configure a target before running automation.</div>}
            <div className="min-h-0 flex-1 bg-surface">
              {visible.length ? (
                <TestCaseTable cases={visible} selected={selected} onToggle={toggle} onToggleAll={toggleAll} onOpen={setOpenCase} onEdit={viewMode === 'qa' ? setEditTarget : undefined} onDuplicate={viewMode === 'qa' ? (testCase) => { void duplicateCase(testCase); } : undefined} onAddToSmoke={viewMode === 'qa' && smokePack ? (testCase) => addCaseToPack(smokePack, testCase) : undefined} onAddToRegression={viewMode === 'qa' && regressionPack ? (testCase) => addCaseToPack(regressionPack, testCase) : undefined} onArchive={viewMode === 'qa' ? setArchiveTarget : undefined} selectable={viewMode === 'qa'} />
              ) : (
                <EmptyState
                  icon={SparklesIcon}
                  title="This Test Pack is empty"
                  description="Describe the feature or requirement and let Local AI generate focused test cases directly into this pack."
                  action={viewMode === 'qa' ? <Button variant="primary" onClick={() => openGenerator()}><SparklesIcon className="h-4 w-4" /> Generate cases with AI</Button> : undefined}
                />
              )}
            </div>
          </div>

          {viewMode === 'qa' && selected.size > 0 && <div className="fixed bottom-4 left-1/2 z-30 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center gap-1 rounded-xl bg-ink px-2 py-1.5 text-canvas shadow-pop"><span className="px-2 text-xs font-medium">{selected.size} selected</span><Bulk label="Run" icon={PlayIcon} onClick={() => setRunConfirm(true)} /><Bulk label="Add to pack" icon={LayersIcon} onClick={() => setAddToPackOpen(true)} /><Bulk label="Add to Smoke" icon={ZapIcon} onClick={() => { if (smokePack) addCasesToPack(smokePack.id, selectedCases.map((testCase) => testCase.id)); toast.success('Cases added to Smoke.'); }} /><Bulk label="Add to Regression" icon={RefreshCwIcon} onClick={() => { if (regressionPack) addCasesToPack(regressionPack.id, selectedCases.map((testCase) => testCase.id)); toast.success('Cases added to Regression.'); }} /><button onClick={() => setSelected(new Set())} aria-label="Clear selection" className="rounded p-1.5 hover:bg-white/10"><XIcon className="h-4 w-4" /></button></div>}
        </div>
      )}

      <TestCaseDrawer testCase={openCase} onClose={() => setOpenCase(null)} onArchive={setArchiveTarget} index={openIndex} total={visible.length} onNext={() => openIndex < visible.length - 1 && setOpenCase(visible[openIndex + 1])} onPrev={() => openIndex > 0 && setOpenCase(visible[openIndex - 1])} cycle={currentCycle} />
      <AIGeneratorModal
        open={aiOpen && Boolean(activePack)}
        onClose={() => setAiOpen(false)}
        packName={activePack?.name}
        initialSource={activePack?.description || ''}
        onConfirm={async (count, request, options) => {
          if (!activePack) throw new Error('Select a Test Pack before generating cases.');
          return addGeneratedCases(activePack.id, count, request, options);
        }}
      />
      <CreateCaseModal open={createOpen && Boolean(activePack)} onClose={() => setCreateOpen(false)} onCreate={async (input) => { const created = await createTestCase(input, activePack?.id); toast.success(`${created.code || created.id} created.`); }} />
      <EditCaseModal open={Boolean(editTarget)} testCase={editTarget} onClose={() => setEditTarget(null)} onSave={async (testCase, input) => {
        const updated = await updateTestCase(testCase.id, input);
        if (openCase?.id === updated.id) setOpenCase(updated);
        toast.success(`${updated.code || updated.id} updated.`);
      }} />
      <CreateTestPackModal open={createPackOpen} onClose={() => setCreatePackOpen(false)} project={currentProject} environment={environment} target={createPackTarget} targetUrl={createPackTargetUrl} onCreate={async (input) => {
        try {
          const created = await createTestPack(input);
          setCreatePackOpen(false);
          setActivePackId(created.id);
          if (testcaseGenerationActive) {
            toast.info(`${created.name} created. Wait for the current AI generation to finish before starting another.`);
          } else {
            setAiOpen(true);
            toast.success(`${created.name} created. Describe the scope and generate its cases.`);
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : String(error));
          throw error;
        }
      }} />
      <AddToPackModal open={addToPackOpen} onClose={() => setAddToPackOpen(false)} packs={workspacePacks} caseIds={selectedCases.map((testCase) => testCase.id)} onAdd={(pack) => {
        const newCount = selectedCases.filter((testCase) => !pack.caseIds.includes(testCase.id)).length;
        addCasesToPack(pack.id, selectedCases.map((testCase) => testCase.id));
        toast.success(newCount ? `${newCount} cases added to ${pack.name}.` : `All selected cases are already in ${pack.name}.`);
        setAddToPackOpen(false);
      }} />
      <TestPackDrawer pack={managedPack} onClose={() => setPackOpen(null)} onRun={(pack) => { setActivePackId(pack.id); setPackOpen(null); setRunConfirm(true); }} />
      <TestCycleDrawer open={cycleOpen} onClose={() => setCycleOpen(false)} onStart={chooseCycle} />
      <RunSummaryModal open={runConfirm} onClose={() => setRunConfirm(false)} onConfirm={queueRun} pack={activePack?.name || 'Current pack'} environment={runEnvironment} target={targetUrl} total={runCases.length} automated={automated} manual={runCases.length - automated} />
      <TestcaseExportModal open={exportOpen} onClose={() => setExportOpen(false)} bundle={exportBundle} loading={exporting} total={visible.length} packName={activePack?.name || 'Test cases'} />
      <ConfirmModal open={Boolean(archiveTarget)} onClose={() => setArchiveTarget(null)} onConfirm={() => { void confirmArchive(); }} title="Archive test case?" confirmLabel="Archive" destructive message="The case is removed from active packs while historical results stay available." />
    </>
  );
}

function Bulk({ label, icon: Icon, onClick }: { label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void }) {
  return <button onClick={onClick} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium hover:bg-white/10"><Icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{label}</span></button>;
}

function AddToPackModal({ open, onClose, packs, caseIds, onAdd }: { open: boolean; onClose: () => void; packs: TestPack[]; caseIds: string[]; onAdd: (pack: TestPack) => void }) {
  return <Modal open={open} onClose={onClose} title="Add to Test Pack" subtitle={`${caseIds.length} selected cases can belong to more than one pack.`} size="max-w-md">
    <div className="space-y-2 p-4">
      {packs.map((pack) => {
        const newCount = caseIds.filter((id) => !pack.caseIds.includes(id)).length;
        return <button key={pack.id} onClick={() => onAdd(pack)} className="flex w-full items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5 text-left hover:border-line-strong hover:bg-surface-2"><LayersIcon className="h-4 w-4 shrink-0 text-ink-3" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink">{pack.name}</span><span className="block text-2xs capitalize text-ink-3">{pack.kind} · {pack.caseIds.length} cases</span></span><span className="text-xs font-medium text-accent">{newCount ? `+${newCount}` : 'Added'}</span></button>;
      })}
      {!packs.length && <p className="p-5 text-center text-sm text-ink-3">Create a Test Pack first.</p>}
    </div>
  </Modal>;
}

function RunSummaryModal({ open, onClose, onConfirm, pack, environment, target, total, automated, manual }: { open: boolean; onClose: () => void; onConfirm: () => void | Promise<void>; pack: string; environment: string; target: string | null; total: number; automated: number; manual: number }) {
  return <Modal open={open} onClose={onClose} title="Confirm run scope" subtitle="Review exactly what will run before queuing it." footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!automated || !target} onClick={onConfirm}><PlayIcon className="h-4 w-4" /> Queue run</Button></>}><div className="space-y-3 p-5"><Summary label="Test Pack" value={pack} /><Summary label="Environment" value={environment} /><Summary label="Target" value={target || 'No valid target'} mono /><div className="grid grid-cols-3 gap-2"><Summary label="Total" value={String(total)} /><Summary label="Automated" value={String(automated)} /><Summary label="Manual / skipped" value={String(manual)} /></div>{manual > 0 && <p className="rounded-lg bg-[rgb(var(--block-soft))] p-3 text-xs text-ink-2">Manual cases are completed through a Test Cycle.</p>}</div></Modal>;
}

function Summary({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div className="rounded-lg border border-line bg-surface px-3 py-2"><div className="text-2xs text-ink-3">{label}</div><div className={`mt-0.5 truncate text-sm font-medium text-ink ${mono ? 'font-mono text-xs' : ''}`}>{value}</div></div>;
}

function TestcaseExportModal({ open, onClose, bundle, loading, total, packName }: {
  open: boolean;
  onClose: () => void;
  bundle: TestcaseExportBundle | null;
  loading: boolean;
  total: number;
  packName: string;
}) {
  const formats = bundle ? [
    { label: 'View HTML report', description: 'Open a printable test case catalog in the browser', url: bundle.htmlUrl, icon: EyeIcon },
    { label: 'Download PDF', description: 'Shareable report for review and sign-off', url: bundle.pdfUrl, icon: FileTextIcon },
    { label: 'Download Excel', description: 'Styled native XLSX that can be imported again', url: bundle.excelUrl, icon: FileSpreadsheetIcon },
    { label: 'Download Word', description: 'Editable review document for the QA team', url: bundle.wordUrl, icon: FileTextIcon },
    { label: 'Download CSV', description: 'Raw tabular data for other tools', url: bundle.csvUrl, icon: DownloadIcon },
    { label: 'Download JSON', description: 'Structured data for scripts and integrations', url: bundle.jsonUrl, icon: BracesIcon },
  ] : [];
  return <Modal open={open} onClose={onClose} title="Export test cases" subtitle={`${packName} · ${total} filtered cases`} size="max-w-xl">
    {loading ? <div className="flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent"><RefreshCwIcon className="h-5 w-5 animate-spin" /></span>
      <div><div className="text-sm font-semibold text-ink">Preparing all report formats…</div><div className="mt-1 text-xs text-ink-3">Excel, PDF, Word and data files are generated from the current filtered scope.</div></div>
    </div> : <div className="grid gap-2 p-4 sm:grid-cols-2">
      {formats.map((format) => {
        const Icon = format.icon;
        return <button key={format.label} onClick={() => window.open(format.url, '_blank', 'noopener,noreferrer')} className="flex min-h-20 items-start gap-3 rounded-lg border border-line bg-surface p-3 text-left hover:border-line-strong hover:bg-surface-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><Icon className="h-4 w-4" /></span>
          <span><span className="block text-sm font-semibold text-ink">{format.label}</span><span className="mt-0.5 block text-2xs leading-4 text-ink-3">{format.description}</span></span>
        </button>;
      })}
    </div>}
  </Modal>;
}

function CreateCaseModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (input: Partial<TestCase>) => Promise<void> }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [expected, setExpected] = useState('');
  const [automation, setAutomation] = useState<TestCase['automation']>('manual');
  const [testType, setTestType] = useState<TestCase['type']>('Functional');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try { await onCreate({ code, name, expected, objective: name, automation, priority: 'Medium', severity: 'Major', type: testType, steps: [{ id: `step-${Date.now()}`, action: name, expected }] }); setCode(''); setName(''); setExpected(''); setTestType('Functional'); onClose(); }
    catch (error) { toast.error(error instanceof Error ? error.message : String(error)); }
    finally { setSaving(false); }
  };
  return <Modal open={open} onClose={onClose} title="Create test case" subtitle="Add a focused manual or automated case." footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name.trim() || saving} onClick={() => void submit()}>{saving ? 'Saving…' : 'Create case'}</Button></>}><div className="space-y-4 p-5"><label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Case ID</span><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="TC-001" className="control font-mono" /></label><label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Test case name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Verify the primary checkout flow" className="control" /></label><label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Expected result</span><textarea value={expected} onChange={(event) => setExpected(event.target.value)} rows={3} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent" /></label><div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Test type</span><TestTypeSelect value={testType} onChange={setTestType} /></label><label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Execution mode</span><select value={automation} onChange={(event) => setAutomation(event.target.value as TestCase['automation'])} className="control"><option value="manual">Manual</option><option value="automated">Automated</option></select></label></div></div></Modal>;
}

function EditCaseModal({ open, testCase, onClose, onSave }: { open: boolean; testCase: TestCase | null; onClose: () => void; onSave: (testCase: TestCase, input: Partial<TestCase>) => Promise<void> }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [expected, setExpected] = useState('');
  const [priority, setPriority] = useState<TestCase['priority']>('Medium');
  const [severity, setSeverity] = useState<TestCase['severity']>('Major');
  const [automation, setAutomation] = useState<TestCase['automation']>('manual');
  const [testType, setTestType] = useState<TestCase['type']>('Functional');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!testCase) return;
    setCode(testCase.code || '');
    setName(testCase.name);
    setObjective(testCase.objective || '');
    setExpected(testCase.expected || '');
    setPriority(testCase.priority);
    setSeverity(testCase.severity);
    setAutomation(testCase.automation);
    setTestType(testCase.type);
  }, [testCase]);

  const submit = async () => {
    if (!testCase || !name.trim()) return;
    setSaving(true);
    try {
      await onSave(testCase, { code: code.trim(), name: name.trim(), objective, expected, priority, severity, automation, type: testType });
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return <Modal open={open} onClose={onClose} title="Edit test case" subtitle={testCase ? `Update ${testCase.code || testCase.id} without losing its run history.` : undefined} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name.trim() || saving} onClick={() => void submit()}>{saving ? 'Saving…' : 'Save changes'}</Button></>}><div className="space-y-4 p-5"><div className="grid gap-3 sm:grid-cols-[160px_1fr]"><label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Case ID</span><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} className="control font-mono" /></label><label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Test case name</span><input value={name} onChange={(event) => setName(event.target.value)} className="control" /></label></div><label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Objective</span><textarea value={objective} onChange={(event) => setObjective(event.target.value)} rows={2} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent" /></label><label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Expected result</span><textarea value={expected} onChange={(event) => setExpected(event.target.value)} rows={3} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent" /></label><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Test type</span><TestTypeSelect value={testType} onChange={setTestType} /></label><label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Priority</span><select value={priority} onChange={(event) => setPriority(event.target.value as TestCase['priority'])} className="control"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label><label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Severity</span><select value={severity} onChange={(event) => setSeverity(event.target.value as TestCase['severity'])} className="control"><option>Blocker</option><option>Critical</option><option>Major</option><option>Minor</option><option>Trivial</option></select></label><label className="block"><span className="mb-1 block text-xs font-medium text-ink-2">Mode</span><select value={automation} onChange={(event) => setAutomation(event.target.value as TestCase['automation'])} className="control"><option value="manual">Manual</option><option value="automated">Automated</option></select></label></div></div></Modal>;
}

function TestTypeSelect({ value, onChange }: { value: TestCase['type']; onChange: (value: TestCase['type']) => void }) {
  return <select value={value} onChange={(event) => onChange(event.target.value as TestCase['type'])} className="control"><option>Functional</option><option>UI</option><option>API</option><option>Accessibility</option><option>SEO</option><option>Performance</option><option>Security</option></select>;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return window.btoa(binary);
}

