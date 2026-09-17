import { textStyleFor, type BoardConnectionId, type BoardDocument, type BoardElement, type BoardElementId } from "@/domain/board/board-document";
import {
  deriveRelationships,
  type BoardAiClusterSummary,
  type BoardAiGroupSummary,
  type BoardAiOutlineNode,
} from "@/domain/ai/board-relationships";

export type {
  BoardAiClusterSummary,
  BoardAiGroupSummary,
  BoardAiOutlineNode,
  BoardAiOutlineRelation,
} from "@/domain/ai/board-relationships";

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

export type BoardAiContext = {
  scope: BoardAiContextScope;
  elementCount: number;
  elements: BoardAiElementSummary[];
  connections: BoardAiConnectionSummary[];
  groups: BoardAiGroupSummary[];
  clusters: BoardAiClusterSummary[];
  outline: BoardAiOutlineNode[];
  /** Element id -> the frame element it sits inside. */
  containerByElementId: Map<BoardElementId, BoardElementId>;
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

  const relationships = deriveRelationships(elementsSummary, connectionsSummary);

  return {
    scope,
    elementCount: elementsSummary.length,
    elements: elementsSummary,
    connections: connectionsSummary,
    groups: relationships.groups,
    clusters: relationships.clusters,
    outline: relationships.outline,
    containerByElementId: relationships.containerByElementId,
  };
}

function labelFor(element: BoardAiElementSummary): string {
  return element.text ?? `[empty ${element.kind}]`;
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

function describeMembers(context: BoardAiContext, elementIds: BoardElementId[]): string {
  return elementIds
    .map((elementId) => context.elements.find((element) => element.id === elementId))
    .filter((element): element is BoardAiElementSummary => Boolean(element))
    .map((element) => `${labelFor(element)} (${element.id})`)
    .join(", ");
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
      lines.push(`- ${group.name}: ${describeMembers(context, group.elementIds)}`);
    }
  }

  if (context.clusters.length > 0) {
    lines.push("\nNearby clusters (close together on the canvas, so probably related; this is a hint, not a stated link):");
    for (const cluster of context.clusters) {
      lines.push(`- ${cluster.name}: ${describeMembers(context, cluster.elementIds)}`);
    }
  }

  if (context.outline.length > 0) {
    const outlineIds = new Set(context.outline.map((node) => node.id));
    lines.push("\nRelationship outline (root first, indented by depth; indentation means a connector, \"inside\" means it sits inside that shape, \"same group\"/\"nearby\" mean grouping or closeness links it, not a connector):");
    for (const node of context.outline) {
      const tags = [node.groupName, node.clusterName, node.relation].filter(Boolean);
      const suffix = tags.length > 0 ? ` [${tags.join(", ")}]` : "";
      lines.push(`${"  ".repeat(node.depth)}- ${node.label}${suffix}`);
    }
    const standalone = context.elements.filter((element) => !outlineIds.has(element.id));
    if (standalone.length > 0) {
      lines.push(`Standalone elements (no connector, group, frame, or nearby element): ${standalone.map(labelFor).join(", ")}`);
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
