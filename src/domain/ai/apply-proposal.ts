import {
  textStyleFor,
  type BoardConnection,
  type BoardConnectionId,
  type BoardDocument,
  type BoardElement,
  type BoardElementId,
  type BoardTextStyle,
} from "@/domain/board/board-document";
import { groupElements, ungroupElements } from "@/domain/board/grouping";
import { layoutMindMap } from "@/domain/board/mind-map";
import type {
  AiElementKind,
  AiProposal,
  AiProposedElement,
  AiProposedElementUpdate,
} from "@/domain/ai/proposal-schema";

export type ApplyProposalOptions = {
  createElementId: () => BoardElementId;
  createConnectionId: () => BoardConnectionId;
  createGroupId: () => string;
  /** Current board selection; used as the anchor for new nodes and mind-map layout. */
  selectedIds?: BoardElementId[];
};

export type ApplyProposalResult = {
  document: BoardDocument;
  createdElementIds: BoardElementId[];
};

const DEFAULT_SIZES: Record<AiElementKind, { width: number; height: number }> = {
  note: { width: 190, height: 110 },
  text: { width: 220, height: 54 },
  rectangle: { width: 160, height: 80 },
  ellipse: { width: 160, height: 80 },
  diamond: { width: 160, height: 80 },
  triangle: { width: 160, height: 80 },
  table: { width: 300, height: 150 },
};

const DEFAULT_TABLE_ROWS = 3;
const DEFAULT_TABLE_COLS = 3;
const TABLE_COL_WIDTH = 100;
const TABLE_ROW_HEIGHT = 50;

function supportsTextStyle(kind: BoardElement["kind"]): boolean {
  return kind !== "draw" && kind !== "image";
}

function parseTableText(text: string): string[][] {
  return text
    .split("\n")
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .filter((row) => row.length > 0);
}

/** Pads or trims cells so rows/cols always match the rendered grid. */
function normalizeTableGrid(data: string[][], rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => data[row]?.[col] ?? ""),
  );
}

function tableText(data: string[][]): string {
  return data.map((row) => row.join(" | ")).join("\n");
}

type TableShape = { rows: number; cols: number; tableData: string[][]; text: string };

function tableShapeFrom(data: string[][] | undefined, fallbackText: string, rows?: number, cols?: number): TableShape {
  const source = data && data.length > 0 ? data : fallbackText ? parseTableText(fallbackText) : [];
  const rowCount = rows ?? (source.length > 0 ? source.length : DEFAULT_TABLE_ROWS);
  const colCount = cols ?? (source.length > 0 ? Math.max(...source.map((row) => row.length)) : DEFAULT_TABLE_COLS);
  const grid = normalizeTableGrid(source, rowCount, colCount);
  return { rows: rowCount, cols: colCount, tableData: grid, text: tableText(grid) };
}

function createElement(proposed: AiProposedElement, id: BoardElementId, x: number, y: number): BoardElement {
  const defaults = DEFAULT_SIZES[proposed.kind];

  if (proposed.kind === "table") {
    const table = tableShapeFrom(proposed.tableData, proposed.text, proposed.rows, proposed.cols);
    return {
      id,
      kind: "table",
      x,
      y,
      width: proposed.width ?? Math.max(defaults.width, table.cols * TABLE_COL_WIDTH),
      height: proposed.height ?? Math.max(defaults.height, table.rows * TABLE_ROW_HEIGHT),
      text: table.text,
      color: proposed.color ?? "slate",
      rows: table.rows,
      cols: table.cols,
      tableData: table.tableData,
      ...(proposed.textStyle ? { textStyle: proposed.textStyle } : {}),
    };
  }

  return {
    id,
    kind: proposed.kind,
    x,
    y,
    width: proposed.width ?? defaults.width,
    height: proposed.height ?? defaults.height,
    text: proposed.text,
    color: proposed.color ?? (proposed.kind === "note" ? "violet" : "blue"),
    ...(proposed.textStyle ? { textStyle: proposed.textStyle } : {}),
  };
}

function updateElement(element: BoardElement, update: AiProposedElementUpdate): BoardElement {
  const nextKind = update.kind ?? element.kind;
  const textStyle: Partial<BoardTextStyle> | undefined = update.textStyle && supportsTextStyle(nextKind)
    ? { ...textStyleFor(element), ...update.textStyle }
    : element.textStyle;

  const next: BoardElement = {
    ...element,
    ...(update.kind !== undefined ? { kind: update.kind } : {}),
    ...(update.color !== undefined ? { color: update.color } : {}),
    ...(update.text !== undefined ? { text: update.text } : {}),
    ...(update.x !== undefined ? { x: update.x } : {}),
    ...(update.y !== undefined ? { y: update.y } : {}),
    ...(update.width !== undefined ? { width: update.width } : {}),
    ...(update.height !== undefined ? { height: update.height } : {}),
    ...(textStyle ? { textStyle } : {}),
  };

  if (nextKind !== "table") {
    if (element.kind === "table") {
      // Leaving the table tool drops grid data that no other kind renders.
      const withoutTable = { ...next };
      delete withoutTable.rows;
      delete withoutTable.cols;
      delete withoutTable.tableData;
      return withoutTable;
    }
    return next;
  }

  const table = tableShapeFrom(update.tableData ?? next.tableData, update.text ?? next.text);
  return {
    ...next,
    rows: table.rows,
    cols: table.cols,
    tableData: table.tableData,
    text: table.text,
    width: update.width ?? Math.max(next.width, table.cols * TABLE_COL_WIDTH),
    height: update.height ?? Math.max(next.height, table.rows * TABLE_ROW_HEIGHT),
  };
}

