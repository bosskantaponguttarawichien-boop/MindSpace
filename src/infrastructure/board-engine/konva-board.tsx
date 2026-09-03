"use client";

import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Arrow, Ellipse, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import { sampleBoard } from "@/domain/board/sample-board";
import { sameBoardDocument, textStyleFor, type BoardColor, type BoardConnection, type BoardDocument, type BoardElement, type BoardElementId, type BoardTextStyle } from "@/domain/board/board-document";
import { boundsFromPoints, getConnectionEndpoints, isElementContainedByBounds, type Bounds } from "@/domain/board/geometry";
import { appendMindMapChild, appendMindMapSibling, layoutMindMap, type MindMapDefaults } from "@/domain/board/mind-map";
import { parseMarkdown } from "@/domain/board/markdown";
import type { BoardEngine, BoardExport, BoardTool } from "@/infrastructure/board-engine/board-engine";
import type { AiProposal } from "@/domain/ai/proposal-schema";
import { heightForEditedElement } from "@/infrastructure/board-engine/element-sizing";
import { useLocale } from "@/lib/i18n/locale-provider";

type Viewport = { x: number; y: number; scale: number };
type Size = { width: number; height: number };
type ScreenPoint = { x: number; y: number };
type TouchGesture = { distance: number; midpoint: ScreenPoint; viewport: Viewport };
type SelectionMarqueeStart = { point: ScreenPoint; additive: boolean };
type MindMapNodeKind = MindMapDefaults["kind"];
const mindMapNodeKinds = new Set<MindMapNodeKind>(["text", "note", "rectangle", "ellipse", "diamond", "triangle"]);

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
  const points = elements.flatMap((element) => {
    if (element.kind !== "draw" || !element.points?.length) return [element.x, element.y, element.x + element.width, element.y + element.height];
    return element.points;
  });
  const xs = points.filter((_, index) => index % 2 === 0);
  const ys = points.filter((_, index) => index % 2 === 1);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function nextElement(tool: BoardTool, x: number, y: number, textStyle: BoardTextStyle): BoardElement | null {
  const id = createElementId();
  if (tool === "text") return { id, kind: "text", x, y, width: 220, height: 54, text: "New idea", color: "grey", textStyle };
  if (tool === "note") return { id, kind: "note", x, y, width: 190, height: 170, text: "New note", color: "yellow" };
  if (tool === "rectangle") return { id, kind: "rectangle", x, y, width: 220, height: 120, text: "New concept", color: "violet", textStyle };
  if (tool === "ellipse") return { id, kind: "ellipse", x, y, width: 200, height: 120, text: "New concept", color: "blue", textStyle };
  if (tool === "diamond") return { id, kind: "diamond", x, y, width: 180, height: 140, text: "Decision", color: "yellow", textStyle };
  if (tool === "triangle") return { id, kind: "triangle", x, y, width: 180, height: 140, text: "Step", color: "green", textStyle };
  return null;
}

function supportsTextStyle(element: BoardElement) {
  return element.kind === "text" || element.kind === "rectangle" || element.kind === "ellipse" || element.kind === "diamond" || element.kind === "triangle";
}

function effectiveTextStyleFor(element: Pick<BoardElement, "kind" | "textStyle">): BoardTextStyle {
  const style = textStyleFor(element);
  const isLegacyShape = element.kind === "rectangle" || element.kind === "ellipse" || element.kind === "diamond" || element.kind === "triangle";
  return isLegacyShape && element.textStyle?.textAlign === undefined ? { ...style, textAlign: "center" } : style;
}

function BoardImage({ element }: { element: BoardElement }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const assetUrl = element.assetUrl;
    if (!assetUrl) return;
    let cancelled = false;
    let pending: HTMLImageElement | null = null;

    // An anonymous request keeps the export canvas untainted, but a bucket without a CORS rule
    // rejects it. Retrying without it shows the image and gives up only on image-perfect export.
    function load(source: string, anonymous: boolean) {
      const next = new window.Image();
      pending = next;
      if (anonymous) next.crossOrigin = "anonymous";
      next.onload = () => { if (!cancelled) setImage(next); };
      next.onerror = () => {
        if (cancelled) return;
        if (anonymous) load(source, false);
        else setImage(null);
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
  }, [element.assetUrl]);

  return image
    ? <KonvaImage image={image} width={element.width} height={element.height} cornerRadius={12} />
    : <Rect width={element.width} height={element.height} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={2} cornerRadius={12} />;
}

