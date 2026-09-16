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

  it("builds a mind-map outline so a summary can follow the branches", () => {
    const document: BoardDocument = {
      ...mockDocument,
      elements: [
        { id: "element:root", kind: "rectangle", x: 0, y: 0, width: 200, height: 100, text: "Launch plan" },
        { id: "element:a", kind: "note", x: 0, y: 0, width: 100, height: 100, text: "Marketing" },
        { id: "element:a1", kind: "note", x: 0, y: 0, width: 100, height: 100, text: "Launch video" },
        { id: "element:b", kind: "note", x: 0, y: 0, width: 100, height: 100, text: "Engineering" },
        { id: "element:loose", kind: "note", x: 0, y: 0, width: 100, height: 100, text: "Parking lot" },
      ],
      connections: [
        { id: "connection:1", fromId: "element:root", toId: "element:a" },
        { id: "connection:2", fromId: "element:a", toId: "element:a1" },
        { id: "connection:3", fromId: "element:root", toId: "element:b" },
      ],
    };

    const context = extractBoardContext(document, "entire-board");
    expect(context.outline.map((node) => [node.label, node.depth])).toEqual([
      ["Launch plan", 0],
      ["Marketing", 1],
      ["Launch video", 2],
      ["Engineering", 1],
    ]);

    const formatted = formatContextForPrompt(context);
    expect(formatted).toContain("Mind map outline (root first, indented by depth):");
    expect(formatted).toContain("- Launch plan\n  - Marketing\n    - Launch video\n  - Engineering");
    expect(formatted).toContain("Standalone elements (not connected): Parking lot");
  });

  it("emits every connected node once even when connections form a cycle", () => {
    const document: BoardDocument = {
      ...mockDocument,
      elements: [
        { id: "element:1", kind: "note", x: 0, y: 0, width: 100, height: 100, text: "A" },
        { id: "element:2", kind: "note", x: 0, y: 0, width: 100, height: 100, text: "B" },
      ],
      connections: [
        { id: "connection:1", fromId: "element:1", toId: "element:2" },
        { id: "connection:2", fromId: "element:2", toId: "element:1" },
      ],
    };

    const context = extractBoardContext(document, "entire-board");
    expect(context.outline.map((node) => node.label)).toEqual(["A", "B"]);
  });

  it("describes every attribute the AI is allowed to edit", () => {
    const document: BoardDocument = {
      ...mockDocument,
      elements: [
        { id: "element:1", kind: "note", x: 100, y: 100, width: 200, height: 120, text: "Central Idea", color: "violet", textStyle: { fontSize: 32, fontWeight: "bold", textAlign: "center", verticalAlign: "middle" }, groupId: "group:a" },
        { id: "element:4", kind: "table", x: 0, y: 0, width: 300, height: 150, text: "A | B", rows: 2, cols: 3, color: "slate" },
      ],
      connections: [],
    };

    const formatted = formatContextForPrompt(extractBoardContext(document, "entire-board"));

    expect(formatted).toContain("pos 100,100, size 200x120, color violet, text 32/bold/center/middle");
    expect(formatted).toContain("group group:a");
    expect(formatted).toContain("table 2x3");
  });
});
