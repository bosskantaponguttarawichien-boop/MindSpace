import type { BoardDocument } from "@/domain/board/board-document";

export function createEmptyBoard(id = "board:untitled", name = "Untitled board"): BoardDocument {
  return {
  version: 1,
  id,
  name,
  elements: [],
  connections: [],
  };
}

export const sampleBoard = createEmptyBoard();
