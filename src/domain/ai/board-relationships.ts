import type { BoardElement, BoardElementId } from "@/domain/board/board-document";

/** Shapes people use as frames or sections; content dropped inside one belongs to it. */
const FRAME_KINDS = new Set<BoardElement["kind"]>(["rectangle", "ellipse", "diamond", "triangle"]);

/** Slack (board px) allowed when deciding an element sits inside a frame. */
const CONTAINMENT_SLACK = 4;

/** Edge gap (board px) under which two otherwise unrelated elements read as one cluster. */
export const NEARBY_GAP = 64;

export type RelationshipElement = {
  id: BoardElementId;
  kind: BoardElement["kind"];
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  groupId?: string;
};

export type RelationshipLink = {
  fromId: BoardElementId;
  toId: BoardElementId;
};

/** A set of elements the user grouped, which belong together even with no connector between them. */
export type BoardAiGroupSummary = {
  id: string;
  /** Short prompt-facing name (G1, G2, ...); the board itself only stores the raw id. */
  name: string;
  elementIds: BoardElementId[];
};

/** Elements sitting close together with no connector, group, or frame relating them. */
export type BoardAiClusterSummary = {
  name: string;
  elementIds: BoardElementId[];
};

/** Why a node sits where it does, when a connector is not the reason. */
export type BoardAiOutlineRelation = "same group" | "inside" | "nearby";

/** One node of the relationship tree, flattened in reading order with its depth. */
export type BoardAiOutlineNode = {
  id: BoardElementId;
  label: string;
  depth: number;
  groupName?: string;
  clusterName?: string;
  relation?: BoardAiOutlineRelation;
};

export type BoardRelationships = {
  groups: BoardAiGroupSummary[];
  clusters: BoardAiClusterSummary[];
  /** Element id -> the frame element it sits inside. */
  containerByElementId: Map<BoardElementId, BoardElementId>;
  outline: BoardAiOutlineNode[];
};

function labelFor(element: RelationshipElement): string {
  return element.text?.trim() || `[empty ${element.kind}]`;
}

function area(element: RelationshipElement): number {
  return Math.max(1, element.width) * Math.max(1, element.height);
}

function contains(outer: RelationshipElement, inner: RelationshipElement): boolean {
  return inner.x >= outer.x - CONTAINMENT_SLACK
    && inner.y >= outer.y - CONTAINMENT_SLACK
    && inner.x + inner.width <= outer.x + outer.width + CONTAINMENT_SLACK
    && inner.y + inner.height <= outer.y + outer.height + CONTAINMENT_SLACK;
}

/** Edge-to-edge gap; 0 when the two boxes touch or overlap. */
function gapBetween(first: RelationshipElement, second: RelationshipElement): number {
  const horizontal = Math.max(0, first.x - (second.x + second.width), second.x - (first.x + first.width));
  const vertical = Math.max(0, first.y - (second.y + second.height), second.y - (first.y + first.height));
  return Math.max(horizontal, vertical);
}

/** Collects grouped elements in board order. A group needs at least two members in scope to mean anything. */
export function buildGroups(elements: RelationshipElement[]): BoardAiGroupSummary[] {
  const membersByGroupId = new Map<string, BoardElementId[]>();
  for (const element of elements) {
    if (!element.groupId) continue;
    membersByGroupId.set(element.groupId, [...(membersByGroupId.get(element.groupId) ?? []), element.id]);
  }

  return [...membersByGroupId.entries()]
    .filter(([, elementIds]) => elementIds.length >= 2)
    .map(([id, elementIds], index) => ({ id, name: `G${index + 1}`, elementIds }));
}

/** Maps each element to the smallest frame that fully holds it, so nested frames keep the closest parent. */
function buildContainers(elements: RelationshipElement[]): Map<BoardElementId, BoardElementId> {
  const frames = elements.filter((element) => FRAME_KINDS.has(element.kind));
  const containerByElementId = new Map<BoardElementId, BoardElementId>();
  if (frames.length === 0) return containerByElementId;

  for (const element of elements) {
    let best: RelationshipElement | undefined;
    for (const frame of frames) {
      if (frame.id === element.id) continue;
      // A strictly larger frame keeps the relation one-directional for equal or overlapping boxes.
      if (area(frame) <= area(element)) continue;
      if (!contains(frame, element)) continue;
      if (!best || area(frame) < area(best)) best = frame;
    }
    if (best) containerByElementId.set(element.id, best.id);
  }

  return containerByElementId;
}

/** Groups elements that only relate by sitting close together. Proximity is a hint, so related elements are excluded. */
function buildClusters(elements: RelationshipElement[], related: Set<BoardElementId>): BoardAiClusterSummary[] {
  const candidates = elements.filter((element) => !related.has(element.id));
  if (candidates.length < 2) return [];

  const parent = new Map<BoardElementId, BoardElementId>(candidates.map((element) => [element.id, element.id]));
  const find = (id: BoardElementId): BoardElementId => {
    let current = id;
    while (parent.get(current) !== current) current = parent.get(current) as BoardElementId;
    return current;
  };

  for (const [index, first] of candidates.entries()) {
    for (const second of candidates.slice(index + 1)) {
      if (gapBetween(first, second) > NEARBY_GAP) continue;
      parent.set(find(first.id), find(second.id));
    }
  }

  const membersByRoot = new Map<BoardElementId, BoardElementId[]>();
  for (const candidate of candidates) {
    const root = find(candidate.id);
    membersByRoot.set(root, [...(membersByRoot.get(root) ?? []), candidate.id]);
  }

  return [...membersByRoot.values()]
    .filter((elementIds) => elementIds.length >= 2)
    .map((elementIds, index) => ({ name: `P${index + 1}`, elementIds }));
}

