import type {
  BoardColor,
  BoardElement,
  ConnectionHeadType,
  ConnectionLineStyle,
  ConnectionStyle,
} from "@/domain/board/board-document";

export type AiActionType = "summarize" | "explain" | "expand" | "check" | "improve" | "mindMap";

export type AiProposedElement = {
  kind: "note" | "text" | "rectangle" | "ellipse" | "diamond" | "triangle";
  text: string;
  color?: BoardColor;
  relativeToId?: string;
};

export type AiProposedConnection = {
  fromIndex?: number;
  toIndex?: number;
  fromId?: string;
  toId?: string;
  style?: ConnectionStyle;
  lineStyle?: ConnectionLineStyle;
  headType?: ConnectionHeadType;
};

export type AiProposedConnectionUpdate = {
  id?: string;
  headType?: ConnectionHeadType;
  style?: ConnectionStyle;
  lineStyle?: ConnectionLineStyle;
  color?: BoardColor;
};

export type AiProposedElementUpdate = {
  id?: string;
  color?: BoardColor;
  text?: string;
  kind?: BoardElement["kind"];
};

export type AiProposal = {
  id: string;
  title: string;
  explanation: string;
  elements?: AiProposedElement[];
  connections?: AiProposedConnection[];
  updateConnections?: AiProposedConnectionUpdate[];
  updateElements?: AiProposedElementUpdate[];
};

export type AiResponsePayload = {
  text: string;
  proposal?: AiProposal;
};

const VALID_KINDS = new Set<BoardElement["kind"]>(["note", "text", "rectangle", "ellipse", "diamond", "triangle"]);
const VALID_COLORS = new Set<BoardColor>(["violet", "yellow", "blue", "green", "grey", "red", "orange", "pink", "teal", "indigo"]);
const VALID_HEAD_TYPES = new Set<ConnectionHeadType>(["arrow", "triangle", "circle", "diamond"]);
const VALID_STYLES = new Set<ConnectionStyle>(["end", "both", "start", "none"]);
const VALID_LINE_STYLES = new Set<ConnectionLineStyle>(["solid", "dashed", "dotted"]);

