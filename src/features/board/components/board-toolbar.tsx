"use client";

import { AlignCenter, AlignLeft, AlignRight, Bold, Columns3, Copy, FileText, GitBranchPlus, ImagePlus, Minus, Palette, Pencil, RectangleHorizontal, Rows3, Spline, Trash2, Waypoints } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { IconAction } from "@/components/ui/icon-action";
import { Separator } from "@/components/ui/separator";
import { AccordionItem, AnchoredCard, ColorRow, OptionRow, ToolCard, ToolCardLabel, ToolCardRow, ToolCardSeparator, type AnchoredCardPosition } from "@/features/board/components/tool-card";
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

const CARD_WIDTH = 236;
const CARD_MARGIN = 8;
const CARD_GAP = 8;

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
  const rowRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Partial<Record<ToolCardId, HTMLButtonElement | null>>>({});
  const [openCard, setOpenCard] = useState<ToolCardId | null>(null);
  const [cardPosition, setCardPosition] = useState<AnchoredCardPosition | null>(null);
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

  useLayoutEffect(() => {
    if (!openCard) return;
    const cardId = openCard;
    function recompute() {
      const trigger = triggerRefs.current[cardId];
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const preferRight = rect.left + rect.width / 2 < viewportWidth / 2;
      const rawLeft = preferRight ? rect.right + CARD_GAP : rect.left - CARD_GAP - CARD_WIDTH;
      const left = Math.min(Math.max(rawLeft, CARD_MARGIN), viewportWidth - CARD_WIDTH - CARD_MARGIN);
      const top = Math.min(Math.max(rect.top, CARD_MARGIN), viewportHeight - CARD_MARGIN - 80);
      setCardPosition({ top, left, maxWidth: CARD_WIDTH, maxHeight: viewportHeight - top - CARD_MARGIN });
    }
    recompute();
    const rowEl = rowRef.current;
    window.addEventListener("resize", recompute);
    rowEl?.addEventListener("scroll", recompute);
    return () => {
      window.removeEventListener("resize", recompute);
      rowEl?.removeEventListener("scroll", recompute);
    };
  }, [openCard]);

  const effectiveShapeTool = selectedShapeKind ?? lastShapeTool;
  const shapeActive = shapeTools.some((tool) => tool.id === activeTool) || Boolean(selectedShapeKind);
  const inkActive = inkTools.some((tool) => tool.id === activeTool);
  const shapeTool = shapeActive ? (shapeTools.some((tool) => tool.id === activeTool) ? activeTool : effectiveShapeTool) : effectiveShapeTool;
  const inkTool = inkActive ? activeTool : lastInkTool;
  const shapeIcon = shapeTools.find((tool) => tool.id === shapeTool)?.icon ?? RectangleHorizontal;
  const inkIcon = inkTools.find((tool) => tool.id === inkTool)?.icon ?? Pencil;
  const effectiveCardPosition = openCard ? cardPosition : null;

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

  return (
    <div ref={toolbarRef} className="pointer-events-none absolute inset-x-2 top-[calc(env(safe-area-inset-top)+0.5rem)] z-30 flex flex-col items-center gap-2 sm:inset-x-3 sm:top-3" onKeyDown={(event) => { if (event.key === "Escape") setOpenCard(null); }}>
      <div ref={rowRef} className="pointer-events-auto flex w-full max-w-full snap-x snap-mandatory flex-nowrap items-center justify-start gap-0.5 overflow-x-auto overscroll-x-contain rounded-xl border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur touch-pan-x scrollbar-none sm:w-auto sm:snap-none" role="toolbar" aria-label="Board tools">
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
            <IconAction key={tool.id} ref={(el) => { triggerRefs.current[tool.id as ToolCardId] = el; }} label={t(tool.label)} icon={tool.icon} shortcut={tool.shortcut} active={activeTool === tool.id} expandable expanded={openCard === tool.id} disabled={!ready} className="max-sm:size-10" onClick={() => {
              if (!hasSelection) onToolChange(tool.id);
              toggleCard(tool.id as ToolCardId);
            }} />
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Separator orientation="vertical" className="mx-0 h-6 sm:mx-1" />
          <IconAction ref={(el) => { triggerRefs.current.shape = el; }} label={t("shapes")} icon={shapeIcon} active={shapeActive} expandable expanded={openCard === "shape"} disabled={!ready} className="max-sm:size-10" onClick={() => { if (!hasSelection && openCard !== "shape") { pickShapeTool(shapeTool); } toggleCard("shape"); }} />
          <IconAction ref={(el) => { triggerRefs.current.connector = el; }} label={t("connector")} icon={Waypoints} shortcut="A" active={activeTool === "arrow"} expandable expanded={openCard === "connector"} disabled={!ready} className="max-sm:size-10" onClick={() => { onToolChange("arrow"); toggleCard("connector"); }} />
          <IconAction ref={(el) => { triggerRefs.current.ink = el; }} label={t("drawTools")} icon={inkIcon} active={inkActive} expandable expanded={openCard === "ink"} disabled={!ready} className="max-sm:size-10" onClick={() => { pickInkTool(inkTool); toggleCard("ink"); }} />
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Separator orientation="vertical" className="mx-1 h-6" />
          <IconAction label={t("importImage")} icon={ImagePlus} disabled={!ready || uploadingImage} onClick={onImportImage} />
          <IconAction label={t("importPdf")} icon={FileText} disabled={!ready} onClick={onImportPdf} />
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Separator orientation="vertical" className="mx-1 h-6" />
          <IconAction label={t("addChildNode")} icon={GitBranchPlus} disabled={!ready} onClick={onAddChildNode} />
          <IconAction ref={(el) => { triggerRefs.current.layout = el; }} label={t("autoLayout")} icon={Spline} expandable expanded={openCard === "layout"} disabled={!ready} onClick={() => { onLayoutMindMap(lastMindMapDirection); toggleCard("layout"); }} />
        </div>
      </div>

      {openCard === "text" ? (
        <AnchoredCard position={effectiveCardPosition}>
          <ToolCard label={t("textFormatting")} className="w-full max-w-none flex-col items-stretch gap-0">
            <ToolCardRow className="px-1 py-1.5">
              <IconAction label={t("bold")} icon={Bold} active={textStyle.fontWeight === "bold"} onClick={toggleBold} />
            </ToolCardRow>
            <AccordionItem label={t("textAlign")} icon={alignIcons[textStyle.textAlign]}>
              {textAlignRow()}
            </AccordionItem>
            <AccordionItem label={t("textSize")}>
              {textSizeRow()}
            </AccordionItem>
            <AccordionItem label={t("textColor")} icon={Palette}>
              <ColorRow onSelect={onSetColor} />
            </AccordionItem>
          </ToolCard>
        </AnchoredCard>
      ) : null}

      {openCard === "note" ? (
        <AnchoredCard position={effectiveCardPosition}>
          <ToolCard label={t("note")} className="w-full max-w-none flex-col items-stretch gap-0">
            <AccordionItem label={t("textFormatting")} icon={alignIcons[textStyle.textAlign]}>
              <ToolCardRow className="w-full overflow-x-auto touch-pan-x scrollbar-none">
                <IconAction label={t("bold")} icon={Bold} active={textStyle.fontWeight === "bold"} onClick={toggleBold} />
                <ToolCardSeparator />
                <IconAction label={t("textAlignLeft")} icon={AlignLeft} active={textStyle.textAlign === "left"} onClick={() => onSetTextStyle({ textAlign: "left" })} />
                <IconAction label={t("textAlignCenter")} icon={AlignCenter} active={textStyle.textAlign === "center"} onClick={() => onSetTextStyle({ textAlign: "center" })} />
                <IconAction label={t("textAlignRight")} icon={AlignRight} active={textStyle.textAlign === "right"} onClick={() => onSetTextStyle({ textAlign: "right" })} />
              </ToolCardRow>
              <ToolCardRow className="w-full overflow-x-auto touch-pan-x scrollbar-none">
                <ToolCardLabel>{t("textSize")}</ToolCardLabel>
                {TEXT_FONT_SIZES.map((size) => (
                  <button key={size} type="button" aria-label={t(textSizeLabels[size])} aria-pressed={textStyle.fontSize === size} className="size-8 shrink-0 rounded-lg border border-transparent text-xs font-semibold text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-primary/10 aria-pressed:text-primary max-sm:size-10" onClick={() => onSetTextStyle({ fontSize: size })}>{size}</button>
                ))}
              </ToolCardRow>
            </AccordionItem>
            <AccordionItem label={t("noteColor")} icon={Palette}>
              <ColorRow onSelect={onSetColor} />
            </AccordionItem>
          </ToolCard>
        </AnchoredCard>
      ) : null}

      {openCard === "table" ? (
        <AnchoredCard position={effectiveCardPosition}>
          <ToolCard label={t("table")} className="w-full max-w-none flex-col items-stretch gap-0">
            {selectedElementKind === "table" ? (
              <AccordionItem label={t("tableActions")}>
                <ToolCardRow className="w-full overflow-x-auto touch-pan-x scrollbar-none">
                  <IconAction label={t("addRow")} icon={Rows3} disabled={!ready} className="max-sm:size-10" onClick={onAddTableRow} />
                  <IconAction label={t("deleteRow")} icon={Minus} disabled={!ready} className="max-sm:size-10" onClick={onDeleteTableRow} />
                  <IconAction label={t("addCol")} icon={Columns3} disabled={!ready} className="max-sm:size-10" onClick={onAddTableCol} />
                  <IconAction label={t("deleteCol")} icon={Minus} disabled={!ready} className="max-sm:size-10" onClick={onDeleteTableCol} />
                </ToolCardRow>
              </AccordionItem>
            ) : null}
            <AccordionItem label={t("tableColor")} icon={Palette}>
              <ColorRow onSelect={onSetColor} />
            </AccordionItem>
            <AccordionItem label={t("textAlign")} icon={alignIcons[textStyle.textAlign]}>
              {textAlignRow()}
            </AccordionItem>
          </ToolCard>
        </AnchoredCard>
      ) : null}

      {openCard === "shape" ? (
        <AnchoredCard position={effectiveCardPosition}>
          <ToolCard label={t("shapes")} className="w-full max-w-none flex-col items-stretch gap-0">
            <AccordionItem label={t("shapeKind")} icon={shapeIcon}>
              <ToolCardRow className="w-full overflow-x-auto touch-pan-x scrollbar-none">
                {shapeTools.map((tool) => (
                  <IconAction key={tool.id} label={t(tool.label)} icon={tool.icon} shortcut={tool.shortcut} active={activeTool === tool.id || selectedShapeKind === tool.id} onClick={() => pickShapeTool(tool.id)} />
                ))}
              </ToolCardRow>
            </AccordionItem>
            <AccordionItem label={t("shapeColor")} icon={Palette}>
              <ColorRow onSelect={onSetColor} />
            </AccordionItem>
            <AccordionItem label={t("textAlign")} icon={alignIcons[textStyle.textAlign]}>
              {textAlignRow()}
            </AccordionItem>
          </ToolCard>
        </AnchoredCard>
      ) : null}

      {openCard === "connector" ? (
        <AnchoredCard position={effectiveCardPosition}>
          <ToolCard label={t("connectorOptions")} className="w-full max-w-none flex-col items-stretch gap-0">
            <AccordionItem label={t("pathStyle")} icon={connectionPathStyles.find((option) => option.value === connection.pathStyle)?.icon}>
              <OptionRow options={connectionPathStyles} value={connection.pathStyle} onSelect={(pathStyle) => applyConnection({ pathStyle })} />
            </AccordionItem>
            <AccordionItem label={t("connectionStyle")} icon={connectionEnds.find((option) => option.value === connection.style)?.icon}>
              <OptionRow options={connectionEnds} value={connection.style} onSelect={(style) => applyConnection({ style })} />
            </AccordionItem>
            <AccordionItem label={t("headType")} icon={connectionHeadTypes.find((option) => option.value === connection.headType)?.icon}>
              <OptionRow options={connectionHeadTypes} value={connection.headType} onSelect={(headType) => applyConnection({ headType })} />
            </AccordionItem>
            <AccordionItem label={t("lineStyle")} icon={connectionLineStyles.find((option) => option.value === connection.lineStyle)?.icon}>
              <OptionRow options={connectionLineStyles} value={connection.lineStyle} onSelect={(lineStyle) => applyConnection({ lineStyle })} />
            </AccordionItem>
            <AccordionItem label={t("connectionColor")} icon={Palette}>
              <ColorRow onSelect={(color) => applyConnection({ color })} />
            </AccordionItem>
          </ToolCard>
        </AnchoredCard>
      ) : null}

      {openCard === "layout" ? (
        <AnchoredCard position={effectiveCardPosition}>
          <ToolCard label={t("layoutOptions")} className="w-full max-w-none flex-col items-stretch gap-2">
            <OptionRow label={t("layoutDirection")} options={mindMapLayoutDirections} value={lastMindMapDirection} onSelect={applyMindMapLayout} />
          </ToolCard>
        </AnchoredCard>
      ) : null}

      {openCard === "ink" ? (
        <AnchoredCard position={effectiveCardPosition}>
          <ToolCard label={t("drawTools")} className="w-full max-w-none flex-col items-stretch gap-2">
            <ToolCardRow>
              {inkTools.map((tool) => (
                <IconAction key={tool.id} label={t(tool.label)} icon={tool.icon} shortcut={tool.shortcut} active={activeTool === tool.id} className="max-sm:size-10" onClick={() => pickInkTool(tool.id)} />
              ))}
            </ToolCardRow>
            <ColorRow label={t("drawColor")} onSelect={onSetColor} />
          </ToolCard>
        </AnchoredCard>
      ) : null}
    </div>
  );
}
