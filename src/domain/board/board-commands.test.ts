import { describe, expect, it } from "vitest";
import { applyBoardCommand } from "@/domain/board/board-commands";
import type { BoardDocument, BoardElementId } from "@/domain/board/board-document";

const document: BoardDocument = {
  version: 1,
  id: "board:test",
  name: "Test board",
  elements: [
    { id: "element:a", kind: "rectangle", x: 10, y: 20, width: 100, height: 80, text: "A" },
    { id: "element:b", kind: "rectangle", x: 200, y: 20, width: 100, height: 80, text: "B" },
  ],
  connections: [{ id: "connection:a-b", fromId: "element:a", toId: "element:b" }],
};

describe("applyBoardCommand", () => {
  it("deletes selected elements and their attached connections", () => {
    const result = applyBoardCommand(document, { type: "delete-elements", elementIds: ["element:a"] });
    expect(result.elements.map((element) => element.id)).toEqual(["element:b"]);
    expect(result.connections).toEqual([]);
  });

  it("duplicates selected elements with new IDs and remaps internal connections", () => {
    let id = 0;
    const result = applyBoardCommand(document, {
      type: "duplicate-elements",
      elementIds: ["element:a", "element:b"],
      createId: () => `element:copy-${++id}` as BoardElementId,
    });

    expect(result.elements.slice(2)).toMatchObject([
      { id: "element:copy-1", x: 42, y: 52 },
      { id: "element:copy-2", x: 232, y: 52 },
    ]);
    expect(result.connections.at(-1)).toMatchObject({ fromId: "element:copy-1", toId: "element:copy-2" });
  });

  it("does not mutate the source document", () => {
    applyBoardCommand(document, { type: "delete-elements", elementIds: ["element:a"] });
    expect(document.elements).toHaveLength(2);
    expect(document.connections).toHaveLength(1);
  });
});
