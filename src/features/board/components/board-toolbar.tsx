"use client";

import { AlignCenterHorizontal, AlignCenterVertical, AlignEndVertical, AlignLeft, AlignRight, AlignStartVertical, FileText, GitBranchPlus, ImagePlus, Palette, Pencil, RectangleHorizontal, Spline, Waypoints } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconAction } from "@/components/ui/icon-action";
import { Separator } from "@/components/ui/separator";
import { ColorRow, OptionRow, ToolCard, ToolCardRow, ToolCardSeparator } from "@/features/board/components/tool-card";
import { connectionEnds, connectionHeadTypes, connectionLineStyles, contentTools, inkTools, pointerTools, shapeTools } from "@/features/board/components/toolbar-groups";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { BoardTool } from "@/infrastructure/board-engine/board-engine";
import type { BoardColor, BoardConnection, ConnectionHeadType, ConnectionLineStyle, ConnectionStyle } from "@/domain/board/board-document";

type ToolCardId = "shape" | "connector" | "ink" | "color";

export function BoardToolbar({
  ready,
  uploadingImage = false,
  activeTool,
  selectedShapeKind,
  hasSelection = false,
  onToolChange,
  onSetShape,
  onImportImage,
  onImportPdf,
  onAddChildNode,
  onLayoutMindMap,
  onSetColor,
  onAlign,
  onUpdateConnection,
}: {
  ready: boolean;
  uploadingImage?: boolean;
  activeTool: BoardTool;
  selectedShapeKind?: BoardTool | null;
  hasSelection?: boolean;
  onToolChange: (tool: BoardTool) => void;
  onSetShape?: (shape: BoardTool) => void;
  onImportImage: () => void;
  onImportPdf: () => void;
  onAddChildNode: () => void;
  onLayoutMindMap: () => void;
  onSetColor: (color: BoardColor) => void;
  onAlign: (alignment: "left" | "center" | "right" | "top" | "middle" | "bottom") => void;
  onUpdateConnection?: (patch: Partial<BoardConnection>) => void;
}) {
  const { t } = useLocale();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [openCard, setOpenCard] = useState<ToolCardId | null>(null);
  const [lastShapeTool, setLastShapeTool] = useState<BoardTool>("rectangle");
  const [lastInkTool, setLastInkTool] = useState<BoardTool>("draw");
  const [connection, setConnection] = useState<{ style: ConnectionStyle; lineStyle: ConnectionLineStyle; headType: ConnectionHeadType }>({ style: "end", lineStyle: "solid", headType: "arrow" });

  useEffect(() => {
    if (!openCard) return;
    function handlePointerDown(event: PointerEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setOpenCard(null);
      }
    }
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [openCard]);

  const effectiveShapeTool = selectedShapeKind ?? lastShapeTool;
  const shapeActive = shapeTools.some((tool) => tool.id === activeTool) || Boolean(selectedShapeKind);
  const inkActive = inkTools.some((tool) => tool.id === activeTool);
  const shapeTool = shapeActive ? (shapeTools.some((tool) => tool.id === activeTool) ? activeTool : effectiveShapeTool) : effectiveShapeTool;
  const inkTool = inkActive ? activeTool : lastInkTool;
  const shapeIcon = shapeTools.find((tool) => tool.id === shapeTool)?.icon ?? RectangleHorizontal;
  const inkIcon = inkTools.find((tool) => tool.id === inkTool)?.icon ?? Pencil;

  function toggleCard(card: ToolCardId) {
    setOpenCard((current) => (current === card ? null : card));
  }

  function pickShapeTool(tool: BoardTool) {
    setLastShapeTool(tool);
    onSetShape?.(tool);
    if (!hasSelection) {
      onToolChange(tool);
    }
  }

  function pickInkTool(tool: BoardTool) {
    setLastInkTool(tool);
    onToolChange(tool);
  }

  function applyConnection(patch: Partial<BoardConnection>) {
    setConnection((current) => ({ ...current, ...patch }));
    onUpdateConnection?.(patch);
  }

  return (
    <div ref={toolbarRef} className="pointer-events-none absolute inset-x-3 top-3 z-30 flex flex-col items-center gap-2" onKeyDown={(event) => { if (event.key === "Escape") setOpenCard(null); }}>
      <div className="pointer-events-auto flex max-w-full flex-nowrap items-center justify-start gap-0.5 overflow-x-auto rounded-xl border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur scrollbar-none" role="toolbar" aria-label="Board tools">
        <div className="flex shrink-0 items-center gap-0.5">
          {pointerTools.map((tool) => (
            <IconAction key={tool.id} label={t(tool.label)} icon={tool.icon} shortcut={tool.shortcut} active={activeTool === tool.id} disabled={!ready} onClick={() => onToolChange(tool.id)} />
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Separator orientation="vertical" className="mx-1 h-6" />
          {contentTools.map((tool) => (
            <IconAction key={tool.id} label={t(tool.label)} icon={tool.icon} shortcut={tool.shortcut} active={activeTool === tool.id} disabled={!ready} onClick={() => onToolChange(tool.id)} />
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Separator orientation="vertical" className="mx-1 h-6" />
          <IconAction label={t("shapes")} icon={shapeIcon} active={shapeActive} expandable expanded={openCard === "shape"} disabled={!ready} onClick={() => { if (!hasSelection && openCard !== "shape") { pickShapeTool(shapeTool); } toggleCard("shape"); }} />
          <IconAction label={t("connector")} icon={Waypoints} shortcut="A" active={activeTool === "arrow"} expandable expanded={openCard === "connector"} disabled={!ready} onClick={() => { onToolChange("arrow"); toggleCard("connector"); }} />
          <IconAction label={t("drawTools")} icon={inkIcon} active={inkActive} expandable expanded={openCard === "ink"} disabled={!ready} onClick={() => { pickInkTool(inkTool); toggleCard("ink"); }} />
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Separator orientation="vertical" className="mx-1 h-6" />
          <IconAction label={t("importImage")} icon={ImagePlus} disabled={!ready || uploadingImage} onClick={onImportImage} />
          <IconAction label={t("importPdf")} icon={FileText} disabled={!ready} onClick={onImportPdf} />
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Separator orientation="vertical" className="mx-1 h-6" />
          <IconAction label={t("addChildNode")} icon={GitBranchPlus} disabled={!ready} onClick={onAddChildNode} />
          <IconAction label={t("autoLayout")} icon={Spline} disabled={!ready} onClick={onLayoutMindMap} />
          <IconAction label={t("changeColor")} icon={Palette} expandable expanded={openCard === "color"} disabled={!ready} onClick={() => toggleCard("color")} />
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
      </div>

      {openCard === "shape" ? (
        <ToolCard label={t("shapes")}>
          <ToolCardRow>
            {shapeTools.map((tool) => (
              <IconAction key={tool.id} label={t(tool.label)} icon={tool.icon} shortcut={tool.shortcut} active={activeTool === tool.id || selectedShapeKind === tool.id} onClick={() => pickShapeTool(tool.id)} />
            ))}
          </ToolCardRow>
          <ToolCardSeparator />
          <ColorRow label={t("shapeColor")} onSelect={onSetColor} />
        </ToolCard>
      ) : null}

      {openCard === "connector" ? (
        <ToolCard label={t("connectorOptions")} className="flex-col items-stretch gap-2">
          <ToolCardRow className="overflow-x-auto scrollbar-none">
            <OptionRow label={t("connectionStyle")} options={connectionEnds} value={connection.style} onSelect={(style) => applyConnection({ style })} />
            <ToolCardSeparator />
            <OptionRow label={t("headType")} options={connectionHeadTypes} value={connection.headType} onSelect={(headType) => applyConnection({ headType })} />
            <ToolCardSeparator />
            <OptionRow label={t("lineStyle")} options={connectionLineStyles} value={connection.lineStyle} onSelect={(lineStyle) => applyConnection({ lineStyle })} />
          </ToolCardRow>
          <ColorRow label={t("connectionColor")} onSelect={(color) => applyConnection({ color })} />
        </ToolCard>
      ) : null}

      {openCard === "ink" ? (
        <ToolCard label={t("drawTools")}>
          <ToolCardRow>
            {inkTools.map((tool) => (
              <IconAction key={tool.id} label={t(tool.label)} icon={tool.icon} shortcut={tool.shortcut} active={activeTool === tool.id} onClick={() => pickInkTool(tool.id)} />
            ))}
          </ToolCardRow>
        </ToolCard>
      ) : null}

      {openCard === "color" ? (
        <ToolCard label={t("changeColor")}>
          <ColorRow onSelect={onSetColor} />
        </ToolCard>
      ) : null}
    </div>
  );
}
