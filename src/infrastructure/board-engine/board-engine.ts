import type { BoardElement } from "@/domain/board/board-document";

export type BoardTool =
  | "select"
  | "hand"
  | "text"
  | "note"
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "triangle"
  | "arrow"
  | "draw";

export type BoardEngine = {
  undo: () => void;
  redo: () => void;
  duplicateSelection: () => void;
  copySelection: () => void;
  pasteClipboard: () => void;
  deleteSelection: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  addImage: (image: { url: string; width: number; height: number }) => void;
  printBoard: () => void;
  addChildNode: () => void;
  setSelectionColor: (color: NonNullable<BoardElement["color"]>) => void;
  alignSelection: (alignment: "left" | "center" | "right" | "top" | "middle" | "bottom") => void;
};
