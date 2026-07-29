import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AppProvider, useApp } from "./context/AppContext";
import { AppHeader } from "./components/layout/AppHeader";
import { ProjectsPage } from "./components/pages/ProjectsPage";
import { WorkspacePage } from "./components/pages/WorkspacePage";
import { RunsPage } from "./components/pages/RunsPage";
import { ReportsPage } from "./components/pages/ReportsPage";
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";
import { AIGenerationProgressDock } from "./components/workspace/AIGenerationProgressDock";

function Shell() {
  const { theme, error, loading, refresh } = useApp();
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <AppHeader />
      {error && (
        <div className="flex items-center gap-2 border-b border-[rgb(var(--block))]/25 bg-[rgb(var(--block-soft))] px-4 py-2 text-xs text-ink-2">
          <AlertTriangleIcon className="h-4 w-4 shrink-0 text-[rgb(var(--block))]" />
          <span className="flex-1"><strong className="text-ink">Unable to load backend data.</strong> No demo cases are being shown. {error}</span>
          <button onClick={() => void refresh()} className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-ink hover:bg-surface"><RefreshCwIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Retry</button>
        </div>
      )}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/runs" element={<RunsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </main>
      <AIGenerationProgressDock />
      <Toaster
        theme={theme}
        position="bottom-right"
        toastOptions={{
          style: {
            background: "rgb(var(--elevated))",
            color: "rgb(var(--ink))",
            border: "1px solid rgb(var(--line))"
          }
        }} />
      
    </div>);

}

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AppProvider>);

}
