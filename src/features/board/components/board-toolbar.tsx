"use client";

import { ALargeSmall, AlignCenter, AlignLeft, AlignRight, Bold, Columns3, Copy, FileText, GitBranchPlus, ImagePlus, Minus, Palette, Pencil, RectangleHorizontal, Rows3, Spline, Trash2, Waypoints } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { IconAction } from "@/components/ui/icon-action";
import { Separator } from "@/components/ui/separator";
import { ColorRow, OptionRow, SubToolGroup, ToolCard, ToolCardRow } from "@/features/board/components/tool-card";
import { connectionEnds, connectionHeadTypes, connectionLineStyles, connectionPathStyles, contentTools, inkTools, mindMapLayoutDirections, pointerTools, shapeTools } from "@/features/board/components/toolbar-groups";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { BoardTool } from "@/infrastructure/board-engine/board-engine";
import { TEXT_FONT_SIZES, type BoardColor, type BoardConnection, type BoardTextFontSize, type BoardTextStyle, type ConnectionHeadType, type ConnectionLineStyle, type ConnectionPathStyle, type ConnectionStyle } from "@/domain/board/board-document";
import type { MindMapLayoutDirection } from "@/domain/board/mind-map";
import type { MessageKey } from "@/lib/i18n/messages";

type ToolCardId = "text" | "note" | "table" | "shape" | "connector" | "ink" | "layout";

const textSizeLabels: Record<BoardTextFontSize, MessageKey> = {
  14: "textSize14",
  16: "textSize16",
  18: "textSize18",
  24: "textSize24",
  32: "textSize32",
  40: "textSize40",
};

