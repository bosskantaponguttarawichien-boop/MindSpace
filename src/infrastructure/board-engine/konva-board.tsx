"use client";

import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Arrow, Ellipse, Group, Image as KonvaImage, Layer, Line, Path, Rect, Stage, Text, Transformer } from "react-konva";
import { sampleBoard } from "@/domain/board/sample-board";
import { sameBoardDocument, textStyleFor, type BoardColor, type BoardConnection, type BoardDocument, type BoardElement, type BoardElementId, type BoardTextStyle } from "@/domain/board/board-document";
import { textStyleForScope, type BoardTextStyles } from "@/domain/board/text-style-scope";
import { boundsFromPoints, elementsBoundingBox, getConnectionEndpoints, getConnectionPathPoints, getGroupedElbowPaths, isElementContainedByBounds, type Bounds } from "@/domain/board/geometry";
import { isElementLocked, isSelectionLocked, setElementsLocked } from "@/domain/board/element-lock";
import { reorderElements, type LayerPlacement } from "@/domain/board/element-order";
import { expandSelectionWithGroups, groupElements, ungroupElements } from "@/domain/board/grouping";
import { appendMindMapChild, appendMindMapSibling, layoutMindMap, type MindMapDefaults, type MindMapLayoutDirection } from "@/domain/board/mind-map";
import { parseMarkdown } from "@/domain/board/markdown";
import type { BoardEngine, BoardExport, BoardTool } from "@/infrastructure/board-engine/board-engine";
import type { AiProposal } from "@/domain/ai/proposal-schema";
import { applyProposalToDocument } from "@/domain/ai/apply-proposal";
import { heightForEditedElement } from "@/infrastructure/board-engine/element-sizing";
import { useLocale } from "@/lib/i18n/locale-provider";

type Viewport = { x: number; y: number; scale: number };
type Size = { width: number; height: number };
type ScreenPoint = { x: number; y: number };
type TouchGesture = { distance: number; midpoint: ScreenPoint; viewport: Viewport };
type SelectionMarqueeStart = { point: ScreenPoint; additive: boolean };
type MindMapNodeKind = MindMapDefaults["kind"];
const mindMapNodeKinds = new Set<MindMapNodeKind>(["text", "note", "rectangle", "ellipse", "diamond", "triangle"]);

function isShapeKind(kind?: string | null): boolean {
  return kind === "rectangle" || kind === "ellipse" || kind === "diamond" || kind === "triangle";
}

const COLORS: Record<BoardColor, { fill: string; stroke: string; text: string }> = {
  violet: { fill: "#ede9fe", stroke: "#7c3aed", text: "#3b0764" },
  purple: { fill: "#f3e8ff", stroke: "#9333ea", text: "#581c87" },
  indigo: { fill: "#e0e7ff", stroke: "#6366f1", text: "#312e81" },
  blue: { fill: "#dbeafe", stroke: "#3b82f6", text: "#1e3a8a" },
  sky: { fill: "#e0f2fe", stroke: "#0284c7", text: "#075985" },
  cyan: { fill: "#cffafe", stroke: "#0891b2", text: "#155e75" },
  teal: { fill: "#ccfbf1", stroke: "#14b8a6", text: "#134e4a" },
  emerald: { fill: "#d1fae5", stroke: "#059669", text: "#065f46" },
  green: { fill: "#dcfce7", stroke: "#22c55e", text: "#14532d" },
  lime: { fill: "#ecfccb", stroke: "#65a30d", text: "#3f6212" },
  yellow: { fill: "#fef3c7", stroke: "#f59e0b", text: "#78350f" },
  amber: { fill: "#fef3c7", stroke: "#d97706", text: "#78350f" },
  orange: { fill: "#ffedd5", stroke: "#f97316", text: "#7c2d12" },
  red: { fill: "#fee2e2", stroke: "#ef4444", text: "#7f1d1d" },
  rose: { fill: "#ffe4e6", stroke: "#e11d48", text: "#881337" },
  pink: { fill: "#fce7f3", stroke: "#ec4899", text: "#831843" },
  fuchsia: { fill: "#fae8ff", stroke: "#c026d3", text: "#701a75" },
  slate: { fill: "#e2e8f0", stroke: "#475569", text: "#0f172a" },
  grey: { fill: "#f3f4f6", stroke: "#94a3b8", text: "#334155" },
};

const NOTE_GRADIENTS: Record<BoardColor, { from: string; to: string }> = {
  yellow: { from: "#fefce8", to: "#fef3c7" },
  amber: { from: "#fffbeb", to: "#fde68a" },
  orange: { from: "#fff7ed", to: "#ffedd5" },
  red: { from: "#fff1f2", to: "#fee2e2" },
  rose: { from: "#fff1f2", to: "#ffe4e6" },
  pink: { from: "#fdf2f8", to: "#fce7f3" },
  fuchsia: { from: "#fdf4ff", to: "#fae8ff" },
  purple: { from: "#faf5ff", to: "#f3e8ff" },
  violet: { from: "#f5f3ff", to: "#ede9fe" },
  indigo: { from: "#eef2ff", to: "#e0e7ff" },
  blue: { from: "#eff6ff", to: "#dbeafe" },
  sky: { from: "#f0f9ff", to: "#e0f2fe" },
  cyan: { from: "#ecfeff", to: "#cffafe" },
  teal: { from: "#f0fdfa", to: "#ccfbf1" },
  emerald: { from: "#ecfdf5", to: "#d1fae5" },
  green: { from: "#f0fdf4", to: "#dcfce7" },
  lime: { from: "#f7fee7", to: "#ecfccb" },
  slate: { from: "#f8fafc", to: "#f1f5f9" },
  grey: { from: "#fafafa", to: "#f4f4f5" },
};

const INITIAL_VIEWPORT: Viewport = { x: 40, y: 25, scale: 0.9 };
const PDF_PAGE = { width: 1123, height: 794, padding: 48 };
const TOOL_SHORTCUTS: Partial<Record<string, BoardTool>> = {
  v: "select",
  h: "hand",
  t: "text",
  n: "note",
  r: "rectangle",
  o: "ellipse",
  a: "arrow",
  d: "draw",
  e: "eraser",
};

function cloneDocument(document: BoardDocument): BoardDocument {
  return structuredClone(document);
}

function createElementId(): BoardElementId {
  return `element:${crypto.randomUUID()}`;
}



