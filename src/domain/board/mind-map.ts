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
