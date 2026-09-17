"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { BoardToolbar } from "@/features/board/components/board-toolbar";
import { ZoomControls } from "@/features/board/components/zoom-controls";
import type { BoardEngine, BoardTool } from "@/infrastructure/board-engine/board-engine";
import { type BoardDocument, type BoardElementId, type BoardTextStyle } from "@/domain/board/board-document";
import { DEFAULT_TEXT_STYLES, textStyleScopeFor, type BoardTextStyleScope, type BoardTextStyles } from "@/domain/board/text-style-scope";
import { isSupportedPdf } from "@/domain/files/file-validation";
import { ImageUploadError, type ImageUploadFailure } from "@/infrastructure/files/firebase-board-images";
import { PdfImportError, renderPdfFirstPage, type PdfImportFailure } from "@/infrastructure/files/pdf-page-image";
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

const pdfFailureMessages: Record<PdfImportFailure, MessageKey> = {
  unreadable: "pdfErrorUnreadable",
  encrypted: "pdfErrorEncrypted",
  renderFailed: "pdfErrorRenderFailed",
};

const KonvaBoard = dynamic(
  () => import("@/infrastructure/board-engine/konva-board").then((module) => module.KonvaBoard),
  { ssr: false },
);

function imageUrls(document: BoardDocument) {
  return new Set(document.elements.flatMap((element) => element.kind === "image" && element.assetUrl ? [element.assetUrl] : []));
}

