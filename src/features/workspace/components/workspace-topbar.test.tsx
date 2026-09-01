import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceTopbar } from "@/features/workspace/components/workspace-topbar";
import { LocaleProvider } from "@/lib/i18n/locale-provider";

function renderTopbar(overrides: Partial<Parameters<typeof WorkspaceTopbar>[0]> = {}) {
  const props = {
    engine: null,
    boardName: "Backend Learning",
    boards: [{ id: "board:1", name: "Backend Learning" }, { id: "board:2", name: "English" }],
    activeBoardId: "board:1",
    nextBoardName: "Untitled board 3",
    syncStatus: "saved" as const,
    syncError: null,
    onCreateBoard: vi.fn(),
    onSelectBoard: vi.fn(),
    onCopySyncLink: vi.fn(async () => true),
    onExportPdf: vi.fn(),
    onOpenAi: vi.fn(),
    ...overrides,
  };
  render(<LocaleProvider><TooltipProvider><WorkspaceTopbar {...props} /></TooltipProvider></LocaleProvider>);
  return props;
}

describe("WorkspaceTopbar", () => {
  it("lets a mobile user choose another board from the more-actions menu", async () => {
    const user = userEvent.setup();
    const { onSelectBoard } = renderTopbar();

    await user.click(screen.getByRole("button", { name: "Board actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "Switch board: English" }));

    expect(onSelectBoard).toHaveBeenCalledWith("board:2");
  });

  it("creates a board from the more-actions menu even before the engine is ready", async () => {
    const user = userEvent.setup();
    const { onCreateBoard } = renderTopbar();

    await user.click(screen.getByRole("button", { name: "Board actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "New board" }));
    const input = await screen.findByRole("textbox", { name: "Board name" });
    await user.clear(input);
    await user.type(input, "System Design");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(onCreateBoard).toHaveBeenCalledWith("System Design");
  });
});