export function validateProposal(raw: unknown): AiProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Record<string, unknown>;

  if (typeof candidate.title !== "string" || typeof candidate.explanation !== "string") {
    return null;
  }

  // Parse elements to add
  const validElements: AiProposedElement[] = [];
  if (Array.isArray(candidate.elements)) {
    for (const item of candidate.elements) {
      if (!item || typeof item !== "object") continue;
      const elem = item as Record<string, unknown>;
      const kind = typeof elem.kind === "string" && VALID_KINDS.has(elem.kind as BoardElement["kind"])
        ? (elem.kind as AiProposedElement["kind"])
        : "note";
      const text = typeof elem.text === "string" ? elem.text.trim() : "";
      if (!text) continue;

      const color = typeof elem.color === "string" && VALID_COLORS.has(elem.color as BoardColor)
        ? (elem.color as BoardColor)
        : undefined;

      const relativeToId = typeof elem.relativeToId === "string" ? elem.relativeToId : undefined;

      validElements.push({ kind, text, color, relativeToId });
    }
  }

  // Parse connections to add
  const validConnections: AiProposedConnection[] = [];
  if (Array.isArray(candidate.connections)) {
    for (const item of candidate.connections) {
      if (!item || typeof item !== "object") continue;
      const conn = item as Record<string, unknown>;
      const fromIndex = typeof conn.fromIndex === "number" ? conn.fromIndex : undefined;
      const toIndex = typeof conn.toIndex === "number" ? conn.toIndex : undefined;
      const fromId = typeof conn.fromId === "string" ? conn.fromId : undefined;
      const toId = typeof conn.toId === "string" ? conn.toId : undefined;
      const headType = typeof conn.headType === "string" && VALID_HEAD_TYPES.has(conn.headType as ConnectionHeadType)
        ? (conn.headType as ConnectionHeadType)
        : undefined;
      const style = typeof conn.style === "string" && VALID_STYLES.has(conn.style as ConnectionStyle)
        ? (conn.style as ConnectionStyle)
        : undefined;
      const lineStyle = typeof conn.lineStyle === "string" && VALID_LINE_STYLES.has(conn.lineStyle as ConnectionLineStyle)
        ? (conn.lineStyle as ConnectionLineStyle)
        : undefined;
      validConnections.push({ fromIndex, toIndex, fromId, toId, headType, style, lineStyle });
    }
  }

  // Parse connection updates (e.g. change headType to circle, change color/style)
  const validUpdateConnections: AiProposedConnectionUpdate[] = [];
  if (Array.isArray(candidate.updateConnections)) {
    for (const item of candidate.updateConnections) {
      if (!item || typeof item !== "object") continue;
      const update = item as Record<string, unknown>;
      const id = typeof update.id === "string" ? update.id : undefined;
      const headType = typeof update.headType === "string" && VALID_HEAD_TYPES.has(update.headType as ConnectionHeadType)
        ? (update.headType as ConnectionHeadType)
        : undefined;
      const style = typeof update.style === "string" && VALID_STYLES.has(update.style as ConnectionStyle)
        ? (update.style as ConnectionStyle)
        : undefined;
      const lineStyle = typeof update.lineStyle === "string" && VALID_LINE_STYLES.has(update.lineStyle as ConnectionLineStyle)
        ? (update.lineStyle as ConnectionLineStyle)
        : undefined;
      const color = typeof update.color === "string" && VALID_COLORS.has(update.color as BoardColor)
        ? (update.color as BoardColor)
        : undefined;

      if (headType || style || lineStyle || color) {
        validUpdateConnections.push({ id, headType, style, lineStyle, color });
      }
    }
  }

  // Parse element updates (e.g. change color, change kind)
  const validUpdateElements: AiProposedElementUpdate[] = [];
  if (Array.isArray(candidate.updateElements)) {
    for (const item of candidate.updateElements) {
      if (!item || typeof item !== "object") continue;
      const update = item as Record<string, unknown>;
      const id = typeof update.id === "string" ? update.id : undefined;
      const color = typeof update.color === "string" && VALID_COLORS.has(update.color as BoardColor)
        ? (update.color as BoardColor)
        : undefined;
      const text = typeof update.text === "string" ? update.text.trim() : undefined;
      const kind = typeof update.kind === "string" && VALID_KINDS.has(update.kind as BoardElement["kind"])
        ? (update.kind as BoardElement["kind"])
        : undefined;

      if (color || text || kind) {
        validUpdateElements.push({ id, color, text, kind });
      }
    }
  }

  // Must have at least one actionable item: new elements, connection updates, or element updates
  if (validElements.length === 0 && validUpdateConnections.length === 0 && validUpdateElements.length === 0) {
    return null;
  }

  return {
    id: typeof candidate.id === "string" ? candidate.id : `proposal:${crypto.randomUUID()}`,
    title: candidate.title.slice(0, 120),
    explanation: candidate.explanation.slice(0, 500),
    elements: validElements.length > 0 ? validElements.slice(0, 20) : undefined,
    connections: validConnections.length > 0 ? validConnections.slice(0, 30) : undefined,
    updateConnections: validUpdateConnections.length > 0 ? validUpdateConnections.slice(0, 30) : undefined,
    updateElements: validUpdateElements.length > 0 ? validUpdateElements.slice(0, 30) : undefined,
  };
}

export function parseAiResponse(raw: string): AiResponsePayload {
  const proposalJsonRegex = /```(?:json|proposal)?\s*(\{[\s\S]*?"title"\s*:[\s\S]*?\})\s*```/;
  const match = raw.match(proposalJsonRegex);

  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      const proposal = validateProposal(parsed);
      if (proposal) {
        const cleanText = raw.replace(match[0], "").trim();
        return {
          text: cleanText || proposal.explanation,
          proposal,
        };
      }
    } catch {
      // JSON parse failed, treat entire response as conversational text
    }
  }

  // Try parsing the entire raw string if it starts with { and contains "title"
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}") && trimmed.includes('"title"')) {
    try {
      const parsed = JSON.parse(trimmed);
      const proposal = validateProposal(parsed);
      if (proposal) {
        return {
          text: proposal.explanation,
          proposal,
        };
      }
    } catch {
      // fallback
    }
  }

  return { text: raw };
}