export function BoardCanvas({ onEngineReady, document, onDocumentChange, onUploadImage, onDeleteImages, onSelectionIdsChange }: { onEngineReady: (engine: BoardEngine) => void; document: BoardDocument; onDocumentChange: (document: BoardDocument) => void; onUploadImage: (file: File) => Promise<{ url: string; width: number; height: number }>; onDeleteImages: (urls: string[]) => Promise<void>; onSelectionIdsChange?: (ids: BoardElementId[]) => void }) {
  const { t } = useLocale();
  const [engine, setEngine] = useState<BoardEngine | null>(null);
  const [activeTool, setActiveTool] = useState<BoardTool>("select");
  const [selectionState, setSelectionState] = useState<{ selectedShapeKind: BoardTool | null; hasSelection: boolean; selectedElementKind?: string | null; selectedTextStyle: BoardTextStyle | null; selectedIds?: BoardElementId[]; selectionLocked?: boolean }>({ selectedShapeKind: null, hasSelection: false, selectedElementKind: null, selectedTextStyle: null, selectedIds: [], selectionLocked: false });
  const [textStyles, setTextStyles] = useState<BoardTextStyles>(DEFAULT_TEXT_STYLES);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [importingPdf, setImportingPdf] = useState(false);
  const [notice, setNotice] = useState<MessageKey | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef(document);
  const deleteTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onEngineReadyRef = useRef(onEngineReady);
  useEffect(() => {
    onEngineReadyRef.current = onEngineReady;
  }, [onEngineReady]);

  const handleReady = useCallback((readyEngine: BoardEngine) => {
    setEngine(readyEngine);
    onEngineReadyRef.current(readyEngine);
  }, []);

  const handleSelectionChange = useCallback((next: { selectedShapeKind: BoardTool | null; hasSelection: boolean; selectedElementKind?: string | null; selectedTextStyle: BoardTextStyle | null; selectedIds?: BoardElementId[]; selectionLocked?: boolean }) => {
    setSelectionState(next);
    // A selected object only ever refreshes the scope it belongs to, so picking a note never
    // rewrites the style the shape or table tool will use next.
    const scope = textStyleScopeFor(next.selectedElementKind);
    const selectedTextStyle = next.selectedTextStyle;
    if (scope && selectedTextStyle) {
      setTextStyles((current) => ({ ...current, [scope]: selectedTextStyle }));
    }
    if (next.selectedIds && onSelectionIdsChange) onSelectionIdsChange(next.selectedIds);
  }, [onSelectionIdsChange]);

  const setTextFormatting = useCallback((scope: BoardTextStyleScope, patch: Partial<BoardTextStyle>) => {
    setTextStyles((current) => ({ ...current, [scope]: { ...current[scope], ...patch } }));
    engine?.setSelectionTextStyle(patch);
  }, [engine]);
  const showNotice = useCallback((key: MessageKey) => {
    setNotice(key);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 6000);
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
  // A PDF lands on the board the same way an image does: its first page is rasterized here and
  // then travels through the image upload path, so the board keeps a picture, not PDF bytes.
  const importPdf = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !engine) return;
    if (!isSupportedPdf(file)) {
      window.alert(t("pdfErrorUnsupported"));
      return;
    }
    setImportingPdf(true);
    setNotice(null);
    try {
      const page = await renderPdfFirstPage(file);
      engine.addImage(await onUploadImage(page.file));
      if (page.pageCount > 1) showNotice("pdfFirstPageOnly");
    } catch (error: unknown) {
      // Only rendering raises PdfImportError, so anything else comes from the upload that follows it.
      if (error instanceof PdfImportError) window.alert(t(pdfFailureMessages[error.reason]));
      else window.alert(t(error instanceof ImageUploadError ? uploadFailureMessages[error.reason] : "imageErrorFailed"));
    } finally {
      setImportingPdf(false);
    }
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
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
  }, []);

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-muted/30" data-testid="board-canvas">
      <KonvaBoard initialDocument={document} onDocumentChange={handleDocumentChange} activeTool={activeTool} textStyles={textStyles} onToolChange={setActiveTool} onSelectionChange={handleSelectionChange} onReady={handleReady} />
      <input ref={inputRef} className="sr-only" type="file" accept="image/*" onChange={importImage} />
      <input ref={pdfInputRef} className="sr-only" type="file" accept="application/pdf" onChange={importPdf} />
      <BoardToolbar
        ready={engine !== null}
        uploadingImage={uploadingImage}
        importingPdf={importingPdf}
        activeTool={activeTool}
        textStyles={textStyles}
        selectedShapeKind={selectionState.selectedShapeKind}
        selectedElementKind={selectionState.selectedElementKind}
        selectedIds={selectionState.selectedIds}
        hasSelection={selectionState.hasSelection}
        selectionLocked={selectionState.selectionLocked}
        onToolChange={setActiveTool}
        onSetShape={(shape) => engine?.setSelectionShape(shape)}
        onSetTextStyle={setTextFormatting}
        onImportImage={() => inputRef.current?.click()}
        onImportPdf={() => pdfInputRef.current?.click()}
        onAddChildNode={() => engine?.addChildNode()}
        onLayoutMindMap={(direction) => engine?.layoutMindMap(direction)}
        onSetColor={(color) => engine?.setSelectionColor(color)}
        onUpdateConnection={(patch) => { engine?.setConnectionDefaults(patch); engine?.updateSelectedConnection(patch); }}
        onAddTableRow={() => engine?.addTableRow()}
        onDeleteTableRow={() => engine?.deleteTableRow()}
        onAddTableCol={() => engine?.addTableCol()}
        onDeleteTableCol={() => engine?.deleteTableCol()}
        onDuplicateSelection={() => engine?.duplicateSelection()}
        onDeleteSelection={() => engine?.deleteSelection()}
        onSetSelectionLocked={(locked) => engine?.setSelectionLocked(locked)}
        onSetSelectionLayer={(placement) => engine?.setSelectionLayer(placement)}
      />
      <ZoomControls engine={engine} />
      {uploadingImage || importingPdf || notice ? <div className="pointer-events-none absolute bottom-20 end-3 sm:bottom-4 sm:end-4 z-30 max-w-64 rounded-lg border border-border bg-background/95 px-3 py-2 text-xs font-medium shadow-md backdrop-blur" role="status">{t(importingPdf ? "pdfImporting" : uploadingImage ? "imageUploading" : notice ?? "imageUploading")}</div> : null}
    </div>
  );
}
