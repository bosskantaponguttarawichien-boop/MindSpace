import type { BoardConnection, BoardDocument, BoardElement, BoardElementId, BoardTextStyle } from "@/domain/board/board-document";

type MindMapResult = { document: BoardDocument; node: BoardElement };
type MindMapNodeKind = Extract<BoardElement["kind"], "text" | "note" | "rectangle" | "ellipse" | "diamond" | "triangle">;

export type MindMapDefaults = {
  kind: MindMapNodeKind;
  color: NonNullable<BoardElement["color"]>;
  textStyle: BoardTextStyle;
  connection: Partial<Pick<BoardConnection, "style" | "lineStyle" | "headType" | "color">>;
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

export function layoutMindMap(document: BoardDocument, preferredRootId?: BoardElementId): BoardDocument {
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
  let nextY = Math.min(...rootIds.map((id) => elementById.get(id)?.y ?? 0));

  function place(id: BoardElementId, depth: number, x: number): number {
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
    const centers = children.map((childId) => place(childId, depth + 1, x + 300));
    const firstCenter = centers[0];
    const lastCenter = centers.at(-1);
    if (firstCenter === undefined || lastCenter === undefined) return nextY;
    const center = (firstCenter + lastCenter) / 2;
    positions.set(id, { x, y: center - element.height / 2 });
    return center;
  }

  for (const rootId of rootIds) {
    const root = elementById.get(rootId);
    if (!root) continue;
    place(rootId, 0, root.x);
    nextY += 80;
  }
  return { ...document, elements: document.elements.map((element) => positions.has(element.id) ? { ...element, ...positions.get(element.id)! } : element) };
}
