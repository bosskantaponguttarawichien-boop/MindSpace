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

/** A set of elements the user grouped, which belong together even with no connector between them. */
export type BoardAiGroupSummary = {
  id: string;
  /** Short prompt-facing name (G1, G2, ...); the board itself only stores the raw id. */
  name: string;
  elementIds: BoardElementId[];
};

/** One node of the relationship tree, flattened in reading order with its depth. */
export type BoardAiOutlineNode = {
  id: BoardElementId;
  label: string;
  depth: number;
  groupName?: string;
  /** True when grouping, not a connector, placed this node here. */
  viaGroup?: boolean;
};

export type BoardAiContext = {
  scope: BoardAiContextScope;
  elementCount: number;
  elements: BoardAiElementSummary[];
  connections: BoardAiConnectionSummary[];
  groups: BoardAiGroupSummary[];
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

  const groups = buildGroups(elementsSummary);

  return {
    scope,
    elementCount: elementsSummary.length,
    elements: elementsSummary,
    connections: connectionsSummary,
    groups,
    outline: buildOutline(elementsSummary, connectionsSummary, groups),
  };
}

function labelFor(element: BoardAiElementSummary): string {
  return element.text ?? `[empty ${element.kind}]`;
}

/** Collects grouped elements in board order. A group needs at least two members in scope to mean anything. */
function buildGroups(elements: BoardAiElementSummary[]): BoardAiGroupSummary[] {
  const membersByGroupId = new Map<string, BoardElementId[]>();
  for (const element of elements) {
    if (!element.groupId) continue;
    membersByGroupId.set(element.groupId, [...(membersByGroupId.get(element.groupId) ?? []), element.id]);
  }

  return [...membersByGroupId.entries()]
    .filter(([, elementIds]) => elementIds.length >= 2)
    .map(([id, elementIds], index) => ({ id, name: `G${index + 1}`, elementIds }));
}

/**
 * Walks the board as one relationship tree so a summary can follow the real topics
 * instead of a flat element list. Connectors give parent/child; grouping keeps
 * grouped elements on the same topic even when no connector links them. Cycles and
 * nodes whose parent sits outside the scope are still emitted once, at the top level.
 */
function buildOutline(
  elements: BoardAiElementSummary[],
  connections: BoardAiConnectionSummary[],
  groups: BoardAiGroupSummary[],
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

  const groupByElementId = new Map<BoardElementId, BoardAiGroupSummary>();
  for (const group of groups) {
    for (const elementId of group.elementIds) groupByElementId.set(elementId, group);
  }

  const outline: BoardAiOutlineNode[] = [];
  const visited = new Set<BoardElementId>();

  const walk = (id: BoardElementId, depth: number, viaGroup = false) => {
    const element = elementById.get(id);
    if (!element || visited.has(id)) return;
    visited.add(id);
    const group = groupByElementId.get(id);
    outline.push({ id, label: labelFor(element), depth, groupName: group?.name, ...(viaGroup ? { viaGroup } : {}) });

    // Grouped siblings sit on the same topic, so they join this node unless a connector already places them.
    for (const siblingId of group?.elementIds ?? []) {
      if (siblingId !== id && !hasParent.has(siblingId)) walk(siblingId, depth, true);
    }

    for (const childId of childIds.get(id) ?? []) walk(childId, depth + 1);
  };

  for (const element of elements) {
    if (childIds.has(element.id) && !hasParent.has(element.id)) walk(element.id, 0);
  }
  for (const element of elements) {
    if (linkedIds.has(element.id)) walk(element.id, 0);
  }
  // A group whose members are all unconnected is still one topic: emit it as its own cluster.
  for (const group of groups) {
    for (const elementId of group.elementIds) walk(elementId, 0);
  }

  return outline;
}

/** Describes every board attribute the AI is allowed to change, so edits can target real state. */
function describeElement(element: BoardAiElementSummary, groupName?: string): string {
  const attributes = [
    `pos ${element.x},${element.y}`,
    `size ${element.width}x${element.height}`,
    `color ${element.color ?? "default"}`,
    `text ${element.fontSize}/${element.fontWeight}/${element.textAlign}/${element.verticalAlign}`,
  ];
  if (element.rows && element.cols) attributes.push(`table ${element.rows}x${element.cols}`);
  if (groupName) attributes.push(`group ${groupName}`);
  return attributes.join(", ");
}

export function formatContextForPrompt(context: BoardAiContext): string {
  if (context.elements.length === 0) {
    return "The board currently contains no elements or selected items.";
  }

  const groupNameByElementId = new Map<BoardElementId, string>();
  for (const group of context.groups) {
    for (const elementId of group.elementIds) groupNameByElementId.set(elementId, group.name);
  }

  const lines: string[] = [];
  lines.push(`Board Scope: ${context.scope === "selection" ? "User Selected Nodes" : "Entire Board"}`);
  lines.push(`Total Elements: ${context.elementCount}`);
  lines.push("\nElements:");

  for (const [index, element] of context.elements.entries()) {
    const desc = element.text ? `"${element.text}"` : `[empty ${element.kind}]`;
    lines.push(`${index + 1}. [${element.kind}] (ID: ${element.id}) ${desc} {${describeElement(element, groupNameByElementId.get(element.id))}}`);
  }

  if (context.groups.length > 0) {
    lines.push("\nGroups (grouped elements are one topic even with no connector between them):");
    for (const group of context.groups) {
      const members = group.elementIds
        .map((elementId) => context.elements.find((element) => element.id === elementId))
        .filter((element): element is BoardAiElementSummary => Boolean(element))
        .map((element) => `${labelFor(element)} (${element.id})`);
      lines.push(`- ${group.name}: ${members.join(", ")}`);
    }
  }

  if (context.outline.length > 0) {
    const outlineIds = new Set(context.outline.map((node) => node.id));
    lines.push("\nRelationship outline (root first, indented by depth; [G1] marks a group, \"same group\" means grouping links it, not a connector):");
    for (const node of context.outline) {
      const tags = [node.groupName, node.viaGroup ? "same group" : undefined].filter(Boolean);
      const suffix = tags.length > 0 ? ` [${tags.join(", ")}]` : "";
      lines.push(`${"  ".repeat(node.depth)}- ${node.label}${suffix}`);
    }
    const standalone = context.elements.filter((element) => !outlineIds.has(element.id));
    if (standalone.length > 0) {
      lines.push(`Standalone elements (no connector and no group): ${standalone.map(labelFor).join(", ")}`);
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
