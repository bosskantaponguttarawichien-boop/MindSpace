"use client";

import { useCallback, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AiPanel } from "@/features/ai/components/ai-panel";
import { BoardCanvas } from "@/features/board/components/board-canvas";
import { LocalPdfViewer, type LocalPdf } from "@/features/board/components/local-pdf-viewer";
import { WorkspaceSidebar } from "@/features/workspace/components/workspace-sidebar";
import { WorkspaceTopbar } from "@/features/workspace/components/workspace-topbar";
import type { BoardEngine } from "@/infrastructure/board-engine/board-engine";
import { usePersistedBoards } from "@/features/workspace/hooks/use-persisted-boards";
import { useLocale } from "@/lib/i18n/locale-provider";

export function MindSpaceApp() {
  const { t } = useLocale();
  const [engine, setEngine] = useState<BoardEngine | null>(null);
  const { boards, activeBoardId, setActiveBoardId, createBoard, updateBoardDocument, copySyncLink, uploadImage, deleteImages, syncStatus, syncError } = usePersistedBoards();
  const [aiOpen, setAiOpen] = useState(false);
  const [pdf, setPdf] = useState<LocalPdf | null>(null);
  const activeBoard = boards.find((board) => board.id === activeBoardId);
  const handleEngineReady = useCallback((readyEngine: BoardEngine) => setEngine(readyEngine), []);
  const selectBoard = (id: string) => { setActiveBoardId(id); setEngine(null); };
  return <>
    <AppShell sidebar={<WorkspaceSidebar boards={boards} activeBoardId={activeBoardId} onCreateBoard={createBoard} onSelectBoard={selectBoard} />} topbar={<WorkspaceTopbar engine={engine} boardName={activeBoard?.name ?? "MindSpace"} syncStatus={syncStatus} syncError={syncError} onCopySyncLink={copySyncLink} onOpenAi={() => setAiOpen(true)} />} board={activeBoard ? <BoardCanvas key={activeBoardId} document={activeBoard.document} onDocumentChange={(document) => updateBoardDocument(activeBoard.id, document)} onUploadImage={uploadImage} onDeleteImages={deleteImages} onOpenPdf={setPdf} onEngineReady={handleEngineReady} /> : <div className="grid h-full place-items-center text-sm text-muted-foreground">{t("syncConnecting")}…</div>} rightPanel={<AiPanel />} />
    {aiOpen ? <div className="fixed inset-0 z-50 bg-background lg:hidden"><button type="button" className="absolute end-4 top-4 z-10 rounded-md border border-border px-3 py-1 text-sm" onClick={() => setAiOpen(false)}>Close</button><AiPanel /></div> : null}
    {pdf ? <LocalPdfViewer pdf={pdf} onClose={() => { URL.revokeObjectURL(pdf.url); setPdf(null); }} /> : null}
  </>;
}
