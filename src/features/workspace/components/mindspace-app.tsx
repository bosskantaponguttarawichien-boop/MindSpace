"use client";

import { useCallback, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AiPanel } from "@/features/ai/components/ai-panel";
import { BoardCanvas } from "@/features/board/components/board-canvas";
import { ExportPdfDialog } from "@/features/board/components/export-pdf-dialog";
import { LocalPdfViewer, type LocalPdf } from "@/features/board/components/local-pdf-viewer";
import { WorkspaceSidebar } from "@/features/workspace/components/workspace-sidebar";
import { WorkspaceTopbar } from "@/features/workspace/components/workspace-topbar";
import type { BoardDocument } from "@/domain/board/board-document";
import type { BoardEngine, BoardExport } from "@/infrastructure/board-engine/board-engine";
import { usePersistedBoards } from "@/features/workspace/hooks/use-persisted-boards";
import { useLocale } from "@/lib/i18n/locale-provider";

export function MindSpaceApp() {
  const { t } = useLocale();
  const [engine, setEngine] = useState<BoardEngine | null>(null);
  const { boards, activeBoardId, setActiveBoardId, nextBoardName, createBoard, renameBoard, deleteBoard, updateBoardDocument, copySyncLink, uploadImage, deleteImages, syncStatus, syncError } = usePersistedBoards();
  const [aiOpen, setAiOpen] = useState(false);
  const [pdf, setPdf] = useState<LocalPdf | null>(null);
  const [exportPreview, setExportPreview] = useState<BoardExport | null>(null);
  const activeBoard = boards.find((board) => board.id === activeBoardId);
  const handleEngineReady = useCallback((readyEngine: BoardEngine) => setEngine(readyEngine), []);
  const handleDocumentChange = useCallback((document: BoardDocument) => {
    if (activeBoardId) updateBoardDocument(activeBoardId, document);
  }, [activeBoardId, updateBoardDocument]);
  const selectBoard = (id: string) => { setActiveBoardId(id); setEngine(null); };
  const requestExport = () => {
    const preview = engine?.renderExport() ?? null;
    if (!preview) return window.alert(t("exportFailed"));
    setExportPreview(preview);
  };
  return <>
    <AppShell sidebar={<WorkspaceSidebar boards={boards} activeBoardId={activeBoardId} nextBoardName={nextBoardName} onCreateBoard={createBoard} onRenameBoard={renameBoard} onDeleteBoard={deleteBoard} onSelectBoard={selectBoard} />} topbar={<WorkspaceTopbar engine={engine} boardName={activeBoard?.name ?? "MindSpace"} syncStatus={syncStatus} syncError={syncError} onCopySyncLink={copySyncLink} onExportPdf={requestExport} onOpenAi={() => setAiOpen(true)} />} board={activeBoard ? <BoardCanvas key={activeBoardId} document={activeBoard.document} onDocumentChange={handleDocumentChange} onUploadImage={uploadImage} onDeleteImages={deleteImages} onOpenPdf={setPdf} onEngineReady={handleEngineReady} /> : <div className="grid h-full place-items-center text-sm text-muted-foreground">{t("syncConnecting")}…</div>} rightPanel={<AiPanel />} />
    {aiOpen ? <div className="fixed inset-0 z-50 bg-background lg:hidden"><button type="button" className="absolute end-4 top-4 z-10 rounded-md border border-border px-3 py-1 text-sm" onClick={() => setAiOpen(false)}>Close</button><AiPanel /></div> : null}
    <ExportPdfDialog preview={exportPreview} onClose={() => setExportPreview(null)} />
    {pdf ? <LocalPdfViewer pdf={pdf} onClose={() => { URL.revokeObjectURL(pdf.url); setPdf(null); }} /> : null}
  </>;
}
