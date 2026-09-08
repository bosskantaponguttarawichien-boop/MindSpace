import type { BoardConnectionId, BoardDocument, BoardElement, BoardElementId } from "@/domain/board/board-document";

export type BoardAiContextScope = "entire-board" | "selection";

export type BoardAiElementSummary = {
  id: BoardElementId;
  kind: BoardElement["kind"];
  text?: string;
  color?: string;
  x: number;
  y: number;
};

export type BoardAiConnectionSummary = {
  id: BoardConnectionId;
  fromId: BoardElementId;
  toId: BoardElementId;
  fromText?: string;
  toText?: string;
  headType?: string;
  style?: string;
  lineStyle?: string;
};

export type BoardAiContext = {
  scope: BoardAiContextScope;
  elementCount: number;
  elements: BoardAiElementSummary[];
  connections: BoardAiConnectionSummary[];
};

export function extractBoardContext(
  document: BoardDocument,
  scope: BoardAiContextScope,
  selectedIds: BoardElementId[] = [],
): BoardAiContext {
  const selectedSet = new Set(selectedIds);
  const targetElements = scope === "selection" && selectedSet.size > 0
    ? document.elements.filter((element) => selectedSet.has(element.id))
    : document.elements;

  const targetIdSet = new Set(targetElements.map((element) => element.id));

  const textById = new Map<BoardElementId, string>();
  for (const element of document.elements) {
    if (element.text) textById.set(element.id, element.text);
  }

  const elementsSummary: BoardAiElementSummary[] = targetElements.map((element) => ({
    id: element.id,
    kind: element.kind,
    text: element.text?.trim() || undefined,
    color: element.color,
    x: Math.round(element.x),
    y: Math.round(element.y),
  }));

  const connectionsSummary: BoardAiConnectionSummary[] = document.connections
    .filter((conn) => targetIdSet.has(conn.fromId) && targetIdSet.has(conn.toId))
    .map((conn) => ({
      id: conn.id,
      fromId: conn.fromId,
      toId: conn.toId,
      fromText: textById.get(conn.fromId),
      toText: textById.get(conn.toId),
      headType: conn.headType ?? "arrow",
      style: conn.style ?? "end",
      lineStyle: conn.lineStyle ?? "solid",
    }));

  return {
    scope,
    elementCount: elementsSummary.length,
    elements: elementsSummary,
    connections: connectionsSummary,
  };
}

export function formatContextForPrompt(context: BoardAiContext): string {
  if (context.elements.length === 0) {
    return "The board currently contains no elements or selected items.";
  }

  const lines: string[] = [];
  lines.push(`Board Scope: ${context.scope === "selection" ? "User Selected Nodes" : "Entire Board"}`);
  lines.push(`Total Elements: ${context.elementCount}`);
  lines.push("\nElements:");

  for (const [index, element] of context.elements.entries()) {
    const desc = element.text ? `"${element.text}"` : `[empty ${element.kind}]`;
    lines.push(`${index + 1}. [${element.kind}] (ID: ${element.id}) ${desc}`);
  }

  if (context.connections.length > 0) {
    lines.push("\nConnections:");
    for (const conn of context.connections) {
      const fromLabel = conn.fromText ? `"${conn.fromText}"` : conn.fromId;
      const toLabel = conn.toText ? `"${conn.toText}"` : conn.toId;
      lines.push(`- (ID: ${conn.id}) ${fromLabel} -> ${toLabel} [head: ${conn.headType}, style: ${conn.style}]`);
    }
  }

  return lines.join("\n");
}
