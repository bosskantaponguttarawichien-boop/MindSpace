import type { BoardConnection, BoardDocument, BoardElement, BoardElementId, BoardTextStyle } from "@/domain/board/board-document";

type MindMapResult = { document: BoardDocument; node: BoardElement };
type MindMapNodeKind = Extract<BoardElement["kind"], "text" | "note" | "rectangle" | "ellipse" | "diamond" | "triangle">;

export type MindMapDefaults = {
  kind: MindMapNodeKind;
  color: NonNullable<BoardElement["color"]>;
  textStyle: BoardTextStyle;
  connection: Partial<Pick<BoardConnection, "style" | "lineStyle" | "headType" | "pathStyle" | "color">>;
};

const DEFAULT_MIND_MAP_DEFAULTS: MindMapDefaults = {
  kind: "note",
  color: "violet",
  textStyle: { fontSize: 18, fontWeight: "normal", textAlign: "left" },
  connection: {},
};

function newNode(id: BoardElementId, x: number, y: number, text: string, defaults: MindMapDefaults): BoardElement {
  const dimensions: Record<MindMapNodeKind, { width: number; height: number }> = {
    text: { width: 220, height: 54 }, note: { width: 190, height: 110 }, rectangle: { width: 220, height: 120 },
    ellipse: { width: 200, height: 120 }, diamond: { width: 180, height: 140 }, triangle: { width: 180, height: 140 },
  };
  const { width, height } = dimensions[defaults.kind];
  return { id, kind: defaults.kind, x, y, width, height, text, color: defaults.color, ...(defaults.kind === "note" ? {} : { textStyle: defaults.textStyle }) };
}

export function appendMindMapChild(document: BoardDocument, parentId: BoardElementId, id: BoardElementId, connectionId: `connection:${string}`, text = "New idea", defaults = DEFAULT_MIND_MAP_DEFAULTS): MindMapResult | null {
  const parent = document.elements.find((element) => element.id === parentId);
  if (!parent) return null;
  const siblingCount = document.connections.filter((connection) => connection.fromId === parentId).length;
  const node = newNode(id, parent.x + parent.width + 120, parent.y + siblingCount * 150, text, defaults);
  return {
    node,
    document: { ...document, elements: [...document.elements, node], connections: [...document.connections, { id: connectionId, fromId: parentId, toId: node.id, ...defaults.connection }] },
  };
}

export function appendMindMapSibling(document: BoardDocument, currentId: BoardElementId, id: BoardElementId, connectionId: `connection:${string}`, text = "New idea", defaults = DEFAULT_MIND_MAP_DEFAULTS): MindMapResult | null {
  const current = document.elements.find((element) => element.id === currentId);
  if (!current) return null;
  const parentConnection = document.connections.find((connection) => connection.toId === currentId);
  const node = newNode(id, current.x, current.y + current.height + 48, text, defaults);
  return {
    node,
    document: {
      ...document,
      elements: [...document.elements, node],
      connections: parentConnection ? [...document.connections, { id: connectionId, fromId: parentConnection.fromId, toId: node.id, ...defaults.connection }] : document.connections,
    },
  };
}

export type MindMapLayoutDirection = "horizontal" | "tree";

export function layoutMindMap(document: BoardDocument, preferredRootId?: BoardElementId, direction: MindMapLayoutDirection = "horizontal"): BoardDocument {
  const childrenByParent = new Map<BoardElementId, BoardElementId[]>();
  const childIds = new Set<BoardElementId>();
  for (const connection of document.connections) {
    if (!document.elements.some((element) => element.id === connection.fromId) || !document.elements.some((element) => element.id === connection.toId)) continue;
    childrenByParent.set(connection.fromId, [...(childrenByParent.get(connection.fromId) ?? []), connection.toId]);
    childIds.add(connection.toId);
  }
  const rootIds = preferredRootId && childrenByParent.has(preferredRootId)
    ? [preferredRootId]
    : document.elements.filter((element) => childrenByParent.has(element.id) && !childIds.has(element.id)).map((element) => element.id);
  if (rootIds.length === 0) return document;

  const positions = new Map<BoardElementId, { x: number; y: number }>();
  const visited = new Set<BoardElementId>();
  const elementById = new Map(document.elements.map((element) => [element.id, element]));

  if (direction === "tree") {
    // Root at the top, each depth level a fixed row below, children spread out left-to-right.
    let nextX = Math.min(...rootIds.map((id) => elementById.get(id)?.x ?? 0));

    const place = (id: BoardElementId, y: number): number => {
      if (visited.has(id)) return nextX;
      visited.add(id);
      const element = elementById.get(id);
      if (!element) return nextX;
      const children = (childrenByParent.get(id) ?? []).filter((childId) => !visited.has(childId));
      if (children.length === 0) {
        const x = nextX;
        nextX += Math.max(200, element.width + 60);
        positions.set(id, { x, y });
        return x + element.width / 2;
      }
      const centers = children.map((childId) => place(childId, y + 200));
      const firstCenter = centers[0];
      const lastCenter = centers.at(-1);
      if (firstCenter === undefined || lastCenter === undefined) return nextX;
      const center = (firstCenter + lastCenter) / 2;
      positions.set(id, { x: center - element.width / 2, y });
      return center;
    };

    for (const rootId of rootIds) {
      const root = elementById.get(rootId);
      if (!root) continue;
      place(rootId, root.y);
      nextX += 80;
    }
  } else {
    // Root on the left, each depth level a fixed column to the right, children stacked top-to-bottom.
    let nextY = Math.min(...rootIds.map((id) => elementById.get(id)?.y ?? 0));

    const place = (id: BoardElementId, x: number): number => {
      if (visited.has(id)) return nextY;
      visited.add(id);
      const element = elementById.get(id);
      if (!element) return nextY;
      const children = (childrenByParent.get(id) ?? []).filter((childId) => !visited.has(childId));
      if (children.length === 0) {
        const y = nextY;
        nextY += Math.max(150, element.height + 48);
        positions.set(id, { x, y });
        return y + element.height / 2;
      }
      const centers = children.map((childId) => place(childId, x + 300));
      const firstCenter = centers[0];
      const lastCenter = centers.at(-1);
      if (firstCenter === undefined || lastCenter === undefined) return nextY;
      const center = (firstCenter + lastCenter) / 2;
      positions.set(id, { x, y: center - element.height / 2 });
      return center;
    };

    for (const rootId of rootIds) {
      const root = elementById.get(rootId);
      if (!root) continue;
      place(rootId, root.x);
      nextY += 80;
    }
  }

  const nextElements = document.elements.map((element) => positions.has(element.id) ? { ...element, ...positions.get(element.id)! } : element);
  // A tree layout only reads as a tree with right-angle branches, so the connections it just arranged switch to the elbow connector shape.
  const nextConnections = direction === "tree"
    ? document.connections.map((connection) => visited.has(connection.fromId) && visited.has(connection.toId) ? { ...connection, pathStyle: "elbow" as const } : connection)
    : document.connections;
  return { ...document, elements: nextElements, connections: nextConnections };
}
