"use client";

import { useCallback, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AiPanel } from "@/features/ai/components/ai-panel";
import { BoardCanvas } from "@/features/board/components/board-canvas";
import { WorkspaceSidebar } from "@/features/workspace/components/workspace-sidebar";
import { WorkspaceTopbar } from "@/features/workspace/components/workspace-topbar";
import type { BoardEngine } from "@/infrastructure/board-engine/board-engine";

type BoardSummary = { id: string; name: string };

export function MindSpaceApp() {
  const [engine, setEngine] = useState<BoardEngine | null>(null);
  const [boards, setBoards] = useState<BoardSummary[]>([{ id: "board:untitled", name: "Untitled board" }]);
  const [activeBoardId, setActiveBoardId] = useState("board:untitled");
  const [aiOpen, setAiOpen] = useState(false);
  const activeBoard = boards.find((board) => board.id === activeBoardId) ?? { id: "board:untitled", name: "Untitled board" };
  const handleEngineReady = useCallback((readyEngine: BoardEngine) => setEngine(readyEngine), []);
  const createBoard = () => {
    const number = boards.length + 1;
    const board = { id: `board:${crypto.randomUUID()}`, name: `Untitled board ${number}` };
    setBoards((current) => [...current, board]);
    setActiveBoardId(board.id);
    setEngine(null);
  };
  return <>
    <AppShell sidebar={<WorkspaceSidebar boards={boards} activeBoardId={activeBoardId} onCreateBoard={createBoard} onSelectBoard={(id) => { setActiveBoardId(id); setEngine(null); }} />} topbar={<WorkspaceTopbar engine={engine} boardName={activeBoard.name} onOpenAi={() => setAiOpen(true)} />} board={<BoardCanvas key={activeBoardId} onEngineReady={handleEngineReady} />} rightPanel={<AiPanel />} />
    {aiOpen ? <div className="fixed inset-0 z-50 bg-background lg:hidden"><button type="button" className="absolute end-4 top-4 z-10 rounded-md border border-border px-3 py-1 text-sm" onClick={() => setAiOpen(false)}>Close</button><AiPanel /></div> : null}
  </>;
}
