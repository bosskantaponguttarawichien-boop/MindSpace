export const BOARD_COLORS = [
  "violet",
  "purple",
  "indigo",
  "blue",
  "sky",
  "cyan",
  "teal",
  "emerald",
  "green",
  "lime",
  "yellow",
  "amber",
  "orange",
  "red",
  "rose",
  "pink",
  "fuchsia",
  "slate",
  "grey",
] as const;

export type BoardColor = (typeof BOARD_COLORS)[number];

export const TEXT_FONT_SIZES = [14, 16, 18, 24, 32, 40] as const;

export type BoardTextFontSize = (typeof TEXT_FONT_SIZES)[number];
export type BoardTextFontWeight = "normal" | "bold";
export type BoardTextAlignment = "left" | "center" | "right";

export type BoardTextStyle = {
  fontSize: BoardTextFontSize;
  fontWeight: BoardTextFontWeight;
  textAlign: BoardTextAlignment;
};

export const DEFAULT_TEXT_STYLE: BoardTextStyle = { fontSize: 18, fontWeight: "normal", textAlign: "left" };

export type BoardElementId = `element:${string}`;
export type BoardConnectionId = `connection:${string}`;

export type BoardElement = {
  id: BoardElementId;
  kind: "text" | "note" | "rectangle" | "ellipse" | "diamond" | "triangle" | "draw" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color?: BoardColor;
  points?: number[];
  assetUrl?: string;
  // Older boards predate alignment, so persisted styles remain additive.
  textStyle?: Partial<BoardTextStyle>;
};

export function textStyleFor(element: Pick<BoardElement, "textStyle">): BoardTextStyle {
  return { ...DEFAULT_TEXT_STYLE, ...element.textStyle };
}

export type ConnectionStyle = "end" | "both" | "start" | "none";
export type ConnectionLineStyle = "solid" | "dashed" | "dotted";
export type ConnectionHeadType = "arrow" | "triangle" | "circle" | "diamond";

export type BoardConnection = {
  id: BoardConnectionId;
  fromId: BoardElementId;
  toId: BoardElementId;
  style?: ConnectionStyle;
  lineStyle?: ConnectionLineStyle;
  headType?: ConnectionHeadType;
  color?: BoardColor;
};

export type BoardDocument = {
  version: 1;
  id: string;
  name: string;
  elements: BoardElement[];
  connections: BoardConnection[];
};

export function isBoardDocument(value: unknown): value is BoardDocument {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BoardDocument>;
  return (
    candidate.version === 1 &&
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    Array.isArray(candidate.elements) &&
    Array.isArray(candidate.connections)
  );
}

/** Compares two documents by content, ignoring key order and fields left undefined. */
export function sameBoardDocument(left: BoardDocument, right: BoardDocument): boolean {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  const entries = value as Record<string, unknown>;
  return Object.keys(entries)
    .sort()
    .flatMap((key) => entries[key] === undefined ? [] : [[key, canonical(entries[key])]]);
}
