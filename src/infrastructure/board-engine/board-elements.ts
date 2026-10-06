import { textStyleFor, type BoardDocument, type BoardElement, type BoardElementId, type BoardTextStyle } from "@/domain/board/board-document";
import { textStyleForScope, type BoardTextStyles } from "@/domain/board/text-style-scope";
import type { MindMapDefaults } from "@/domain/board/mind-map";
import type { BoardTool } from "@/infrastructure/board-engine/board-engine";

export type MindMapNodeKind = MindMapDefaults["kind"];
export const mindMapNodeKinds = new Set<MindMapNodeKind>(["text", "note", "rectangle", "ellipse", "diamond", "triangle"]);

export function isShapeKind(kind?: string | null): boolean {
  return kind === "rectangle" || kind === "ellipse" || kind === "diamond" || kind === "triangle";
}

export function cloneDocument(document: BoardDocument): BoardDocument {
  return structuredClone(document);
}

export function createElementId(): BoardElementId {
  return `element:${crypto.randomUUID()}`;
}

export function boardBounds(elements: BoardElement[]) {
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

export function nextElement(tool: BoardTool, x: number, y: number, textStyles: BoardTextStyles): BoardElement | null {
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

export function supportsTextStyle(element: BoardElement) {
  return element.kind === "text" || element.kind === "note" || element.kind === "table" || element.kind === "rectangle" || element.kind === "ellipse" || element.kind === "diamond" || element.kind === "triangle";
}

export function effectiveTextStyleFor(element: Pick<BoardElement, "kind" | "textStyle">): BoardTextStyle {
  const style = textStyleFor(element);
  if (isShapeKind(element.kind) && element.textStyle?.textAlign === undefined) {
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
