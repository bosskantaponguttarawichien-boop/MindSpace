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
    onExportPdf: vi.fn(),
    ...overrides,
  };
  render(<LocaleProvider><TooltipProvider><WorkspaceTopbar {...props} /></TooltipProvider></LocaleProvider>);
  return props;
}

describe("WorkspaceTopbar", () => {
  it("lets a mobile user choose another board from the board name menu", async () => {
    const user = userEvent.setup();
    const { onSelectBoard } = renderTopbar();

    await user.click(screen.getByRole("button", { name: "Switch board" }));
    await user.click(await screen.findByRole("menuitem", { name: "Switch board: English" }));

    expect(onSelectBoard).toHaveBeenCalledWith("board:2");
  });

  it("creates a board from the board name menu even before the engine is ready", async () => {
    const user = userEvent.setup();
    const { onCreateBoard } = renderTopbar();

    await user.click(screen.getByRole("button", { name: "Switch board" }));
    await user.click(await screen.findByRole("menuitem", { name: "New board" }));
    const input = await screen.findByRole("textbox", { name: "Board name" });
    await user.clear(input);
    await user.type(input, "System Design");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(onCreateBoard).toHaveBeenCalledWith("System Design");
  });

  it("renames a board from the board name menu", async () => {
    const user = userEvent.setup();
    const onRenameBoard = vi.fn();
    renderTopbar({ onRenameBoard });

    await user.click(screen.getByRole("button", { name: "Switch board" }));
    await user.click(await screen.findByRole("button", { name: "Rename board: English" }));
    const input = await screen.findByRole("textbox", { name: "Board name" });
    await user.clear(input);
    await user.type(input, "Advanced English");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onRenameBoard).toHaveBeenCalledWith("board:2", "Advanced English");
  });

  it("deletes a board from the board name menu after confirmation", async () => {
    const user = userEvent.setup();
    const onDeleteBoard = vi.fn();
    renderTopbar({ onDeleteBoard });

    await user.click(screen.getByRole("button", { name: "Switch board" }));
    await user.click(await screen.findByRole("button", { name: "Delete board: English" }));
    await user.click(await screen.findByRole("button", { name: "Delete board" }));

    expect(onDeleteBoard).toHaveBeenCalledWith("board:2");
  });

  it("allows signing out from the more-actions menu", async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn();
    renderTopbar({
      account: { uid: "user:1", email: "boss_k_u@hotmail.com", isAnonymous: false },
      onSignOut,
    });

    await user.click(screen.getByRole("button", { name: "Board actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "Sign out" }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("toggles sidebar when sidebar button is clicked and has responsive hiding class", async () => {
    const user = userEvent.setup();
    const onToggleSidebar = vi.fn();
    renderTopbar({ onToggleSidebar, sidebarOpen: true });

    const sidebarButton = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(sidebarButton.className).toContain("hidden lg:inline-flex");
    await user.click(sidebarButton);
    expect(onToggleSidebar).toHaveBeenCalled();
  });

  it("toggles AI panel when right panel button is clicked and has responsive hiding class", async () => {
    const user = userEvent.setup();
    const onToggleRightPanel = vi.fn();
    renderTopbar({ onToggleRightPanel, rightPanelOpen: true });

    const rightPanelButton = screen.getByRole("button", { name: "Collapse AI panel" });
    expect(rightPanelButton.className).toContain("hidden lg:inline-flex");
    await user.click(rightPanelButton);
    expect(onToggleRightPanel).toHaveBeenCalled();
  });

  it("opens account controls from the top bar", async () => {
    const user = userEvent.setup();
    const onOpenAccount = vi.fn();
    renderTopbar({ accountLabel: "Sign in", onOpenAccount });

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(onOpenAccount).toHaveBeenCalledTimes(1);
  });
});
