import type { BoardColor, BoardConnection } from "@/domain/board/board-document";

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
  | "draw"
  | "eraser";

export type BoardExport = { dataUrl: string; width: number; height: number };

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
  renderExport: () => BoardExport | null;
  addChildNode: () => void;
  layoutMindMap: () => void;
  setSelectionColor: (color: BoardColor) => void;
  setSelectionShape: (shape: BoardTool) => void;
  alignSelection: (alignment: "left" | "center" | "right" | "top" | "middle" | "bottom") => void;
  updateSelectedConnection: (patch: Partial<BoardConnection>) => void;
  setConnectionDefaults: (patch: Partial<BoardConnection>) => void;
};
