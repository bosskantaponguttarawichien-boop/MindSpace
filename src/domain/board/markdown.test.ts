import { describe, expect, it } from "vitest";
import { parseMarkdown } from "@/domain/board/markdown";

describe("parseMarkdown", () => {
  it("parses headings, lists, tasks, quotes, and code blocks", () => {
    expect(parseMarkdown("# Plan\n- Read\n- [x] Done\n> Remember\n```\nconst x = 1\n```" )).toEqual([
      { kind: "heading", level: 1, text: "Plan", bold: true },
      { kind: "bullet", text: "Read" },
      { kind: "task", checked: true, text: "Done" },
      { kind: "quote", text: "Remember" },
      { kind: "code", text: "const x = 1" },
    ]);
  });

  it("removes inline bold and code markers for the canvas preview", () => {
    expect(parseMarkdown("**Important** and `value`")).toEqual([{ kind: "paragraph", text: "Important and value", bold: true }]);
  });
});
