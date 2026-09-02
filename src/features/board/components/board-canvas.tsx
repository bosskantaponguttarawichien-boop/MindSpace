"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { BoardToolbar } from "@/features/board/components/board-toolbar";
import type { LocalPdf } from "@/features/board/components/local-pdf-viewer";
import { ZoomControls } from "@/features/board/components/zoom-controls";
import type { BoardEngine, BoardTool } from "@/infrastructure/board-engine/board-engine";
import type { BoardDocument } from "@/domain/board/board-document";
import { isSupportedPdf } from "@/domain/files/file-validation";
import { ImageUploadError, type ImageUploadFailure } from "@/infrastructure/files/firebase-board-images";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

const uploadFailureMessages: Record<ImageUploadFailure, MessageKey> = {
  unsupportedType: "imageErrorUnsupportedType",
  tooLarge: "imageErrorTooLarge",
  stillTooLarge: "imageErrorStillTooLarge",
  unreadable: "imageErrorUnreadable",
  rulesBlocked: "imageErrorRulesBlocked",
  quotaExceeded: "imageErrorQuotaExceeded",
  bucketUnavailable: "imageErrorBucketUnavailable",
  unreachable: "imageErrorUnreachable",
  failed: "imageErrorFailed",
};

const KonvaBoard = dynamic(
  () => import("@/infrastructure/board-engine/konva-board").then((module) => module.KonvaBoard),
  { ssr: false },
);

function imageUrls(document: BoardDocument) {
  return new Set(document.elements.flatMap((element) => element.kind === "image" && element.assetUrl ? [element.assetUrl] : []));
}

export function BoardCanvas({ onEngineReady, document, onDocumentChange, onUploadImage, onDeleteImages, onOpenPdf }: { onEngineReady: (engine: BoardEngine) => void; document: BoardDocument; onDocumentChange: (document: BoardDocument) => void; onUploadImage: (file: File) => Promise<{ url: string; width: number; height: number }>; onDeleteImages: (urls: string[]) => Promise<void>; onOpenPdf: (pdf: LocalPdf) => void }) {
  const { t } = useLocale();
  const [engine, setEngine] = useState<BoardEngine | null>(null);
  const [activeTool, setActiveTool] = useState<BoardTool>("select");
  const [selectionState, setSelectionState] = useState<{ selectedShapeKind: BoardTool | null; hasSelection: boolean }>({ selectedShapeKind: null, hasSelection: false });
  const [uploadingImage, setUploadingImage] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef(document);
  const deleteTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const onEngineReadyRef = useRef(onEngineReady);
  useEffect(() => {
    onEngineReadyRef.current = onEngineReady;
  }, [onEngineReady]);

  const handleReady = useCallback((readyEngine: BoardEngine) => {
    setEngine(readyEngine);
    onEngineReadyRef.current(readyEngine);
  }, []);
  const importImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !engine) return;
    setUploadingImage(true);
    try {
      engine.addImage(await onUploadImage(file));
    } catch (error: unknown) {
      window.alert(t(error instanceof ImageUploadError ? uploadFailureMessages[error.reason] : "imageErrorFailed"));
    } finally {
      setUploadingImage(false);
    }
  };
  const importPdf = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isSupportedPdf(file)) {
      window.alert("Choose a PDF file that is 25 MB or smaller.");
      return;
    }
    onOpenPdf({ name: file.name, url: URL.createObjectURL(file) });
  };
  const handleDocumentChange = useCallback((next: BoardDocument) => {
    const before = imageUrls(documentRef.current);
    const after = imageUrls(next);
    for (const url of before) {
      if (after.has(url) || deleteTimersRef.current.has(url)) continue;
      deleteTimersRef.current.set(url, setTimeout(() => {
        deleteTimersRef.current.delete(url);
        // Cleanup is best effort: a rejected delete leaves an orphaned object, which must never
        // surface as an unhandled rejection on a board the user is still editing.
        void onDeleteImages([url]).catch(() => undefined);
      }, 30_000));
    }
    for (const url of after) {
      const timer = deleteTimersRef.current.get(url);
      if (!timer) continue;
      clearTimeout(timer);
      deleteTimersRef.current.delete(url);
    }
    documentRef.current = next;
    onDocumentChange(next);
  }, [onDeleteImages, onDocumentChange]);

  useEffect(() => () => {
    deleteTimersRef.current.forEach((timer) => clearTimeout(timer));
    deleteTimersRef.current.clear();
  }, []);

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-muted/30" data-testid="board-canvas">
      <KonvaBoard initialDocument={document} onDocumentChange={handleDocumentChange} activeTool={activeTool} onToolChange={setActiveTool} onSelectionChange={setSelectionState} onReady={handleReady} />
      <input ref={inputRef} className="sr-only" type="file" accept="image/*" onChange={importImage} />
      <input ref={pdfInputRef} className="sr-only" type="file" accept="application/pdf" onChange={importPdf} />
      <BoardToolbar
        ready={engine !== null}
        uploadingImage={uploadingImage}
        activeTool={activeTool}
        selectedShapeKind={selectionState.selectedShapeKind}
        hasSelection={selectionState.hasSelection}
        onToolChange={setActiveTool}
        onSetShape={(shape) => engine?.setSelectionShape(shape)}
        onImportImage={() => inputRef.current?.click()}
        onImportPdf={() => pdfInputRef.current?.click()}
        onAddChildNode={() => engine?.addChildNode()}
        onLayoutMindMap={() => engine?.layoutMindMap()}
        onSetColor={(color) => engine?.setSelectionColor(color)}
        onAlign={(alignment) => engine?.alignSelection(alignment)}
        onUpdateConnection={(patch) => { engine?.setConnectionDefaults(patch); engine?.updateSelectedConnection(patch); }}
      />
      <ZoomControls engine={engine} />
      {uploadingImage ? <div className="pointer-events-none absolute bottom-4 end-4 z-30 rounded-lg border border-border bg-background/95 px-3 py-2 text-xs font-medium shadow-md backdrop-blur" role="status">{t("imageUploading")}</div> : null}
    </div>
  );
}
