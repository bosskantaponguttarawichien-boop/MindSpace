import {
  BOARD_COLORS,
  TEXT_FONT_SIZES,
  type BoardColor,
  type BoardElement,
  type BoardTextAlignment,
  type BoardTextFontSize,
  type BoardTextFontWeight,
  type BoardTextStyle,
  type BoardVerticalAlignment,
  type ConnectionHeadType,
  type ConnectionLineStyle,
  type ConnectionPathStyle,
  type ConnectionStyle,
} from "@/domain/board/board-document";
import type { MindMapLayoutDirection } from "@/domain/board/mind-map";

export type AiActionType = "summarize" | "explain" | "expand" | "check" | "proofread" | "improve" | "mindMap" | "updateMindMap";

/** Board tools the AI may drive. Draw strokes and images stay human-only: they need raw input or an upload. */
export const AI_ELEMENT_KINDS = ["note", "text", "rectangle", "ellipse", "diamond", "triangle", "table"] as const;

export type AiElementKind = (typeof AI_ELEMENT_KINDS)[number];

export const AI_LIMITS = {
  elements: 20,
  connections: 30,
  updates: 30,
  deletes: 20,
  groups: 10,
  groupMembers: 30,
  tableRows: 12,
  tableCols: 8,
  cellLength: 120,
  minCoordinate: -20_000,
  maxCoordinate: 20_000,
  minSize: 24,
  maxSize: 4_000,
} as const;

export type AiProposedElement = {
  kind: AiElementKind;
  text: string;
  color?: BoardColor;
  relativeToId?: string;
  textStyle?: Partial<BoardTextStyle>;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rows?: number;
  cols?: number;
  tableData?: string[][];
};

export type AiProposedConnection = {
  fromIndex?: number;
  toIndex?: number;
  fromId?: string;
  toId?: string;
  style?: ConnectionStyle;
  lineStyle?: ConnectionLineStyle;
  headType?: ConnectionHeadType;
  pathStyle?: ConnectionPathStyle;
  color?: BoardColor;
};

export type AiProposedConnectionUpdate = {
  id?: string;
  headType?: ConnectionHeadType;
  style?: ConnectionStyle;
  lineStyle?: ConnectionLineStyle;
  pathStyle?: ConnectionPathStyle;
  color?: BoardColor;
};

export type AiProposedElementUpdate = {
  id?: string;
  color?: BoardColor;
  text?: string;
  kind?: AiElementKind;
  textStyle?: Partial<BoardTextStyle>;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  tableData?: string[][];
};

export type AiProposedGroup = {
  elementIds: string[];
};

export type AiProposedLayout = {
  direction: MindMapLayoutDirection;
  rootId?: string;
};

export type AiProposal = {
  id: string;
  title: string;
  explanation: string;
  elements?: AiProposedElement[];
  connections?: AiProposedConnection[];
  updateConnections?: AiProposedConnectionUpdate[];
  updateElements?: AiProposedElementUpdate[];
  deleteElementIds?: string[];
  deleteConnectionIds?: string[];
  groupElements?: AiProposedGroup[];
  ungroupElementIds?: string[];
  layout?: AiProposedLayout;
};

export type AiResponsePayload = {
  text: string;
  proposal?: AiProposal;
};

const VALID_KINDS = new Set<AiElementKind>(AI_ELEMENT_KINDS);
const VALID_COLORS = new Set<BoardColor>(BOARD_COLORS);
const VALID_FONT_SIZES = new Set<number>(TEXT_FONT_SIZES);
const VALID_FONT_WEIGHTS = new Set<BoardTextFontWeight>(["normal", "bold"]);
const VALID_TEXT_ALIGNMENTS = new Set<BoardTextAlignment>(["left", "center", "right"]);
const VALID_VERTICAL_ALIGNMENTS = new Set<BoardVerticalAlignment>(["top", "middle", "bottom"]);
const VALID_HEAD_TYPES = new Set<ConnectionHeadType>(["arrow", "triangle", "circle", "diamond"]);
const VALID_STYLES = new Set<ConnectionStyle>(["end", "both", "start", "none"]);
const VALID_LINE_STYLES = new Set<ConnectionLineStyle>(["solid", "dashed", "dotted"]);
const VALID_PATH_STYLES = new Set<ConnectionPathStyle>(["straight", "curved", "elbow"]);
const VALID_LAYOUT_DIRECTIONS = new Set<MindMapLayoutDirection>(["horizontal", "tree"]);

