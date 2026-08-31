"use client";

import { useCallback, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AiPanel } from "@/features/ai/components/ai-panel";
import { BoardCanvas } from "@/features/board/components/board-canvas";
import { WorkspaceSidebar } from "@/features/workspace/components/workspace-sidebar";
import { WorkspaceTopbar } from "@/features/workspace/components/workspace-topbar";
import type { BoardEngine } from "@/infrastructure/board-engine/board-engine";

export function MindSpaceApp() {
  const [engine, setEngine] = useState<BoardEngine | null>(null);
  const handleEngineReady = useCallback((readyEngine: BoardEngine) => setEngine(readyEngine), []);
  return <AppShell sidebar={<WorkspaceSidebar />} topbar={<WorkspaceTopbar engine={engine} />} board={<BoardCanvas onEngineReady={handleEngineReady} />} rightPanel={<AiPanel />} />;
}
