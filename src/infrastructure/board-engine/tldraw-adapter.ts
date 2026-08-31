import {
  createShapeId,
  GeoShapeGeoStyle,
  toRichText,
  type Editor,
  type TLUiComponents,
} from "tldraw";
import type { BoardDocument, BoardElement } from "@/domain/board/board-document";

const colorMap = {
  violet: "violet",
  yellow: "yellow",
  blue: "blue",
  green: "green",
  grey: "grey",
} as const;

export type BoardTool = "select" | "hand" | "text" | "note" | "rectangle" | "ellipse" | "arrow" | "draw";

export const hiddenTldrawUi: TLUiComponents = {
  ActionsMenu: null,
  DebugMenu: null,
  HelpMenu: null,
  MainMenu: null,
  MenuPanel: null,
  Minimap: null,
  NavigationPanel: null,
  PageMenu: null,
  QuickActions: null,
  SharePanel: null,
  StylePanel: null,
  Toolbar: null,
  TopPanel: null,
  ZoomMenu: null,
};

export function mountBoardDocument(editor: Editor, document: BoardDocument) {
  if (editor.getCurrentPageShapeIds().size > 0) return;
  editor.run(
    () => {
      editor.createShapes(document.elements.map(toTldrawShape));
      editor.selectNone();
    },
    { history: "ignore" },
  );
  editor.clearHistory();
  editor.zoomToFit({ animation: { duration: 220 } });
}

function toTldrawShape(element: BoardElement) {
  const common = {
    id: createShapeId(element.id),
    x: element.x,
    y: element.y,
  };

  if (element.kind === "text") {
    return {
      ...common,
      type: "text" as const,
      props: {
        richText: toRichText(element.text),
        color: colorMap[element.color ?? "grey"],
        size: "m" as const,
        autoSize: false,
        w: element.width,
      },
    };
  }

  if (element.kind === "note") {
    return {
      ...common,
      type: "note" as const,
      props: {
        richText: toRichText(element.text),
        color: colorMap[element.color ?? "yellow"],
        size: "m" as const,
      },
    };
  }

  return {
    ...common,
    type: "geo" as const,
    props: {
      geo: element.kind === "ellipse" ? ("ellipse" as const) : ("rectangle" as const),
      w: element.width,
      h: element.height,
      richText: toRichText(element.text),
      color: colorMap[element.color ?? "violet"],
      fill: "semi" as const,
      dash: "solid" as const,
      align: "middle" as const,
      verticalAlign: "middle" as const,
    },
  };
}

export function selectBoardTool(editor: Editor, tool: BoardTool) {
  if (tool === "rectangle" || tool === "ellipse") {
    editor.setStyleForNextShapes(GeoShapeGeoStyle, tool === "ellipse" ? "ellipse" : "rectangle");
    editor.setCurrentTool("geo");
    return;
  }
  editor.setCurrentTool(tool);
}

export function duplicateSelection(editor: Editor) {
  const ids = editor.getSelectedShapeIds();
  if (ids.length > 0) editor.duplicateShapes(ids, { x: 32, y: 32 });
}

export function deleteSelection(editor: Editor) {
  const ids = editor.getSelectedShapeIds();
  if (ids.length > 0) editor.deleteShapes(ids);
}