function readColor(value: unknown): BoardColor | undefined {
  return typeof value === "string" && VALID_COLORS.has(value as BoardColor) ? (value as BoardColor) : undefined;
}

function readKind(value: unknown): AiElementKind | undefined {
  return typeof value === "string" && VALID_KINDS.has(value as AiElementKind) ? (value as AiElementKind) : undefined;
}

/** Keeps model-supplied geometry inside the canvas budget instead of trusting raw numbers. */
function readClampedNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.round(Math.min(max, Math.max(min, value)));
}

function readCoordinate(value: unknown): number | undefined {
  return readClampedNumber(value, AI_LIMITS.minCoordinate, AI_LIMITS.maxCoordinate);
}

function readSize(value: unknown): number | undefined {
  return readClampedNumber(value, AI_LIMITS.minSize, AI_LIMITS.maxSize);
}

function readTextStyle(value: unknown): Partial<BoardTextStyle> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const style: Partial<BoardTextStyle> = {};

  if (typeof raw.fontSize === "number" && VALID_FONT_SIZES.has(raw.fontSize)) {
    style.fontSize = raw.fontSize as BoardTextFontSize;
  }
  if (typeof raw.fontWeight === "string" && VALID_FONT_WEIGHTS.has(raw.fontWeight as BoardTextFontWeight)) {
    style.fontWeight = raw.fontWeight as BoardTextFontWeight;
  }
  if (typeof raw.textAlign === "string" && VALID_TEXT_ALIGNMENTS.has(raw.textAlign as BoardTextAlignment)) {
    style.textAlign = raw.textAlign as BoardTextAlignment;
  }
  if (typeof raw.verticalAlign === "string" && VALID_VERTICAL_ALIGNMENTS.has(raw.verticalAlign as BoardVerticalAlignment)) {
    style.verticalAlign = raw.verticalAlign as BoardVerticalAlignment;
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

function readTableData(value: unknown): string[][] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows: string[][] = [];
  for (const row of value.slice(0, AI_LIMITS.tableRows)) {
    if (!Array.isArray(row)) continue;
    rows.push(
      row
        .slice(0, AI_LIMITS.tableCols)
        .map((cell) => (typeof cell === "string" ? cell.slice(0, AI_LIMITS.cellLength) : typeof cell === "number" ? String(cell) : "")),
    );
  }
  if (rows.length === 0) return undefined;
  const cols = Math.max(...rows.map((row) => row.length));
  return rows.map((row) => Array.from({ length: cols }, (_, index) => row[index] ?? ""));
}

function readIdList(value: unknown, prefix: "element:" | "connection:", limit: number): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value.filter((id): id is string => typeof id === "string" && id.startsWith(prefix));
  return [...new Set(ids)].slice(0, limit);
}

function parseElements(raw: unknown): AiProposedElement[] {
  if (!Array.isArray(raw)) return [];
  const elements: AiProposedElement[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const kind = readKind(entry.kind) ?? "note";
    const text = typeof entry.text === "string" ? entry.text.trim() : "";
    const tableData = readTableData(entry.tableData);
    // A table carries its content in cells, so it may ship without a text label.
    if (!text && !(kind === "table" && tableData)) continue;

    elements.push({
      kind,
      text,
      color: readColor(entry.color),
      relativeToId: typeof entry.relativeToId === "string" ? entry.relativeToId : undefined,
      textStyle: readTextStyle(entry.textStyle),
      x: readCoordinate(entry.x),
      y: readCoordinate(entry.y),
      width: readSize(entry.width),
      height: readSize(entry.height),
      rows: readClampedNumber(entry.rows, 1, AI_LIMITS.tableRows),
      cols: readClampedNumber(entry.cols, 1, AI_LIMITS.tableCols),
      tableData,
    });
  }

  return elements;
}

