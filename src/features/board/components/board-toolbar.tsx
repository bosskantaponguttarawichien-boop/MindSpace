"use client";

import { Circle, FileText, Hand, ImagePlus, MousePointer2, Pencil, RectangleHorizontal, StickyNote, Type, Waypoints } from "lucide-react";
import { IconAction } from "@/components/ui/icon-action";
import { Separator } from "@/components/ui/separator";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { BoardTool } from "@/infrastructure/board-engine/board-engine";

const tools: Array<{ id: BoardTool; label: "select" | "hand" | "text" | "note" | "rectangle" | "circle" | "connector" | "draw"; icon: typeof MousePointer2; shortcut?: string }> = [
  { id: "select", label: "select", icon: MousePointer2, shortcut: "V" },
  { id: "hand", label: "hand", icon: Hand, shortcut: "H" },
  { id: "text", label: "text", icon: Type, shortcut: "T" },
  { id: "note", label: "note", icon: StickyNote, shortcut: "N" },
  { id: "rectangle", label: "rectangle", icon: RectangleHorizontal, shortcut: "R" },
  { id: "ellipse", label: "circle", icon: Circle, shortcut: "O" },
  { id: "arrow", label: "connector", icon: Waypoints, shortcut: "A" },
  { id: "draw", label: "draw", icon: Pencil, shortcut: "D" },
];

export function BoardToolbar({ ready, activeTool, onToolChange, onImportImage, onImportPdf }: { ready: boolean; activeTool: BoardTool; onToolChange: (tool: BoardTool) => void; onImportImage: () => void; onImportPdf: () => void }) {
  const { t } = useLocale();
  function chooseTool(tool: BoardTool) {
    onToolChange(tool);
  }

  return (
    <div className="absolute start-1/2 top-4 z-30 flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-xl border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur" role="toolbar" aria-label="Board tools">
      {tools.map((tool, index) => (
        <div key={tool.id} className="contents">
          {index === 2 || index === 6 ? <Separator orientation="vertical" className="mx-1 h-6" /> : null}
          <IconAction label={t(tool.label)} icon={tool.icon} shortcut={tool.shortcut} active={activeTool === tool.id} disabled={!ready} onClick={() => chooseTool(tool.id)} />
        </div>
      ))}
      <Separator orientation="vertical" className="mx-1 h-6" />
      <IconAction label={t("importImage")} icon={ImagePlus} disabled={!ready} onClick={onImportImage} />
      <IconAction label={t("importPdf")} icon={FileText} disabled={!ready} onClick={onImportPdf} />
    </div>
  );
}
