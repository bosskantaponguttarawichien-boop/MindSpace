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
  deleteSelection: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
};