/**
 * Reads the board as one relationship tree so summaries and edits follow the real
 * topics instead of a flat element list. Connectors give parent/child structure;
 * grouping keeps grouped elements on one topic; a frame owns what sits inside it;
 * proximity clusters what is otherwise unrelated. Every element is emitted at most
 * once, and cycles or parents outside the scope surface at the top level.
 */
export function deriveRelationships(elements: RelationshipElement[], links: RelationshipLink[]): BoardRelationships {
  const elementById = new Map(elements.map((element) => [element.id, element]));
  const groups = buildGroups(elements);
  const containerByElementId = buildContainers(elements);

  const childIds = new Map<BoardElementId, BoardElementId[]>();
  const linkedIds = new Set<BoardElementId>();
  const hasParent = new Set<BoardElementId>();
  for (const link of links) {
    if (!elementById.has(link.fromId) || !elementById.has(link.toId)) continue;
    childIds.set(link.fromId, [...(childIds.get(link.fromId) ?? []), link.toId]);
    hasParent.add(link.toId);
    linkedIds.add(link.fromId);
    linkedIds.add(link.toId);
  }

  const groupByElementId = new Map<BoardElementId, BoardAiGroupSummary>();
  for (const group of groups) {
    for (const elementId of group.elementIds) groupByElementId.set(elementId, group);
  }

  // Explicit relations win over geometry: a connector states where a node belongs, and a
  // group anchored in the connector tree already carries its members, so a frame only
  // adopts content nothing else places.
  const framedChildIds = new Map<BoardElementId, BoardElementId[]>();
  for (const [elementId, containerId] of containerByElementId) {
    if (hasParent.has(elementId)) continue;
    const group = groupByElementId.get(elementId);
    const groupIsAnchored = group?.elementIds.some((id) => hasParent.has(id) || childIds.has(id)) ?? false;
    if (groupIsAnchored) continue;
    framedChildIds.set(containerId, [...(framedChildIds.get(containerId) ?? []), elementId]);
  }

  // A frame that holds content is related even when something else placed that content.
  const containerIds = new Set<BoardElementId>(containerByElementId.values());
  const related = new Set<BoardElementId>([
    ...linkedIds,
    ...groupByElementId.keys(),
    ...containerByElementId.keys(),
    ...containerIds,
  ]);
  const clusters = buildClusters(elements, related);
  const clusterByElementId = new Map<BoardElementId, BoardAiClusterSummary>();
  for (const cluster of clusters) {
    for (const elementId of cluster.elementIds) clusterByElementId.set(elementId, cluster);
  }

  const outline: BoardAiOutlineNode[] = [];
  const visited = new Set<BoardElementId>();

  const walk = (id: BoardElementId, depth: number, relation?: BoardAiOutlineRelation) => {
    const element = elementById.get(id);
    if (!element || visited.has(id)) return;
    visited.add(id);

    const group = groupByElementId.get(id);
    const cluster = clusterByElementId.get(id);
    outline.push({
      id,
      label: labelFor(element),
      depth,
      ...(group ? { groupName: group.name } : {}),
      ...(cluster ? { clusterName: cluster.name } : {}),
      ...(relation ? { relation } : {}),
    });

    // Grouped siblings sit on the same topic unless a connector already places them.
    for (const siblingId of group?.elementIds ?? []) {
      if (siblingId !== id && !hasParent.has(siblingId)) walk(siblingId, depth, "same group");
    }
    for (const framedId of framedChildIds.get(id) ?? []) {
      walk(framedId, depth + 1, "inside");
    }
    for (const childId of childIds.get(id) ?? []) {
      walk(childId, depth + 1);
    }
    for (const nearbyId of cluster?.elementIds ?? []) {
      if (nearbyId !== id) walk(nearbyId, depth, "nearby");
    }
  };

  for (const element of elements) {
    if (childIds.has(element.id) && !hasParent.has(element.id)) walk(element.id, 0);
  }
  for (const element of elements) {
    if (linkedIds.has(element.id)) walk(element.id, 0);
  }
  for (const element of elements) {
    if (containerIds.has(element.id) && !containerByElementId.has(element.id)) walk(element.id, 0);
  }
  for (const element of elements) {
    if (containerIds.has(element.id) || containerByElementId.has(element.id)) walk(element.id, 0);
  }
  for (const group of groups) {
    for (const elementId of group.elementIds) walk(elementId, 0);
  }
  for (const cluster of clusters) {
    for (const elementId of cluster.elementIds) walk(elementId, 0);
  }

  return { groups, clusters, containerByElementId, outline };
}
