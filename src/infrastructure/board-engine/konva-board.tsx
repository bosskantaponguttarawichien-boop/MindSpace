"use client";

import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Arrow, Ellipse, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import { sampleBoard } from "@/domain/board/sample-board";
import type { BoardConnection, BoardDocument, BoardElement, BoardElementId } from "@/domain/board/board-document";
import type { BoardEngine, BoardTool } from "@/infrastructure/board-engine/board-engine";
import { useLocale } from "@/lib/i18n/locale-provider";

type Viewport = { x: number; y: number; scale: number };
type Size = { width: number; height: number };
type ScreenPoint = { x: number; y: number };
type TouchGesture = { distance: number; midpoint: ScreenPoint; viewport: Viewport };

const COLORS = {
  violet: { fill: "#ede9fe", stroke: "#7c3aed", text: "#3b0764" },
  yellow: { fill: "#fef3c7", stroke: "#f59e0b", text: "#78350f" },
  blue: { fill: "#dbeafe", stroke: "#3b82f6", text: "#1e3a8a" },
  green: { fill: "#dcfce7", stroke: "#22c55e", text: "#14532d" },
  grey: { fill: "#f3f4f6", stroke: "#94a3b8", text: "#334155" },
} as const;

const INITIAL_VIEWPORT: Viewport = { x: 40, y: 25, scale: 0.9 };
const PDF_PAGE = { width: 1123, height: 794, padding: 48 };

function cloneDocument(document: BoardDocument): BoardDocument {
  return structuredClone(document);
}

function createElementId(): BoardElementId {
  return `element:${crypto.randomUUID()}`;
}

function elementCenter(element: BoardElement) {
  return { x: element.x + element.width / 2, y: element.y + element.height / 2 };
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

function nextElement(tool: BoardTool, x: number, y: number): BoardElement | null {
  const id = createElementId();
  if (tool === "text") return { id, kind: "text", x, y, width: 220, height: 54, text: "New idea", color: "grey" };
  if (tool === "note") return { id, kind: "note", x, y, width: 190, height: 170, text: "New note", color: "yellow" };
  if (tool === "rectangle") return { id, kind: "rectangle", x, y, width: 220, height: 120, text: "New concept", color: "violet" };
  if (tool === "ellipse") return { id, kind: "ellipse", x, y, width: 200, height: 120, text: "New concept", color: "blue" };
  return null;
}

function BoardImage({ element }: { element: BoardElement }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!element.assetUrl) return;
    const next = new window.Image();
    next.crossOrigin = "anonymous";
    next.onload = () => setImage(next);
    next.onerror = () => setImage(null);
    next.src = element.assetUrl;
    return () => {
      next.onload = null;
      next.onerror = null;
    };
  }, [element.assetUrl]);

  return image
    ? <KonvaImage image={image} width={element.width} height={element.height} cornerRadius={12} />
    : <Rect width={element.width} height={element.height} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={2} cornerRadius={12} />;
}

