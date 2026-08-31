"use client";

import { useCallback, useEffect, useState } from "react";
import { Tldraw, type Editor } from "tldraw";
import "tldraw/tldraw.css";
import { BoardToolbar } from "@/features/board/components/board-toolbar";
import { ZoomControls } from "@/features/board/components/zoom-controls";
import { sampleBoard } from "@/domain/board/sample-board";
import { hiddenTldrawUi, mountBoardDocument, type BoardTool } from "@/infrastructure/board-engine/tldraw-adapter";

export function BoardCanvas({ onEditorReady }: { onEditorReady: (editor: Editor) => void }) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [activeTool, setActiveTool] = useState<BoardTool>("select");

  useEffect(() => {
    if (!editor) return;
    return editor.store.listen(() => {
      const currentTool = editor.getCurrentToolId();
      if (["select", "hand", "text", "note", "arrow", "draw"].includes(currentTool)) {
        setActiveTool(currentTool as BoardTool);
      } else if (currentTool === "geo") {
        setActiveTool((previous) => (previous === "ellipse" ? "ellipse" : "rectangle"));
      }
    });
  }, [editor]);

  const handleMount = useCallback((mountedEditor: Editor) => {
    setEditor(mountedEditor);
    onEditorReady(mountedEditor);
    try {
      mountBoardDocument(mountedEditor, sampleBoard);
    } catch (error) {
      console.error("Failed to mount the Phase 1 sample board", error);
    }
  }, [onEditorReady]);

  return (
    <div className="relative h-full min-h-0 bg-muted/30" data-testid="board-canvas">
      <Tldraw onMount={handleMount} components={hiddenTldrawUi} locale="en" licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY} autoFocus />
      <BoardToolbar editor={editor} activeTool={activeTool} onToolChange={setActiveTool} />
      <ZoomControls editor={editor} />
    </div>
  );
}
