import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardToolbar } from "@/features/board/components/board-toolbar";
import { BOARD_COLORS } from "@/domain/board/board-document";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

function renderToolbar(overrides: Partial<Parameters<typeof BoardToolbar>[0]> = {}) {
  const props = {
    ready: true,
    activeTool: "select" as const,
    onToolChange: vi.fn(),
    onImportImage: vi.fn(),
    onImportPdf: vi.fn(),
    onAddChildNode: vi.fn(),
    onLayoutMindMap: vi.fn(),
    onSetColor: vi.fn(),
    onAlign: vi.fn(),
    onUpdateConnection: vi.fn(),
    ...overrides,
  };
  render(<LocaleProvider><TooltipProvider><BoardToolbar {...props} /></TooltipProvider></LocaleProvider>);
  return props;
}

describe("BoardToolbar", () => {
  it("keeps every tool in one horizontally scrollable row", () => {
    renderToolbar();

    expect(screen.getByRole("toolbar", { name: "Board tools" })).toHaveClass("flex-nowrap", "overflow-x-auto");
  });

  it("picks the group tool and opens its card in one click", async () => {
    const user = userEvent.setup();
    const { onToolChange } = renderToolbar();

    expect(screen.queryByRole("group", { name: "Shapes" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Shapes" }));

    expect(onToolChange).toHaveBeenCalledWith("rectangle");
    expect(screen.getByRole("group", { name: "Shapes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Shapes" })).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps the tool selected when the card is toggled shut", async () => {
    const user = userEvent.setup();
    const { onToolChange } = renderToolbar({ activeTool: "rectangle" });

    await user.click(screen.getByRole("button", { name: "Shapes" }));
    await user.click(screen.getByRole("button", { name: "Shapes" }));

    expect(screen.queryByRole("group", { name: "Shapes" })).toBeNull();
    expect(onToolChange).toHaveBeenLastCalledWith("rectangle");
    expect(screen.getByRole("button", { name: "Shapes" })).toHaveAttribute("aria-pressed", "true");
  });

  it("remembers the shape picked in the card as the group tool", async () => {
    const user = userEvent.setup();
    const { onToolChange } = renderToolbar({ activeTool: "diamond" });

    await user.click(screen.getByRole("button", { name: "Shapes" }));

    expect(onToolChange).toHaveBeenCalledWith("diamond");
  });

  it("selects the eraser from the draw card", async () => {
    const user = userEvent.setup();
    const { onToolChange } = renderToolbar();

    await user.click(screen.getByRole("button", { name: "Draw and erase" }));
    await user.click(screen.getByRole("button", { name: "Eraser" }));

    expect(onToolChange).toHaveBeenCalledWith("eraser");
  });

  it("opens one card at a time", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: "Shapes" }));
    await user.click(screen.getByRole("button", { name: "Connector" }));

    expect(screen.queryByRole("group", { name: "Shapes" })).toBeNull();
    expect(screen.getByRole("group", { name: "Connector options" })).toBeInTheDocument();
  });

  it("closes the open card on Escape", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: "Shapes" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("group", { name: "Shapes" })).toBeNull();
  });

  it("applies connector options and marks the chosen one", async () => {
    const user = userEvent.setup();
    const { onUpdateConnection } = renderToolbar();

    await user.click(screen.getByRole("button", { name: "Connector" }));
    await user.click(screen.getByRole("button", { name: "Diamond marker" }));
    await user.click(screen.getByRole("button", { name: "Dashed line" }));

    expect(onUpdateConnection).toHaveBeenCalledWith({ headType: "diamond" });
    expect(onUpdateConnection).toHaveBeenCalledWith({ lineStyle: "dashed" });
    expect(screen.getByRole("button", { name: "Diamond marker" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Dashed line" })).toHaveAttribute("aria-pressed", "true");
  });

  it("sets the connector colour through the connector card", async () => {
    const user = userEvent.setup();
    const { onUpdateConnection, onSetColor } = renderToolbar();

    await user.click(screen.getByRole("button", { name: "Connector" }));
    await user.click(screen.getByRole("button", { name: "Red" }));

    expect(onUpdateConnection).toHaveBeenCalledWith({ color: "red" });
    expect(onSetColor).not.toHaveBeenCalled();
  });

  it("opens a colour card outside the toolbar and applies a colour", async () => {
    const user = userEvent.setup();
    const { onSetColor } = renderToolbar();

    expect(screen.queryByRole("group", { name: "Change color" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Change color" }));

    const palette = screen.getByRole("group", { name: "Change color" });
    expect(palette).not.toContainElement(screen.getByRole("toolbar", { name: "Board tools" }));
    expect(screen.getAllByRole("button", { name: /^(Violet|Purple|Indigo|Blue|Sky blue|Cyan|Teal|Emerald|Green|Lime|Yellow|Amber|Orange|Red|Rose|Pink|Fuchsia|Slate|Grey)$/ })).toHaveLength(BOARD_COLORS.length);

    await user.click(screen.getByRole("button", { name: "Red" }));
    await user.click(screen.getByRole("button", { name: "Teal" }));

    expect(onSetColor).toHaveBeenNthCalledWith(1, "red");
    expect(onSetColor).toHaveBeenNthCalledWith(2, "teal");
    expect(screen.getByRole("group", { name: "Change color" })).toBeInTheDocument();
  });

  it("closes the colour card from its toolbar button", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: "Change color" }));
    await user.click(screen.getByRole("button", { name: "Change color" }));

    expect(screen.queryByRole("group", { name: "Change color" })).toBeNull();
  });

  it("calls onSetShape when a shape tool is picked", async () => {
    const user = userEvent.setup();
    const onSetShape = vi.fn();
    renderToolbar({ selectedShapeKind: "ellipse", onSetShape });

    await user.click(screen.getByRole("button", { name: "Shapes" }));
    await user.click(screen.getByRole("button", { name: "Diamond" }));

    expect(onSetShape).toHaveBeenCalledWith("diamond");
  });

  it("closes open tool card when pointer clicks outside", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: "Shapes" }));
    expect(screen.getByRole("group", { name: "Shapes" })).toBeInTheDocument();

    await user.pointer({ target: document.body, keys: "[MouseLeft]" });
    expect(screen.queryByRole("group", { name: "Shapes" })).toBeNull();
  });

  it("disables every tool until the engine is ready", () => {
    renderToolbar({ ready: false });
    expect(screen.getByRole("button", { name: "Draw and erase" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sticky note" })).toBeDisabled();
  });
});