const alignIcons = { left: AlignLeft, center: AlignCenter, right: AlignRight } as const;

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
  onDuplicateSelection,
  onDeleteSelection,
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
  onDuplicateSelection?: () => void;
  onDeleteSelection?: () => void;
}) {
  const { t } = useLocale();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [openCard, setOpenCard] = useState<ToolCardId | null>(null);
  const [openSubTool, setOpenSubTool] = useState<string | null>(null);
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
    setOpenSubTool(null);
  }

  function toggleSubTool(id: string) {
    setOpenSubTool((current) => (current === id ? null : id));
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

  function toggleBold() {
    onSetTextStyle({ fontWeight: textStyle.fontWeight === "bold" ? "normal" : "bold" });
  }

  function textAlignRow() {
    return (
      <ToolCardRow>
        <IconAction label={t("textAlignLeft")} icon={AlignLeft} active={textStyle.textAlign === "left"} onClick={() => onSetTextStyle({ textAlign: "left" })} />
        <IconAction label={t("textAlignCenter")} icon={AlignCenter} active={textStyle.textAlign === "center"} onClick={() => onSetTextStyle({ textAlign: "center" })} />
        <IconAction label={t("textAlignRight")} icon={AlignRight} active={textStyle.textAlign === "right"} onClick={() => onSetTextStyle({ textAlign: "right" })} />
      </ToolCardRow>
    );
  }

  function textSizeRow() {
    return (
      <ToolCardRow>
        {TEXT_FONT_SIZES.map((size) => (
          <button key={size} type="button" aria-label={t(textSizeLabels[size])} aria-pressed={textStyle.fontSize === size} className="size-8 shrink-0 rounded-lg border border-transparent text-xs font-semibold text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-primary/10 aria-pressed:text-primary max-sm:size-10" onClick={() => onSetTextStyle({ fontSize: size })}>{size}</button>
        ))}
      </ToolCardRow>
    );
  }

  function renderToolSubTools(id: ToolCardId): ReactNode {
    if (id === "text" || id === "note") {
      return (
        <SubToolGroup>
          <IconAction label={t("bold")} icon={Bold} active={textStyle.fontWeight === "bold"} disabled={!ready} className="max-sm:size-10" onClick={toggleBold} />
          <IconAction label={t("textAlign")} icon={alignIcons[textStyle.textAlign]} expandable expanded={openSubTool === "align"} disabled={!ready} className="max-sm:size-10" onClick={() => toggleSubTool("align")} />
          <IconAction label={t("textSize")} icon={ALargeSmall} expandable expanded={openSubTool === "size"} disabled={!ready} className="max-sm:size-10" onClick={() => toggleSubTool("size")} />
          <IconAction label={t(id === "text" ? "textColor" : "noteColor")} icon={Palette} expandable expanded={openSubTool === "color"} disabled={!ready} className="max-sm:size-10" onClick={() => toggleSubTool("color")} />
        </SubToolGroup>
      );
    }
    if (id === "table") {
      return (
        <SubToolGroup>
          {selectedElementKind === "table" ? (
            <IconAction label={t("tableActions")} icon={Rows3} expandable expanded={openSubTool === "actions"} disabled={!ready} className="max-sm:size-10" onClick={() => toggleSubTool("actions")} />
          ) : null}
          <IconAction label={t("tableColor")} icon={Palette} expandable expanded={openSubTool === "color"} disabled={!ready} className="max-sm:size-10" onClick={() => toggleSubTool("color")} />
          <IconAction label={t("textAlign")} icon={alignIcons[textStyle.textAlign]} expandable expanded={openSubTool === "align"} disabled={!ready} className="max-sm:size-10" onClick={() => toggleSubTool("align")} />
        </SubToolGroup>
      );
    }
    if (id === "shape") {
      return (
        <SubToolGroup>
          <IconAction label={t("shapeKind")} icon={shapeIcon} expandable expanded={openSubTool === "kind"} disabled={!ready} className="max-sm:size-10" onClick={() => toggleSubTool("kind")} />
          <IconAction label={t("shapeColor")} icon={Palette} expandable expanded={openSubTool === "color"} disabled={!ready} className="max-sm:size-10" onClick={() => toggleSubTool("color")} />
          <IconAction label={t("textAlign")} icon={alignIcons[textStyle.textAlign]} expandable expanded={openSubTool === "align"} disabled={!ready} className="max-sm:size-10" onClick={() => toggleSubTool("align")} />
        </SubToolGroup>
      );
    }
    if (id === "connector") {
      return (
        <SubToolGroup>
          <IconAction label={t("pathStyle")} icon={connectionPathStyles.find((option) => option.value === connection.pathStyle)?.icon ?? RectangleHorizontal} expandable expanded={openSubTool === "pathStyle"} disabled={!ready} className="max-sm:size-10" onClick={() => toggleSubTool("pathStyle")} />
          <IconAction label={t("connectionStyle")} icon={connectionEnds.find((option) => option.value === connection.style)?.icon ?? RectangleHorizontal} expandable expanded={openSubTool === "connectionStyle"} disabled={!ready} className="max-sm:size-10" onClick={() => toggleSubTool("connectionStyle")} />
          <IconAction label={t("headType")} icon={connectionHeadTypes.find((option) => option.value === connection.headType)?.icon ?? RectangleHorizontal} expandable expanded={openSubTool === "headType"} disabled={!ready} className="max-sm:size-10" onClick={() => toggleSubTool("headType")} />
          <IconAction label={t("lineStyle")} icon={connectionLineStyles.find((option) => option.value === connection.lineStyle)?.icon ?? RectangleHorizontal} expandable expanded={openSubTool === "lineStyle"} disabled={!ready} className="max-sm:size-10" onClick={() => toggleSubTool("lineStyle")} />
          <IconAction label={t("connectionColor")} icon={Palette} expandable expanded={openSubTool === "color"} disabled={!ready} className="max-sm:size-10" onClick={() => toggleSubTool("color")} />
        </SubToolGroup>
      );
    }
    if (id === "ink") {
      return (
        <SubToolGroup>
          {inkTools.map((tool) => (
            <IconAction key={tool.id} label={t(tool.label)} icon={tool.icon} shortcut={tool.shortcut} active={activeTool === tool.id} disabled={!ready} className="max-sm:size-10" onClick={() => pickInkTool(tool.id)} />
          ))}
          <IconAction label={t("drawColor")} icon={Palette} expandable expanded={openSubTool === "color"} disabled={!ready} className="max-sm:size-10" onClick={() => toggleSubTool("color")} />
        </SubToolGroup>
      );
    }
    return null;
  }

  function getSubPanel(): { label: string; content: ReactNode } | null {
    if ((openCard === "text" || openCard === "note") && openSubTool) {
      if (openSubTool === "align") return { label: t("textAlign"), content: textAlignRow() };
      if (openSubTool === "size") return { label: t("textSize"), content: textSizeRow() };
      if (openSubTool === "color") return { label: t(openCard === "text" ? "textColor" : "noteColor"), content: <ColorRow onSelect={onSetColor} /> };
    }
    if (openCard === "table" && openSubTool) {
      if (openSubTool === "actions") {
        return {
          label: t("tableActions"),
          content: (
            <ToolCardRow className="w-full overflow-x-auto touch-pan-x scrollbar-none">
              <IconAction label={t("addRow")} icon={Rows3} disabled={!ready} className="max-sm:size-10" onClick={onAddTableRow} />
              <IconAction label={t("deleteRow")} icon={Minus} disabled={!ready} className="max-sm:size-10" onClick={onDeleteTableRow} />
              <IconAction label={t("addCol")} icon={Columns3} disabled={!ready} className="max-sm:size-10" onClick={onAddTableCol} />
              <IconAction label={t("deleteCol")} icon={Minus} disabled={!ready} className="max-sm:size-10" onClick={onDeleteTableCol} />
            </ToolCardRow>
          ),
        };
      }
      if (openSubTool === "color") return { label: t("tableColor"), content: <ColorRow onSelect={onSetColor} /> };
      if (openSubTool === "align") return { label: t("textAlign"), content: textAlignRow() };
    }
    if (openCard === "shape" && openSubTool) {
      if (openSubTool === "kind") {
        return {
          label: t("shapeKind"),
          content: (
            <ToolCardRow className="w-full overflow-x-auto touch-pan-x scrollbar-none">
              {shapeTools.map((tool) => (
                <IconAction key={tool.id} label={t(tool.label)} icon={tool.icon} shortcut={tool.shortcut} active={activeTool === tool.id || selectedShapeKind === tool.id} onClick={() => pickShapeTool(tool.id)} />
              ))}
            </ToolCardRow>
          ),
        };
      }
      if (openSubTool === "color") return { label: t("shapeColor"), content: <ColorRow onSelect={onSetColor} /> };
      if (openSubTool === "align") return { label: t("textAlign"), content: textAlignRow() };
    }
    if (openCard === "connector" && openSubTool) {
      if (openSubTool === "pathStyle") return { label: t("pathStyle"), content: <OptionRow options={connectionPathStyles} value={connection.pathStyle} onSelect={(pathStyle) => applyConnection({ pathStyle })} /> };
      if (openSubTool === "connectionStyle") return { label: t("connectionStyle"), content: <OptionRow options={connectionEnds} value={connection.style} onSelect={(style) => applyConnection({ style })} /> };
      if (openSubTool === "headType") return { label: t("headType"), content: <OptionRow options={connectionHeadTypes} value={connection.headType} onSelect={(headType) => applyConnection({ headType })} /> };
      if (openSubTool === "lineStyle") return { label: t("lineStyle"), content: <OptionRow options={connectionLineStyles} value={connection.lineStyle} onSelect={(lineStyle) => applyConnection({ lineStyle })} /> };
      if (openSubTool === "color") return { label: t("connectionColor"), content: <ColorRow onSelect={(color) => applyConnection({ color })} /> };
    }
    if (openCard === "ink" && openSubTool === "color") {
      return { label: t("drawColor"), content: <ColorRow onSelect={onSetColor} /> };
    }
    return null;
  }

  const subPanel = getSubPanel();

  return (
    <div ref={toolbarRef} className="pointer-events-none absolute inset-x-2 top-[calc(env(safe-area-inset-top)+0.5rem)] z-30 flex flex-col items-center gap-2 sm:inset-x-3 sm:top-3" onKeyDown={(event) => { if (event.key === "Escape") setOpenCard(null); }}>
      <div className="pointer-events-auto flex w-full max-w-full snap-x snap-mandatory flex-nowrap items-center justify-start gap-0.5 overflow-x-auto overscroll-x-contain rounded-xl border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur touch-pan-x scrollbar-none sm:w-auto sm:snap-none" role="toolbar" aria-label="Board tools">
        <div className="flex shrink-0 items-center gap-0.5">
          {pointerTools.map((tool) => (
            <IconAction key={tool.id} label={t(tool.label)} icon={tool.icon} shortcut={tool.shortcut} active={activeTool === tool.id} disabled={!ready} className="max-sm:size-10" onClick={() => onToolChange(tool.id)} />
          ))}
        </div>
        {hasSelection ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <Separator orientation="vertical" className="mx-0 h-6 sm:mx-1" />
            <IconAction label={t("duplicate")} icon={Copy} disabled={!ready} className="max-sm:size-10" onClick={onDuplicateSelection} />
            <IconAction label={t("delete")} icon={Trash2} disabled={!ready} className="max-sm:size-10" onClick={onDeleteSelection} />
          </div>
        ) : null}
        <div className="flex shrink-0 items-center gap-0.5">
          <Separator orientation="vertical" className="mx-0 h-6 sm:mx-1" />
          {contentTools.map((tool) => (
            <div key={tool.id} className="flex shrink-0 items-center gap-0.5">
              <IconAction label={t(tool.label)} icon={tool.icon} shortcut={tool.shortcut} active={activeTool === tool.id} expandable expanded={openCard === tool.id} disabled={!ready} className="max-sm:size-10" onClick={() => {
                if (!hasSelection) onToolChange(tool.id);
                toggleCard(tool.id as ToolCardId);
              }} />
              {openCard === tool.id ? renderToolSubTools(tool.id as ToolCardId) : null}
            </div>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Separator orientation="vertical" className="mx-0 h-6 sm:mx-1" />
          <IconAction label={t("shapes")} icon={shapeIcon} active={shapeActive} expandable expanded={openCard === "shape"} disabled={!ready} className="max-sm:size-10" onClick={() => { if (!hasSelection && openCard !== "shape") { pickShapeTool(shapeTool); } toggleCard("shape"); }} />
          {openCard === "shape" ? renderToolSubTools("shape") : null}
          <IconAction label={t("connector")} icon={Waypoints} shortcut="A" active={activeTool === "arrow"} expandable expanded={openCard === "connector"} disabled={!ready} className="max-sm:size-10" onClick={() => { onToolChange("arrow"); toggleCard("connector"); }} />
          {openCard === "connector" ? renderToolSubTools("connector") : null}
          <IconAction label={t("drawTools")} icon={inkIcon} active={inkActive} expandable expanded={openCard === "ink"} disabled={!ready} className="max-sm:size-10" onClick={() => { pickInkTool(inkTool); toggleCard("ink"); }} />
          {openCard === "ink" ? renderToolSubTools("ink") : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Separator orientation="vertical" className="mx-1 h-6" />
          <IconAction label={t("importImage")} icon={ImagePlus} disabled={!ready || uploadingImage} onClick={onImportImage} />
          <IconAction label={t("importPdf")} icon={FileText} disabled={!ready} onClick={onImportPdf} />
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Separator orientation="vertical" className="mx-1 h-6" />
          <IconAction label={t("addChildNode")} icon={GitBranchPlus} disabled={!ready} onClick={onAddChildNode} />
          <IconAction label={t("autoLayout")} icon={Spline} expandable expanded={openCard === "layout"} disabled={!ready} onClick={() => { onLayoutMindMap(lastMindMapDirection); toggleCard("layout"); }} />
        </div>
      </div>

      {subPanel ? (
        <ToolCard label={subPanel.label} className="flex-col items-stretch gap-2">
          {subPanel.content}
        </ToolCard>
      ) : null}

      {openCard === "layout" ? (
        <ToolCard label={t("layoutOptions")} className="flex-col items-stretch gap-2">
          <OptionRow label={t("layoutDirection")} options={mindMapLayoutDirections} value={lastMindMapDirection} onSelect={applyMindMapLayout} />
        </ToolCard>
      ) : null}
    </div>
  );
}