function MarkdownText({ element, color }: { element: BoardElement; color: string }) {
  const lines = parseMarkdown(element.text);
  const isStructured = lines.length > 1 || lines.some((line) => line.kind !== "paragraph");
  const padding = element.kind === "text" ? 0 : 18;
  const textStyle = effectiveTextStyleFor(element);
  const defaultFontSize = element.kind === "text" ? textStyle.fontSize : 16;
  const startY = element.kind === "note" || element.kind === "text" || isStructured ? padding : element.height / 2 - defaultFontSize * 0.7;
  const availableWidth = Math.max(20, element.width - padding * 2);

  return (
    <Group listening={false}>
      {lines.map((line, index) => {
        const fontSize = element.kind === "text" || line.kind !== "heading" ? defaultFontSize : ({ 1: 24, 2: 20, 3: 18 }[line.level ?? 3]);
        const prefix = line.kind === "bullet" ? "• " : line.kind === "task" ? `${line.checked ? "☑" : "☐"} ` : line.kind === "quote" ? "│ " : "";
        const lineY = startY + lines.slice(0, index).reduce((offset, previous) => {
          const prevFontSize = element.kind === "text" || previous.kind !== "heading" ? defaultFontSize : ({ 1: 24, 2: 20, 3: 18 }[previous.level ?? 3]);
          const prevPrefix = previous.kind === "bullet" ? "• " : previous.kind === "task" ? `${previous.checked ? "☑" : "☐"} ` : previous.kind === "quote" ? "│ " : "";
          const totalLength = (prevPrefix + previous.text).length;
          const charsPerLine = Math.max(1, Math.floor(availableWidth / (prevFontSize * 0.55)));
          const estimatedLines = Math.max(1, Math.ceil(totalLength / charsPerLine));
          return offset + prevFontSize * 1.45 * estimatedLines;
        }, 0);
        return <Text key={`${line.kind}-${index}`} text={`${prefix}${line.text}`} x={padding} y={lineY} width={availableWidth} fill={color} fontFamily={line.kind === "code" ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "Geist, Noto Sans Thai, sans-serif"} fontSize={fontSize} fontStyle={(supportsTextStyle(element) && textStyle.fontWeight === "bold") || line.bold || line.kind === "heading" ? "bold" : "normal"} lineHeight={1.35} align={supportsTextStyle(element) ? textStyle.textAlign : element.kind === "note" || isStructured ? "left" : "center"} wrap="word" />;
      })}
    </Group>
  );
}

