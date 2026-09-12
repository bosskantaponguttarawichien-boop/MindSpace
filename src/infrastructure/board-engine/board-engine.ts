import type { BoardColor, BoardConnection, BoardTextStyle } from "@/domain/board/board-document";
import type { MindMapLayoutDirection } from "@/domain/board/mind-map";
import type { AiProposal } from "@/domain/ai/proposal-schema";

export type BoardTool =
  | "select"
  | "hand"
  | "text"
  | "note"
  | "table"
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
  layoutMindMap: (direction?: MindMapLayoutDirection) => void;
  setSelectionColor: (color: BoardColor) => void;
  setSelectionShape: (shape: BoardTool) => void;
  setSelectionTextStyle: (patch: Partial<BoardTextStyle>) => void;
  updateSelectedConnection: (patch: Partial<BoardConnection>) => void;
  setConnectionDefaults: (patch: Partial<BoardConnection>) => void;
  addTableRow: (elementId?: string, rowIndex?: number) => void;
  deleteTableRow: (elementId?: string, rowIndex?: number) => void;
  addTableCol: (elementId?: string, colIndex?: number) => void;
  deleteTableCol: (elementId?: string, colIndex?: number) => void;
  applyProposal: (proposal: AiProposal) => void;
};
