export type BoardTool =
  | "select"
  | "hand"
  | "text"
  | "note"
  | "rectangle"
  | "ellipse"
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
};