export function KonvaBoard({
  initialDocument,
  onDocumentChange,
  activeTool,
  textStyle,
  onToolChange,
  onReady,
  onSelectionChange,
}: {
  initialDocument: BoardDocument;
  onDocumentChange: (document: BoardDocument) => void;
  activeTool: BoardTool;
  textStyle: BoardTextStyle;
  onToolChange: (tool: BoardTool) => void;
  onReady: (engine: BoardEngine) => void;
  onSelectionChange?: (info: { selectedShapeKind: BoardTool | null; hasSelection: boolean; selectedTextStyle: BoardTextStyle | null; selectedIds?: BoardElementId[] }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const shapeRefs = useRef(new Map<BoardElementId, Konva.Node>());
  const documentRef = useRef(cloneDocument(sampleBoard));
  const selectionRef = useRef<BoardElementId[]>([]);
  const pastRef = useRef<BoardDocument[]>([]);
  const futureRef = useRef<BoardDocument[]>([]);
  const clipboardRef = useRef<BoardDocument | null>(null);
  const connectionDefaultsRef = useRef<Partial<Pick<BoardConnection, "style" | "lineStyle" | "headType" | "color">>>({});
  const elementColorRef = useRef<BoardColor | null>(null);
  const gestureStartRef = useRef<BoardDocument | null>(null);
  const elementGestureActiveRef = useRef(false);
  const dragPreviewRef = useRef<{ id: BoardElementId; x: number; y: number } | null>(null);
  const arrowRefs = useRef(new Map<string, Konva.Arrow>());
  const drawStartRef = useRef<{ id: BoardElementId; document: BoardDocument } | null>(null);
  const eraseStartRef = useRef<BoardDocument | null>(null);
  const selectionMarqueeStartRef = useRef<SelectionMarqueeStart | null>(null);
  const moveFrameRef = useRef<number | null>(null);
  const pendingMoveRef = useRef<{ id: BoardElementId; x: number; y: number } | null>(null);
  const drawFrameRef = useRef<number | null>(null);
  const pendingDrawPointRef = useRef<{ id: BoardElementId; x: number; y: number } | null>(null);
  const wheelFrameRef = useRef<number | null>(null);
  const wheelCommitTimerRef = useRef<number | null>(null);
  const pendingWheelRef = useRef<{ x: number; y: number; deltaX: number; deltaY: number; zoom: boolean } | null>(null);
  const viewportRef = useRef<Viewport>(INITIAL_VIEWPORT);
  const touchGestureRef = useRef<TouchGesture | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [document, setDocument] = useState(() => cloneDocument(initialDocument));
  const [selection, setSelection] = useState<BoardElementId[]>([]);
  const [connectorStart, setConnectorStart] = useState<BoardElementId | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: BoardElementId; value: string } | null>(null);
  const [viewport, setViewport] = useState(INITIAL_VIEWPORT);
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const [selectionMarquee, setSelectionMarquee] = useState<Bounds | null>(null);
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
    const nodes = selection.flatMap((id) => {
      const node = shapeRefs.current.get(id);
      return node ? [node] : [];
    });
    transformerRef.current?.nodes(nodes);
    transformerRef.current?.getLayer()?.batchDraw();

    const hasSelection = selection.length > 0 || selectedConnection !== null;
    if (selection.length > 0) {
      const shapeKinds: BoardTool[] = ["rectangle", "ellipse", "diamond", "triangle"];
      const selectedElements = documentRef.current.elements.filter((element) => selection.includes(element.id));
      const shapeElement = selectedElements.find((element) => shapeKinds.includes(element.kind as BoardTool));
      const selectedTextElements = selectedElements.filter(supportsTextStyle);
      const firstTextStyle = selectedTextElements[0] ? effectiveTextStyleFor(selectedTextElements[0]) : null;
      const selectedTextStyle = firstTextStyle && selectedTextElements.every((element) => {
        const style = effectiveTextStyleFor(element);
        return style.fontSize === firstTextStyle.fontSize && style.fontWeight === firstTextStyle.fontWeight && style.textAlign === firstTextStyle.textAlign;
      }) ? firstTextStyle : null;
      onSelectionChangeRef.current?.({ selectedShapeKind: shapeElement ? (shapeElement.kind as BoardTool) : null, hasSelection, selectedTextStyle, selectedIds: selection });
    } else {
      onSelectionChangeRef.current?.({ selectedShapeKind: null, hasSelection, selectedTextStyle: null, selectedIds: [] });
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
    setDocument(next);
    onDocumentChangeRef.current(next);
  }, []);

  const updateElement = useCallback((id: BoardElementId, patch: Partial<BoardElement>, historical = false) => {
    const next = { ...documentRef.current, elements: documentRef.current.elements.map((element) => element.id === id ? { ...element, ...patch } : element) };
    if (historical && gestureStartRef.current) {
      pastRef.current.push(gestureStartRef.current);
      futureRef.current = [];
      gestureStartRef.current = null;
    }
    replaceDocument(next);
  }, [replaceDocument]);

  const cancelPendingMove = useCallback(() => {
    if (moveFrameRef.current !== null) {
      window.cancelAnimationFrame(moveFrameRef.current);
      moveFrameRef.current = null;
    }
    pendingMoveRef.current = null;
  }, []);

  useEffect(() => {
    function finishInterruptedGesture() {
      selectionMarqueeStartRef.current = null;
      setSelectionMarquee(null);
      if (!elementGestureActiveRef.current) return;
      elementGestureActiveRef.current = false;
      cancelPendingMove();
      const preview = dragPreviewRef.current;
      if (!preview) return;
      shapeRefs.current.get(preview.id)?.clearCache();
      updateElement(preview.id, { x: preview.x, y: preview.y }, true);
    }
    window.addEventListener("blur", finishInterruptedGesture);
    return () => window.removeEventListener("blur", finishInterruptedGesture);
  }, [cancelPendingMove, updateElement]);

  const updateConnectedArrows = useCallback((movedId: BoardElementId, x: number, y: number) => {
    for (const connection of documentRef.current.connections) {
      if (connection.fromId !== movedId && connection.toId !== movedId) continue;
      const from = documentRef.current.elements.find((element) => element.id === connection.fromId);
      const to = documentRef.current.elements.find((element) => element.id === connection.toId);
      if (!from || !to) continue;
      const fromEl = connection.fromId === movedId ? { ...from, x, y } : from;
      const toEl = connection.toId === movedId ? { ...to, x, y } : to;
      const { start, end } = getConnectionEndpoints(fromEl, toEl);
      const arrow = arrowRefs.current.get(connection.id);
      arrow?.points([start.x, start.y, end.x, end.y]);
      arrow?.getLayer()?.batchDraw();
    }
  }, []);

  const scheduleMove = useCallback((id: BoardElementId, x: number, y: number) => {
    pendingMoveRef.current = { id, x, y };
    if (moveFrameRef.current !== null) return;
    moveFrameRef.current = window.requestAnimationFrame(() => {
      moveFrameRef.current = null;
      const pending = pendingMoveRef.current;
      pendingMoveRef.current = null;
      if (!pending) return;
      dragPreviewRef.current = pending;
      updateConnectedArrows(pending.id, pending.x, pending.y);
    });
  }, [updateConnectedArrows]);

  const flushPendingDrawPoint = useCallback(() => {
    if (drawFrameRef.current !== null) {
      window.cancelAnimationFrame(drawFrameRef.current);
      drawFrameRef.current = null;
    }
    const pending = pendingDrawPointRef.current;
    pendingDrawPointRef.current = null;
    if (!pending) return;
    replaceDocument({
      ...documentRef.current,
      elements: documentRef.current.elements.map((element) => element.id === pending.id
        ? { ...element, points: [...(element.points ?? []), pending.x, pending.y] }
        : element),
    });
  }, [replaceDocument]);

  const scheduleDrawPoint = useCallback((id: BoardElementId, x: number, y: number) => {
    pendingDrawPointRef.current = { id, x, y };
    if (drawFrameRef.current !== null) return;
    drawFrameRef.current = window.requestAnimationFrame(() => {
      drawFrameRef.current = null;
      flushPendingDrawPoint();
    });
  }, [flushPendingDrawPoint]);

  useEffect(() => () => {
    if (moveFrameRef.current !== null) window.cancelAnimationFrame(moveFrameRef.current);
    if (drawFrameRef.current !== null) window.cancelAnimationFrame(drawFrameRef.current);
    if (wheelFrameRef.current !== null) window.cancelAnimationFrame(wheelFrameRef.current);
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
    const ids = new Set(selectionRef.current);
    if (ids.size === 0) return;
    commit({
      ...documentRef.current,
      elements: documentRef.current.elements.filter((element) => !ids.has(element.id)),
      connections: documentRef.current.connections.filter((connection) => !ids.has(connection.fromId) && !ids.has(connection.toId)),
    });
    setSelection([]);
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
    const hasElements = Boolean(proposal.elements && proposal.elements.length > 0);
    const hasConnUpdates = Boolean(proposal.updateConnections && proposal.updateConnections.length > 0);
    const hasElemUpdates = Boolean(proposal.updateElements && proposal.updateElements.length > 0);
    if (!hasElements && !hasConnUpdates && !hasElemUpdates) return;
    const doc = documentRef.current;

    const referenceId = (proposal.elements?.[0]?.relativeToId as BoardElementId | undefined) ?? selectionRef.current[0];
    const referenceElement = referenceId ? doc.elements.find((e) => e.id === referenceId) : null;

    let startX = referenceElement ? referenceElement.x + referenceElement.width + 100 : 400;
    let startY = referenceElement ? referenceElement.y : 200;

    if (!referenceElement && doc.elements.length > 0) {
      const maxX = Math.max(...doc.elements.map((e) => e.x + e.width));
      const minY = Math.min(...doc.elements.map((e) => e.y));
      startX = maxX + 100;
      startY = minY;
    }

    const newElements: BoardElement[] = [];
    const idMap: BoardElementId[] = [];

    if (proposal.elements && proposal.elements.length > 0) {
      for (const [index, proposed] of proposal.elements.entries()) {
        const elementId = createElementId();
        idMap.push(elementId);
        const isNote = proposed.kind === "note";
        const width = isNote ? 190 : 160;
        const height = isNote ? 110 : 80;
        const x = startX;
        const y = startY + index * (height + 28);

        newElements.push({
          id: elementId,
          kind: proposed.kind,
          x,
          y,
          width,
          height,
          text: proposed.text,
          color: proposed.color ?? (isNote ? "violet" : "blue"),
        });
      }
    }

    const newConnections: BoardConnection[] = [];
    if (proposal.connections && proposal.connections.length > 0) {
      for (const conn of proposal.connections) {
        const fromId = conn.fromId ? (conn.fromId as BoardElementId) : (conn.fromIndex !== undefined ? idMap[conn.fromIndex] : (referenceElement?.id ?? idMap[0]));
        const toId = conn.toIndex !== undefined ? idMap[conn.toIndex] : (conn.toId as BoardElementId | undefined);
        if (fromId && toId && fromId !== toId) {
          newConnections.push({
            id: `connection:${crypto.randomUUID()}`,
            fromId,
            toId,
            style: conn.style ?? "end",
            lineStyle: conn.lineStyle ?? "solid",
            headType: conn.headType ?? "arrow",
          });
        }
      }
    } else if (referenceElement && idMap[0]) {
      newConnections.push({
        id: `connection:${crypto.randomUUID()}`,
        fromId: referenceElement.id,
        toId: idMap[0],
        style: "end",
        lineStyle: "solid",
        headType: "arrow",
      });
    }

    let updatedConnections = [...doc.connections];
    if (proposal.updateConnections && proposal.updateConnections.length > 0) {
      for (const update of proposal.updateConnections) {
        updatedConnections = updatedConnections.map((conn) => {
          if (update.id && conn.id !== update.id) return conn;
          return {
            ...conn,
            ...(update.headType !== undefined ? { headType: update.headType } : {}),
            ...(update.style !== undefined ? { style: update.style } : {}),
            ...(update.lineStyle !== undefined ? { lineStyle: update.lineStyle } : {}),
            ...(update.color !== undefined ? { color: update.color } : {}),
          };
        });
      }
    }

    let updatedElements = [...doc.elements];
    if (proposal.updateElements && proposal.updateElements.length > 0) {
      for (const update of proposal.updateElements) {
        updatedElements = updatedElements.map((elem) => {
          if (update.id && elem.id !== update.id) return elem;
          return {
            ...elem,
            ...(update.color !== undefined ? { color: update.color } : {}),
            ...(update.text !== undefined ? { text: update.text } : {}),
            ...(update.kind !== undefined ? { kind: update.kind } : {}),
          };
        });
      }
    }

    const nextDoc: BoardDocument = {
      ...doc,
      elements: [...updatedElements, ...newElements],
      connections: [...updatedConnections, ...newConnections],
    };

    commit(nextDoc);
    if (idMap.length > 0) {
      setSelection(idMap);
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
    const { style, lineStyle, headType, color } = patch;
    connectionDefaultsRef.current = {
      ...connectionDefaultsRef.current,
      ...(style === undefined ? {} : { style }),
      ...(lineStyle === undefined ? {} : { lineStyle }),
      ...(headType === undefined ? {} : { headType }),
      ...(color === undefined ? {} : { color }),
    };
  }, []);

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
      if (nextTextStyle.fontSize === currentTextStyle.fontSize && nextTextStyle.fontWeight === currentTextStyle.fontWeight && nextTextStyle.textAlign === currentTextStyle.textAlign) return element;
      changed = true;
      return { ...element, textStyle: nextTextStyle };
    });
    if (!changed) return;
    commit({
      ...documentRef.current,
      elements,
    });
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

  const arrangeMindMap = useCallback(() => {
    const rootId = selectionRef.current[0];
    const next = layoutMindMap(documentRef.current, rootId);
    if (next !== documentRef.current) commit(next);
  }, [commit]);

  const engine = useMemo<BoardEngine>(() => ({
    undo,
    redo,
    deleteSelection,
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
    updateSelectedConnection,
    setConnectionDefaults,
    applyProposal,
  }), [addChildNode, addImage, applyProposal, arrangeMindMap, copySelection, deleteSelection, duplicateSelection, pasteClipboard, redo, renderExport, setConnectionDefaults, setSelectionColor, setSelectionShape, setSelectionTextStyle, undo, updateSelectedConnection, zoomAtCenter, zoomToFit]);

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
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if ((event.key === "Delete" || event.key === "Backspace") && selectionRef.current.length > 0) {
        event.preventDefault();
        deleteSelection();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelection();
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
  }, [copySelection, deleteSelection, duplicateSelection, onToolChange, pasteClipboard, redo, undo]);

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
      setSelection((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]);
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
    return { x: (pointer.x - viewport.x) / viewport.scale, y: (pointer.y - viewport.y) / viewport.scale };
  }

  function clearSelectionMarquee() {
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

    const selectedIds = documentRef.current.elements
      .filter((element) => isElementContainedByBounds(element, bounds))
      .map((element) => element.id);
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
      drawStartRef.current = { id: element.id, document: cloneDocument(documentRef.current) };
      replaceDocument({ ...documentRef.current, elements: [...documentRef.current.elements, element] });
      return;
    }
    const created = nextElement(effectiveTool, point.x, point.y, textStyle);
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
      if (point) setSelectionMarquee(boundsFromPoints(selectionStart.point, point));
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
    const next = event.evt.shiftKey
      ? selection.includes(id) ? selection.filter((selectedId) => selectedId !== id) : [...selection, id]
      : [id];
    setSelection(next);
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

  const elementMap = new Map(document.elements.map((element) => [element.id, element]));
  const editingElement = editing ? elementMap.get(editing.id) : undefined;

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
    if (element && element.text !== editing.value) {
      const textarea = textareaRef.current;
      let height = element.height;
      if (textarea) {
        const previousHeight = textarea.style.height;
        textarea.style.height = "0px";
        height = heightForEditedElement(element, textarea.scrollHeight, viewportRef.current.scale);
        textarea.style.height = previousHeight;
      }
      commit({
        ...documentRef.current,
        elements: documentRef.current.elements.map((candidate) => candidate.id === editing.id ? { ...candidate, text: editing.value, height } : candidate),
      });
    }
    setEditing(null);
  }

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
            const { start, end } = getConnectionEndpoints(from, to);
            const isSelected = selectedConnection === connection.id;
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
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
            const isCustomMarker = headType === "circle" || headType === "diamond";
            return (
              <Group key={connection.id}>
                <Arrow
                  name={connection.id}
                  hitStrokeWidth={18}
                  ref={(node) => { if (node) arrowRefs.current.set(connection.id, node); else arrowRefs.current.delete(connection.id); }}
                  points={[start.x, start.y, end.x, end.y]}
                  stroke={strokeColor}
                  fill={strokeColor}
                  strokeWidth={isSelected ? 4 : 2}
                  dash={dash}
                  pointerAtBeginning={isCustomMarker ? false : pointerAtBeginning}
                  pointerAtEnding={isCustomMarker ? false : pointerAtEnding}
                  pointerLength={pointerLength}
                  pointerWidth={pointerWidth}
                  perfectDrawEnabled={false}
                  onClick={(event) => { event.cancelBubble = true; setSelection([]); setSelectedConnection(connection.id); }}
                  onTap={(event) => { event.cancelBubble = true; setSelection([]); setSelectedConnection(connection.id); }}
                />
                {headType === "circle" && pointerAtEnding ? <Ellipse x={end.x} y={end.y} radiusX={6} radiusY={6} fill={strokeColor} stroke={strokeColor} onClick={(event) => { event.cancelBubble = true; setSelection([]); setSelectedConnection(connection.id); }} onTap={(event) => { event.cancelBubble = true; setSelection([]); setSelectedConnection(connection.id); }} /> : null}
                {headType === "circle" && pointerAtBeginning ? <Ellipse x={start.x} y={start.y} radiusX={6} radiusY={6} fill={strokeColor} stroke={strokeColor} onClick={(event) => { event.cancelBubble = true; setSelection([]); setSelectedConnection(connection.id); }} onTap={(event) => { event.cancelBubble = true; setSelection([]); setSelectedConnection(connection.id); }} /> : null}
                {headType === "diamond" && pointerAtEnding ? <Line points={[-6, 0, 0, -5, 6, 0, 0, 5]} closed x={end.x} y={end.y} rotation={angleDeg} fill={strokeColor} stroke={strokeColor} onClick={(event) => { event.cancelBubble = true; setSelection([]); setSelectedConnection(connection.id); }} onTap={(event) => { event.cancelBubble = true; setSelection([]); setSelectedConnection(connection.id); }} /> : null}
                {headType === "diamond" && pointerAtBeginning ? <Line points={[-6, 0, 0, -5, 6, 0, 0, 5]} closed x={start.x} y={start.y} rotation={angleDeg + 180} fill={strokeColor} stroke={strokeColor} onClick={(event) => { event.cancelBubble = true; setSelection([]); setSelectedConnection(connection.id); }} onTap={(event) => { event.cancelBubble = true; setSelection([]); setSelectedConnection(connection.id); }} /> : null}
              </Group>
            );
          })}
          {document.elements.map((element) => {
            if (element.kind === "draw") {
              return <Line key={element.id} name={element.id} points={element.points ?? []} stroke={COLORS[element.color ?? "violet"].stroke} strokeWidth={3} hitStrokeWidth={20} lineCap="round" lineJoin="round" tension={0.25} />;
            }
            const colors = COLORS[element.color ?? "grey"];
            return (
              <Group
                key={element.id}
                name={element.id}
                ref={(node) => { if (node) shapeRefs.current.set(element.id, node); else shapeRefs.current.delete(element.id); }}
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                draggable={effectiveTool === "select"}
                onClick={(event) => selectElement(element.id, event)}
                onTap={(event) => selectElement(element.id, event)}
                onTouchStart={(event) => startLongPress(element.id, event)}
                onTouchMove={clearLongPress}
                onTouchEnd={clearLongPress}
                onMouseDown={() => startMouseLongPress(element.id)}
                onMouseMove={clearLongPress}
                onMouseUp={clearLongPress}
                onDblClick={(event) => {
                  event.cancelBubble = true;
                  setEditing({ id: element.id, value: element.text });
                }}
                onDblTap={(event) => {
                  event.cancelBubble = true;
                  setEditing({ id: element.id, value: element.text });
                }}
                onDragStart={(event) => {
                  gestureStartRef.current = cloneDocument(documentRef.current);
                  elementGestureActiveRef.current = true;
                  event.target.cache();
                }}
                onDragMove={(event) => scheduleMove(element.id, event.target.x(), event.target.y())}
                onDragEnd={(event) => {
                  cancelPendingMove();
                  dragPreviewRef.current = null;
                  elementGestureActiveRef.current = false;
                  event.target.clearCache();
                  updateElement(element.id, { x: event.target.x(), y: event.target.y() }, true);
                }}
                onTransformStart={(event) => {
                  gestureStartRef.current = cloneDocument(documentRef.current);
                  elementGestureActiveRef.current = true;
                  event.target.cache();
                }}
                onTransformEnd={(event) => {
                  const node = event.target;
                  const width = Math.max(48, element.width * node.scaleX());
                  const height = Math.max(36, element.height * node.scaleY());
                  node.scale({ x: 1, y: 1 });
                  elementGestureActiveRef.current = false;
                  node.clearCache();
                  updateElement(element.id, { x: node.x(), y: node.y(), width, height }, true);
                }}
              >
                {element.kind === "image"
                  ? <BoardImage element={element} />
                  : element.kind === "ellipse"
                  ? <Ellipse x={element.width / 2} y={element.height / 2} radiusX={element.width / 2} radiusY={element.height / 2} fill={colors.fill} stroke={colors.stroke} strokeWidth={2} />
                  : element.kind === "diamond"
                    ? <Line points={[element.width / 2, 0, element.width, element.height / 2, element.width / 2, element.height, 0, element.height / 2]} closed fill={colors.fill} stroke={colors.stroke} strokeWidth={2} />
                    : element.kind === "triangle"
                      ? <Line points={[element.width / 2, 0, element.width, element.height, 0, element.height]} closed fill={colors.fill} stroke={colors.stroke} strokeWidth={2} />
                  : element.kind === "note"
                    ? (() => {
                        const fold = Math.min(24, Math.min(element.width, element.height) * 0.2);
                        return (
                          <Group>
                            <Line
                              points={[0, 0, element.width, 0, element.width, element.height - fold, element.width - fold, element.height, 0, element.height]}
                              closed
                              fill={colors.fill}
                              lineJoin="round"
                              shadowColor="#0f172a"
                              shadowOpacity={isCoarsePointer ? 0 : 0.16}
                              shadowBlur={isCoarsePointer ? 0 : 12}
                              shadowOffsetY={6}
                              shadowOffsetX={2}
                              perfectDrawEnabled={false}
                              shadowForStrokeEnabled={false}
                            />
                            <Line
                              points={[element.width - fold, element.height - fold, element.width, element.height - fold, element.width - fold, element.height]}
                              closed
                              fill={colors.stroke}
                              opacity={0.35}
                              lineJoin="round"
                            />
                            <Rect
                              x={element.width / 2 - 24}
                              y={-8}
                              width={48}
                              height={14}
                              fill="rgba(255, 255, 255, 0.65)"
                              stroke="rgba(148, 163, 184, 0.45)"
                              strokeWidth={1}
                              cornerRadius={2}
                              rotation={-1.5}
                            />
                          </Group>
                        );
                      })()
                  : element.kind === "text"
                    ? <Rect width={element.width} height={element.height} fill="rgba(0, 0, 0, 0.001)" />
                    : <Rect width={element.width} height={element.height} fill={colors.fill} stroke={colors.stroke} strokeWidth={2} cornerRadius={16} shadowColor="#475569" shadowOpacity={isCoarsePointer ? 0 : 0.12} shadowBlur={isCoarsePointer ? 0 : 10} shadowOffsetY={4} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />}
                {element.kind === "image" || editing?.id === element.id ? null : <MarkdownText element={element} color={colors.text} />}
              </Group>
            );
          })}
          {selectionMarquee ? <Rect x={selectionMarquee.x} y={selectionMarquee.y} width={selectionMarquee.width} height={selectionMarquee.height} fill="rgba(124, 58, 237, 0.12)" stroke="#7c3aed" strokeWidth={1.5} dash={[6, 4]} listening={false} /> : null}
          <Transformer ref={transformerRef} rotateEnabled={false} flipEnabled={false} boundBoxFunc={(oldBox, newBox) => newBox.width < 48 || newBox.height < 36 ? oldBox : newBox} />
        </Layer>
      </Stage>
      {editing && editingElement ? (
        <textarea
          ref={textareaRef}
          autoFocus
          aria-label={t("editElement")}
          className="absolute z-20 resize-none border-0 bg-transparent outline-none"
          style={{
            left: viewport.x + editingElement.x * viewport.scale,
            top: viewport.y + editingElement.y * viewport.scale,
            width: Math.max(140, editingElement.width * viewport.scale),
            height: Math.max(60, editingElement.height * viewport.scale),
            boxSizing: "border-box",
            padding: editingElement.kind === "text" ? 0 : "18px",
            paddingTop: editingElement.kind === "text" || editingElement.kind === "note" ? undefined : Math.max(18, editingElement.height * viewport.scale * 0.23),
            borderRadius: editingElement.kind === "ellipse" ? "50%" : undefined,
            color: COLORS[editingElement.color ?? "grey"].text,
            fontFamily: "Geist, Noto Sans Thai, sans-serif",
            fontSize: supportsTextStyle(editingElement) ? effectiveTextStyleFor(editingElement).fontSize : 16,
            fontWeight: supportsTextStyle(editingElement) ? effectiveTextStyleFor(editingElement).fontWeight : "bold",
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
            if (event.key === "Tab") {
              event.preventDefault();
              continueMindMap("child");
            }
            if (event.key === "Enter" && !event.shiftKey) {
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
              // For sticky notes ("note"), default Enter behavior creates a multiline note/checklist
            }
          }}
        />
      ) : null}
    </div>
  );
}
