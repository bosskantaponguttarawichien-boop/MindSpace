import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BoardElement } from "@/domain/board/board-document";
import { InlineElementEditor } from "./inline-element-editor";
import { sourceFromEditor } from "./inline-text-content";

const note: BoardElement = { id: "element:note", kind: "note", x: 120, y: 80, width: 220, height: 180,
  title: "Grammar", text: "# Pronouns\n- **She** is learning.\n- [x] Practice", color: "yellow" };
afterEach(cleanup);

function mount(element = note, scale = 0.5) {
  const onChange = vi.fn();
  render(<InlineElementEditor element={element} viewport={{ x: 40, y: 25, scale }}
    label="Edit board item" onChange={onChange} onBlur={vi.fn()} onKeyDown={vi.fn()} />);
  return { editor: screen.getByRole("textbox"), onChange };
}

// JSDOM omits innerText; the browser integration check covers its native implementation.
function setRows(editor: HTMLElement, values: string[]) {
  Array.from(editor.children).forEach((row, index) => {
    Object.defineProperty(row, "innerText", { configurable: true, value: values[index] ?? "" });
  });
}

describe("in-place note and shape editing", () => {
  it.each([0.25, 0.9, 1, 2.5])("keeps the board footprint and text metrics at zoom %s", (scale) => {
    const { editor } = mount(note, scale);
    expect(editor).toHaveFocus();
    expect(editor.parentElement).toHaveStyle({ width: "220px", height: "180px", transform: `scale(${scale})`, transformOrigin: "top left" });
    expect(editor).toHaveStyle({ left: "18px", top: "58px", width: "184px" });
    expect(editor).toHaveTextContent("Pronouns");
    expect(editor).not.toHaveTextContent("**");
  });

  it("preserves Markdown when another visible row is edited", () => {
    const { editor, onChange } = mount();
    setRows(editor, ["Pronouns", "• She is working.", "☑ Practice"]);
    fireEvent.input(editor);
    expect(onChange).toHaveBeenLastCalledWith("# Pronouns\n- **She** is working.\n- [x] Practice");
  });

  it("leaves the original Markdown bytes alone on an unchanged input", () => {
    const { editor, onChange } = mount();
    setRows(editor, ["Pronouns", "• She is learning.", "☑ Practice"]);
    fireEvent.input(editor);
    expect(onChange).toHaveBeenLastCalledWith(note.text);
  });

  it("preserves code fences when inserting a new row", () => {
    const source = "```\nconst n = 1;\n```";
    const { editor } = mount({ ...note, text: source });
    setRows(editor, ["const n = 1;"]);
    const added = document.createElement("div");
    Object.defineProperty(added, "innerText", { value: "const m = 2;" });
    editor.append(added);
    expect(sourceFromEditor(editor, source)).toBe("```\nconst n = 1;\nconst m = 2;\n```");
  });

  it.each(["rectangle", "ellipse", "diamond", "triangle"] as const)("keeps a centered %s body in the same position while editing", (kind) => {
    const { editor } = mount({ ...note, kind, title: undefined, text: "Practice",
      textStyle: { verticalAlign: "middle", textAlign: "center" } });
    expect(editor).toHaveStyle({ textAlign: "center", top: "76.95px" });
  });
});

