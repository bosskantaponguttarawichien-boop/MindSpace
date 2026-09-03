import { describe, expect, it } from "vitest";
import type { BoardDocument } from "@/domain/board/board-document";
import { extractBoardContext, formatContextForPrompt } from "@/domain/ai/board-context";

const mockDocument: BoardDocument = {
  version: 1,
  id: "board:test",
  name: "Test Board",
  elements: [
    { id: "element:1", kind: "note", x: 100, y: 100, width: 200, height: 120, text: "Central Idea", color: "violet" },
    { id: "element:2", kind: "rectangle", x: 400, y: 100, width: 160, height: 80, text: "Sub Topic A", color: "blue" },
    { id: "element:3", kind: "text", x: 100, y: 300, width: 150, height: 50, text: "Isolated Note" },
  ],
  connections: [
    { id: "connection:1", fromId: "element:1", toId: "element:2" },
  ],
};

describe("board-context", () => {
  it("extracts entire board context when scope is entire-board", () => {
    const context = extractBoardContext(mockDocument, "entire-board");
    expect(context.scope).toBe("entire-board");
    expect(context.elementCount).toBe(3);
    expect(context.elements).toHaveLength(3);
    expect(context.connections).toHaveLength(1);
    expect(context.connections[0]?.fromText).toBe("Central Idea");
    expect(context.connections[0]?.toText).toBe("Sub Topic A");
  });

  it("extracts only selected elements when scope is selection", () => {
    const context = extractBoardContext(mockDocument, "selection", ["element:1", "element:2"]);
    expect(context.scope).toBe("selection");
    expect(context.elementCount).toBe(2);
    expect(context.elements.map((e) => e.id)).toEqual(["element:1", "element:2"]);
    expect(context.connections).toHaveLength(1);
  });

  it("omits connections to unselected nodes when in selection scope", () => {
    const context = extractBoardContext(mockDocument, "selection", ["element:1"]);
    expect(context.elementCount).toBe(1);
    expect(context.connections).toHaveLength(0);
  });

  it("formats context into readable markdown prompt", () => {
    const context = extractBoardContext(mockDocument, "entire-board");
    const formatted = formatContextForPrompt(context);

    expect(formatted).toContain("Board Scope: Entire Board");
    expect(formatted).toContain("[note] (ID: element:1) \"Central Idea\"");
    expect(formatted).toContain("- (ID: connection:1) \"Central Idea\" -> \"Sub Topic A\"");
  });
});
