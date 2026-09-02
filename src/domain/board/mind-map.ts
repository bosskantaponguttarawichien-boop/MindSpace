import type { BoardDocument, BoardElement, BoardElementId } from "@/domain/board/board-document";

type MindMapResult = { document: BoardDocument; node: BoardElement };

function newNode(id: BoardElementId, x: number, y: number, text: string): BoardElement {
  return { id, kind: "note", x, y, width: 190, height: 110, text, color: "violet" };
}

export function appendMindMapChild(document: BoardDocument, parentId: BoardElementId, id: BoardElementId, connectionId: `connection:${string}`, text = "New idea"): MindMapResult | null {
  const parent = document.elements.find((element) => element.id === parentId);
  if (!parent) return null;
  const siblingCount = document.connections.filter((connection) => connection.fromId === parentId).length;
  const node = newNode(id, parent.x + parent.width + 120, parent.y + siblingCount * 150, text);
  return {
    node,
    document: { ...document, elements: [...document.elements, node], connections: [...document.connections, { id: connectionId, fromId: parentId, toId: node.id }] },
  };
}

export function appendMindMapSibling(document: BoardDocument, currentId: BoardElementId, id: BoardElementId, connectionId: `connection:${string}`, text = "New idea"): MindMapResult | null {
  const current = document.elements.find((element) => element.id === currentId);
  if (!current) return null;
  const parentConnection = document.connections.find((connection) => connection.toId === currentId);
  const node = newNode(id, current.x, current.y + current.height + 48, text);
  return {
    node,
    document: {
      ...document,
      elements: [...document.elements, node],
      connections: parentConnection ? [...document.connections, { id: connectionId, fromId: parentConnection.fromId, toId: node.id }] : document.connections,
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
