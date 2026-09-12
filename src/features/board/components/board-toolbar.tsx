"use client";

import { AlignCenter, AlignLeft, AlignRight, Bold, Columns3, FileText, GitBranchPlus, ImagePlus, Minus, Palette, Pencil, RectangleHorizontal, Rows3, Spline, Waypoints } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconAction } from "@/components/ui/icon-action";
import { Separator } from "@/components/ui/separator";
import { ColorRow, OptionRow, ToolCard, ToolCardLabel, ToolCardRow, ToolCardSeparator } from "@/features/board/components/tool-card";
import { connectionEnds, connectionHeadTypes, connectionLineStyles, connectionPathStyles, contentTools, inkTools, mindMapLayoutDirections, pointerTools, shapeTools } from "@/features/board/components/toolbar-groups";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { BoardTool } from "@/infrastructure/board-engine/board-engine";
import { TEXT_FONT_SIZES, type BoardColor, type BoardConnection, type BoardTextFontSize, type BoardTextStyle, type ConnectionHeadType, type ConnectionLineStyle, type ConnectionPathStyle, type ConnectionStyle } from "@/domain/board/board-document";
import type { MindMapLayoutDirection } from "@/domain/board/mind-map";
import type { MessageKey } from "@/lib/i18n/messages";

type ToolCardId = "text" | "shape" | "connector" | "ink" | "layout" | "color";

const textSizeLabels: Record<BoardTextFontSize, MessageKey> = {
  14: "textSize14",
  16: "textSize16",
  18: "textSize18",
  24: "textSize24",
  32: "textSize32",
  40: "textSize40",
};

