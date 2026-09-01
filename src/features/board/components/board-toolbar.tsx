"use client";

import { AlignCenterHorizontal, AlignCenterVertical, AlignLeft, AlignRight, AlignStartVertical, AlignEndVertical, Circle, Diamond, FileText, GitBranchPlus, Hand, ImagePlus, MousePointer2, Palette, Pencil, RectangleHorizontal, StickyNote, Triangle, Type, Waypoints } from "lucide-react";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconAction } from "@/components/ui/icon-action";
import { Separator } from "@/components/ui/separator";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { BoardTool } from "@/infrastructure/board-engine/board-engine";
import type { BoardElement } from "@/domain/board/board-document";

const tools: Array<{ id: BoardTool; label: "select" | "hand" | "text" | "note" | "rectangle" | "circle" | "diamond" | "triangle" | "connector" | "draw"; icon: typeof MousePointer2; shortcut?: string }> = [
  { id: "select", label: "select", icon: MousePointer2, shortcut: "V" },
  { id: "hand", label: "hand", icon: Hand, shortcut: "H" },
  { id: "text", label: "text", icon: Type, shortcut: "T" },
  { id: "note", label: "note", icon: StickyNote, shortcut: "N" },
  { id: "rectangle", label: "rectangle", icon: RectangleHorizontal, shortcut: "R" },
  { id: "ellipse", label: "circle", icon: Circle, shortcut: "O" },
  { id: "diamond", label: "diamond", icon: Diamond },
  { id: "triangle", label: "triangle", icon: Triangle },
  { id: "arrow", label: "connector", icon: Waypoints, shortcut: "A" },
  { id: "draw", label: "draw", icon: Pencil, shortcut: "D" },
];

const colors: Array<NonNullable<BoardElement["color"]>> = ["violet", "yellow", "blue", "green", "grey"];
const colorClasses: Record<NonNullable<BoardElement["color"]>, string> = {
  violet: "bg-violet-500",
  yellow: "bg-yellow-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  grey: "bg-slate-400",
};
const colorLabels: Record<NonNullable<BoardElement["color"]>, "colorViolet" | "colorYellow" | "colorBlue" | "colorGreen" | "colorGrey"> = {
  violet: "colorViolet",
  yellow: "colorYellow",
  blue: "colorBlue",
  green: "colorGreen",
  grey: "colorGrey",
};

export function BoardToolbar({ ready, activeTool, onToolChange, onImportImage, onImportPdf, onAddChildNode, onSetColor, onAlign }: { ready: boolean; activeTool: BoardTool; onToolChange: (tool: BoardTool) => void; onImportImage: () => void; onImportPdf: () => void; onAddChildNode: () => void; onSetColor: (color: NonNullable<BoardElement["color"]>) => void; onAlign: (alignment: "left" | "center" | "right" | "top" | "middle" | "bottom") => void }) {
  const { t } = useLocale();
  const [paletteOpen, setPaletteOpen] = useState(false);
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
      <Separator orientation="vertical" className="mx-1 h-6" />
      <IconAction label={t("addChildNode")} icon={GitBranchPlus} disabled={!ready} onClick={onAddChildNode} />
      <div className="relative">
        <IconAction label={t("changeColor")} icon={Palette} disabled={!ready} active={paletteOpen} onClick={() => setPaletteOpen((current) => !current)} />
        {paletteOpen ? <div className="absolute left-0 top-full z-40 mt-2 flex gap-1 rounded-lg border border-border bg-background p-2 shadow-lg">{colors.map((color) => <button key={color} type="button" aria-label={t(colorLabels[color])} className={`size-6 rounded-full border-2 border-background ring-1 ring-border ${colorClasses[color]}`} onClick={() => { onSetColor(color); setPaletteOpen(false); }} />)}</div> : null}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><span><IconAction label={t("align")} icon={AlignCenterHorizontal} disabled={!ready} /></span></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onAlign("left")}><AlignLeft />{t("alignLeft")}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAlign("center")}><AlignCenterHorizontal />{t("alignCenter")}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAlign("right")}><AlignRight />{t("alignRight")}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAlign("top")}><AlignStartVertical />{t("alignTop")}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAlign("middle")}><AlignCenterVertical />{t("alignMiddle")}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAlign("bottom")}><AlignEndVertical />{t("alignBottom")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