export function KonvaBoard({
  initialDocument,
  onDocumentChange,
  activeTool,
  onToolChange,
  onReady,
}: {
  initialDocument: BoardDocument;
  onDocumentChange: (document: BoardDocument) => void;
  activeTool: BoardTool;
  onToolChange: (tool: BoardTool) => void;
  onReady: (engine: BoardEngine) => void;
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
  const gestureStartRef = useRef<BoardDocument | null>(null);
  const elementGestureActiveRef = useRef(false);
  const dragPreviewRef = useRef<{ id: BoardElementId; x: number; y: number } | null>(null);
  const arrowRefs = useRef(new Map<string, Konva.Arrow>());
  const drawStartRef = useRef<{ id: BoardElementId; document: BoardDocument } | null>(null);
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
  const [document, setDocument] = useState(() => cloneDocument(initialDocument));
  const [selection, setSelection] = useState<BoardElementId[]>([]);
  const [connectorStart, setConnectorStart] = useState<BoardElementId | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: BoardElementId; value: string } | null>(null);
  const [viewport, setViewport] = useState(INITIAL_VIEWPORT);
  const [isCoarsePointer, setIsCoarsePointer] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const [size, setSize] = useState<Size>({ width: 900, height: 650 });
  const { t } = useLocale();

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  useEffect(() => {
    if (JSON.stringify(initialDocument) === JSON.stringify(documentRef.current)) return;
    documentRef.current = cloneDocument(initialDocument);
    setDocument(documentRef.current);
    setSelection([]);
    setSelectedConnection(null);
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
  }, [selection]);

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
    onDocumentChange(next);
  }, [onDocumentChange]);

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
      const start = elementCenter(connection.fromId === movedId ? { ...from, x, y } : from);
      const end = elementCenter(connection.toId === movedId ? { ...to, x, y } : to);
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
    if (selectedConnection) {
      commit({ ...documentRef.current, connections: documentRef.current.connections.filter((connection) => connection.id !== selectedConnection) });
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
  }, [commit, selectedConnection]);

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
      const nextScale = Math.min(2.5, Math.max(0.25, current.scale * factor));
      const center = { x: size.width / 2, y: size.height / 2 };
      const world = { x: (center.x - current.x) / current.scale, y: (center.y - current.y) / current.scale };
      return { scale: nextScale, x: center.x - world.x * nextScale, y: center.y - world.y * nextScale };
    });
  }, [size]);

  const zoomToFit = useCallback(() => {
    const elements = documentRef.current.elements;
    if (elements.length === 0) return setViewport(INITIAL_VIEWPORT);
    const minX = Math.min(...elements.map((element) => element.x));
    const minY = Math.min(...elements.map((element) => element.y));
    const maxX = Math.max(...elements.map((element) => element.x + element.width));
    const maxY = Math.max(...elements.map((element) => element.y + element.height));
    const scale = Math.min(1.4, Math.max(0.25, Math.min((size.width - 120) / (maxX - minX), (size.height - 120) / (maxY - minY))));
    setViewport({ x: (size.width - (maxX + minX) * scale) / 2, y: (size.height - (maxY + minY) * scale) / 2, scale });
  }, [size]);

  const addImage = useCallback((image: { url: string; width: number; height: number }) => {
    const maxWidth = 420;
    const maxHeight = 320;
    const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
    const width = Math.max(80, Math.round(image.width * scale));
    const height = Math.max(80, Math.round(image.height * scale));
    const viewport = viewportRef.current;
    const element: BoardElement = {
      id: createElementId(),
      kind: "image",
      x: (size.width / 2 - viewport.x) / viewport.scale - width / 2,
      y: (size.height / 2 - viewport.y) / viewport.scale - height / 2,
      width,
      height,
      text: "",
      assetUrl: image.url,
    };
    commit({ ...documentRef.current, elements: [...documentRef.current.elements, element] });
    setSelection([element.id]);
  }, [commit, size]);

  const printBoard = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const original = { width: stage.width(), height: stage.height(), x: stage.x(), y: stage.y(), scaleX: stage.scaleX(), scaleY: stage.scaleY() };
    try {
      const bounds = boardBounds(documentRef.current.elements);
      const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
      const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
      const scale = Math.min((PDF_PAGE.width - PDF_PAGE.padding * 2) / contentWidth, (PDF_PAGE.height - PDF_PAGE.padding * 2) / contentHeight);
      stage.size({ width: PDF_PAGE.width, height: PDF_PAGE.height });
      stage.scale({ x: scale, y: scale });
      stage.position({ x: (PDF_PAGE.width - contentWidth * scale) / 2 - bounds.minX * scale, y: (PDF_PAGE.height - contentHeight * scale) / 2 - bounds.minY * scale });
      stage.draw();
      const dataUrl = stage.toDataURL({ pixelRatio: 2 });
      const printWindow = window.open("", "_blank", "noopener,noreferrer");
      if (!printWindow) return window.alert("Allow pop-ups to export this board as PDF.");
      printWindow.document.write(`<!doctype html><title>MindSpace board</title><img src="${dataUrl}" style="width:100%;height:auto" />`);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
    } catch {
      window.alert("Unable to export this board. Images may need Firebase Storage access first.");
    } finally {
      stage.size({ width: original.width, height: original.height });
      stage.scale({ x: original.scaleX, y: original.scaleY });
      stage.position({ x: original.x, y: original.y });
      stage.draw();
    }
  }, []);

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
    printBoard,
  }), [addImage, copySelection, deleteSelection, duplicateSelection, pasteClipboard, printBoard, redo, undo, zoomAtCenter, zoomToFit]);

  useEffect(() => onReady(engine), [engine, onReady]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
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
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [copySelection, deleteSelection, duplicateSelection, pasteClipboard, redo, undo]);

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
    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      setSelection((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]);
      onToolChange("select");
      longPressTimerRef.current = null;
    }, 450);
  }

  function startLongPress(id: BoardElementId, event: KonvaEventObject<TouchEvent>) {
    if (!isCoarsePointer || event.evt.touches.length !== 1) return;
    selectByLongPress(id);
  }

  function startMouseLongPress(id: BoardElementId) {
    if (isCoarsePointer) return;
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

  function worldPointer() {
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return null;
    return { x: (pointer.x - viewport.x) / viewport.scale, y: (pointer.y - viewport.y) / viewport.scale };
  }

  function handleStagePointerDown(event: KonvaEventObject<PointerEvent>) {
    if (event.target !== event.target.getStage()) return;
    if (activeTool === "select") return setSelection([]);
    if (activeTool === "hand") return;
    const point = worldPointer();
    if (!point) return;
    if (activeTool === "draw") {
      const element: BoardElement = { id: createElementId(), kind: "draw", x: 0, y: 0, width: 1, height: 1, text: "", color: "violet", points: [point.x, point.y] };
      drawStartRef.current = { id: element.id, document: cloneDocument(documentRef.current) };
      replaceDocument({ ...documentRef.current, elements: [...documentRef.current.elements, element] });
      return;
    }
    const element = nextElement(activeTool, point.x, point.y);
    if (element) {
      commit({ ...documentRef.current, elements: [...documentRef.current.elements, element] });
      setSelection([element.id]);
      onToolChange("select");
    }
  }

  function handleStagePointerMove() {
    const drawing = drawStartRef.current;
    if (!drawing) return;
    const point = worldPointer();
    if (!point) return;
    scheduleDrawPoint(drawing.id, point.x, point.y);
  }

  function handleStagePointerUp() {
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
    if (activeTool === "arrow") {
      if (!connectorStart) return setConnectorStart(id);
      if (connectorStart !== id) {
        const connection: BoardConnection = { id: `connection:${crypto.randomUUID()}`, fromId: connectorStart, toId: id };
        commit({ ...documentRef.current, connections: [...documentRef.current.connections, connection] });
      }
      setConnectorStart(null);
      onToolChange("select");
      return;
    }
    if (activeTool !== "select") return;
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

  function finishEditing() {
    if (!editing) return;
    const element = documentRef.current.elements.find((candidate) => candidate.id === editing.id);
    if (element && element.text !== editing.value) {
      commit({
        ...documentRef.current,
        elements: documentRef.current.elements.map((candidate) => candidate.id === editing.id ? { ...candidate, text: editing.value } : candidate),
      });
    }
    setEditing(null);
  }

  return (
    <div ref={containerRef} className="konva-board h-full w-full touch-none" data-testid="konva-board" data-element-count={document.elements.length}>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        draggable={activeTool === "hand"}
        onDragEnd={(event) => {
          if (event.target !== event.target.getStage()) return;
          setViewport((current) => ({ ...current, x: event.target.x(), y: event.target.y() }));
        }}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
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
            const start = elementCenter(from);
            const end = elementCenter(to);
            return <Arrow key={connection.id} ref={(node) => { if (node) arrowRefs.current.set(connection.id, node); else arrowRefs.current.delete(connection.id); }} points={[start.x, start.y, end.x, end.y]} stroke={selectedConnection === connection.id ? "#7c3aed" : "#64748b"} fill={selectedConnection === connection.id ? "#7c3aed" : "#64748b"} strokeWidth={selectedConnection === connection.id ? 4 : 2} pointerLength={8} pointerWidth={8} perfectDrawEnabled={false} onClick={(event) => { event.cancelBubble = true; setSelection([]); setSelectedConnection(connection.id); }} onTap={(event) => { event.cancelBubble = true; setSelection([]); setSelectedConnection(connection.id); }} />;
          })}
          {document.elements.map((element) => {
            if (element.kind === "draw") {
              return <Line key={element.id} points={element.points ?? []} stroke="#7c3aed" strokeWidth={3} lineCap="round" lineJoin="round" tension={0.25} />;
            }
            const colors = COLORS[element.color ?? "grey"];
            return (
              <Group
                key={element.id}
                ref={(node) => { if (node) shapeRefs.current.set(element.id, node); else shapeRefs.current.delete(element.id); }}
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                draggable={activeTool === "select"}
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
                  : element.kind === "text"
                    ? null
                    : <Rect width={element.width} height={element.height} fill={colors.fill} stroke={colors.stroke} strokeWidth={2} cornerRadius={element.kind === "note" ? 4 : 16} shadowColor="#475569" shadowOpacity={isCoarsePointer ? 0 : 0.12} shadowBlur={isCoarsePointer ? 0 : 10} shadowOffsetY={4} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />}
                {element.kind === "image" ? null : <Text text={element.text} width={element.width} height={element.height} padding={element.kind === "text" ? 0 : 18} fill={colors.text} fontFamily="Geist, Noto Sans Thai, sans-serif" fontSize={element.kind === "text" ? 18 : 16} fontStyle={element.kind === "text" ? "normal" : "bold"} lineHeight={1.35} verticalAlign="middle" align={element.kind === "text" ? "left" : "center"} wrap="word" />}
              </Group>
            );
          })}
          <Transformer ref={transformerRef} rotateEnabled={false} flipEnabled={false} boundBoxFunc={(oldBox, newBox) => newBox.width < 48 || newBox.height < 36 ? oldBox : newBox} />
        </Layer>
      </Stage>
      {editing && editingElement ? (
        <textarea
          autoFocus
          aria-label={t("editElement")}
          className="absolute z-20 resize-none rounded-md border-2 border-primary bg-background/95 p-3 text-sm shadow-xl outline-none"
          style={{
            left: viewport.x + editingElement.x * viewport.scale,
            top: viewport.y + editingElement.y * viewport.scale,
            width: Math.max(140, editingElement.width * viewport.scale),
            height: Math.max(60, editingElement.height * viewport.scale),
          }}
          value={editing.value}
          onChange={(event) => setEditing({ ...editing, value: event.target.value })}
          onBlur={finishEditing}
          onKeyDown={(event) => {
            if (event.key === "Escape") setEditing(null);
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") event.currentTarget.blur();
          }}
        />
      ) : null}
    </div>
  );
}