function boardBounds(elements: BoardElement[]) {
  if (elements.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const element of elements) {
    if (element.kind === "draw" && element.points && element.points.length >= 2) {
      for (let i = 0; i < element.points.length; i += 2) {
        const px = element.points[i]!;
        const py = element.points[i + 1]!;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    } else {
      if (element.x < minX) minX = element.x;
      if (element.y < minY) minY = element.y;
      const right = element.x + element.width;
      const bottom = element.y + element.height;
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    }
  }

  return {
    minX: minX === Infinity ? 0 : minX,
    minY: minY === Infinity ? 0 : minY,
    maxX: maxX === -Infinity ? 800 : maxX,
    maxY: maxY === -Infinity ? 600 : maxY,
  };
}

function nextElement(tool: BoardTool, x: number, y: number, textStyles: BoardTextStyles): BoardElement | null {
  const id = createElementId();
  const textStyle = textStyleForScope(textStyles, tool);
  if (tool === "text") return { id, kind: "text", x, y, width: 220, height: 54, text: "New idea", color: "grey", textStyle };
  if (tool === "note") return { id, kind: "note", x, y, width: 190, height: 170, text: "New note", color: "yellow", textStyle };
  if (tool === "table") {
    const defaultData = [
      ["Header 1", "Header 2", "Header 3"],
      ["Item A", "10", "OK"],
      ["Item B", "20", "Done"],
    ];
    return {
      id,
      kind: "table",
      x,
      y,
      width: 300,
      height: 150,
      rows: 3,
      cols: 3,
      tableData: defaultData,
      text: defaultData.map((row) => row.join(" | ")).join("\n"),
      color: "slate",
      textStyle,
    };
  }
  if (tool === "rectangle") return { id, kind: "rectangle", x, y, width: 220, height: 120, text: "New concept", color: "violet", textStyle };
  if (tool === "ellipse") return { id, kind: "ellipse", x, y, width: 200, height: 120, text: "New concept", color: "blue", textStyle };
  if (tool === "diamond") return { id, kind: "diamond", x, y, width: 180, height: 140, text: "Decision", color: "yellow", textStyle };
  if (tool === "triangle") return { id, kind: "triangle", x, y, width: 180, height: 140, text: "Step", color: "green", textStyle };
  return null;
}

function supportsTextStyle(element: BoardElement) {
  return element.kind === "text" || element.kind === "note" || element.kind === "table" || element.kind === "rectangle" || element.kind === "ellipse" || element.kind === "diamond" || element.kind === "triangle";
}

function effectiveTextStyleFor(element: Pick<BoardElement, "kind" | "textStyle">): BoardTextStyle {
  const style = textStyleFor(element);
  const isLegacyShape = element.kind === "rectangle" || element.kind === "ellipse" || element.kind === "diamond" || element.kind === "triangle";
  if (isLegacyShape && element.textStyle?.textAlign === undefined) {
    return { ...style, textAlign: "center" };
  }
  if (element.kind === "note" && element.textStyle?.fontSize === undefined) {
    return { ...style, fontSize: 16 };
  }
  if (element.kind === "table") {
    return {
      fontSize: element.textStyle?.fontSize ?? 14,
      fontWeight: element.textStyle?.fontWeight ?? "normal",
      textAlign: element.textStyle?.textAlign ?? "center",
      verticalAlign: element.textStyle?.verticalAlign ?? "middle",
    };
  }
  return style;
}

const imageElementCache = new Map<string, HTMLImageElement>();

const BoardImage = memo(function BoardImage({ element }: { element: BoardElement }) {
  const assetUrl = element.assetUrl;
  const cached = assetUrl ? imageElementCache.get(assetUrl) ?? null : null;
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const image = cached ?? loadedImage;

  useEffect(() => {
    if (!assetUrl || imageElementCache.has(assetUrl)) return;
    let cancelled = false;
    let pending: HTMLImageElement | null = null;

    function load(source: string, anonymous: boolean) {
      const next = new window.Image();
      pending = next;
      if (anonymous) next.crossOrigin = "anonymous";
      next.onload = () => {
        imageElementCache.set(source, next);
        if (!cancelled) setLoadedImage(next);
      };
      next.onerror = () => {
        if (cancelled) return;
        if (anonymous) load(source, false);
        else setLoadedImage(null);
      };
      next.src = source;
    }

    load(assetUrl, true);
    return () => {
      cancelled = true;
      if (!pending) return;
      pending.onload = null;
      pending.onerror = null;
    };
  }, [assetUrl]);

  return image
    ? <KonvaImage image={image} width={element.width} height={element.height} cornerRadius={12} perfectDrawEnabled={false} />
    : <Rect width={element.width} height={element.height} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={2} cornerRadius={12} perfectDrawEnabled={false} />;
});

const BoardTable = memo(function BoardTable({
  element,
  colors,
  onCellDblClick,
  onTitleDblClick,
  titleEditing,
}: {
  element: BoardElement;
  colors: { fill: string; stroke: string; text: string };
  onCellDblClick: (r: number, c: number, text: string) => void;
  onTitleDblClick: () => void;
  titleEditing: boolean;
}) {
  const rows = Math.max(1, element.rows ?? 3);
  const cols = Math.max(1, element.cols ?? 3);
  const titleHeight = element.title || titleEditing ? 38 : 0;
  const cellWidth = element.width / cols;
  const cellHeight = Math.max(1, element.height - titleHeight) / rows;

  const data: string[][] = useMemo(() => {
    if (element.tableData && element.tableData.length > 0) {
      return element.tableData;
    }
    const lines = (element.text || "").split("\n");
    return Array.from({ length: rows }, (_, r) => {
      const lineCells = lines[r] ? lines[r].split("|").map((cell) => cell.trim()) : [];
      return Array.from({ length: cols }, (_, c) => lineCells[c] ?? "");
    });
  }, [element.tableData, element.text, rows, cols]);

  const vLines: number[] = useMemo(() => {
    const list: number[] = [];
    for (let c = 1; c < cols; c++) list.push(c * cellWidth);
    return list;
  }, [cols, cellWidth]);

  const hLines: number[] = useMemo(() => {
    const list: number[] = [];
    for (let r = 1; r < rows; r++) list.push(r * cellHeight);
    return list;
  }, [rows, cellHeight]);

  const textStyle = effectiveTextStyleFor(element);
  const fontSize = element.textStyle?.fontSize ?? Math.max(11, Math.min(14, cellHeight * 0.35));

  return (
    <Group>
      <Rect
        width={element.width}
        height={element.height}
        fill="#ffffff"
        stroke={colors.stroke}
        strokeWidth={2}
        cornerRadius={18}
        shadowColor="#0f172a"
        shadowOpacity={0.06}
        shadowBlur={6}
        shadowOffsetY={3}
        shadowForStrokeEnabled={false}
        perfectDrawEnabled={false}
      />
      <Rect
        x={0}
        y={titleHeight}
        width={element.width}
        height={cellHeight}
        fill={colors.stroke}
        opacity={0.35}
        cornerRadius={titleHeight ? 0 : [18, 18, 0, 0]}
        perfectDrawEnabled={false}
      />
      <Line
        points={[0, titleHeight + cellHeight, element.width, titleHeight + cellHeight]}
        stroke={colors.stroke}
        strokeWidth={1.5}
        opacity={0.4}
        perfectDrawEnabled={false}
      />
      {Array.from({ length: rows - 1 }, (_, index) => {
        const r = index + 1;
        if (r % 2 === 0) {
          return (
            <Rect
              key={`zebra-${r}`}
              x={0}
              y={titleHeight + r * cellHeight}
              width={element.width}
              height={cellHeight}
              fill={colors.fill}
              opacity={0.35}
              cornerRadius={r === rows - 1 ? [0, 0, 18, 18] : 0}
              perfectDrawEnabled={false}
            />
          );
        }
        return null;
      })}
      {vLines.map((x, i) => (
        <Line
          key={`v-${i}`}
          points={[x, titleHeight, x, element.height]}
          stroke={colors.stroke}
          strokeWidth={1}
          opacity={0.16}
          perfectDrawEnabled={false}
        />
      ))}
      {hLines.map((y, i) => (
        <Line
          key={`h-${i + 1}`}
          points={[0, titleHeight + y, element.width, titleHeight + y]}
          stroke={colors.stroke}
          strokeWidth={1}
          opacity={0.18}
          perfectDrawEnabled={false}
        />
      ))}
      {data.slice(0, rows).flatMap((row, r) =>
        row.slice(0, cols).map((cellText, c) => (
          <Group
            key={`cell-${r}-${c}`}
            x={c * cellWidth}
            y={titleHeight + r * cellHeight}
            width={cellWidth}
            height={cellHeight}
            onDblClick={(event) => {
              event.cancelBubble = true;
              onCellDblClick(r, c, cellText);
            }}
          >
            <Rect width={cellWidth} height={cellHeight} fill="transparent" perfectDrawEnabled={false} hitStrokeWidth={0} />
            <Text
              width={cellWidth}
              height={cellHeight}
              text={cellText}
              padding={8}
              fill={r === 0 ? "#0f172a" : "#1e293b"}
              fontFamily="Geist, Noto Sans Thai, sans-serif"
              fontSize={r === 0 ? Math.max(12, fontSize) : fontSize}
              fontStyle={r === 0 || textStyle.fontWeight === "bold" ? "bold" : "normal"}
              lineHeight={1.25}
              verticalAlign={textStyle.verticalAlign ?? "middle"}
              align={textStyle.textAlign}
              wrap="word"
              perfectDrawEnabled={false}
            />
          </Group>
        ))
      )}
      {titleHeight ? (
        <Group onDblClick={(event) => { event.cancelBubble = true; onTitleDblClick(); }}>
          <Rect width={element.width} height={titleHeight} fill="transparent" perfectDrawEnabled={false} />
          <Rect x={12} y={7} width={24} height={24} cornerRadius={6} fill={colors.fill} perfectDrawEnabled={false} />
          <Path x={17} y={12} data="M1 1H15V15H1z M1 5H15 M5 1V15" stroke={colors.stroke} strokeWidth={1.5} listening={false} perfectDrawEnabled={false} />
          <Text x={44} y={9} width={element.width - 55} text={titleEditing ? "" : element.title ?? ""} fill="#1e293b" fontFamily="Geist, Noto Sans Thai, sans-serif" fontSize={16} fontStyle="bold" perfectDrawEnabled={false} />
          <Line points={[0, titleHeight, element.width, titleHeight]} stroke={colors.stroke} opacity={0.25} strokeWidth={1} perfectDrawEnabled={false} />
        </Group>
      ) : null}
    </Group>
  );
});

const MarkdownText = memo(function MarkdownText({ element, color }: { element: BoardElement; color: string }) {
  const lines = parseMarkdown(element.text);
  const isStructured = lines.length > 1 || lines.some((line) => line.kind !== "paragraph");
  const padding = element.kind === "text" ? 0 : 18;
  const textStyle = effectiveTextStyleFor(element);
  const defaultFontSize = supportsTextStyle(element) ? textStyle.fontSize : 16;
  const availableWidth = Math.max(20, element.width - padding * 2);

  const lineHeights = lines.map((line) => {
    const fontSize = element.kind === "text" || line.kind !== "heading" ? defaultFontSize : ({ 1: 24, 2: 20, 3: 18 }[line.level ?? 3]);
    const prefix = line.kind === "bullet" ? "• " : line.kind === "task" ? `${line.checked ? "☑" : "☐"} ` : line.kind === "quote" ? "│ " : "";
    const totalLength = (prefix + line.text).length;
    const charsPerLine = Math.max(1, Math.floor(availableWidth / (fontSize * 0.55)));
    const estimatedLines = Math.max(1, Math.ceil(totalLength / charsPerLine));
    const height = fontSize * 1.45 * estimatedLines;
    return { fontSize, prefix, height };
  });

  const totalTextHeight = lineHeights.reduce((sum, item) => sum + item.height, 0);

  const verticalAlign = textStyle.verticalAlign ?? "top";
  const titleOffset = (element.kind === "note" || isShapeKind(element.kind)) && element.title ? 40 : 0;
  let startY = padding + titleOffset;
  if (element.kind !== "text") {
    const availableHeight = Math.max(0, element.height - padding * 2 - titleOffset);
    if (verticalAlign === "middle") {
      startY = Math.max(padding + titleOffset, padding + titleOffset + (availableHeight - totalTextHeight) / 2);
    } else if (verticalAlign === "bottom") {
      startY = Math.max(padding + titleOffset, element.height - padding - totalTextHeight);
    }
  }

  const lineYPositions = lineHeights.reduce<number[]>((acc, item, index) => {
    const prevY = index === 0 ? startY : acc[index - 1]! + lineHeights[index - 1]!.height;
    acc.push(prevY);
    return acc;
  }, []);

  return (
    <Group listening={false}>
      {lines.map((line, index) => {
        const item = lineHeights[index]!;
        const lineY = lineYPositions[index]!;
        return (
          <Text
            key={`${line.kind}-${index}`}
            text={`${item.prefix}${line.text}`}
            x={padding}
            y={lineY}
            width={availableWidth}
            fill={color}
            fontFamily={line.kind === "code" ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "Geist, Noto Sans Thai, sans-serif"}
            fontSize={item.fontSize}
            fontStyle={(supportsTextStyle(element) && textStyle.fontWeight === "bold") || line.bold || line.kind === "heading" ? "bold" : "normal"}
            lineHeight={1.35}
            align={supportsTextStyle(element) ? textStyle.textAlign : element.kind === "note" || isStructured ? "left" : "center"}
            wrap="word"
            perfectDrawEnabled={false}
          />
        );
      })}
    </Group>
  );
});

type BoardConnectionNodeProps = {
  connection: BoardConnection;
  from: BoardElement;
  to: BoardElement;
  groupedPath?: { points: number[] };
  isSelected: boolean;
  onSelect: (id: string, event: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  registerArrow: (id: string, node: Konva.Arrow | null) => void;
  registerAnchor: (key: string, node: Konva.Ellipse | null) => void;
};

const BoardConnectionNode = memo(function BoardConnectionNode({
  connection,
  from,
  to,
  groupedPath,
  isSelected,
  onSelect,
  registerArrow,
  registerAnchor,
}: BoardConnectionNodeProps) {
  const { start, end } = getConnectionEndpoints(from, to, connection.pathStyle === "curved" ? 0 : 16);
  const colorKey = connection.color;
  const strokeColor = isSelected ? "#7c3aed" : colorKey ? COLORS[colorKey].stroke : "#64748b";
  const style = connection.style ?? "end";
  const lineStyle = connection.lineStyle ?? "solid";
  const headType = connection.headType ?? "arrow";
  const pointerAtBeginning = style === "both" || style === "start";
  const pointerAtEnding = style === "both" || style === "end";
  const dash = lineStyle === "dashed" ? [10, 6] : lineStyle === "dotted" ? [3, 5] : [];
  let pointerLength = 10;
  let pointerWidth = 10;
  if (headType === "arrow") {
    pointerLength = 10;
    pointerWidth = 12;
  } else if (headType === "triangle") {
    pointerLength = 14;
    pointerWidth = 10;
  }
  const pathStyle = connection.pathStyle ?? "straight";
  const points = groupedPath ? groupedPath.points : getConnectionPathPoints(pathStyle, start, end);
  const isCustomMarker = headType === "circle" || headType === "diamond";
  const endAngleDeg = (Math.atan2(points[points.length - 1]! - points[points.length - 3]!, points[points.length - 2]! - points[points.length - 4]!) * 180) / Math.PI;
  const startAngleDeg = (Math.atan2(points[1]! - points[3]!, points[0]! - points[2]!) * 180) / Math.PI;

  return (
    <Group>
      <Arrow
        name={connection.id}
        hitStrokeWidth={18}
        ref={(node) => registerArrow(connection.id, node)}
        points={points}
        tension={pathStyle === "curved" ? 0.5 : 0}
        stroke={strokeColor}
        fill={strokeColor}
        strokeWidth={isSelected ? 4 : 2}
        dash={dash}
        pointerAtBeginning={isCustomMarker ? false : pointerAtBeginning}
        pointerAtEnding={isCustomMarker ? false : pointerAtEnding}
        pointerLength={pointerLength}
        pointerWidth={pointerWidth}
        perfectDrawEnabled={false}
        onClick={(event) => onSelect(connection.id, event)}
        onTap={(event) => onSelect(connection.id, event)}
      />
      {headType === "circle" && pointerAtEnding ? <Ellipse x={end.x} y={end.y} radiusX={6.5} radiusY={6.5} fill={strokeColor} stroke="#ffffff" strokeWidth={2} perfectDrawEnabled={false} shadowForStrokeEnabled={false} onClick={(event) => onSelect(connection.id, event)} onTap={(event) => onSelect(connection.id, event)} /> : null}
      {headType === "circle" && pointerAtBeginning ? <Ellipse x={start.x} y={start.y} radiusX={6.5} radiusY={6.5} fill={strokeColor} stroke="#ffffff" strokeWidth={2} perfectDrawEnabled={false} shadowForStrokeEnabled={false} onClick={(event) => onSelect(connection.id, event)} onTap={(event) => onSelect(connection.id, event)} /> : null}
      {headType === "diamond" && pointerAtEnding ? <Line points={[-6, 0, 0, -5, 6, 0, 0, 5]} closed x={end.x} y={end.y} rotation={endAngleDeg} fill={strokeColor} stroke={strokeColor} perfectDrawEnabled={false} onClick={(event) => onSelect(connection.id, event)} onTap={(event) => onSelect(connection.id, event)} /> : null}
      {headType === "diamond" && pointerAtBeginning ? <Line points={[-6, 0, 0, -5, 6, 0, 0, 5]} closed x={start.x} y={start.y} rotation={startAngleDeg + 180} fill={strokeColor} stroke={strokeColor} perfectDrawEnabled={false} onClick={(event) => onSelect(connection.id, event)} onTap={(event) => onSelect(connection.id, event)} /> : null}
      {pathStyle === "curved" && style === "none" ? [start, end].map((point, index) => <Ellipse key={`anchor-${index}`} ref={(node) => registerAnchor(`${connection.id}:${index}`, node)} x={point.x} y={point.y} radiusX={4.5} radiusY={4.5} fill="#ffffff" stroke={strokeColor} strokeWidth={1.7} listening={false} perfectDrawEnabled={false} />) : null}
    </Group>
  );
});

type BoardElementNodeProps = {
  element: BoardElement;
  colors: { fill: string; stroke: string; text: string };
  effectiveTool: BoardTool;
  isLocked: boolean;
  isCoarsePointer: boolean;
  isEditing: boolean;
  isTitleEditing: boolean;
  onSelect: (id: BoardElementId, event: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onStartLongPress: (id: BoardElementId, event: KonvaEventObject<TouchEvent>) => void;
  onClearLongPress: () => void;
  onStartMouseLongPress: (id: BoardElementId) => void;
  onDblClick: (element: BoardElement, event: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDblTap: (element: BoardElement, event: KonvaEventObject<TouchEvent>) => void;
  onDragStart: () => void;
  onDragMove: (element: BoardElement, event: KonvaEventObject<DragEvent>) => void;
  onDragEnd: (element: BoardElement, event: KonvaEventObject<DragEvent>) => void;
  onTransformStart: () => void;
  onTransformEnd: (element: BoardElement, event: KonvaEventObject<Event>) => void;
  onCellDblClick: (element: BoardElement, r: number, c: number, text: string) => void;
  onTitleDblClick: (element: BoardElement) => void;
  registerShape: (id: BoardElementId, node: Konva.Node | null) => void;
};

const BoardElementNode = memo(function BoardElementNode({
  element,
  colors,
  effectiveTool,
  isLocked,
  isCoarsePointer,
  isEditing,
  isTitleEditing,
  onSelect,
  onStartLongPress,
  onClearLongPress,
  onStartMouseLongPress,
  onDblClick,
  onDblTap,
  onDragStart,
  onDragMove,
  onDragEnd,
  onTransformStart,
  onTransformEnd,
  onCellDblClick,
  onTitleDblClick,
  registerShape,
}: BoardElementNodeProps) {
  if (element.kind === "draw") {
    return (
      <Line
        name={element.id}
        ref={(node) => registerShape(element.id, node)}
        points={element.points ?? []}
        stroke={colors.stroke}
        strokeWidth={3}
        hitStrokeWidth={20}
        lineCap="round"
        lineJoin="round"
        tension={0.25}
        perfectDrawEnabled={false}
      />
    );
  }

  return (
    <Group
      name={element.id}
      ref={(node) => registerShape(element.id, node)}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      draggable={effectiveTool === "select" && !isLocked}
      onClick={(event) => onSelect(element.id, event)}
      onTap={(event) => onSelect(element.id, event)}
      onTouchStart={(event) => onStartLongPress(element.id, event)}
      onTouchMove={onClearLongPress}
      onTouchEnd={onClearLongPress}
      onMouseDown={() => onStartMouseLongPress(element.id)}
      onMouseMove={onClearLongPress}
      onMouseUp={onClearLongPress}
      onDblClick={(event) => onDblClick(element, event)}
      onDblTap={(event) => onDblTap(element, event)}
      onDragStart={onDragStart}
      onDragMove={(event) => onDragMove(element, event)}
      onDragEnd={(event) => onDragEnd(element, event)}
      onTransformStart={onTransformStart}
      onTransformEnd={(event) => onTransformEnd(element, event)}
    >
      {element.kind === "image" ? (
        <BoardImage element={element} />
      ) : element.kind === "table" ? (
        <BoardTable
          element={element}
          colors={colors}
          titleEditing={isTitleEditing}
          onTitleDblClick={() => onTitleDblClick(element)}
          onCellDblClick={(r, c, text) => onCellDblClick(element, r, c, text)}
        />
      ) : element.kind === "ellipse" ? (
        <Ellipse
          x={element.width / 2}
          y={element.height / 2}
          radiusX={element.width / 2}
          radiusY={element.height / 2}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={2}
          perfectDrawEnabled={false}
        />
      ) : element.kind === "diamond" ? (
        <Line
          points={[element.width / 2, 0, element.width, element.height / 2, element.width / 2, element.height, 0, element.height / 2]}
          closed
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={2}
          perfectDrawEnabled={false}
        />
      ) : element.kind === "triangle" ? (
        <Line
          points={[element.width / 2, 0, element.width, element.height, 0, element.height]}
          closed
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={2}
          perfectDrawEnabled={false}
        />
      ) : element.kind === "note" ? (
        (() => {
          const gradient = NOTE_GRADIENTS[element.color ?? "yellow"];
          const fold = Math.min(24, Math.min(element.width, element.height) * 0.18);
          const tapeWidth = Math.min(84, Math.max(68, element.width * 0.4));
          const tapeHeight = 24;
          return (
            <Group>
              {/* Main square paper sheet with subtle gradient and ambient shadow */}
              <Line
                points={[
                  0,
                  0,
                  element.width,
                  0,
                  element.width,
                  element.height - fold,
                  element.width - fold,
                  element.height,
                  0,
                  element.height,
                ]}
                closed
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: element.width, y: element.height }}
                fillLinearGradientColorStops={[
                  0,
                  gradient.from,
                  1,
                  gradient.to,
                ]}
                shadowColor="#0f172a"
                shadowOpacity={isCoarsePointer ? 0 : 0.12}
                shadowBlur={isCoarsePointer ? 0 : 14}
                shadowOffsetY={6}
                shadowOffsetX={1}
                perfectDrawEnabled={false}
                shadowForStrokeEnabled={false}
              />
              {/* Under-crease shadow behind the folded corner */}
              <Line
                points={[
                  element.width - fold,
                  element.height,
                  element.width - fold - 2,
                  element.height - fold - 2,
                  element.width,
                  element.height - fold,
                ]}
                closed
                fill="rgba(15, 23, 42, 0.12)"
                perfectDrawEnabled={false}
              />
              {/* Folded corner flap with gentle 3D elevation shadow */}
              <Line
                points={[
                  element.width - fold,
                  element.height - fold,
                  element.width,
                  element.height - fold,
                  element.width - fold,
                  element.height,
                ]}
                closed
                fill={gradient.to}
                shadowColor="#0f172a"
                shadowOpacity={isCoarsePointer ? 0 : 0.18}
                shadowBlur={isCoarsePointer ? 0 : 4}
                shadowOffsetX={-2}
                shadowOffsetY={-2}
                perfectDrawEnabled={false}
                shadowForStrokeEnabled={false}
              />
              {/* Fold crease highlight */}
              <Line
                points={[
                  element.width - fold,
                  element.height,
                  element.width,
                  element.height - fold,
                ]}
                stroke="rgba(255, 255, 255, 0.55)"
                strokeWidth={0.8}
                perfectDrawEnabled={false}
              />
              {/* Clear tape (เทปใส) attached at the top center */}
              <Group
                x={element.width / 2}
                y={0}
                offsetX={tapeWidth / 2}
                offsetY={tapeHeight / 2}
                rotation={-1.5}
                listening={false}
              >
                {/* Tape soft shadow */}
                <Rect
                  width={tapeWidth}
                  height={tapeHeight}
                  cornerRadius={2}
                  fill="rgba(15, 23, 42, 0.08)"
                  shadowColor="#0f172a"
                  shadowOpacity={isCoarsePointer ? 0 : 0.18}
                  shadowBlur={isCoarsePointer ? 0 : 4}
                  shadowOffsetY={2}
                  perfectDrawEnabled={false}
                />
                {/* Clear translucent tape body */}
                <Rect
                  width={tapeWidth}
                  height={tapeHeight}
                  cornerRadius={2}
                  fill="rgba(255, 255, 255, 0.72)"
                  stroke="rgba(203, 213, 225, 0.6)"
                  strokeWidth={1}
                  perfectDrawEnabled={false}
                />
                {/* Tape glossy highlight sheen */}
                <Line
                  points={[6, 4, tapeWidth - 6, 4]}
                  stroke="rgba(255, 255, 255, 0.85)"
                  strokeWidth={1.5}
                  perfectDrawEnabled={false}
                />
              </Group>
            </Group>
          );
        })()
      ) : element.kind === "text" ? (
        <Rect width={element.width} height={element.height} fill="rgba(0, 0, 0, 0.001)" perfectDrawEnabled={false} />
      ) : (
        <Rect
          width={element.width}
          height={element.height}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={2.5}
          cornerRadius={18}
          shadowColor="#0f172a"
          shadowOpacity={isCoarsePointer ? 0 : 0.06}
          shadowBlur={isCoarsePointer ? 0 : 8}
          shadowOffsetY={3}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
        />
      )}
      {(element.kind === "note" || isShapeKind(element.kind)) && (element.title || isTitleEditing) ? (
        <Group onDblClick={() => onTitleDblClick(element)}>
          <Rect width={element.width} height={50} fill="transparent" perfectDrawEnabled={false} />
          {element.kind === "note" ? (
            <Path x={18} y={19} data="M6 11A5 5 0 1 1 11 6c0 2-1 3-2.5 4.5V13h-5v-2.5C2 9 1 8 1 6A5 5 0 0 1 6 1 M3.5 15h5 M4.5 17h3" stroke={colors.text} strokeWidth={1.4} listening={false} perfectDrawEnabled={false} />
          ) : (
            <Path x={18} y={18} scaleX={0.85} scaleY={0.85} data="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0 M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" stroke={colors.text} strokeWidth={1.5} lineCap="round" lineJoin="round" listening={false} perfectDrawEnabled={false} />
          )}
          <Text x={43} y={18} width={element.width - 61} text={isTitleEditing ? "" : element.title ?? ""} fill={colors.text} fontFamily="Geist, Noto Sans Thai, sans-serif" fontSize={17} fontStyle="bold" perfectDrawEnabled={false} />
          {element.text?.trim() ? (
            <Line points={[18, 51, element.width - 18, 51]} stroke={colors.stroke} opacity={0.27} strokeWidth={1} perfectDrawEnabled={false} />
          ) : null}
        </Group>
      ) : null}
      {element.kind === "image" || element.kind === "table" || isEditing ? null : <MarkdownText element={element} color={colors.text} />}
      {isLocked ? (
        <Group x={element.width - 18} y={-20} listening={false} opacity={0.85}>
          <Rect y={5} width={14} height={10} cornerRadius={2} fill="#475569" perfectDrawEnabled={false} />
          <Line points={[3.5, 5, 3.5, 2.5, 10.5, 2.5, 10.5, 5]} stroke="#475569" strokeWidth={1.8} lineCap="round" perfectDrawEnabled={false} />
        </Group>
      ) : null}
    </Group>
  );
});

export function KonvaBoard({
  initialDocument,
  onDocumentChange,
  activeTool,
  textStyles,
  onToolChange,
  onReady,
  onSelectionChange,
}: {
  initialDocument: BoardDocument;
  onDocumentChange: (document: BoardDocument) => void;
  activeTool: BoardTool;
  textStyles: BoardTextStyles;
  onToolChange: (tool: BoardTool) => void;
  onReady: (engine: BoardEngine) => void;
  onSelectionChange?: (info: { selectedShapeKind: BoardTool | null; hasSelection: boolean; selectedElementKind?: BoardElement["kind"] | "connector" | "shape" | null; selectedTextStyle: BoardTextStyle | null; selectedIds?: BoardElementId[]; hasTitle?: boolean; selectionLocked?: boolean }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const shapeRefs = useRef(new Map<BoardElementId, Konva.Node>());
  const documentRef = useRef(cloneDocument(sampleBoard));
  const elementsByIdRef = useRef<Map<BoardElementId, BoardElement>>(new Map(sampleBoard.elements.map((el) => [el.id, el])));
  const gestureStartPositionsRef = useRef<Map<BoardElementId, { x: number; y: number }>>(new Map());
  const activeDrawPointsRef = useRef<number[]>([]);
  const lastSelectionPayloadRef = useRef<string>("");
  const selectionRef = useRef<BoardElementId[]>([]);
  const pastRef = useRef<BoardDocument[]>([]);
  const futureRef = useRef<BoardDocument[]>([]);
  const clipboardRef = useRef<BoardDocument | null>(null);
  const connectionDefaultsRef = useRef<Partial<Pick<BoardConnection, "style" | "lineStyle" | "headType" | "pathStyle" | "color">>>({ style: "none", pathStyle: "curved", color: "violet" });
  const elementColorRef = useRef<BoardColor | null>(null);
  const gestureStartRef = useRef<BoardDocument | null>(null);
  const elementGestureActiveRef = useRef(false);
  const dragPreviewRef = useRef<Map<BoardElementId, { x: number; y: number }>>(new Map());
  const arrowRefs = useRef(new Map<string, Konva.Arrow>());
  const anchorRefs = useRef(new Map<string, Konva.Ellipse>());
  const drawStartRef = useRef<{ id: BoardElementId; document: BoardDocument } | null>(null);
  const eraseStartRef = useRef<BoardDocument | null>(null);
  const selectionMarqueeStartRef = useRef<SelectionMarqueeStart | null>(null);
  const marqueeFrameRef = useRef<number | null>(null);
  const pendingMarqueeRef = useRef<Bounds | null>(null);
  const moveFrameRef = useRef<number | null>(null);
  const pendingMoveRef = useRef<Map<BoardElementId, { x: number; y: number }>>(new Map());
  const drawFrameRef = useRef<number | null>(null);
  const wheelFrameRef = useRef<number | null>(null);
  const wheelCommitTimerRef = useRef<number | null>(null);
  const pendingWheelRef = useRef<{ x: number; y: number; deltaX: number; deltaY: number; zoom: boolean } | null>(null);
  const viewportRef = useRef<Viewport>(INITIAL_VIEWPORT);
  const touchGestureRef = useRef<TouchGesture | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [document, setDocument] = useState(() => cloneDocument(initialDocument));
  const [selection, setSelection] = useState<BoardElementId[]>([]);
  const [focusedGroupId, setFocusedGroupId] = useState<string | null>(null);
  const effectiveFocusedGroupId = useMemo(() => {
    if (!focusedGroupId) return null;
    return document.elements.some((element) => element.groupId === focusedGroupId) ? focusedGroupId : null;
  }, [document.elements, focusedGroupId]);

  const focusedGroupIdRef = useRef<string | null>(null);
  useEffect(() => {
    focusedGroupIdRef.current = effectiveFocusedGroupId;
  }, [effectiveFocusedGroupId]);
  const [connectorStart, setConnectorStart] = useState<BoardElementId | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: BoardElementId; value: string; row?: number; col?: number; title?: boolean } | null>(null);
  const [viewport, setViewport] = useState(INITIAL_VIEWPORT);
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const [selectionMarquee, setSelectionMarquee] = useState<Bounds | null>(null);

  const focusedGroupElements = useMemo(() => {
    if (!effectiveFocusedGroupId) return [];
    return document.elements.filter((element) => element.groupId === effectiveFocusedGroupId);
  }, [document.elements, effectiveFocusedGroupId]);

  const focusedGroupBounds = useMemo(() => {
    if (focusedGroupElements.length === 0) return null;
    return elementsBoundingBox(focusedGroupElements);
  }, [focusedGroupElements]);
  const [isCoarsePointer, setIsCoarsePointer] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const [size, setSize] = useState<Size>({ width: 900, height: 650 });
  const { t } = useLocale();
  const effectiveTool = isSpacePanning ? "hand" : activeTool;

  const onDocumentChangeRef = useRef(onDocumentChange);
  useEffect(() => {
    onDocumentChangeRef.current = onDocumentChange;
  }, [onDocumentChange]);

  const selectedConnectionRef = useRef(selectedConnection);
  useEffect(() => {
    selectedConnectionRef.current = selectedConnection;
  }, [selectedConnection]);

  const sizeRef = useRef(size);
  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const onSelectionChangeRef = useRef(onSelectionChange);
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  useEffect(() => {
    if (sameBoardDocument(initialDocument, documentRef.current)) return;
    documentRef.current = cloneDocument(initialDocument);
    elementsByIdRef.current = new Map(documentRef.current.elements.map((el) => [el.id, el]));
    setDocument(documentRef.current);
    const elementIds = new Set(documentRef.current.elements.map((element) => element.id));
    setSelection((current) => current.every((id) => elementIds.has(id)) ? current : current.filter((id) => elementIds.has(id)));
    setSelectedConnection((current) => current === null || documentRef.current.connections.some((connection) => connection.id === current) ? current : null);
  }, [initialDocument]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse)");
    const update = () => setIsCoarsePointer(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isCoarsePointer) return;
    const stage = stageRef.current;
    if (!stage) return;
    for (const layer of stage.getLayers()) {
      layer.getCanvas().setPixelRatio(1);
      layer.getHitCanvas().setPixelRatio(1);
    }
    stage.batchDraw();
  }, [isCoarsePointer, size]);

  useEffect(() => {
    selectionRef.current = selection;
    // A locked element gets no transformer handles: they would promise a resize that never lands.
    const lockedIds = new Set(documentRef.current.elements.filter(isElementLocked).map((element) => element.id));
    const nodes = selection.flatMap((id) => {
      if (lockedIds.has(id)) return [];
      const node = shapeRefs.current.get(id);
      return node ? [node] : [];
    });
    transformerRef.current?.nodes(nodes);
    transformerRef.current?.getLayer()?.batchDraw();

    const hasSelection = selection.length > 0 || selectedConnection !== null;
    let nextPayloadKey = "";
    if (selection.length > 0) {
      const shapeKinds: BoardTool[] = ["rectangle", "ellipse", "diamond", "triangle"];
      const selectedElements = documentRef.current.elements.filter((element) => selection.includes(element.id));
      const shapeElement = selectedElements.find((element) => shapeKinds.includes(element.kind as BoardTool));
      const allShapes = selectedElements.length > 0 && selectedElements.every((el) => shapeKinds.includes(el.kind as BoardTool));
      const selectedElementKind = selectedElements.length === 1 && selectedElements[0] ? selectedElements[0].kind : allShapes ? "shape" : null;
      const selectedTextElements = selectedElements.filter(supportsTextStyle);
      const firstTextStyle = selectedTextElements[0] ? effectiveTextStyleFor(selectedTextElements[0]) : null;
      const selectedTextStyle = firstTextStyle && selectedTextElements.every((element) => {
        const style = effectiveTextStyleFor(element);
        return style.fontSize === firstTextStyle.fontSize &&
          style.fontWeight === firstTextStyle.fontWeight &&
          style.textAlign === firstTextStyle.textAlign &&
          (style.verticalAlign ?? "top") === (firstTextStyle.verticalAlign ?? "top");
      }) ? firstTextStyle : null;
      const hasTitle = selectedElements.length === 1 && Boolean(selectedElements[0]?.title);
      const selectionLocked = isSelectionLocked(documentRef.current.elements, selection);
      nextPayloadKey = `${shapeElement?.kind}:${hasSelection}:${selectedElementKind}:${selectedTextStyle?.fontSize}:${selectedTextStyle?.fontWeight}:${selectedTextStyle?.textAlign}:${selectedTextStyle?.verticalAlign}:${selection.join(",")}:${hasTitle}:${selectionLocked}`;
      if (nextPayloadKey !== lastSelectionPayloadRef.current) {
        lastSelectionPayloadRef.current = nextPayloadKey;
        onSelectionChangeRef.current?.({ selectedShapeKind: shapeElement ? (shapeElement.kind as BoardTool) : null, hasSelection, selectedElementKind, selectedTextStyle, selectedIds: selection, hasTitle, selectionLocked });
      }
    } else {
      const isConnectionSelected = selectedConnection !== null;
      nextPayloadKey = `none:${isConnectionSelected}:${selectedConnection ?? ""}`;
      if (nextPayloadKey !== lastSelectionPayloadRef.current) {
        lastSelectionPayloadRef.current = nextPayloadKey;
        onSelectionChangeRef.current?.({ selectedShapeKind: null, hasSelection: isConnectionSelected, selectedElementKind: isConnectionSelected ? "connector" : null, selectedTextStyle: null, selectedIds: [], selectionLocked: false });
      }
    }
  }, [selection, selectedConnection, document]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({ width: Math.max(1, entry.contentRect.width), height: Math.max(1, entry.contentRect.height) });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const replaceDocument = useCallback((next: BoardDocument) => {
    documentRef.current = next;
    elementsByIdRef.current = new Map(next.elements.map((el) => [el.id, el]));
    setDocument(next);
    onDocumentChangeRef.current(next);
  }, []);

  const updateElements = useCallback((patches: { id: BoardElementId; patch: Partial<BoardElement> }[], historical = false) => {
    const patchMap = new Map(patches.map((entry) => [entry.id, entry.patch]));
    const next = { ...documentRef.current, elements: documentRef.current.elements.map((element) => {
      const patch = patchMap.get(element.id);
      return patch ? { ...element, ...patch } : element;
    }) };
    if (historical && gestureStartRef.current) {
      pastRef.current.push(gestureStartRef.current);
      futureRef.current = [];
      gestureStartRef.current = null;
    }
    replaceDocument(next);
  }, [replaceDocument]);

  const updateElement = useCallback((id: BoardElementId, patch: Partial<BoardElement>, historical = false) => {
    updateElements([{ id, patch }], historical);
  }, [updateElements]);

  const cancelPendingMove = useCallback(() => {
    if (moveFrameRef.current !== null) {
      window.cancelAnimationFrame(moveFrameRef.current);
      moveFrameRef.current = null;
    }
    pendingMoveRef.current = new Map();
  }, []);

  useEffect(() => {
    function finishInterruptedGesture() {
      selectionMarqueeStartRef.current = null;
      setSelectionMarquee(null);
      if (!elementGestureActiveRef.current) return;
      elementGestureActiveRef.current = false;
      cancelPendingMove();
      const preview = dragPreviewRef.current;
      dragPreviewRef.current = new Map();
      if (preview.size === 0) return;
      const patches = [...preview].map(([id, position]) => ({ id, patch: position }));
      updateElements(patches, true);
    }
    window.addEventListener("blur", finishInterruptedGesture);
    return () => window.removeEventListener("blur", finishInterruptedGesture);
  }, [cancelPendingMove, updateElements]);

  const updateConnectedArrows = useCallback((movedIds: Set<BoardElementId>) => {
    const resolveElement = (id: BoardElementId): BoardElement | undefined => {
      const element = elementsByIdRef.current.get(id);
      if (!element) return undefined;
      const preview = dragPreviewRef.current.get(id);
      return preview ? { ...element, x: preview.x, y: preview.y } : element;
    };

    const elbowGroupIds = new Set<BoardElementId>();
    for (const connection of documentRef.current.connections) {
      if (!movedIds.has(connection.fromId) && !movedIds.has(connection.toId)) continue;
      if ((connection.pathStyle ?? "straight") === "elbow") {
        elbowGroupIds.add(connection.fromId);
        continue;
      }
      const from = resolveElement(connection.fromId);
      const to = resolveElement(connection.toId);
      if (!from || !to) continue;
      const { start, end } = getConnectionEndpoints(from, to, connection.pathStyle === "curved" ? 0 : 16);
      const arrow = arrowRefs.current.get(connection.id);
      arrow?.points(getConnectionPathPoints(connection.pathStyle, start, end));
      anchorRefs.current.get(`${connection.id}:0`)?.position(start);
      anchorRefs.current.get(`${connection.id}:1`)?.position(end);
    }

    for (const fromId of elbowGroupIds) {
      const siblings = documentRef.current.connections.filter(
        (connection) => connection.fromId === fromId && (connection.pathStyle ?? "straight") === "elbow",
      );
      const paths = getGroupedElbowPaths(fromId, siblings, resolveElement);
      for (const [connectionId, { points }] of paths) {
        const arrow = arrowRefs.current.get(connectionId);
        arrow?.points(points);
      }
    }
  }, []);

  const scheduleMove = useCallback((moves: { id: BoardElementId; x: number; y: number }[]) => {
    for (const move of moves) pendingMoveRef.current.set(move.id, { x: move.x, y: move.y });
    if (moveFrameRef.current !== null) return;
    moveFrameRef.current = window.requestAnimationFrame(() => {
      moveFrameRef.current = null;
      const pending = pendingMoveRef.current;
      pendingMoveRef.current = new Map();
      if (pending.size === 0) return;
      const movedIds = new Set<BoardElementId>();
      for (const [id, position] of pending) {
        dragPreviewRef.current.set(id, position);
        movedIds.add(id);
      }
      updateConnectedArrows(movedIds);
      transformerRef.current?.update();
      transformerRef.current?.getLayer()?.batchDraw();
    });
  }, [updateConnectedArrows]);

  const flushPendingDrawPoint = useCallback(() => {
    if (drawFrameRef.current !== null) {
      window.cancelAnimationFrame(drawFrameRef.current);
      drawFrameRef.current = null;
    }
    const drawing = drawStartRef.current;
    if (!drawing) return;
    const finalPoints = [...activeDrawPointsRef.current];
    if (finalPoints.length > 0) {
      replaceDocument({
        ...documentRef.current,
        elements: documentRef.current.elements.map((element) =>
          element.id === drawing.id ? { ...element, points: finalPoints } : element,
        ),
      });
    }
  }, [replaceDocument]);

  const scheduleDrawPoint = useCallback((id: BoardElementId, x: number, y: number) => {
    activeDrawPointsRef.current.push(x, y);
    if (drawFrameRef.current !== null) return;
    drawFrameRef.current = window.requestAnimationFrame(() => {
      drawFrameRef.current = null;
      const line = shapeRefs.current.get(id) as Konva.Line | undefined;
      if (line) {
        line.points(activeDrawPointsRef.current);
        line.getLayer()?.batchDraw();
      }
    });
  }, []);

  useEffect(() => () => {
    if (moveFrameRef.current !== null) window.cancelAnimationFrame(moveFrameRef.current);
    if (drawFrameRef.current !== null) window.cancelAnimationFrame(drawFrameRef.current);
    if (wheelFrameRef.current !== null) window.cancelAnimationFrame(wheelFrameRef.current);
    if (marqueeFrameRef.current !== null) window.cancelAnimationFrame(marqueeFrameRef.current);
    if (wheelCommitTimerRef.current !== null) window.clearTimeout(wheelCommitTimerRef.current);
    if (longPressTimerRef.current !== null) window.clearTimeout(longPressTimerRef.current);
  }, []);

  const commit = useCallback((next: BoardDocument) => {
    pastRef.current.push(cloneDocument(documentRef.current));
    futureRef.current = [];
    replaceDocument(next);
  }, [replaceDocument]);

  const undo = useCallback(() => {
    const previous = pastRef.current.pop();
    if (!previous) return;
    futureRef.current.push(cloneDocument(documentRef.current));
    setSelection([]);
    replaceDocument(previous);
  }, [replaceDocument]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(cloneDocument(documentRef.current));
    setSelection([]);
    replaceDocument(next);
  }, [replaceDocument]);

  const deleteSelection = useCallback(() => {
    if (selectedConnectionRef.current) {
      commit({ ...documentRef.current, connections: documentRef.current.connections.filter((connection) => connection.id !== selectedConnectionRef.current) });
      setSelectedConnection(null);
      return;
    }
    const lockedIds = new Set(documentRef.current.elements.filter(isElementLocked).map((element) => element.id));
    const ids = new Set(selectionRef.current.filter((id) => !lockedIds.has(id)));
    if (ids.size === 0) return;
    commit({
      ...documentRef.current,
      elements: documentRef.current.elements.filter((element) => !ids.has(element.id)),
      connections: documentRef.current.connections.filter((connection) => !ids.has(connection.fromId) && !ids.has(connection.toId)),
    });
    // Anything locked in the selection survives the delete, so it stays selected and visible.
    setSelection((current) => current.filter((id) => !ids.has(id)));
  }, [commit]);

  const groupSelection = useCallback(() => {
    const groupId = `group:${crypto.randomUUID()}`;
    const elements = groupElements(documentRef.current.elements, selectionRef.current, groupId);
    if (elements === documentRef.current.elements) return;
    commit({ ...documentRef.current, elements });
  }, [commit]);

  const ungroupSelection = useCallback(() => {
    const elements = ungroupElements(documentRef.current.elements, selectionRef.current);
    if (elements === documentRef.current.elements) return;
    setFocusedGroupId(null);
    commit({ ...documentRef.current, elements });
  }, [commit]);

  const duplicateSelection = useCallback(() => {
    const selected = new Set(selectionRef.current);
    if (selected.size === 0) return;
    const idMap = new Map<BoardElementId, BoardElementId>();
    const copies = documentRef.current.elements.flatMap((element) => {
      if (!selected.has(element.id)) return [];
      const id = createElementId();
      idMap.set(element.id, id);
      return [{ ...element, id, x: element.x + 32, y: element.y + 32 }];
    });
    const copiedConnections = documentRef.current.connections.flatMap((connection) => {
      const fromId = idMap.get(connection.fromId);
      const toId = idMap.get(connection.toId);
      if (!fromId || !toId) return [];
      return [{ id: `connection:${crypto.randomUUID()}` as const, fromId, toId }];
    });
    commit({
      ...documentRef.current,
      elements: [...documentRef.current.elements, ...copies],
      connections: [...documentRef.current.connections, ...copiedConnections],
    });
    setSelection(copies.map((element) => element.id));
  }, [commit]);

  const copySelection = useCallback(() => {
    const selected = new Set(selectionRef.current);
    if (selected.size === 0) return;
    clipboardRef.current = {
      ...documentRef.current,
      elements: documentRef.current.elements.filter((element) => selected.has(element.id)),
      connections: documentRef.current.connections.filter((connection) => selected.has(connection.fromId) && selected.has(connection.toId)),
    };
  }, []);

  const pasteClipboard = useCallback(() => {
    const clipboard = clipboardRef.current;
    if (!clipboard || clipboard.elements.length === 0) return;
    const idMap = new Map<BoardElementId, BoardElementId>();
    const copies = clipboard.elements.map((element) => {
      const id = createElementId();
      idMap.set(element.id, id);
      return { ...element, id, x: element.x + 32, y: element.y + 32 };
    });
    const connections = clipboard.connections.flatMap((connection) => {
      const fromId = idMap.get(connection.fromId);
      const toId = idMap.get(connection.toId);
      return fromId && toId ? [{ ...connection, id: `connection:${crypto.randomUUID()}` as const, fromId, toId }] : [];
    });
    commit({ ...documentRef.current, elements: [...documentRef.current.elements, ...copies], connections: [...documentRef.current.connections, ...connections] });
    setSelection(copies.map((element) => element.id));
  }, [commit]);

  const zoomAtCenter = useCallback((factor: number) => {
    setViewport((current) => {
      const currentSize = sizeRef.current;
      const nextScale = Math.min(2.5, Math.max(0.25, current.scale * factor));
      const center = { x: currentSize.width / 2, y: currentSize.height / 2 };
      const world = { x: (center.x - current.x) / current.scale, y: (center.y - current.y) / current.scale };
      return { scale: nextScale, x: center.x - world.x * nextScale, y: center.y - world.y * nextScale };
    });
  }, []);

  const zoomToFit = useCallback(() => {
    const elements = documentRef.current.elements;
    if (elements.length === 0) return setViewport(INITIAL_VIEWPORT);
    const currentSize = sizeRef.current;
    const minX = Math.min(...elements.map((element) => element.x));
    const minY = Math.min(...elements.map((element) => element.y));
    const maxX = Math.max(...elements.map((element) => element.x + element.width));
    const maxY = Math.max(...elements.map((element) => element.y + element.height));
    const scale = Math.min(1.4, Math.max(0.25, Math.min((currentSize.width - 120) / (maxX - minX), (currentSize.height - 120) / (maxY - minY))));
    setViewport({ x: (currentSize.width - (maxX + minX) * scale) / 2, y: (currentSize.height - (maxY + minY) * scale) / 2, scale });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const frame = requestAnimationFrame(() => {
      if (documentRef.current.elements.length === 0) return;
      const rect = container.getBoundingClientRect();
      sizeRef.current = { width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
      zoomToFit();
    });
    return () => cancelAnimationFrame(frame);
  }, [zoomToFit]);

  const addImage = useCallback((image: { url: string; width: number; height: number }) => {
    const maxWidth = 420;
    const maxHeight = 320;
    const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
    const width = Math.max(80, Math.round(image.width * scale));
    const height = Math.max(80, Math.round(image.height * scale));
    const viewport = viewportRef.current;
    const currentSize = sizeRef.current;
    const element: BoardElement = {
      id: createElementId(),
      kind: "image",
      x: (currentSize.width / 2 - viewport.x) / viewport.scale - width / 2,
      y: (currentSize.height / 2 - viewport.y) / viewport.scale - height / 2,
      width,
      height,
      text: "",
      assetUrl: image.url,
    };
    commit({ ...documentRef.current, elements: [...documentRef.current.elements, element] });
    setSelection([element.id]);
  }, [commit]);

  const applyProposal = useCallback((proposal: AiProposal) => {
    const result = applyProposalToDocument(documentRef.current, proposal, {
      createElementId,
      createConnectionId: () => `connection:${crypto.randomUUID()}`,
      createGroupId: () => `group:${crypto.randomUUID()}`,
      selectedIds: selectionRef.current,
    });
    if (!result) return;

    commit(result.document);
    if (result.createdElementIds.length > 0) {
      setSelection(result.createdElementIds);
    }
  }, [commit]);

  const renderExport = useCallback((): BoardExport | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const original = { width: stage.width(), height: stage.height(), x: stage.x(), y: stage.y(), scaleX: stage.scaleX(), scaleY: stage.scaleY() };
    // The stage paints no background, so an exported page would otherwise be transparent.
    const page = new Konva.Layer({ listening: false });
    try {
      const bounds = boardBounds(documentRef.current.elements);
      const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
      const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
      const scale = Math.min((PDF_PAGE.width - PDF_PAGE.padding * 2) / contentWidth, (PDF_PAGE.height - PDF_PAGE.padding * 2) / contentHeight);
      stage.size({ width: PDF_PAGE.width, height: PDF_PAGE.height });
      stage.scale({ x: scale, y: scale });
      stage.position({ x: (PDF_PAGE.width - contentWidth * scale) / 2 - bounds.minX * scale, y: (PDF_PAGE.height - contentHeight * scale) / 2 - bounds.minY * scale });
      page.add(new Konva.Rect({ x: -stage.x() / scale, y: -stage.y() / scale, width: PDF_PAGE.width / scale, height: PDF_PAGE.height / scale, fill: "#ffffff" }));
      stage.add(page);
      page.moveToBottom();
      stage.draw();
      // Konva swallows a tainted-canvas SecurityError and hands back an empty string instead.
      const dataUrl = stage.toDataURL({ pixelRatio: 2 });
      return dataUrl.startsWith("data:image/") ? { dataUrl, width: PDF_PAGE.width, height: PDF_PAGE.height } : null;
    } catch {
      return null;
    } finally {
      page.destroy();
      stage.size({ width: original.width, height: original.height });
      stage.scale({ x: original.scaleX, y: original.scaleY });
      stage.position({ x: original.x, y: original.y });
      stage.draw();
    }
  }, []);

  const setConnectionDefaults = useCallback((patch: Partial<BoardConnection>) => {
    const { style, lineStyle, headType, pathStyle, color } = patch;
    connectionDefaultsRef.current = {
      ...connectionDefaultsRef.current,
      ...(style === undefined ? {} : { style }),
      ...(lineStyle === undefined ? {} : { lineStyle }),
      ...(headType === undefined ? {} : { headType }),
      ...(pathStyle === undefined ? {} : { pathStyle }),
      ...(color === undefined ? {} : { color }),
    };
  }, []);

  const editSelectedTitle = useCallback(() => {
    const ids = selectionRef.current;
    if (ids.length !== 1) return;
    const element = documentRef.current.elements.find((item) => item.id === ids[0]);
    if (!element || isElementLocked(element) || (element.kind !== "note" && element.kind !== "table" && !isShapeKind(element.kind))) return;
    setEditing({ id: element.id, value: element.title ?? "", title: true });
  }, []);

  const toggleSelectedTitle = useCallback(() => {
    const ids = selectionRef.current;
    if (ids.length !== 1) return;
    const element = documentRef.current.elements.find((item) => item.id === ids[0]);
    if (!element || isElementLocked(element) || (element.kind !== "note" && element.kind !== "table" && !isShapeKind(element.kind))) return;

    if (element.title) {
      commit({
        ...documentRef.current,
        elements: documentRef.current.elements.map((item) =>
          item.id === element.id ? { ...item, title: undefined } : item,
        ),
      });
    } else {
      setEditing({ id: element.id, value: "", title: true });
    }
  }, [commit]);

  const updateSelectedConnection = useCallback((patch: Partial<BoardConnection>) => {
    if (!selectedConnectionRef.current) return;
    const targetId = selectedConnectionRef.current;
    commit({
      ...documentRef.current,
      connections: documentRef.current.connections.map((connection) => connection.id === targetId ? { ...connection, ...patch } : connection),
    });
  }, [commit]);

  const setSelectionColor = useCallback((color: BoardColor) => {
    if (selectedConnectionRef.current) {
      updateSelectedConnection({ color });
      return;
    }
    elementColorRef.current = color;
    const ids = new Set(selectionRef.current);
    if (ids.size === 0) return;
    commit({
      ...documentRef.current,
      elements: documentRef.current.elements.map((element) => ids.has(element.id) && element.kind !== "image" ? { ...element, color } : element),
    });
  }, [commit, updateSelectedConnection]);

  const setSelectionShape = useCallback((shape: BoardTool) => {
    const ids = new Set(selectionRef.current);
    if (ids.size === 0) return;
    const shapeKinds = new Set<BoardTool>(["rectangle", "ellipse", "diamond", "triangle"]);
    if (!shapeKinds.has(shape)) return;

    const hasTargetElement = documentRef.current.elements.some(
      (element) => ids.has(element.id) && (shapeKinds.has(element.kind as BoardTool) || element.kind === "note" || element.kind === "text")
    );
    if (!hasTargetElement) return;

    commit({
      ...documentRef.current,
      elements: documentRef.current.elements.map((element) => {
        if (!ids.has(element.id)) return element;
        if (shapeKinds.has(element.kind as BoardTool) || element.kind === "note" || element.kind === "text") {
          return { ...element, kind: shape as BoardElement["kind"] };
        }
        return element;
      }),
    });
  }, [commit]);

  const setSelectionTextStyle = useCallback((patch: Partial<BoardTextStyle>) => {
    const ids = new Set(selectionRef.current);
    if (ids.size === 0) return;
    const hasTextSelection = documentRef.current.elements.some((element) => ids.has(element.id) && supportsTextStyle(element));
    if (!hasTextSelection) return;
    let changed = false;
    const elements = documentRef.current.elements.map((element) => {
      if (!supportsTextStyle(element) || !ids.has(element.id)) return element;
      const currentTextStyle = effectiveTextStyleFor(element);
      const nextTextStyle = { ...currentTextStyle, ...patch };
      if (
        nextTextStyle.fontSize === currentTextStyle.fontSize &&
        nextTextStyle.fontWeight === currentTextStyle.fontWeight &&
        nextTextStyle.textAlign === currentTextStyle.textAlign &&
        (nextTextStyle.verticalAlign ?? "top") === (currentTextStyle.verticalAlign ?? "top")
      ) return element;
      changed = true;
      return { ...element, textStyle: nextTextStyle };
    });
    if (!changed) return;
    commit({
      ...documentRef.current,
      elements,
    });
  }, [commit]);

  const setSelectionLocked = useCallback((locked: boolean) => {
    const elements = setElementsLocked(documentRef.current.elements, selectionRef.current, locked);
    if (elements === documentRef.current.elements) return;
    commit({ ...documentRef.current, elements });
  }, [commit]);

  const setSelectionLayer = useCallback((placement: LayerPlacement) => {
    const elements = reorderElements(documentRef.current.elements, selectionRef.current, placement);
    if (elements === documentRef.current.elements) return;
    commit({ ...documentRef.current, elements });
  }, [commit]);

  const addMindMapNode = useCallback((kind: "child" | "sibling", currentId: BoardElementId, text = "New idea", source = documentRef.current) => {
    const sourceElement = source.elements.find((element) => element.id === currentId);
    const nodeKind = sourceElement && mindMapNodeKinds.has(sourceElement.kind as MindMapNodeKind)
      ? sourceElement.kind as MindMapNodeKind
      : "note";
    const defaults: MindMapDefaults = {
      kind: nodeKind,
      color: elementColorRef.current ?? sourceElement?.color ?? "violet",
      textStyle: sourceElement ? effectiveTextStyleFor(sourceElement) : textStyleFor({}),
      connection: connectionDefaultsRef.current,
    };
    const result = kind === "child"
      ? appendMindMapChild(source, currentId, createElementId(), `connection:${crypto.randomUUID()}`, text, defaults)
      : appendMindMapSibling(source, currentId, createElementId(), `connection:${crypto.randomUUID()}`, text, defaults);
    if (!result) return null;
    commit(result.document);
    setSelection([result.node.id]);
    return result.node;
  }, [commit]);

  const addChildNode = useCallback(() => {
    const parentId = selectionRef.current[0];
    if (parentId) addMindMapNode("child", parentId);
  }, [addMindMapNode]);

  const arrangeMindMap = useCallback((direction: MindMapLayoutDirection = "horizontal") => {
    const rootId = selectionRef.current[0];
    const next = layoutMindMap(documentRef.current, rootId, direction);
    if (next !== documentRef.current) commit(next);
  }, [commit]);

  const addTableRow = useCallback((elementId?: string, rowIndex?: number) => {
    const targetId = (elementId ?? selectionRef.current[0]) as BoardElementId | undefined;
    if (!targetId) return;
    const target = documentRef.current.elements.find((el) => el.id === targetId && el.kind === "table");
    if (!target) return;

    const rows = Math.max(1, target.rows ?? 3);
    const cols = Math.max(1, target.cols ?? 3);
    const insertIdx = rowIndex ?? rows;

    const currentData: string[][] = target.tableData ?? (target.text || "").split("\n").map((l) => l.split("|").map((c) => c.trim()));
    const filledData = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => currentData[r]?.[c] ?? ""));

    filledData.splice(insertIdx, 0, Array.from({ length: cols }, () => ""));

    const nextRows = rows + 1;
    const rowHeight = target.height / rows;
    const nextHeight = target.height + rowHeight;
    const nextText = filledData.map((r) => r.join(" | ")).join("\n");

    commit({
      ...documentRef.current,
      elements: documentRef.current.elements.map((el) =>
        el.id === targetId ? { ...el, rows: nextRows, height: nextHeight, tableData: filledData, text: nextText } : el
      ),
    });
  }, [commit]);

  const deleteTableRow = useCallback((elementId?: string, rowIndex?: number) => {
    const targetId = (elementId ?? selectionRef.current[0]) as BoardElementId | undefined;
    if (!targetId) return;
    const target = documentRef.current.elements.find((el) => el.id === targetId && el.kind === "table");
    if (!target) return;

    const rows = Math.max(1, target.rows ?? 3);
    if (rows <= 1) return;
    const cols = Math.max(1, target.cols ?? 3);
    const removeIdx = rowIndex ?? rows - 1;

    const currentData: string[][] = target.tableData ?? (target.text || "").split("\n").map((l) => l.split("|").map((c) => c.trim()));
    const filledData = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => currentData[r]?.[c] ?? ""));

    filledData.splice(removeIdx, 1);

    const nextRows = rows - 1;
    const rowHeight = target.height / rows;
    const nextHeight = Math.max(36, target.height - rowHeight);
    const nextText = filledData.map((r) => r.join(" | ")).join("\n");

    commit({
      ...documentRef.current,
      elements: documentRef.current.elements.map((el) =>
        el.id === targetId ? { ...el, rows: nextRows, height: nextHeight, tableData: filledData, text: nextText } : el
      ),
    });
  }, [commit]);

  const addTableCol = useCallback((elementId?: string, colIndex?: number) => {
    const targetId = (elementId ?? selectionRef.current[0]) as BoardElementId | undefined;
    if (!targetId) return;
    const target = documentRef.current.elements.find((el) => el.id === targetId && el.kind === "table");
    if (!target) return;

    const rows = Math.max(1, target.rows ?? 3);
    const cols = Math.max(1, target.cols ?? 3);
    const insertIdx = colIndex ?? cols;

    const currentData: string[][] = target.tableData ?? (target.text || "").split("\n").map((l) => l.split("|").map((c) => c.trim()));
    const filledData = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => currentData[r]?.[c] ?? ""));

    for (let r = 0; r < rows; r++) {
      filledData[r]?.splice(insertIdx, 0, "");
    }

    const nextCols = cols + 1;
    const colWidth = target.width / cols;
    const nextWidth = target.width + colWidth;
    const nextText = filledData.map((r) => r.join(" | ")).join("\n");

    commit({
      ...documentRef.current,
      elements: documentRef.current.elements.map((el) =>
        el.id === targetId ? { ...el, cols: nextCols, width: nextWidth, tableData: filledData, text: nextText } : el
      ),
    });
  }, [commit]);

  const deleteTableCol = useCallback((elementId?: string, colIndex?: number) => {
    const targetId = (elementId ?? selectionRef.current[0]) as BoardElementId | undefined;
    if (!targetId) return;
    const target = documentRef.current.elements.find((el) => el.id === targetId && el.kind === "table");
    if (!target) return;

    const rows = Math.max(1, target.rows ?? 3);
    const cols = Math.max(1, target.cols ?? 3);
    if (cols <= 1) return;
    const removeIdx = colIndex ?? cols - 1;

    const currentData: string[][] = target.tableData ?? (target.text || "").split("\n").map((l) => l.split("|").map((c) => c.trim()));
    const filledData = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => currentData[r]?.[c] ?? ""));

    for (let r = 0; r < rows; r++) {
      filledData[r]?.splice(removeIdx, 1);
    }

    const nextCols = cols - 1;
    const colWidth = target.width / cols;
    const nextWidth = Math.max(48, target.width - colWidth);
    const nextText = filledData.map((r) => r.join(" | ")).join("\n");

    commit({
      ...documentRef.current,
      elements: documentRef.current.elements.map((el) =>
        el.id === targetId ? { ...el, cols: nextCols, width: nextWidth, tableData: filledData, text: nextText } : el
      ),
    });
  }, [commit]);

  const engine = useMemo<BoardEngine>(() => ({
    undo,
    redo,
    deleteSelection,
    groupSelection,
    ungroupSelection,
    duplicateSelection,
    copySelection,
    pasteClipboard,
    zoomIn: () => zoomAtCenter(1.2),
    zoomOut: () => zoomAtCenter(1 / 1.2),
    zoomToFit,
    addImage,
    renderExport,
    addChildNode,
    layoutMindMap: arrangeMindMap,
    setSelectionColor,
    setSelectionShape,
    setSelectionTextStyle,
    setSelectionLocked,
    setSelectionLayer,
    updateSelectedConnection,
    setConnectionDefaults,
    editSelectedTitle,
    toggleSelectedTitle,
    addTableRow,
    deleteTableRow,
    addTableCol,
    deleteTableCol,
    applyProposal,
  }), [addChildNode, addImage, addTableCol, addTableRow, applyProposal, arrangeMindMap, copySelection, deleteTableCol, deleteTableRow, deleteSelection, duplicateSelection, editSelectedTitle, groupSelection, pasteClipboard, redo, renderExport, setConnectionDefaults, setSelectionColor, setSelectionLayer, setSelectionLocked, setSelectionShape, setSelectionTextStyle, toggleSelectedTitle, undo, ungroupSelection, updateSelectedConnection, zoomAtCenter, zoomToFit]);

  useEffect(() => onReadyRef.current(engine), [engine]);

  useEffect(() => {
    function isInteractiveTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      return target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable ||
        target.closest("button, [role='button'], [contenteditable='true']") !== null;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isInteractiveTarget(event.target)) return;
      if (event.code === "Space") {
        event.preventDefault();
        setIsSpacePanning(true);
        return;
      }
      if (event.key === "Escape") {
        if (focusedGroupIdRef.current) {
          event.preventDefault();
          const currentGroupMembers = documentRef.current.elements
            .filter((el) => el.groupId === focusedGroupIdRef.current)
            .map((el) => el.id);
          setFocusedGroupId(null);
          setSelection(currentGroupMembers);
          return;
        }
        if (selectionRef.current.length > 0) {
          event.preventDefault();
          setSelection([]);
          return;
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if ((event.key === "Delete" || event.key === "Backspace") && selectionRef.current.length > 0) {
        event.preventDefault();
        deleteSelection();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelection();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "g") {
        event.preventDefault();
        if (event.shiftKey) ungroupSelection(); else groupSelection();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copySelection();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteClipboard();
      } else if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
        const tool = TOOL_SHORTCUTS[event.key.toLowerCase()];
        if (!tool) return;
        event.preventDefault();
        onToolChange(tool);
      }
    }
    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") setIsSpacePanning(false);
    }
    function clearSpacePan() {
      setIsSpacePanning(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearSpacePan);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearSpacePan);
    };
  }, [copySelection, deleteSelection, duplicateSelection, groupSelection, onToolChange, pasteClipboard, redo, ungroupSelection, undo]);

  function applyViewport(next: Viewport) {
    viewportRef.current = next;
    const stage = stageRef.current;
    if (!stage) return;
    stage.position({ x: next.x, y: next.y });
    stage.scale({ x: next.scale, y: next.scale });
    stage.batchDraw();
  }

  function commitViewport() {
    setViewport({ ...viewportRef.current });
  }

  function touchPoint(touch: Touch): ScreenPoint | null {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.container().getBoundingClientRect();
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  function distance(a: ScreenPoint, b: ScreenPoint) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function clearLongPress() {
    if (longPressTimerRef.current === null) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  }

  function selectByLongPress(id: BoardElementId) {
    if (effectiveTool === "eraser" || effectiveTool === "hand") return;
    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      const groupMembers = expandSelectionWithGroups([id], documentRef.current.elements, focusedGroupIdRef.current);
      setSelection((current) => current.includes(id)
        ? current.filter((selectedId) => !groupMembers.includes(selectedId))
        : [...new Set([...current, ...groupMembers])]);
      onToolChange("select");
      longPressTimerRef.current = null;
    }, 450);
  }

  function startLongPress(id: BoardElementId, event: KonvaEventObject<TouchEvent>) {
    if (!isCoarsePointer || effectiveTool === "hand" || event.evt.touches.length !== 1) return;
    selectByLongPress(id);
  }

  function startMouseLongPress(id: BoardElementId) {
    if (isCoarsePointer || effectiveTool === "hand") return;
    selectByLongPress(id);
  }

  function handleTouchStart(event: KonvaEventObject<TouchEvent>) {
    if (event.evt.touches.length !== 2) return;
    clearLongPress();
    event.evt.preventDefault();
    stageRef.current?.stopDrag();
    const [firstTouch, secondTouch] = Array.from(event.evt.touches);
    if (!firstTouch || !secondTouch) return;
    const first = touchPoint(firstTouch);
    const second = touchPoint(secondTouch);
    if (!first || !second) return;
    touchGestureRef.current = {
      distance: distance(first, second),
      midpoint: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
      viewport: { ...viewportRef.current },
    };
  }

  function handleTouchMove(event: KonvaEventObject<TouchEvent>) {
    clearLongPress();
    const gesture = touchGestureRef.current;
    if (!gesture || event.evt.touches.length !== 2) return;
    event.evt.preventDefault();
    const [firstTouch, secondTouch] = Array.from(event.evt.touches);
    if (!firstTouch || !secondTouch) return;
    const first = touchPoint(firstTouch);
    const second = touchPoint(secondTouch);
    if (!first || !second) return;
    const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    const scale = Math.min(2.5, Math.max(0.25, gesture.viewport.scale * distance(first, second) / gesture.distance));
    const world = { x: (gesture.midpoint.x - gesture.viewport.x) / gesture.viewport.scale, y: (gesture.midpoint.y - gesture.viewport.y) / gesture.viewport.scale };
    applyViewport({ x: midpoint.x - world.x * scale, y: midpoint.y - world.y * scale, scale });
  }

  function handleTouchEnd(event: KonvaEventObject<TouchEvent>) {
    clearLongPress();
    if (!touchGestureRef.current || event.evt.touches.length >= 2) return;
    touchGestureRef.current = null;
    commitViewport();
  }

  function targetNameAtPointer() {
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) return null;
    let node: Konva.Node | null = stage.getIntersection(pointer);
    while (node && node !== stage) {
      const name = node.name();
      if (name.startsWith("element:") || name.startsWith("connection:")) return name;
      node = node.getParent();
    }
    return null;
  }

  function eraseAtPointer() {
    const name = targetNameAtPointer();
    if (!name) return;
    const current = documentRef.current;
    // Locking is what makes a reference layer safe to draw over, so the eraser passes through it.
    if (current.elements.some((element) => element.id === name && isElementLocked(element))) return;
    const next = name.startsWith("connection:")
      ? { ...current, connections: current.connections.filter((connection) => connection.id !== name) }
      : {
        ...current,
        elements: current.elements.filter((element) => element.id !== name),
        connections: current.connections.filter((connection) => connection.fromId !== name && connection.toId !== name),
      };
    if (next.elements.length === current.elements.length && next.connections.length === current.connections.length) return;
    replaceDocument(next);
  }

  function worldPointer() {
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return null;
    const vp = viewportRef.current;
    return { x: (pointer.x - vp.x) / vp.scale, y: (pointer.y - vp.y) / vp.scale };
  }

  function clearSelectionMarquee() {
    if (marqueeFrameRef.current !== null) {
      window.cancelAnimationFrame(marqueeFrameRef.current);
      marqueeFrameRef.current = null;
    }
    pendingMarqueeRef.current = null;
    selectionMarqueeStartRef.current = null;
    setSelectionMarquee(null);
  }

  function finishSelectionMarquee(point: ScreenPoint) {
    const start = selectionMarqueeStartRef.current;
    if (!start) return false;
    const bounds = boundsFromPoints(start.point, point);
    clearSelectionMarquee();

    const minimumDragDistance = 4 / viewportRef.current.scale;
    if (bounds.width < minimumDragDistance && bounds.height < minimumDragDistance) {
      if (!start.additive) setSelection([]);
      return true;
    }

    // Locked elements still land in a marquee: a freehand stroke has no click target of its own,
    // so selecting it is the only way back to the unlock button.
    const containedIds = documentRef.current.elements
      .filter((element) => isElementContainedByBounds(element, bounds))
      .map((element) => element.id);
    const selectedIds = expandSelectionWithGroups(containedIds, documentRef.current.elements, focusedGroupIdRef.current);
    setSelectedConnection(null);
    setSelection((current) => start.additive ? [...new Set([...current, ...selectedIds])] : selectedIds);
    return true;
  }

  function handleStagePointerDown(event: KonvaEventObject<PointerEvent>) {
    if (effectiveTool === "eraser") {
      eraseStartRef.current = cloneDocument(documentRef.current);
      setSelection([]);
      setSelectedConnection(null);
      eraseAtPointer();
      return;
    }
    if (event.target !== event.target.getStage()) return;
    if (effectiveTool === "select") {
      setFocusedGroupId(null);
      const point = worldPointer();
      if (event.evt.pointerType === "mouse" && event.evt.button === 0 && point) {
        selectionMarqueeStartRef.current = { point, additive: event.evt.shiftKey };
        setSelectionMarquee({ x: point.x, y: point.y, width: 0, height: 0 });
        return;
      }
      return setSelection([]);
    }
    if (effectiveTool === "hand") return;
    const point = worldPointer();
    if (!point) return;
    if (effectiveTool === "draw") {
      const element: BoardElement = { id: createElementId(), kind: "draw", x: 0, y: 0, width: 1, height: 1, text: "", color: elementColorRef.current ?? "violet", points: [point.x, point.y] };
      activeDrawPointsRef.current = [point.x, point.y];
      drawStartRef.current = { id: element.id, document: cloneDocument(documentRef.current) };
      replaceDocument({ ...documentRef.current, elements: [...documentRef.current.elements, element] });
      return;
    }
    const created = nextElement(effectiveTool, point.x, point.y, textStyles);
    const element = created && elementColorRef.current ? { ...created, color: elementColorRef.current } : created;
    if (element) {
      commit({ ...documentRef.current, elements: [...documentRef.current.elements, element] });
      setSelection([element.id]);
      onToolChange("select");
    }
  }

  function handleStagePointerMove() {
    const selectionStart = selectionMarqueeStartRef.current;
    if (selectionStart) {
      const point = worldPointer();
      if (point) {
        pendingMarqueeRef.current = boundsFromPoints(selectionStart.point, point);
        if (marqueeFrameRef.current === null) {
          marqueeFrameRef.current = window.requestAnimationFrame(() => {
            marqueeFrameRef.current = null;
            if (pendingMarqueeRef.current) setSelectionMarquee(pendingMarqueeRef.current);
          });
        }
      }
      return;
    }
    if (eraseStartRef.current) return eraseAtPointer();
    const drawing = drawStartRef.current;
    if (!drawing) return;
    const point = worldPointer();
    if (!point) return;
    scheduleDrawPoint(drawing.id, point.x, point.y);
  }

  function handleStagePointerUp() {
    const point = worldPointer();
    if (point && finishSelectionMarquee(point)) return;
    clearSelectionMarquee();
    const erased = eraseStartRef.current;
    if (erased) {
      eraseStartRef.current = null;
      const current = documentRef.current;
      if (erased.elements.length !== current.elements.length || erased.connections.length !== current.connections.length) {
        pastRef.current.push(erased);
        futureRef.current = [];
      }
      return;
    }
    const drawing = drawStartRef.current;
    if (!drawing) return;
    flushPendingDrawPoint();
    pastRef.current.push(drawing.document);
    futureRef.current = [];
    drawStartRef.current = null;
    onToolChange("select");
  }

  function selectElement(id: BoardElementId, event: KonvaEventObject<MouseEvent | TouchEvent>) {
    event.cancelBubble = true;
    if (effectiveTool === "arrow") {
      if (!connectorStart) return setConnectorStart(id);
      if (connectorStart !== id) {
        const connection: BoardConnection = { id: `connection:${crypto.randomUUID()}`, fromId: connectorStart, toId: id, ...connectionDefaultsRef.current };
        commit({ ...documentRef.current, connections: [...documentRef.current.connections, connection] });
      }
      setConnectorStart(null);
      onToolChange("select");
      return;
    }
    if (effectiveTool !== "select") return;
    setSelectedConnection(null);
    const clickedElement = documentRef.current.elements.find((el) => el.id === id);
    if (focusedGroupIdRef.current && clickedElement?.groupId !== focusedGroupIdRef.current) {
      setFocusedGroupId(null);
    }
    const currentFocusedGroup = clickedElement?.groupId === focusedGroupIdRef.current ? focusedGroupIdRef.current : null;
    const groupMembers = expandSelectionWithGroups([id], documentRef.current.elements, currentFocusedGroup);
    if (!event.evt.shiftKey) {
      setSelection(groupMembers);
      return;
    }
    setSelection(selection.includes(id)
      ? selection.filter((selectedId) => !groupMembers.includes(selectedId))
      : [...new Set([...selection, ...groupMembers])]);
  }

  function handleWheel(event: KonvaEventObject<WheelEvent>) {
    event.evt.preventDefault();
    if (elementGestureActiveRef.current) return;
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;
    const pending = pendingWheelRef.current;
    pendingWheelRef.current = {
      x: pointer.x,
      y: pointer.y,
      deltaX: (pending?.deltaX ?? 0) + event.evt.deltaX,
      deltaY: (pending?.deltaY ?? 0) + event.evt.deltaY,
      zoom: event.evt.ctrlKey,
    };
    if (wheelFrameRef.current !== null) return;
    wheelFrameRef.current = window.requestAnimationFrame(() => {
      wheelFrameRef.current = null;
      const wheel = pendingWheelRef.current;
      pendingWheelRef.current = null;
      if (!wheel || elementGestureActiveRef.current) return;
      const current = viewportRef.current;
      if (wheel.zoom) {
        const factor = Math.exp(-wheel.deltaY * 0.01);
        const scale = Math.min(2.5, Math.max(0.25, current.scale * factor));
        const world = { x: (wheel.x - current.x) / current.scale, y: (wheel.y - current.y) / current.scale };
        applyViewport({ x: wheel.x - world.x * scale, y: wheel.y - world.y * scale, scale });
      } else {
        applyViewport({ ...current, x: current.x - wheel.deltaX, y: current.y - wheel.deltaY });
      }
      if (wheelCommitTimerRef.current !== null) window.clearTimeout(wheelCommitTimerRef.current);
      wheelCommitTimerRef.current = window.setTimeout(commitViewport, 120);
    });
  }

  const elementMap = useMemo(() => new Map(document.elements.map((element) => [element.id, element])), [document.elements]);
  const editingElement = editing ? elementMap.get(editing.id) : undefined;

  // Elbow connections sharing a source are merged into one trunk that splits toward each target,
  // so they're grouped by fromId and solved together rather than routed independently per pair.
  const elbowPaths = useMemo(() => {
    const elbowGroups = new Map<BoardElementId, BoardConnection[]>();
    for (const connection of document.connections) {
      if ((connection.pathStyle ?? "straight") !== "elbow") continue;
      const group = elbowGroups.get(connection.fromId);
      if (group) group.push(connection); else elbowGroups.set(connection.fromId, [connection]);
    }
    return new Map(
      Array.from(elbowGroups.entries()).flatMap(([fromId, group]) =>
        Array.from(getGroupedElbowPaths(fromId, group, (id) => elementMap.get(id))),
      ),
    );
  }, [document.connections, elementMap]);

  function documentWithEditingText() {
    if (!editing) return documentRef.current;
    return {
      ...documentRef.current,
      elements: documentRef.current.elements.map((element) => element.id === editing.id ? { ...element, text: editing.value } : element),
    };
  }

  function continueMindMap(kind: "child" | "sibling") {
    if (!editing) return;
    const node = addMindMapNode(kind, editing.id, "", documentWithEditingText());
    if (node) setEditing({ id: node.id, value: "" });
  }

  function finishEditing() {
    if (!editing) return;
    const element = documentRef.current.elements.find((candidate) => candidate.id === editing.id);
    if (element) {
      if (editing.title && (element.kind === "note" || element.kind === "table" || isShapeKind(element.kind))) {
        const title = editing.value.trim();
        if ((element.title ?? "") !== title) {
          commit({ ...documentRef.current, elements: documentRef.current.elements.map((candidate) =>
            candidate.id === element.id ? { ...candidate, title: title || undefined } : candidate,
          ) });
        }
      } else if (editing.row !== undefined && editing.col !== undefined && element.kind === "table") {
        const rows = Math.max(1, element.rows ?? 3);
        const cols = Math.max(1, element.cols ?? 3);
        const currentData: string[][] = element.tableData ?? (element.text || "").split("\n").map((l) => l.split("|").map((c) => c.trim()));
        const filledData = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => currentData[r]?.[c] ?? ""));

        const targetRow = filledData[editing.row];
        if (targetRow) {
          targetRow[editing.col] = editing.value;
        }
        const nextText = filledData.map((row) => row.join(" | ")).join("\n");

        commit({
          ...documentRef.current,
          elements: documentRef.current.elements.map((candidate) =>
            candidate.id === editing.id ? { ...candidate, tableData: filledData, text: nextText } : candidate
          ),
        });
      } else if (element.text !== editing.value) {
        const textarea = textareaRef.current;
        let height = element.height;
        if (textarea) {
          const previousHeight = textarea.style.height;
          textarea.style.height = "0px";
          height = heightForEditedElement(element, textarea.scrollHeight, viewportRef.current.scale);
          textarea.style.height = previousHeight;
        }
        let updateProps: Partial<BoardElement> = { text: editing.value, height };
        if (element.kind === "table") {
          const lines = editing.value.split("\n");
          const tableData = lines.map((line) => line.split("|").map((cell) => cell.trim()));
          const rows = Math.max(1, tableData.length);
          const cols = Math.max(1, ...tableData.map((row) => row.length));
          const normalizedData = tableData.map((row) => {
            const padded = [...row];
            while (padded.length < cols) padded.push("");
            return padded;
          });
          updateProps = {
            text: editing.value,
            rows,
            cols,
            tableData: normalizedData,
            height,
          };
        }
        commit({
          ...documentRef.current,
          elements: documentRef.current.elements.map((candidate) => candidate.id === editing.id ? { ...candidate, ...updateProps } : candidate),
        });
      }
    }
    setEditing(null);
  }

  const handleElementDblClick = useCallback((element: BoardElement, event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    event.cancelBubble = true;
    if (isElementLocked(element)) return;
    if (element.groupId && effectiveFocusedGroupId !== element.groupId) {
      setFocusedGroupId(element.groupId);
      setSelection([element.id]);
      return;
    }
    setEditing({ id: element.id, value: element.text });
  }, [effectiveFocusedGroupId]);

  const handleElementDragStart = useCallback(() => {
    gestureStartRef.current = cloneDocument(documentRef.current);
    gestureStartPositionsRef.current = new Map(documentRef.current.elements.map((e) => [e.id, { x: e.x, y: e.y }]));
    elementGestureActiveRef.current = true;
  }, []);

  const handleElementDragMove = useCallback((element: BoardElement, event: KonvaEventObject<DragEvent>) => {
    if (selectionRef.current.includes(element.id) && selectionRef.current.length > 1) {
      const original = gestureStartPositionsRef.current.get(element.id) ?? element;
      const dx = event.target.x() - original.x;
      const dy = event.target.y() - original.y;
      const moves: { id: BoardElementId; x: number; y: number }[] = [];
      for (const id of selectionRef.current) {
        if (id === element.id) {
          moves.push({ id, x: event.target.x(), y: event.target.y() });
        } else {
          const startPos = gestureStartPositionsRef.current.get(id);
          if (startPos) {
            const nextX = startPos.x + dx;
            const nextY = startPos.y + dy;
            moves.push({ id, x: nextX, y: nextY });
            shapeRefs.current.get(id)?.position({ x: nextX, y: nextY });
          }
        }
      }
      scheduleMove(moves);
    } else {
      scheduleMove([{ id: element.id, x: event.target.x(), y: event.target.y() }]);
    }
  }, [scheduleMove]);

  const handleElementDragEnd = useCallback((element: BoardElement, event: KonvaEventObject<DragEvent>) => {
    cancelPendingMove();
    dragPreviewRef.current = new Map();
    elementGestureActiveRef.current = false;
    if (selectionRef.current.includes(element.id) && selectionRef.current.length > 1) {
      const original = gestureStartPositionsRef.current.get(element.id) ?? element;
      const dx = event.target.x() - original.x;
      const dy = event.target.y() - original.y;
      const patches: { id: BoardElementId; patch: { x: number; y: number } }[] = [];
      for (const id of selectionRef.current) {
        if (id === element.id) {
          patches.push({ id, patch: { x: event.target.x(), y: event.target.y() } });
        } else {
          const startPos = gestureStartPositionsRef.current.get(id);
          if (startPos) {
            patches.push({ id, patch: { x: startPos.x + dx, y: startPos.y + dy } });
          }
        }
      }
      gestureStartPositionsRef.current.clear();
      updateElements(patches, true);
    } else {
      gestureStartPositionsRef.current.clear();
      updateElements([{ id: element.id, patch: { x: event.target.x(), y: event.target.y() } }], true);
    }
  }, [cancelPendingMove, updateElements]);

  const handleElementTransformStart = useCallback(() => {
    gestureStartRef.current = cloneDocument(documentRef.current);
    elementGestureActiveRef.current = true;
  }, []);

  const handleElementTransformEnd = useCallback((element: BoardElement, event: KonvaEventObject<Event>) => {
    const node = event.target;
    const width = Math.max(48, element.width * node.scaleX());
    const height = Math.max(36, element.height * node.scaleY());
    node.scale({ x: 1, y: 1 });
    elementGestureActiveRef.current = false;
    updateElement(element.id, { x: node.x(), y: node.y(), width, height }, true);
  }, [updateElement]);

  const handleTableCellDblClick = useCallback((element: BoardElement, r: number, c: number, text: string) => {
    if (element.groupId && effectiveFocusedGroupId !== element.groupId) {
      setFocusedGroupId(element.groupId);
      setSelection([element.id]);
      return;
    }
    setEditing({ id: element.id, value: text, row: r, col: c });
  }, [effectiveFocusedGroupId]);

  const handleElementTitleDblClick = useCallback((element: BoardElement) => {
    if (isElementLocked(element)) return;
    if (element.groupId && effectiveFocusedGroupId !== element.groupId) {
      setFocusedGroupId(element.groupId);
      setSelection([element.id]);
      return;
    }
    setEditing({ id: element.id, value: element.title ?? "", title: true });
  }, [effectiveFocusedGroupId]);

  const registerShapeNode = useCallback((id: BoardElementId, node: Konva.Node | null) => {
    if (node) shapeRefs.current.set(id, node);
    else shapeRefs.current.delete(id);
  }, []);

  const registerArrowNode = useCallback((id: string, node: Konva.Arrow | null) => {
    if (node) arrowRefs.current.set(id, node);
    else arrowRefs.current.delete(id);
  }, []);

  const registerAnchorNode = useCallback((key: string, node: Konva.Ellipse | null) => {
    if (node) anchorRefs.current.set(key, node);
    else anchorRefs.current.delete(key);
  }, []);

  const handleSelectConnection = useCallback((id: string, event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    event.cancelBubble = true;
    setSelection([]);
    setSelectedConnection(id);
  }, []);

  return (
    <div ref={containerRef} className={`konva-board h-full w-full touch-none ${effectiveTool === "hand" ? "cursor-grab" : "cursor-default"}`} data-testid="konva-board" data-element-count={document.elements.length} data-space-panning={isSpacePanning || undefined}>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        draggable={effectiveTool === "hand"}
        onDragEnd={(event) => {
          if (event.target !== event.target.getStage()) return;
          setViewport((current) => ({ ...current, x: event.target.x(), y: event.target.y() }));
        }}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerCancel={clearSelectionMarquee}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <Layer>
          {document.connections.map((connection) => {
            const from = elementMap.get(connection.fromId);
            const to = elementMap.get(connection.toId);
            if (!from || !to) return null;
            return (
              <BoardConnectionNode
                key={connection.id}
                connection={connection}
                from={from}
                to={to}
                groupedPath={elbowPaths.get(connection.id)}
                isSelected={selectedConnection === connection.id}
                onSelect={handleSelectConnection}
                registerArrow={registerArrowNode}
                registerAnchor={registerAnchorNode}
              />
            );
          })}
          {document.elements.map((element) => (
            <BoardElementNode
              key={element.id}
              element={element}
              colors={COLORS[element.color ?? "grey"]}
              effectiveTool={effectiveTool}
              isLocked={isElementLocked(element)}
              isCoarsePointer={isCoarsePointer}
              isEditing={editing?.id === element.id}
              isTitleEditing={editing?.id === element.id && Boolean(editing.title)}
              onSelect={selectElement}
              onStartLongPress={startLongPress}
              onClearLongPress={clearLongPress}
              onStartMouseLongPress={startMouseLongPress}
              onDblClick={handleElementDblClick}
              onDblTap={handleElementDblClick}
              onDragStart={handleElementDragStart}
              onDragMove={handleElementDragMove}
              onDragEnd={handleElementDragEnd}
              onTransformStart={handleElementTransformStart}
              onTransformEnd={handleElementTransformEnd}
              onCellDblClick={handleTableCellDblClick}
              onTitleDblClick={handleElementTitleDblClick}
              registerShape={registerShapeNode}
            />
          ))}
          {focusedGroupBounds ? (
            <Group listening={false}>
              <Rect
                x={focusedGroupBounds.x - 8}
                y={focusedGroupBounds.y - 8}
                width={focusedGroupBounds.width + 16}
                height={focusedGroupBounds.height + 16}
                stroke="#3b82f6"
                strokeWidth={1.5}
                dash={[6, 4]}
                cornerRadius={8}
                opacity={0.8}
              />
              <Group x={focusedGroupBounds.x - 8} y={focusedGroupBounds.y - 26}>
                <Rect
                  width={50}
                  height={18}
                  fill="#3b82f6"
                  cornerRadius={4}
                />
                <Text
                  text="Group"
                  x={7}
                  y={3}
                  fill="#ffffff"
                  fontSize={11}
                  fontFamily="sans-serif"
                  fontStyle="bold"
                />
              </Group>
            </Group>
          ) : null}
          {selectionMarquee ? <Rect x={selectionMarquee.x} y={selectionMarquee.y} width={selectionMarquee.width} height={selectionMarquee.height} fill="rgba(124, 58, 237, 0.12)" stroke="#7c3aed" strokeWidth={1.5} dash={[6, 4]} listening={false} /> : null}
          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
            flipEnabled={false}
            ignoreStroke={true}
            boundBoxFunc={(oldBox, newBox) => newBox.width < 48 || newBox.height < 36 ? oldBox : newBox}
            onDblClick={(event) => {
              event.cancelBubble = true;
              const ids = selectionRef.current;
              if (ids.length > 0) {
                const firstElement = documentRef.current.elements.find((el) => ids.includes(el.id));
                if (firstElement?.groupId && effectiveFocusedGroupId !== firstElement.groupId) {
                  const pointer = worldPointer();
                  let targetId = firstElement.id;
                  if (pointer) {
                    const hit = documentRef.current.elements.find(
                      (el) => ids.includes(el.id) &&
                        pointer.x >= el.x && pointer.x <= el.x + el.width &&
                        pointer.y >= el.y && pointer.y <= el.y + el.height,
                    );
                    if (hit) targetId = hit.id;
                  }
                  setFocusedGroupId(firstElement.groupId);
                  setSelection([targetId]);
                }
              }
            }}
            onDblTap={(event) => {
              event.cancelBubble = true;
              const ids = selectionRef.current;
              if (ids.length > 0) {
                const firstElement = documentRef.current.elements.find((el) => ids.includes(el.id));
                if (firstElement?.groupId && effectiveFocusedGroupId !== firstElement.groupId) {
                  const pointer = worldPointer();
                  let targetId = firstElement.id;
                  if (pointer) {
                    const hit = documentRef.current.elements.find(
                      (el) => ids.includes(el.id) &&
                        pointer.x >= el.x && pointer.x <= el.x + el.width &&
                        pointer.y >= el.y && pointer.y <= el.y + el.height,
                    );
                    if (hit) targetId = hit.id;
                  }
                  setFocusedGroupId(firstElement.groupId);
                  setSelection([targetId]);
                }
              }
            }}
          />
        </Layer>
      </Stage>
      {(() => {
        if (!editing || !editingElement) return null;
        const isCellEdit = editing.row !== undefined && editing.col !== undefined && editingElement.kind === "table";
        const cols = Math.max(1, editingElement.cols ?? 3);
        const rows = Math.max(1, editingElement.rows ?? 3);
        const cellWidth = editingElement.width / cols;
        const titleHeight = editingElement.kind === "table" && (editingElement.title || editing.title) ? 38 : 0;
        const cellHeight = Math.max(1, editingElement.height - titleHeight) / rows;
        const cellX = isCellEdit ? editingElement.x + (editing.col! * cellWidth) : editingElement.x;
        const cellY = isCellEdit ? editingElement.y + titleHeight + (editing.row! * cellHeight) : editingElement.y;
        const isShape = isShapeKind(editingElement.kind);
        const editWidth = isCellEdit ? cellWidth : editingElement.width;
        const editHeight = editing.title ? (editingElement.kind === "table" ? 38 : 50) : isCellEdit ? cellHeight : editingElement.height;

        return (
          <textarea
            ref={textareaRef}
            autoFocus
            aria-label={t(editing.title ? "editTitle" : "editElement")}
            className={isCellEdit ? "absolute z-20 resize-none rounded-md border-2 border-primary bg-background/95 p-2 text-sm shadow-xl outline-none" : "absolute z-20 resize-none border-0 bg-transparent outline-none"}
            style={{
              left: viewport.x + cellX * viewport.scale,
              top: viewport.y + cellY * viewport.scale,
              width: Math.max(isCellEdit ? 48 : 140, editWidth * viewport.scale),
              height: Math.max(isCellEdit ? 32 : editing.title ? 35 : 60, editHeight * viewport.scale),
              boxSizing: "border-box",
              padding: isCellEdit ? "8px" : editing.title ? (editingElement.kind === "table" ? "8px 17px 8px 44px" : "18px 18px 18px 43px") : editingElement.kind === "text" ? 0 : (editingElement.kind === "note" || isShape) && editingElement.title ? "58px 18px 18px" : "18px",
              borderRadius: isCellEdit ? undefined : editingElement.kind === "ellipse" ? "50%" : undefined,
              color: COLORS[editingElement.color ?? "grey"].text,
              fontFamily: "Geist, Noto Sans Thai, sans-serif",
              fontSize: supportsTextStyle(editingElement) ? effectiveTextStyleFor(editingElement).fontSize : 16,
              fontWeight: editing.title ? "bold" : supportsTextStyle(editingElement) ? effectiveTextStyleFor(editingElement).fontWeight : "bold",
              lineHeight: 1.35,
              textAlign: supportsTextStyle(editingElement) ? effectiveTextStyleFor(editingElement).textAlign : editingElement.kind === "note" ? "left" : "center",
            }}
            value={editing.value}
            onChange={(event) => setEditing({ ...editing, value: event.target.value })}
            onBlur={finishEditing}
            onKeyDown={(event) => {
              if (event.key === "Escape") setEditing(null);
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.currentTarget.blur();
                return;
              }
              if (event.key === "Tab" && !editing.title) {
                event.preventDefault();
                continueMindMap("child");
              }
              if (event.key === "Enter" && !event.shiftKey) {
                if (isCellEdit || editing.title) {
                  event.preventDefault();
                  finishEditing();
                  return;
                }
                if (editingElement.kind !== "note") {
                  const hasParent = documentRef.current.connections.some((c) => c.toId === editingElement.id);
                  if (hasParent) {
                    event.preventDefault();
                    continueMindMap("sibling");
                  } else {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }
              }
            }}
          />
        );
      })()}
      {(() => {
        const selectedTable = selection.length === 1 ? document.elements.find((el) => el.id === selection[0] && el.kind === "table") : undefined;
        if (!selectedTable) return null;
        const cols = Math.max(1, selectedTable.cols ?? 3);
        const rows = Math.max(1, selectedTable.rows ?? 3);
        const cellWidth = selectedTable.width / cols;
        const cellHeight = selectedTable.height / rows;

        return (
          <>
            {/* Floating Column Controls (Right Edge) */}
            <div
              className="absolute z-20 flex items-center gap-1"
              style={{
                left: viewport.x + (selectedTable.x + selectedTable.width + 8) * viewport.scale,
                top: viewport.y + (selectedTable.y + selectedTable.height / 2 - 14) * viewport.scale,
              }}
            >
              <button
                type="button"
                title={t("addCol")}
                className="flex h-7 items-center justify-center rounded-md border border-border bg-background/95 px-2 text-xs font-semibold shadow-md transition-transform hover:scale-105 active:scale-95"
                onClick={() => addTableCol(selectedTable.id)}
              >
                + Col
              </button>
              {cols > 1 ? (
                <button
                  type="button"
                  title={t("deleteCol")}
                  className="flex h-7 items-center justify-center rounded-md border border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100 px-2 text-xs font-semibold shadow-md transition-transform hover:scale-105 active:scale-95"
                  onClick={() => deleteTableCol(selectedTable.id)}
                >
                  - Col
                </button>
              ) : null}
            </div>

            {/* Floating Row Controls (Bottom Edge) */}
            <div
              className="absolute z-20 flex items-center gap-1"
              style={{
                left: viewport.x + (selectedTable.x + selectedTable.width / 2 - 40) * viewport.scale,
                top: viewport.y + (selectedTable.y + selectedTable.height + 8) * viewport.scale,
              }}
            >
              <button
                type="button"
                title={t("addRow")}
                className="flex h-7 items-center justify-center rounded-md border border-border bg-background/95 px-2 text-xs font-semibold shadow-md transition-transform hover:scale-105 active:scale-95"
                onClick={() => addTableRow(selectedTable.id)}
              >
                + Row
              </button>
              {rows > 1 ? (
                <button
                  type="button"
                  title={t("deleteRow")}
                  className="flex h-7 items-center justify-center rounded-md border border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100 px-2 text-xs font-semibold shadow-md transition-transform hover:scale-105 active:scale-95"
                  onClick={() => deleteTableRow(selectedTable.id)}
                >
                  - Row
                </button>
              ) : null}
            </div>

            {/* Per-column top delete handles */}
            {cols > 1 ? Array.from({ length: cols }, (_, c) => {
              const colCenterX = selectedTable.x + (c + 0.5) * cellWidth;
              return (
                <button
                  key={`del-col-${c}`}
                  type="button"
                  title={`${t("deleteCol")} ${c + 1}`}
                  className="absolute z-20 flex h-5 w-5 items-center justify-center rounded-full border border-rose-300 bg-rose-50 text-xs font-bold text-rose-600 shadow transition-transform hover:scale-110 active:scale-95"
                  style={{
                    left: viewport.x + colCenterX * viewport.scale - 10,
                    top: viewport.y + (selectedTable.y - 24) * viewport.scale,
                  }}
                  onClick={() => deleteTableCol(selectedTable.id, c)}
                >
                  -
                </button>
              );
            }) : null}

            {/* Per-row left delete handles */}
            {rows > 1 ? Array.from({ length: rows }, (_, r) => {
              const rowCenterY = selectedTable.y + (r + 0.5) * cellHeight;
              return (
                <button
                  key={`del-row-${r}`}
                  type="button"
                  title={`${t("deleteRow")} ${r + 1}`}
                  className="absolute z-20 flex h-5 w-5 items-center justify-center rounded-full border border-rose-300 bg-rose-50 text-xs font-bold text-rose-600 shadow transition-transform hover:scale-110 active:scale-95"
                  style={{
                    left: viewport.x + (selectedTable.x - 24) * viewport.scale,
                    top: viewport.y + rowCenterY * viewport.scale - 10,
                  }}
                  onClick={() => deleteTableRow(selectedTable.id, r)}
                >
                  -
                </button>
              );
            }) : null}
          </>
        );
      })()}
    </div>
  );
}