export function BoardToolbar({
  ready,
  uploadingImage = false,
  activeTool,
  textStyle,
  selectedShapeKind,
  selectedElementKind,
  hasSelection = false,
  onToolChange,
  onSetShape,
  onSetTextStyle,
  onImportImage,
  onImportPdf,
  onAddChildNode,
  onLayoutMindMap,
  onSetColor,
  onUpdateConnection,
  onAddTableRow,
  onDeleteTableRow,
  onAddTableCol,
  onDeleteTableCol,
}: {
  ready: boolean;
  uploadingImage?: boolean;
  activeTool: BoardTool;
  textStyle: BoardTextStyle;
  selectedShapeKind?: BoardTool | null;
  selectedElementKind?: string | null;
  hasSelection?: boolean;
  onToolChange: (tool: BoardTool) => void;
  onSetShape?: (shape: BoardTool) => void;
  onSetTextStyle: (patch: Partial<BoardTextStyle>) => void;
  onImportImage: () => void;
  onImportPdf: () => void;
  onAddChildNode: () => void;
  onLayoutMindMap: (direction?: MindMapLayoutDirection) => void;
  onSetColor: (color: BoardColor) => void;
  onUpdateConnection?: (patch: Partial<BoardConnection>) => void;
  onAddTableRow?: () => void;
  onDeleteTableRow?: () => void;
  onAddTableCol?: () => void;
  onDeleteTableCol?: () => void;
}) {
  const { t } = useLocale();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [openCard, setOpenCard] = useState<ToolCardId | null>(null);
  const [lastShapeTool, setLastShapeTool] = useState<BoardTool>("rectangle");
  const [lastInkTool, setLastInkTool] = useState<BoardTool>("draw");
  const [lastMindMapDirection, setLastMindMapDirection] = useState<MindMapLayoutDirection>("horizontal");
  const [connection, setConnection] = useState<{ style: ConnectionStyle; lineStyle: ConnectionLineStyle; headType: ConnectionHeadType; pathStyle: ConnectionPathStyle }>({ style: "end", lineStyle: "solid", headType: "arrow", pathStyle: "straight" });

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

  function applyMindMapLayout(direction: MindMapLayoutDirection) {
    setLastMindMapDirection(direction);
    onLayoutMindMap(direction);
  }

  return (
    <div ref={toolbarRef} className="pointer-events-none absolute inset-x-2 top-[calc(env(safe-area-inset-top)+0.5rem)] z-30 flex flex-col items-center gap-2 sm:inset-x-3 sm:top-3" onKeyDown={(event) => { if (event.key === "Escape") setOpenCard(null); }}>
      <div className="pointer-events-auto flex w-full max-w-full snap-x snap-mandatory flex-nowrap items-center justify-start gap-0.5 overflow-x-auto overscroll-x-contain rounded-xl border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur touch-pan-x scrollbar-none sm:w-auto sm:snap-none" role="toolbar" aria-label="Board tools">
        <div className="flex shrink-0 items-center gap-0.5">
          {pointerTools.map((tool) => (
            <IconAction key={tool.id} label={t(tool.label)} icon={tool.icon} shortcut={tool.shortcut} active={activeTool === tool.id} disabled={!ready} className="max-sm:size-10" onClick={() => onToolChange(tool.id)} />
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Separator orientation="vertical" className="mx-0 h-6 sm:mx-1" />
          {contentTools.map((tool) => (
            <IconAction key={tool.id} label={t(tool.label)} icon={tool.icon} shortcut={tool.shortcut} active={activeTool === tool.id} expandable={tool.id === "text"} expanded={tool.id === "text" && openCard === "text"} disabled={!ready} className="max-sm:size-10" onClick={() => {
              if (tool.id === "text") {
                if (!hasSelection) onToolChange(tool.id);
                toggleCard("text");
                return;
              }
              onToolChange(tool.id);
            }} />
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Separator orientation="vertical" className="mx-0 h-6 sm:mx-1" />
          <IconAction label={t("shapes")} icon={shapeIcon} active={shapeActive} expandable expanded={openCard === "shape"} disabled={!ready} className="max-sm:size-10" onClick={() => { if (!hasSelection && openCard !== "shape") { pickShapeTool(shapeTool); } toggleCard("shape"); }} />
          <IconAction label={t("connector")} icon={Waypoints} shortcut="A" active={activeTool === "arrow"} expandable expanded={openCard === "connector"} disabled={!ready} className="max-sm:size-10" onClick={() => { onToolChange("arrow"); toggleCard("connector"); }} />
          <IconAction label={t("drawTools")} icon={inkIcon} active={inkActive} expandable expanded={openCard === "ink"} disabled={!ready} className="max-sm:size-10" onClick={() => { pickInkTool(inkTool); toggleCard("ink"); }} />
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Separator orientation="vertical" className="mx-1 h-6" />
          <IconAction label={t("importImage")} icon={ImagePlus} disabled={!ready || uploadingImage} onClick={onImportImage} />
          <IconAction label={t("importPdf")} icon={FileText} disabled={!ready} onClick={onImportPdf} />
        </div>
        {selectedElementKind === "table" ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <Separator orientation="vertical" className="mx-0 h-6 sm:mx-1" />
            <IconAction label={t("addRow")} icon={Rows3} disabled={!ready} className="max-sm:size-10" onClick={onAddTableRow} />
            <IconAction label={t("deleteRow")} icon={Minus} disabled={!ready} className="max-sm:size-10" onClick={onDeleteTableRow} />
            <IconAction label={t("addCol")} icon={Columns3} disabled={!ready} className="max-sm:size-10" onClick={onAddTableCol} />
            <IconAction label={t("deleteCol")} icon={Minus} disabled={!ready} className="max-sm:size-10" onClick={onDeleteTableCol} />
          </div>
        ) : null}
        <div className="flex shrink-0 items-center gap-0.5">
          <Separator orientation="vertical" className="mx-1 h-6" />
          <IconAction label={t("addChildNode")} icon={GitBranchPlus} disabled={!ready} onClick={onAddChildNode} />
          <IconAction label={t("autoLayout")} icon={Spline} expandable expanded={openCard === "layout"} disabled={!ready} onClick={() => { onLayoutMindMap(lastMindMapDirection); toggleCard("layout"); }} />
          <IconAction label={t("changeColor")} icon={Palette} expandable expanded={openCard === "color"} disabled={!ready} onClick={() => toggleCard("color")} />
        </div>
      </div>

      {openCard === "text" ? (
        <ToolCard label={t("textFormatting")}>
          <IconAction label={t("bold")} icon={Bold} active={textStyle.fontWeight === "bold"} onClick={() => onSetTextStyle({ fontWeight: textStyle.fontWeight === "bold" ? "normal" : "bold" })} />
          <ToolCardSeparator />
          <ToolCardRow>
            <ToolCardLabel>{t("textAlign")}</ToolCardLabel>
            <IconAction label={t("textAlignLeft")} icon={AlignLeft} active={textStyle.textAlign === "left"} onClick={() => onSetTextStyle({ textAlign: "left" })} />
            <IconAction label={t("textAlignCenter")} icon={AlignCenter} active={textStyle.textAlign === "center"} onClick={() => onSetTextStyle({ textAlign: "center" })} />
            <IconAction label={t("textAlignRight")} icon={AlignRight} active={textStyle.textAlign === "right"} onClick={() => onSetTextStyle({ textAlign: "right" })} />
          </ToolCardRow>
          <ToolCardSeparator />
          <ToolCardRow>
            <ToolCardLabel>{t("textSize")}</ToolCardLabel>
            {TEXT_FONT_SIZES.map((size) => (
              <button key={size} type="button" aria-label={t(textSizeLabels[size])} aria-pressed={textStyle.fontSize === size} className="size-8 shrink-0 rounded-lg border border-transparent text-xs font-semibold text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-primary/10 aria-pressed:text-primary max-sm:size-10" onClick={() => onSetTextStyle({ fontSize: size })}>{size}</button>
            ))}
          </ToolCardRow>
        </ToolCard>
      ) : null}

      {openCard === "shape" ? (
        <ToolCard label={t("shapes")} className="flex-col items-stretch gap-2">
          <ToolCardRow className="w-full overflow-x-auto touch-pan-x scrollbar-none">
            {shapeTools.map((tool) => (
              <IconAction key={tool.id} label={t(tool.label)} icon={tool.icon} shortcut={tool.shortcut} active={activeTool === tool.id || selectedShapeKind === tool.id} onClick={() => pickShapeTool(tool.id)} />
            ))}
          </ToolCardRow>
          <Separator orientation="horizontal" />
          <ColorRow label={t("shapeColor")} onSelect={onSetColor} />
          <Separator orientation="horizontal" />
          <ToolCardRow className="w-full overflow-x-auto touch-pan-x scrollbar-none">
            <ToolCardLabel>{t("textAlign")}</ToolCardLabel>
            <IconAction label={t("textAlignLeft")} icon={AlignLeft} active={textStyle.textAlign === "left"} onClick={() => onSetTextStyle({ textAlign: "left" })} />
            <IconAction label={t("textAlignCenter")} icon={AlignCenter} active={textStyle.textAlign === "center"} onClick={() => onSetTextStyle({ textAlign: "center" })} />
            <IconAction label={t("textAlignRight")} icon={AlignRight} active={textStyle.textAlign === "right"} onClick={() => onSetTextStyle({ textAlign: "right" })} />
          </ToolCardRow>
        </ToolCard>
      ) : null}

      {openCard === "connector" ? (
        <ToolCard label={t("connectorOptions")} className="flex-col items-stretch gap-2">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:overflow-x-auto sm:scrollbar-none">
            <OptionRow label={t("pathStyle")} options={connectionPathStyles} value={connection.pathStyle} onSelect={(pathStyle) => applyConnection({ pathStyle })} />
            <Separator orientation="horizontal" className="sm:hidden" />
            <Separator orientation="vertical" className="mx-0.5 hidden h-6 sm:block" />
            <OptionRow label={t("connectionStyle")} options={connectionEnds} value={connection.style} onSelect={(style) => applyConnection({ style })} />
            <Separator orientation="horizontal" className="sm:hidden" />
            <Separator orientation="vertical" className="mx-0.5 hidden h-6 sm:block" />
            <OptionRow label={t("headType")} options={connectionHeadTypes} value={connection.headType} onSelect={(headType) => applyConnection({ headType })} />
            <Separator orientation="horizontal" className="sm:hidden" />
            <Separator orientation="vertical" className="mx-0.5 hidden h-6 sm:block" />
            <OptionRow label={t("lineStyle")} options={connectionLineStyles} value={connection.lineStyle} onSelect={(lineStyle) => applyConnection({ lineStyle })} />
          </div>
          <ColorRow label={t("connectionColor")} onSelect={(color) => applyConnection({ color })} />
        </ToolCard>
      ) : null}

      {openCard === "layout" ? (
        <ToolCard label={t("layoutOptions")} className="flex-col items-stretch gap-2">
          <OptionRow label={t("layoutDirection")} options={mindMapLayoutDirections} value={lastMindMapDirection} onSelect={applyMindMapLayout} />
        </ToolCard>
      ) : null}

      {openCard === "ink" ? (
        <ToolCard label={t("drawTools")} className="flex-col items-stretch gap-2">
          <ToolCardRow>
            {inkTools.map((tool) => (
              <IconAction key={tool.id} label={t(tool.label)} icon={tool.icon} shortcut={tool.shortcut} active={activeTool === tool.id} className="max-sm:size-10" onClick={() => pickInkTool(tool.id)} />
            ))}
          </ToolCardRow>
          <ColorRow label={t("drawColor")} onSelect={onSetColor} />
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
