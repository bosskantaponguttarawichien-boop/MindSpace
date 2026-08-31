"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { BoardToolbar } from "@/features/board/components/board-toolbar";
import { ZoomControls } from "@/features/board/components/zoom-controls";
import type { BoardEngine, BoardTool } from "@/infrastructure/board-engine/board-engine";

const KonvaBoard = dynamic(
  () => import("@/infrastructure/board-engine/konva-board").then((module) => module.KonvaBoard),
  { ssr: false },
);

export function BoardCanvas({ onEngineReady }: { onEngineReady: (engine: BoardEngine) => void }) {
  const [engine, setEngine] = useState<BoardEngine | null>(null);
  const [activeTool, setActiveTool] = useState<BoardTool>("select");

  const handleReady = useCallback((readyEngine: BoardEngine) => {
    setEngine(readyEngine);
    onEngineReady(readyEngine);
  }, [onEngineReady]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-muted/30" data-testid="board-canvas">
      <KonvaBoard activeTool={activeTool} onToolChange={setActiveTool} onReady={handleReady} />
      <BoardToolbar ready={engine !== null} activeTool={activeTool} onToolChange={setActiveTool} />
      <ZoomControls engine={engine} />
    </div>
  );
}
