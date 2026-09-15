import { DEFAULT_TEXT_STYLE, type BoardTextStyle } from "@/domain/board/board-document";

/**
 * Text formatting is owned by the object type it belongs to: a heading typed into a sticky note
 * must never re-style shapes or table cells. Every creator tool that carries text maps onto exactly
 * one scope, and each scope keeps its own bold/alignment/size state and its own creation defaults.
 */
export const TEXT_STYLE_SCOPES = ["text", "note", "table", "shape"] as const;

export type BoardTextStyleScope = (typeof TEXT_STYLE_SCOPES)[number];

export type BoardTextStyles = Record<BoardTextStyleScope, BoardTextStyle>;

export const DEFAULT_TEXT_STYLES: BoardTextStyles = {
  text: { ...DEFAULT_TEXT_STYLE },
  note: { ...DEFAULT_TEXT_STYLE, fontSize: 16 },
  table: { ...DEFAULT_TEXT_STYLE, fontSize: 14, textAlign: "center", verticalAlign: "middle" },
  shape: { ...DEFAULT_TEXT_STYLE, textAlign: "center", verticalAlign: "middle" },
};

/** Maps an element kind or creator tool id onto the text scope that owns its formatting. */
export function textStyleScopeFor(kind: string | null | undefined): BoardTextStyleScope | null {
  switch (kind) {
    case "text":
      return "text";
    case "note":
      return "note";
    case "table":
      return "table";
    case "rectangle":
    case "ellipse":
    case "diamond":
    case "triangle":
    case "shape":
      return "shape";
    default:
      return null;
  }
}

export function textStyleForScope(styles: BoardTextStyles, kind: string | null | undefined): BoardTextStyle {
  const scope = textStyleScopeFor(kind);
  return scope ? styles[scope] : styles.text;
}
