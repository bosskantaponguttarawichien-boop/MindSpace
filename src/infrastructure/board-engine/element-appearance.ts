import type { BoardElement } from "@/domain/board/board-document";
import { isShapeKind } from "./board-elements";
import { COLORS, type ElementColors } from "./board-theme";

export const ELEMENT_APPEARANCE = {
  paper: "#fff9ed",
  paperBorder: "#ded6c8",
  paperHighlight: "#ffffff",
  fold: "#f2e7d2",
  tape: "#d9cbb4",
  tapeBorder: "#c5b69d",
  grain: "#86765e",
  text: "#20252c",
  noteRadius: 10,
  noteRail: 5,
  noteFold: 16,
  tapeWidth: 64,
  tapeHeight: 16,
  shapeRadius: 24,
  shapeBorder: 0.8,
  shapeInset: 2.5,
} as const;

function mix(from: string, to: string, amount: number): string {
  const channels = [1, 3, 5].map((offset) => {
    const a = parseInt(from.slice(offset, offset + 2), 16);
    const b = parseInt(to.slice(offset, offset + 2), 16);
    return Math.round(a + (b - a) * amount).toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

/** Presentation only: persisted color choices and document geometry stay intact. */
export function elementColors(element: BoardElement): ElementColors {
  const palette = COLORS[element.color ?? "grey"];
  if (element.kind === "note") {
    return { fill: ELEMENT_APPEARANCE.paper, stroke: mix(palette.stroke, palette.fill, 0.65), text: ELEMENT_APPEARANCE.text };
  }
  if (isShapeKind(element.kind)) {
    return { fill: mix(palette.fill, "#ffffff", 0.3), stroke: mix(palette.stroke, "#64756e", 0.35), text: ELEMENT_APPEARANCE.text };
  }
  return palette;
}

export function shapeCornerRadius(width: number, height: number): number {
  return Math.min(ELEMENT_APPEARANCE.shapeRadius, width / 4, height / 4);
}
