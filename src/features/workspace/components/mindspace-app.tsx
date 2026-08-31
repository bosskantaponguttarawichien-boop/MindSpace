"use client";

import { useCallback, useState } from "react";
import type { Editor } from "tldraw";
import { AppShell } from "@/components/layout/app-shell";
import { AiPanel } from "@/features/ai/components/ai-panel";
import { BoardCanvas } from "@/features/board/components/board-canvas";
import { WorkspaceSidebar } from "@/features/workspace/components/workspace-sidebar";
import { WorkspaceTopbar } from "@/features/workspace/components/workspace-topbar";

export function MindSpaceApp() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const handleEditorReady = useCallback((readyEditor: Editor) => setEditor(readyEditor), []);
  return <AppShell sidebar={<WorkspaceSidebar />} topbar={<WorkspaceTopbar editor={editor} />} board={<BoardCanvas onEditorReady={handleEditorReady} />} rightPanel={<AiPanel />} />;
}
