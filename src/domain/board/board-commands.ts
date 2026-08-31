import type {
  BoardConnection,
  BoardDocument,
  BoardElement,
  BoardElementId,
} from "@/domain/board/board-document";

export type BoardCommand =
  | { type: "create-element"; element: BoardElement }
  | { type: "delete-elements"; elementIds: BoardElementId[] }
  | {
      type: "duplicate-elements";
      elementIds: BoardElementId[];
      createId: (sourceId: BoardElementId) => BoardElementId;
      offset?: { x: number; y: number };
    };

export function applyBoardCommand(document: BoardDocument, command: BoardCommand): BoardDocument {
  switch (command.type) {
    case "create-element":
      return { ...document, elements: [...document.elements, command.element] };
    case "delete-elements": {
      const deletedIds = new Set(command.elementIds);
      return {
        ...document,
        elements: document.elements.filter((element) => !deletedIds.has(element.id)),
        connections: document.connections.filter(
          (connection) => !deletedIds.has(connection.fromId) && !deletedIds.has(connection.toId),
        ),
      };
    }
    case "duplicate-elements":
      return duplicateElements(document, command);
  }
}

function duplicateElements(
  document: BoardDocument,
  command: Extract<BoardCommand, { type: "duplicate-elements" }>,
): BoardDocument {
  const selectedIds = new Set(command.elementIds);
  const offset = command.offset ?? { x: 32, y: 32 };
  const idMap = new Map<BoardElementId, BoardElementId>();
  const duplicatedElements: BoardElement[] = [];

  for (const element of document.elements) {
    if (!selectedIds.has(element.id)) continue;
    const nextId = command.createId(element.id);
    idMap.set(element.id, nextId);
    duplicatedElements.push({
      ...element,
      id: nextId,
      x: element.x + offset.x,
      y: element.y + offset.y,
    });
  }

  const duplicatedConnections: BoardConnection[] = document.connections.flatMap((connection) => {
    const fromId = idMap.get(connection.fromId);
    const toId = idMap.get(connection.toId);
    if (!fromId || !toId) return [];
    return [{ ...connection, id: `connection:${connection.id}:copy` as const, fromId, toId }];
  });

  return {
    ...document,
    elements: [...document.elements, ...duplicatedElements],
    connections: [...document.connections, ...duplicatedConnections],
  };
}
