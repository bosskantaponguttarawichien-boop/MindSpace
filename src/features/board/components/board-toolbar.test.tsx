import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardToolbar } from "@/features/board/components/board-toolbar";
import { DEFAULT_TEXT_STYLE } from "@/domain/board/board-document";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

function renderToolbar(overrides: Partial<Parameters<typeof BoardToolbar>[0]> = {}) {
  const props = {
    ready: true,
    activeTool: "select" as const,
    textStyle: DEFAULT_TEXT_STYLE,
    onToolChange: vi.fn(),
    onImportImage: vi.fn(),
    onImportPdf: vi.fn(),
    onAddChildNode: vi.fn(),
    onLayoutMindMap: vi.fn(),
    onSetColor: vi.fn(),
    onSetTextStyle: vi.fn(),
    onUpdateConnection: vi.fn(),
    ...overrides,
  };
  const result = render(<LocaleProvider><TooltipProvider><BoardToolbar {...props} /></TooltipProvider></LocaleProvider>);
  return { ...props, ...result };
}

describe("BoardToolbar", () => {
  it("keeps every tool in a touch-scrollable row without alignment", () => {
    renderToolbar();

    expect(screen.getByRole("toolbar", { name: "Board tools" })).toHaveClass("w-full", "flex-nowrap", "overflow-x-auto", "touch-pan-x");
  });

  it("renders connector tool visible on mobile without being hidden", () => {
    renderToolbar();

    const connectorButton = screen.getByRole("button", { name: "Connector" });
    expect(connectorButton).toBeInTheDocument();
    expect(connectorButton).toHaveClass("max-sm:size-10");
    expect(connectorButton.closest(".hidden")).toBeNull();
  });

  it("reveals shape sub-tools inline in the row when tapped", async () => {
    const user = userEvent.setup();
    const { onToolChange } = renderToolbar();

    expect(screen.queryByRole("button", { name: "Shape type" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Shapes" }));

    expect(onToolChange).toHaveBeenCalledWith("rectangle");
    expect(screen.getByRole("button", { name: "Shape type" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Shapes" })).toHaveAttribute("aria-expanded", "true");
  });

  it("opens text sub-tools and dispatches bold and font-size changes", async () => {
    const user = userEvent.setup();
    const { onSetTextStyle } = renderToolbar({ activeTool: "text" });

    const textTool = screen.getByRole("button", { name: "Text" });
    expect(textTool).toHaveAttribute("aria-expanded", "false");
    await user.click(textTool);
    await user.click(screen.getByRole("button", { name: "Bold" }));
    await user.click(screen.getByRole("button", { name: "Text size" }));
    await user.click(screen.getByRole("button", { name: "24 px" }));

    expect(textTool).toHaveAttribute("aria-expanded", "true");
    expect(onSetTextStyle).toHaveBeenCalledWith({ fontWeight: "bold" });
    expect(onSetTextStyle).toHaveBeenCalledWith({ fontSize: 24 });
  });

  it("opens text sub-tools for a selected element without changing tools", async () => {
    const user = userEvent.setup();
    const { onToolChange } = renderToolbar({ hasSelection: true });

    await user.click(screen.getByRole("button", { name: "Text" }));

    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(onToolChange).not.toHaveBeenCalled();
  });

  it("marks the selected text style in the size panel", async () => {
    const user = userEvent.setup();
    renderToolbar({ activeTool: "text", textStyle: { fontSize: 32, fontWeight: "bold", textAlign: "left" } });

    await user.click(screen.getByRole("button", { name: "Text" }));

    expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Text size" }));
    expect(screen.getByRole("button", { name: "32 px" })).toHaveAttribute("aria-pressed", "true");
  });

  it("sets text alignment for future text and a selected text element", async () => {
    const user = userEvent.setup();
    const { onSetTextStyle } = renderToolbar({ activeTool: "text" });

    await user.click(screen.getByRole("button", { name: "Text" }));
    await user.click(screen.getByRole("button", { name: "Alignment" }));
    await user.click(screen.getByRole("button", { name: "Center text" }));

    expect(onSetTextStyle).toHaveBeenCalledWith({ textAlign: "center" });
  });

  it("sets vertical alignment for future text and selected elements", async () => {
    const user = userEvent.setup();
    const { onSetTextStyle } = renderToolbar({ activeTool: "text", textStyle: { ...DEFAULT_TEXT_STYLE, verticalAlign: "top" } });

    await user.click(screen.getByRole("button", { name: "Text" }));
    await user.click(screen.getByRole("button", { name: "Alignment" }));

    expect(screen.getByRole("button", { name: "Align top" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Align middle" }));
    expect(onSetTextStyle).toHaveBeenCalledWith({ verticalAlign: "middle" });

    await user.click(screen.getByRole("button", { name: "Align bottom" }));
    expect(onSetTextStyle).toHaveBeenCalledWith({ verticalAlign: "bottom" });
  });

  it("sets the text colour from the text sub-tools", async () => {
    const user = userEvent.setup();
    const { onSetColor } = renderToolbar({ activeTool: "text" });

    await user.click(screen.getByRole("button", { name: "Text" }));
    await user.click(screen.getByRole("button", { name: "Text color" }));
    await user.click(screen.getByRole("button", { name: "Red" }));

    expect(onSetColor).toHaveBeenCalledWith("red");
  });

  it("sets alignment directly from the shapes sub-tools for a selected shape", async () => {
    const user = userEvent.setup();
    const { onSetTextStyle } = renderToolbar({ hasSelection: true, selectedShapeKind: "rectangle", textStyle: { ...DEFAULT_TEXT_STYLE, textAlign: "center" } });

    await user.click(screen.getByRole("button", { name: "Shapes" }));
    await user.click(screen.getByRole("button", { name: "Alignment" }));

    expect(screen.getByRole("button", { name: "Center text" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Align text right" }));
    expect(onSetTextStyle).toHaveBeenCalledWith({ textAlign: "right" });
  });

  it("shows only one shape sub-tool panel at a time", async () => {
    const user = userEvent.setup();
    renderToolbar({ hasSelection: true, selectedShapeKind: "rectangle" });

    await user.click(screen.getByRole("button", { name: "Shapes" }));
    expect(screen.queryByRole("button", { name: "Red" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Align text left" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Shape color" }));
    expect(screen.getByRole("button", { name: "Red" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Alignment" }));
    expect(screen.queryByRole("button", { name: "Red" })).toBeNull();
    expect(screen.getByRole("button", { name: "Align text left" })).toBeInTheDocument();
  });

  it("keeps the tool selected when its sub-tools are toggled shut", async () => {
    const user = userEvent.setup();
    const { onToolChange } = renderToolbar({ activeTool: "rectangle" });

    await user.click(screen.getByRole("button", { name: "Shapes" }));
    await user.click(screen.getByRole("button", { name: "Shapes" }));

    expect(screen.queryByRole("button", { name: "Shape type" })).toBeNull();
    expect(onToolChange).toHaveBeenLastCalledWith("rectangle");
    expect(screen.getByRole("button", { name: "Shapes" })).toHaveAttribute("aria-pressed", "true");
  });

  it("remembers the shape picked as the group tool", async () => {
    const user = userEvent.setup();
    const { onToolChange } = renderToolbar({ activeTool: "diamond" });

    await user.click(screen.getByRole("button", { name: "Shapes" }));

    expect(onToolChange).toHaveBeenCalledWith("diamond");
  });

  it("selects the eraser from the draw sub-tools", async () => {
    const user = userEvent.setup();
    const { onToolChange } = renderToolbar();

    await user.click(screen.getByRole("button", { name: "Draw and erase" }));
    await user.click(screen.getByRole("button", { name: "Eraser" }));

    expect(onToolChange).toHaveBeenCalledWith("eraser");
  });

  it("sets the colour for drawing from the draw sub-tools", async () => {
    const user = userEvent.setup();
    const { onSetColor } = renderToolbar();

    await user.click(screen.getByRole("button", { name: "Draw and erase" }));
    await user.click(screen.getByRole("button", { name: "Draw color" }));
    await user.click(screen.getByRole("button", { name: "Red" }));

    expect(onSetColor).toHaveBeenCalledWith("red");
  });

  it("removes alignment without hiding tools in a mobile overflow menu", () => {
    renderToolbar();

    expect(screen.queryByRole("button", { name: "More tools" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Align selection" })).toBeNull();
  });

  it("shows one tool's sub-tools at a time", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: "Shapes" }));
    await user.click(screen.getByRole("button", { name: "Connector" }));

    expect(screen.queryByRole("button", { name: "Shape type" })).toBeNull();
    expect(screen.getByRole("button", { name: "Connector shape" })).toBeInTheDocument();
  });

  it("closes the open sub-tools on Escape", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: "Shapes" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("button", { name: "Shape type" })).toBeNull();
  });

  it("keeps connector sub-tool panels collapsed until tapped", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: "Connector" }));

    expect(screen.queryByRole("button", { name: "Dashed line" })).toBeNull();
    expect(screen.getByRole("button", { name: "Line style" })).toHaveAttribute("aria-expanded", "false");

    await user.click(screen.getByRole("button", { name: "Line style" }));

    expect(screen.getByRole("button", { name: "Dashed line" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Line style" })).toHaveAttribute("aria-expanded", "true");
  });

  it("applies connector options and marks the chosen one", async () => {
    const user = userEvent.setup();
    const { onUpdateConnection } = renderToolbar();

    await user.click(screen.getByRole("button", { name: "Connector" }));

    await user.click(screen.getByRole("button", { name: "Head type" }));
    await user.click(screen.getByRole("button", { name: "Diamond marker" }));
    expect(onUpdateConnection).toHaveBeenCalledWith({ headType: "diamond" });
    expect(screen.getByRole("button", { name: "Diamond marker" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Line style" }));
    await user.click(screen.getByRole("button", { name: "Dashed line" }));
    expect(onUpdateConnection).toHaveBeenCalledWith({ lineStyle: "dashed" });
    expect(screen.getByRole("button", { name: "Dashed line" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Connector shape" }));
    await user.click(screen.getByRole("button", { name: "Curved" }));
    expect(onUpdateConnection).toHaveBeenCalledWith({ pathStyle: "curved" });
    expect(screen.getByRole("button", { name: "Curved" })).toHaveAttribute("aria-pressed", "true");
  });

  it("runs the mind map layout with the last picked direction and lets you switch it", async () => {
    const user = userEvent.setup();
    const { onLayoutMindMap } = renderToolbar();

    await user.click(screen.getByRole("button", { name: "Arrange mind map" }));
    expect(onLayoutMindMap).toHaveBeenCalledWith("horizontal");

    await user.click(screen.getByRole("button", { name: "Tree" }));
    expect(onLayoutMindMap).toHaveBeenCalledWith("tree");
    expect(screen.getByRole("button", { name: "Tree" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Arrange mind map" }));
    expect(onLayoutMindMap).toHaveBeenLastCalledWith("tree");
  });

  it("sets the connector colour through its sub-tool", async () => {
    const user = userEvent.setup();
    const { onUpdateConnection, onSetColor } = renderToolbar();

    await user.click(screen.getByRole("button", { name: "Connector" }));
    await user.click(screen.getByRole("button", { name: "Line color" }));
    await user.click(screen.getByRole("button", { name: "Red" }));

    expect(onUpdateConnection).toHaveBeenCalledWith({ color: "red" });
    expect(onSetColor).not.toHaveBeenCalled();
  });

  it("has no standalone change-color button — color lives inside each tool's own sub-tools", () => {
    renderToolbar();

    expect(screen.queryByRole("button", { name: "Change color" })).toBeNull();
  });

  it("keeps the shape type picker collapsed until tapped", async () => {
    const user = userEvent.setup();
    const onSetShape = vi.fn();
    renderToolbar({ selectedShapeKind: "ellipse", onSetShape });

    await user.click(screen.getByRole("button", { name: "Shapes" }));
    expect(screen.queryByRole("button", { name: "Diamond" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Shape type" }));
    await user.click(screen.getByRole("button", { name: "Diamond" }));

    expect(onSetShape).toHaveBeenCalledWith("diamond");
  });

  it("closes open sub-tools when pointer clicks outside", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: "Shapes" }));
    expect(screen.getByRole("button", { name: "Shape type" })).toBeInTheDocument();

    await user.pointer({ target: document.body, keys: "[MouseLeft]" });
    expect(screen.queryByRole("button", { name: "Shape type" })).toBeNull();
  });

  it("disables every tool until the engine is ready", () => {
    renderToolbar({ ready: false });
    expect(screen.getByRole("button", { name: "Draw and erase" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sticky note" })).toBeDisabled();
  });

  it("selects the table tool when the table button is clicked", async () => {
    const user = userEvent.setup();
    const { onToolChange } = renderToolbar();

    await user.click(screen.getByRole("button", { name: "Table" }));
    expect(onToolChange).toHaveBeenCalledWith("table");
  });

  it("opens the note sub-tools with formatting and color, both collapsed by default", async () => {
    const user = userEvent.setup();
    const { onSetColor } = renderToolbar();

    await user.click(screen.getByRole("button", { name: "Sticky note" }));

    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Center text" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Red" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Note color" }));
    await user.click(screen.getByRole("button", { name: "Red" }));

    expect(onSetColor).toHaveBeenCalledWith("red");
  });

  it("hides table row/col actions until a table is selected, but keeps color and alignment available", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: "Table" }));

    expect(screen.queryByRole("button", { name: "Table actions" })).toBeNull();
    expect(screen.getByRole("button", { name: "Table color" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alignment" })).toBeInTheDocument();
  });

  it("shows table row and col action buttons when a table is selected", async () => {
    const user = userEvent.setup();
    const onAddTableRow = vi.fn();
    const onAddTableCol = vi.fn();
    renderToolbar({ hasSelection: true, selectedElementKind: "table", onAddTableRow, onAddTableCol });

    // Table sub-tools are auto-expanded when a table is selected
    await user.click(screen.getByRole("button", { name: "Table actions" }));

    await user.click(screen.getByRole("button", { name: "Add row" }));
    expect(onAddTableRow).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Add column" }));
    expect(onAddTableCol).toHaveBeenCalled();
  });

  it("automatically selects the corresponding tool and expands sub-tools when an element is selected", () => {
    const { rerender } = renderToolbar({ hasSelection: true, selectedElementKind: "note" });

    // Note tool should be active and its sub-tools expanded
    expect(screen.getByRole("button", { name: "Sticky note" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Select" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();

    // Switch selection to a shape
    rerender(
      <LocaleProvider>
        <TooltipProvider>
          <BoardToolbar
            ready={true}
            activeTool="select"
            textStyle={DEFAULT_TEXT_STYLE}
            onToolChange={vi.fn()}
            onImportImage={vi.fn()}
            onImportPdf={vi.fn()}
            onAddChildNode={vi.fn()}
            onLayoutMindMap={vi.fn()}
            onSetColor={vi.fn()}
            onSetTextStyle={vi.fn()}
            onUpdateConnection={vi.fn()}
            hasSelection={true}
            selectedElementKind="rectangle"
          />
        </TooltipProvider>
      </LocaleProvider>
    );
    expect(screen.getByRole("button", { name: "Shapes" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Bold" })).toBeNull();
    expect(screen.getByRole("button", { name: "Shape type" })).toBeInTheDocument();

    // Deselect
    rerender(
      <LocaleProvider>
        <TooltipProvider>
          <BoardToolbar
            ready={true}
            activeTool="select"
            textStyle={DEFAULT_TEXT_STYLE}
            onToolChange={vi.fn()}
            onImportImage={vi.fn()}
            onImportPdf={vi.fn()}
            onAddChildNode={vi.fn()}
            onLayoutMindMap={vi.fn()}
            onSetColor={vi.fn()}
            onSetTextStyle={vi.fn()}
            onUpdateConnection={vi.fn()}
            hasSelection={false}
            selectedElementKind={null}
          />
        </TooltipProvider>
      </LocaleProvider>
    );
    expect(screen.getByRole("button", { name: "Select" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Shapes" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: "Shape type" })).toBeNull();
  });

  it("keeps sub-tools open when clicking outside while an object is selected, and when switching to another object of the same kind", async () => {
    const user = userEvent.setup();
    const { rerender } = renderToolbar({ hasSelection: true, selectedElementKind: "note", selectedIds: ["note-1"] });

    // Sub-tools should be open
    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();

    // Clicking outside (on canvas / document.body) while an object is selected should NOT close sub-tools
    await user.pointer({ target: document.body, keys: "[MouseLeft]" });
    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();

    // Selecting another note on the canvas (different ID, same kind) must keep sub-tools open
    rerender(
      <LocaleProvider>
        <TooltipProvider>
          <BoardToolbar
            ready={true}
            activeTool="select"
            textStyle={DEFAULT_TEXT_STYLE}
            onToolChange={vi.fn()}
            onImportImage={vi.fn()}
            onImportPdf={vi.fn()}
            onAddChildNode={vi.fn()}
            onLayoutMindMap={vi.fn()}
            onSetColor={vi.fn()}
            onSetTextStyle={vi.fn()}
            onUpdateConnection={vi.fn()}
            hasSelection={true}
            selectedElementKind="note"
            selectedIds={["note-2"]}
          />
        </TooltipProvider>
      </LocaleProvider>
    );
    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sticky note" })).toHaveAttribute("aria-pressed", "true");
  });

  it("hides duplicate and delete until something is selected", () => {
    renderToolbar();

    expect(screen.queryByRole("button", { name: "Duplicate selection" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete selection" })).toBeNull();
  });

  it("duplicates and deletes the selection from the toolbar", async () => {
    const user = userEvent.setup();
    const onDuplicateSelection = vi.fn();
    const onDeleteSelection = vi.fn();
    renderToolbar({ hasSelection: true, onDuplicateSelection, onDeleteSelection });

    await user.click(screen.getByRole("button", { name: "Duplicate selection" }));
    expect(onDuplicateSelection).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Delete selection" }));
    expect(onDeleteSelection).toHaveBeenCalled();
  });
});
