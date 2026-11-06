import type { BoardElement } from "@/domain/board/board-document";
import { parseMarkdown } from "@/domain/board/markdown";
import { effectiveTextStyleFor, isShapeKind, supportsTextStyle } from "./board-elements";

export const BOARD_FONT = "Geist, Noto Sans Thai, sans-serif";
export const CODE_FONT = "ui-monospace, SFMono-Regular, Menlo, monospace";

/** Board coordinates, shared by the canvas and its in-place editing overlay. */
export function textLayout(element: BoardElement) {
  const lines = parseMarkdown(element.text);
  const style = effectiveTextStyleFor(element);
  const padding = element.kind === "text" ? 0 : 18;
  const width = Math.max(20, element.width - padding * 2);
  const defaultFontSize = supportsTextStyle(element) ? style.fontSize : 16;
  const rows = lines.map((line) => {
    const fontSize = element.kind === "text" || line.kind !== "heading" ? defaultFontSize : ({ 1: 24, 2: 20, 3: 18 }[line.level ?? 3]);
    const prefix = line.kind === "bullet" ? "• " : line.kind === "task" ? `${line.checked ? "☑" : "☐"} ` : line.kind === "quote" ? "│ " : "";
    const count = Math.max(1, Math.ceil((prefix + line.text).length / Math.max(1, Math.floor(width / (fontSize * 0.55)))));
    return { ...line, prefix, fontSize, height: fontSize * 1.45 * count,
      fontFamily: line.kind === "code" ? CODE_FONT : BOARD_FONT,
      fontWeight: (supportsTextStyle(element) && style.fontWeight === "bold") || line.bold || line.kind === "heading" ? "bold" as const : "normal" as const };
  });
  const height = rows.reduce((sum, row) => sum + row.height, 0);
  const titleOffset = (element.kind === "note" || isShapeKind(element.kind)) && element.title ? 40 : 0;
  const available = Math.max(0, element.height - padding * 2 - titleOffset);
  let y = padding + titleOffset;
  if (element.kind !== "text" && style.verticalAlign === "middle") y += Math.max(0, (available - height) / 2);
  if (element.kind !== "text" && style.verticalAlign === "bottom") y = Math.max(y, element.height - padding - height);
  const structured = lines.length > 1 || lines.some((line) => line.kind !== "paragraph");
  return { rows, x: padding, y, width, height, style,
    align: supportsTextStyle(element) ? style.textAlign : element.kind === "note" || structured ? "left" as const : "center" as const };
}
