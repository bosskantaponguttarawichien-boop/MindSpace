import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkspaceSidebar } from "@/features/workspace/components/workspace-sidebar";
import { LocaleProvider } from "@/lib/i18n/locale-provider";

const boards = [{ id: "board:1", name: "Backend Learning" }, { id: "board:2", name: "Untitled board 2" }];

function renderSidebar(overrides: Partial<Parameters<typeof WorkspaceSidebar>[0]> = {}) {
  const props = {
    boards,
    activeBoardId: "board:1",
    nextBoardName: "Untitled board 3",
    onCreateBoard: vi.fn(),
    onRenameBoard: vi.fn(),
    onDeleteBoard: vi.fn(),
    onSelectBoard: vi.fn(),
    ...overrides,
  };
  render(<LocaleProvider><WorkspaceSidebar {...props} /></LocaleProvider>);
  return props;
}

async function openBoardMenu(user: ReturnType<typeof userEvent.setup>, boardName: string) {
  await user.click(screen.getByRole("button", { name: `Board actions: ${boardName}` }));
}

describe("WorkspaceSidebar", () => {
  it("creates a board with the name typed in the dialog", async () => {
    const user = userEvent.setup();
    const { onCreateBoard } = renderSidebar();

    await user.click(screen.getByRole("button", { name: "New board" }));
    const input = await screen.findByRole("textbox", { name: "Board name" });
    expect(input).toHaveValue("Untitled board 3");

    await user.clear(input);
    await user.type(input, "Physics notes");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(onCreateBoard).toHaveBeenCalledWith("Physics notes");
  });

  it("falls back to the suggested name when the field is left empty", async () => {
    const user = userEvent.setup();
    const { onCreateBoard } = renderSidebar();

    await user.click(screen.getByRole("button", { name: "New board" }));
    await user.clear(await screen.findByRole("textbox", { name: "Board name" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(onCreateBoard).toHaveBeenCalledWith("Untitled board 3");
  });

  it("only deletes a board after the confirmation is accepted", async () => {
    const user = userEvent.setup();
    const { onDeleteBoard } = renderSidebar();

    await openBoardMenu(user, "Backend Learning");
    await user.click(await screen.findByRole("menuitem", { name: "Delete board" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Backend Learning");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDeleteBoard).not.toHaveBeenCalled();

    await openBoardMenu(user, "Backend Learning");
    await user.click(await screen.findByRole("menuitem", { name: "Delete board" }));
    await user.click(await screen.findByRole("button", { name: "Delete board" }));

    expect(onDeleteBoard).toHaveBeenCalledWith("board:1");
  });

  it("renames a board from the board menu", async () => {
    const user = userEvent.setup();
    const { onRenameBoard } = renderSidebar();

    await openBoardMenu(user, "Backend Learning");
    await user.click(await screen.findByRole("menuitem", { name: "Rename board" }));

    const input = await screen.findByRole("textbox", { name: "Board name" });
    expect(input).toHaveValue("Backend Learning");

    await user.clear(input);
    await user.type(input, "Backend Notes");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onRenameBoard).toHaveBeenCalledWith("board:1", "Backend Notes");
  });

  it("shows the MindSpace logo", () => {
    renderSidebar();
    expect(document.querySelector('img[src*="mindspace-192"]')).not.toBeNull();
  });

  it("calls onToggleSidebar when the collapse button is clicked", async () => {
    const user = userEvent.setup();
    const onToggleSidebar = vi.fn();
    renderSidebar({ onToggleSidebar });

    const collapseBtn = screen.getByRole("button", { name: "Collapse sidebar" });
    await user.click(collapseBtn);
    expect(onToggleSidebar).toHaveBeenCalledTimes(1);
  });
});

