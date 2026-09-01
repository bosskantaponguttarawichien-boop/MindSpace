"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { BoardToolbar } from "@/features/board/components/board-toolbar";
import { ZoomControls } from "@/features/board/components/zoom-controls";
import type { BoardEngine, BoardTool } from "@/infrastructure/board-engine/board-engine";
import type { BoardDocument } from "@/domain/board/board-document";

const KonvaBoard = dynamic(
  () => import("@/infrastructure/board-engine/konva-board").then((module) => module.KonvaBoard),
  { ssr: false },
);

export function BoardCanvas({ onEngineReady, document, onDocumentChange, onUploadImage }: { onEngineReady: (engine: BoardEngine) => void; document: BoardDocument; onDocumentChange: (document: BoardDocument) => void; onUploadImage: (file: File) => Promise<{ url: string; width: number; height: number }> }) {
  const [engine, setEngine] = useState<BoardEngine | null>(null);
  const [activeTool, setActiveTool] = useState<BoardTool>("select");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleReady = useCallback((readyEngine: BoardEngine) => {
    setEngine(readyEngine);
    onEngineReady(readyEngine);
  }, [onEngineReady]);
  const importImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !engine) return;
    try {
      engine.addImage(await onUploadImage(file));
    } catch (error: unknown) {
      window.alert(error instanceof Error ? error.message : "Unable to upload image.");
    }
  };

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-muted/30" data-testid="board-canvas">
      <KonvaBoard initialDocument={document} onDocumentChange={onDocumentChange} activeTool={activeTool} onToolChange={setActiveTool} onReady={handleReady} />
      <input ref={inputRef} className="sr-only" type="file" accept="image/*" onChange={importImage} />
      <BoardToolbar ready={engine !== null} activeTool={activeTool} onToolChange={setActiveTool} onImportImage={() => inputRef.current?.click()} />
      <ZoomControls engine={engine} />
    </div>
  );
}