/**
 * Turns an approved proposal into the next board document. Pure so the AI path is
 * covered by tests and shares the same document shape as human board commands.
 * Returns null when the proposal carries nothing the board can apply.
 */
export function applyProposalToDocument(
  document: BoardDocument,
  proposal: AiProposal,
  options: ApplyProposalOptions,
): ApplyProposalResult | null {
  const selectedIds = options.selectedIds ?? [];
  const hasWork = Boolean(
    proposal.elements?.length
      || proposal.connections?.some((connection) => connection.fromId && connection.toId)
      || proposal.updateConnections?.length
      || proposal.updateElements?.length
      || proposal.deleteElementIds?.length
      || proposal.deleteConnectionIds?.length
      || proposal.groupElements?.length
      || proposal.ungroupElementIds?.length
      || proposal.layout,
  );
  if (!hasWork) return null;

  const referenceId = (proposal.elements?.[0]?.relativeToId as BoardElementId | undefined) ?? selectedIds[0];
  const referenceElement = referenceId ? document.elements.find((element) => element.id === referenceId) ?? null : null;

  let startX = referenceElement ? referenceElement.x + referenceElement.width + 100 : 400;
  let startY = referenceElement ? referenceElement.y : 200;

  if (!referenceElement && document.elements.length > 0) {
    startX = Math.max(...document.elements.map((element) => element.x + element.width)) + 100;
    startY = Math.min(...document.elements.map((element) => element.y));
  }

  const createdElements: BoardElement[] = [];
  const createdIds: BoardElementId[] = [];
  let stackedY = startY;

  for (const proposed of proposal.elements ?? []) {
    const id = options.createElementId();
    createdIds.push(id);
    const element = createElement(proposed, id, proposed.x ?? startX, proposed.y ?? stackedY);
    if (proposed.y === undefined) stackedY += element.height + 28;
    createdElements.push(element);
  }

  const createdConnections: BoardConnection[] = [];
  if (proposal.connections && proposal.connections.length > 0) {
    for (const connection of proposal.connections) {
      const fromId = connection.fromId
        ? (connection.fromId as BoardElementId)
        : connection.fromIndex !== undefined
          ? createdIds[connection.fromIndex]
          : referenceElement?.id ?? createdIds[0];
      const toId = connection.toIndex !== undefined ? createdIds[connection.toIndex] : (connection.toId as BoardElementId | undefined);
      if (!fromId || !toId || fromId === toId) continue;
      createdConnections.push({
        id: options.createConnectionId(),
        fromId,
        toId,
        style: connection.style ?? "end",
        lineStyle: connection.lineStyle ?? "solid",
        headType: connection.headType ?? "arrow",
        pathStyle: connection.pathStyle ?? "straight",
        ...(connection.color ? { color: connection.color } : {}),
      });
    }
  } else if (referenceElement && createdIds[0]) {
    createdConnections.push({
      id: options.createConnectionId(),
      fromId: referenceElement.id,
      toId: createdIds[0],
      style: "end",
      lineStyle: "solid",
      headType: "arrow",
      pathStyle: "straight",
    });
  }

  let nextConnections = [...document.connections];
  for (const update of proposal.updateConnections ?? []) {
    nextConnections = nextConnections.map((connection) => {
      if (update.id && connection.id !== update.id) return connection;
      return {
        ...connection,
        ...(update.headType !== undefined ? { headType: update.headType } : {}),
        ...(update.style !== undefined ? { style: update.style } : {}),
        ...(update.lineStyle !== undefined ? { lineStyle: update.lineStyle } : {}),
        ...(update.pathStyle !== undefined ? { pathStyle: update.pathStyle } : {}),
        ...(update.color !== undefined ? { color: update.color } : {}),
      };
    });
  }

  let nextElements = [...document.elements];
  for (const update of proposal.updateElements ?? []) {
    nextElements = nextElements.map((element) => (update.id && element.id !== update.id ? element : updateElement(element, update)));
  }

  const deletedElementIds = new Set((proposal.deleteElementIds ?? []) as BoardElementId[]);
  const deletedConnectionIds = new Set((proposal.deleteConnectionIds ?? []) as BoardConnectionId[]);

  nextElements = [...nextElements, ...createdElements].filter((element) => !deletedElementIds.has(element.id));
  nextConnections = [...nextConnections, ...createdConnections].filter(
    (connection) =>
      !deletedConnectionIds.has(connection.id)
      && !deletedElementIds.has(connection.fromId)
      && !deletedElementIds.has(connection.toId),
  );

  for (const group of proposal.groupElements ?? []) {
    nextElements = groupElements(nextElements, group.elementIds as BoardElementId[], options.createGroupId());
  }
  if (proposal.ungroupElementIds && proposal.ungroupElementIds.length > 0) {
    nextElements = ungroupElements(nextElements, proposal.ungroupElementIds as BoardElementId[]);
  }

  let nextDocument: BoardDocument = { ...document, elements: nextElements, connections: nextConnections };

  if (proposal.layout) {
    const rootId = (proposal.layout.rootId as BoardElementId | undefined) ?? referenceElement?.id ?? selectedIds[0];
    nextDocument = layoutMindMap(nextDocument, rootId, proposal.layout.direction);
  }

  return { document: nextDocument, createdElementIds: createdIds };
}