function parseConnections(raw: unknown): AiProposedConnection[] {
  if (!Array.isArray(raw)) return [];
  const connections: AiProposedConnection[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    connections.push({
      fromIndex: typeof entry.fromIndex === "number" ? entry.fromIndex : undefined,
      toIndex: typeof entry.toIndex === "number" ? entry.toIndex : undefined,
      fromId: typeof entry.fromId === "string" ? entry.fromId : undefined,
      toId: typeof entry.toId === "string" ? entry.toId : undefined,
      headType: typeof entry.headType === "string" && VALID_HEAD_TYPES.has(entry.headType as ConnectionHeadType)
        ? (entry.headType as ConnectionHeadType)
        : undefined,
      style: typeof entry.style === "string" && VALID_STYLES.has(entry.style as ConnectionStyle)
        ? (entry.style as ConnectionStyle)
        : undefined,
      lineStyle: typeof entry.lineStyle === "string" && VALID_LINE_STYLES.has(entry.lineStyle as ConnectionLineStyle)
        ? (entry.lineStyle as ConnectionLineStyle)
        : undefined,
      pathStyle: typeof entry.pathStyle === "string" && VALID_PATH_STYLES.has(entry.pathStyle as ConnectionPathStyle)
        ? (entry.pathStyle as ConnectionPathStyle)
        : undefined,
      color: readColor(entry.color),
    });
  }

  return connections;
}

function parseConnectionUpdates(raw: unknown): AiProposedConnectionUpdate[] {
  if (!Array.isArray(raw)) return [];
  const updates: AiProposedConnectionUpdate[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const update: AiProposedConnectionUpdate = {
      id: typeof entry.id === "string" ? entry.id : undefined,
      headType: typeof entry.headType === "string" && VALID_HEAD_TYPES.has(entry.headType as ConnectionHeadType)
        ? (entry.headType as ConnectionHeadType)
        : undefined,
      style: typeof entry.style === "string" && VALID_STYLES.has(entry.style as ConnectionStyle)
        ? (entry.style as ConnectionStyle)
        : undefined,
      lineStyle: typeof entry.lineStyle === "string" && VALID_LINE_STYLES.has(entry.lineStyle as ConnectionLineStyle)
        ? (entry.lineStyle as ConnectionLineStyle)
        : undefined,
      pathStyle: typeof entry.pathStyle === "string" && VALID_PATH_STYLES.has(entry.pathStyle as ConnectionPathStyle)
        ? (entry.pathStyle as ConnectionPathStyle)
        : undefined,
      color: readColor(entry.color),
    };

    if (update.headType || update.style || update.lineStyle || update.pathStyle || update.color) {
      updates.push(update);
    }
  }

  return updates;
}

function parseElementUpdates(raw: unknown): AiProposedElementUpdate[] {
  if (!Array.isArray(raw)) return [];
  const updates: AiProposedElementUpdate[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const update: AiProposedElementUpdate = {
      id: typeof entry.id === "string" ? entry.id : undefined,
      color: readColor(entry.color),
      text: typeof entry.text === "string" ? entry.text.trim() : undefined,
      kind: readKind(entry.kind),
      textStyle: readTextStyle(entry.textStyle),
      x: readCoordinate(entry.x),
      y: readCoordinate(entry.y),
      width: readSize(entry.width),
      height: readSize(entry.height),
      tableData: readTableData(entry.tableData),
    };

    const hasChange = update.color !== undefined
      || update.text !== undefined
      || update.kind !== undefined
      || update.textStyle !== undefined
      || update.x !== undefined
      || update.y !== undefined
      || update.width !== undefined
      || update.height !== undefined
      || update.tableData !== undefined;

    if (hasChange) updates.push(update);
  }

  return updates;
}

function parseGroups(raw: unknown): AiProposedGroup[] {
  if (!Array.isArray(raw)) return [];
  const groups: AiProposedGroup[] = [];

  for (const item of raw.slice(0, AI_LIMITS.groups)) {
    const ids = Array.isArray(item)
      ? readIdList(item, "element:", AI_LIMITS.groupMembers)
      : item && typeof item === "object"
        ? readIdList((item as Record<string, unknown>).elementIds, "element:", AI_LIMITS.groupMembers)
        : [];
    // Grouping a single element is a no-op on the board, so it is not a proposal.
    if (ids.length >= 2) groups.push({ elementIds: ids });
  }

  return groups;
}

