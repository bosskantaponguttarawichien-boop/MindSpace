"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { BoardToolbar } from "@/features/board/components/board-toolbar";
import type { LocalPdf } from "@/features/board/components/local-pdf-viewer";
import { ZoomControls } from "@/features/board/components/zoom-controls";
import type { BoardEngine, BoardTool } from "@/infrastructure/board-engine/board-engine";
import type { BoardDocument } from "@/domain/board/board-document";
import { isSupportedPdf } from "@/domain/files/file-validation";

const KonvaBoard = dynamic(
  () => import("@/infrastructure/board-engine/konva-board").then((module) => module.KonvaBoard),
  { ssr: false },
);

function imageUrls(document: BoardDocument) {
  return new Set(document.elements.flatMap((element) => element.kind === "image" && element.assetUrl ? [element.assetUrl] : []));
}

export function BoardCanvas({ onEngineReady, document, onDocumentChange, onUploadImage, onDeleteImages, onOpenPdf }: { onEngineReady: (engine: BoardEngine) => void; document: BoardDocument; onDocumentChange: (document: BoardDocument) => void; onUploadImage: (file: File) => Promise<{ url: string; width: number; height: number }>; onDeleteImages: (urls: string[]) => Promise<void>; onOpenPdf: (pdf: LocalPdf) => void }) {
  const [engine, setEngine] = useState<BoardEngine | null>(null);
  const [activeTool, setActiveTool] = useState<BoardTool>("select");
  const inputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef(document);
  const deleteTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

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
        void onDeleteImages([url]);
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
      <KonvaBoard initialDocument={document} onDocumentChange={handleDocumentChange} activeTool={activeTool} onToolChange={setActiveTool} onReady={handleReady} />
      <input ref={inputRef} className="sr-only" type="file" accept="image/*" onChange={importImage} />
      <input ref={pdfInputRef} className="sr-only" type="file" accept="application/pdf" onChange={importPdf} />
      <BoardToolbar
        ready={engine !== null}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onImportImage={() => inputRef.current?.click()}
        onImportPdf={() => pdfInputRef.current?.click()}
        onAddChildNode={() => engine?.addChildNode()}
        onSetColor={(color) => engine?.setSelectionColor(color)}
        onAlign={(alignment) => engine?.alignSelection(alignment)}
      />
      <ZoomControls engine={engine} />
    </div>
  );
}
