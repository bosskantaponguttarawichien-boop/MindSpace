import { textStyleFor, type BoardConnectionId, type BoardDocument, type BoardElement, type BoardElementId } from "@/domain/board/board-document";

export type BoardAiContextScope = "entire-board" | "selection";

export type BoardAiElementSummary = {
  id: BoardElementId;
  kind: BoardElement["kind"];
  text?: string;
  color?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: string;
  textAlign: string;
  verticalAlign: string;
  groupId?: string;
  rows?: number;
  cols?: number;
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
  pathStyle?: string;
  color?: string;
};

/** One node of the connection tree, flattened in reading order with its depth. */
export type BoardAiOutlineNode = {
  id: BoardElementId;
  label: string;
  depth: number;
};

export type BoardAiContext = {
  scope: BoardAiContextScope;
  elementCount: number;
  elements: BoardAiElementSummary[];
  connections: BoardAiConnectionSummary[];
  outline: BoardAiOutlineNode[];
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

  const elementsSummary: BoardAiElementSummary[] = targetElements.map((element) => {
    const textStyle = textStyleFor(element);
    return {
      id: element.id,
      kind: element.kind,
      text: element.text?.trim() || undefined,
      color: element.color,
      x: Math.round(element.x),
      y: Math.round(element.y),
      width: Math.round(element.width),
      height: Math.round(element.height),
      fontSize: textStyle.fontSize,
      fontWeight: textStyle.fontWeight,
      textAlign: textStyle.textAlign,
      verticalAlign: textStyle.verticalAlign ?? "top",
      groupId: element.groupId,
      rows: element.kind === "table" ? element.rows ?? 3 : undefined,
      cols: element.kind === "table" ? element.cols ?? 3 : undefined,
    };
  });

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
      pathStyle: conn.pathStyle ?? "straight",
      color: conn.color,
    }));

  return {
    scope,
    elementCount: elementsSummary.length,
    elements: elementsSummary,
    connections: connectionsSummary,
    outline: buildOutline(elementsSummary, connectionsSummary),
  };
}

function labelFor(element: BoardAiElementSummary): string {
  return element.text ?? `[empty ${element.kind}]`;
}

/**
 * Walks the connections as a tree so a summary can follow the map's own branches
 * instead of a flat element list. Cycles and nodes whose parent sits outside the
 * scope are still emitted once, at the top level.
 */
function buildOutline(
  elements: BoardAiElementSummary[],
  connections: BoardAiConnectionSummary[],
): BoardAiOutlineNode[] {
  const elementById = new Map(elements.map((element) => [element.id, element]));
  const childIds = new Map<BoardElementId, BoardElementId[]>();
  const linkedIds = new Set<BoardElementId>();
  const hasParent = new Set<BoardElementId>();

  for (const connection of connections) {
    if (!elementById.has(connection.fromId) || !elementById.has(connection.toId)) continue;
    childIds.set(connection.fromId, [...(childIds.get(connection.fromId) ?? []), connection.toId]);
    hasParent.add(connection.toId);
    linkedIds.add(connection.fromId);
    linkedIds.add(connection.toId);
  }

  const outline: BoardAiOutlineNode[] = [];
  const visited = new Set<BoardElementId>();

  const walk = (id: BoardElementId, depth: number) => {
    const element = elementById.get(id);
    if (!element || visited.has(id)) return;
    visited.add(id);
    outline.push({ id, label: labelFor(element), depth });
    for (const childId of childIds.get(id) ?? []) walk(childId, depth + 1);
  };

  for (const element of elements) {
    if (childIds.has(element.id) && !hasParent.has(element.id)) walk(element.id, 0);
  }
  for (const element of elements) {
    if (linkedIds.has(element.id)) walk(element.id, 0);
  }

  return outline;
}

/** Describes every board attribute the AI is allowed to change, so edits can target real state. */
function describeElement(element: BoardAiElementSummary): string {
  const attributes = [
    `pos ${element.x},${element.y}`,
    `size ${element.width}x${element.height}`,
    `color ${element.color ?? "default"}`,
    `text ${element.fontSize}/${element.fontWeight}/${element.textAlign}/${element.verticalAlign}`,
  ];
  if (element.rows && element.cols) attributes.push(`table ${element.rows}x${element.cols}`);
  if (element.groupId) attributes.push(`group ${element.groupId}`);
  return attributes.join(", ");
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
    lines.push(`${index + 1}. [${element.kind}] (ID: ${element.id}) ${desc} {${describeElement(element)}}`);
  }

  if (context.outline.length > 0) {
    const outlineIds = new Set(context.outline.map((node) => node.id));
    lines.push("\nMind map outline (root first, indented by depth):");
    for (const node of context.outline) {
      lines.push(`${"  ".repeat(node.depth)}- ${node.label}`);
    }
    const standalone = context.elements.filter((element) => !outlineIds.has(element.id));
    if (standalone.length > 0) {
      lines.push(`Standalone elements (not connected): ${standalone.map(labelFor).join(", ")}`);
    }
  }

  if (context.connections.length > 0) {
    lines.push("\nConnections:");
    for (const conn of context.connections) {
      const fromLabel = conn.fromText ? `"${conn.fromText}"` : conn.fromId;
      const toLabel = conn.toText ? `"${conn.toText}"` : conn.toId;
      const color = conn.color ? `, color: ${conn.color}` : "";
      lines.push(`- (ID: ${conn.id}) ${fromLabel} -> ${toLabel} [shape: ${conn.pathStyle}, head: ${conn.headType}, style: ${conn.style}, line: ${conn.lineStyle}${color}]`);
    }
  }

  return lines.join("\n");
}