function parseLayout(raw: unknown): AiProposedLayout | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const entry = raw as Record<string, unknown>;
  const direction = typeof entry.direction === "string" && VALID_LAYOUT_DIRECTIONS.has(entry.direction as MindMapLayoutDirection)
    ? (entry.direction as MindMapLayoutDirection)
    : undefined;
  if (!direction) return undefined;
  const rootId = typeof entry.rootId === "string" && entry.rootId.startsWith("element:") ? entry.rootId : undefined;
  return { direction, rootId };
}

export function validateProposal(raw: unknown): AiProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Record<string, unknown>;

  if (typeof candidate.title !== "string" || typeof candidate.explanation !== "string") {
    return null;
  }

  const elements = parseElements(candidate.elements);
  const connections = parseConnections(candidate.connections);
  const updateConnections = parseConnectionUpdates(candidate.updateConnections);
  const updateElements = parseElementUpdates(candidate.updateElements);
  const deleteElementIds = readIdList(candidate.deleteElementIds, "element:", AI_LIMITS.deletes);
  const deleteConnectionIds = readIdList(candidate.deleteConnectionIds, "connection:", AI_LIMITS.deletes);
  const groupElements = parseGroups(candidate.groupElements);
  const ungroupElementIds = readIdList(candidate.ungroupElementIds, "element:", AI_LIMITS.groupMembers);
  const layout = parseLayout(candidate.layout);

  // Connections between elements that already exist stand on their own; index-only
  // connections need proposed elements to point at.
  const linksExistingElements = connections.some((connection) => connection.fromId && connection.toId);

  const isActionable = elements.length > 0
    || linksExistingElements
    || updateConnections.length > 0
    || updateElements.length > 0
    || deleteElementIds.length > 0
    || deleteConnectionIds.length > 0
    || groupElements.length > 0
    || ungroupElementIds.length > 0
    || Boolean(layout);

  if (!isActionable) return null;

  return {
    id: typeof candidate.id === "string" ? candidate.id : `proposal:${crypto.randomUUID()}`,
    title: candidate.title.slice(0, 120),
    explanation: candidate.explanation.slice(0, 500),
    elements: elements.length > 0 ? elements.slice(0, AI_LIMITS.elements) : undefined,
    connections: connections.length > 0 ? connections.slice(0, AI_LIMITS.connections) : undefined,
    updateConnections: updateConnections.length > 0 ? updateConnections.slice(0, AI_LIMITS.updates) : undefined,
    updateElements: updateElements.length > 0 ? updateElements.slice(0, AI_LIMITS.updates) : undefined,
    deleteElementIds: deleteElementIds.length > 0 ? deleteElementIds : undefined,
    deleteConnectionIds: deleteConnectionIds.length > 0 ? deleteConnectionIds : undefined,
    groupElements: groupElements.length > 0 ? groupElements : undefined,
    ungroupElementIds: ungroupElementIds.length > 0 ? ungroupElementIds : undefined,
    layout,
  };
}

/**
 * Reads complete fenced JSON blocks instead of stopping at the first closing brace.
 * AI mind-map proposals contain nested element/connection objects, so a non-greedy
 * brace regex would silently discard otherwise valid proposals.
 */
function extractFencedJsonBlocks(raw: string): Array<{ fullBlock: string; json: string }> {
  const blocks: Array<{ fullBlock: string; json: string }> = [];
  const expression = /```(?:json|proposal)?\s*([\s\S]*?)\s*```/gi;
  for (const match of raw.matchAll(expression)) {
    const json = match[1]?.trim();
    if (json) blocks.push({ fullBlock: match[0], json });
  }
  return blocks;
}

function proposalFromJson(raw: string): AiProposal | null {
  try {
    return validateProposal(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function parseAiResponse(raw: string): AiResponsePayload {
  for (const block of extractFencedJsonBlocks(raw)) {
    const proposal = proposalFromJson(block.json);
    if (proposal) {
      const cleanText = raw.replace(block.fullBlock, "").trim();
      return { text: cleanText || proposal.explanation, proposal };
    }
  }

  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const proposal = proposalFromJson(trimmed);
    if (proposal) return { text: proposal.explanation, proposal };
  }

  return { text: raw };
}

/** Element kinds the board can render but the AI may not author directly. */
export function isAiElementKind(kind: BoardElement["kind"]): kind is AiElementKind {
  return VALID_KINDS.has(kind as AiElementKind);
}
