import { describe, expect, it } from "vitest";
import { appendMindMapChild, appendMindMapSibling, layoutMindMap } from "@/domain/board/mind-map";
import { createEmptyBoard } from "@/domain/board/sample-board";

const root = { id: "element:root" as const, kind: "ellipse" as const, x: 10, y: 20, width: 200, height: 120, text: "Root", color: "blue" as const };

describe("mind-map commands", () => {
  it("adds a linked child to the right of its parent", () => {
    const document = { ...createEmptyBoard(), elements: [root] };
    const result = appendMindMapChild(document, root.id, "element:child", "connection:root-child", "");

    expect(result?.node).toMatchObject({ id: "element:child", x: 330, y: 20, text: "" });
    expect(result?.document.connections).toContainEqual({ id: "connection:root-child", fromId: root.id, toId: "element:child" });
  });

  it("adds a sibling under the current node and keeps the same parent connection", () => {
    const child = { id: "element:child" as const, kind: "note" as const, x: 330, y: 20, width: 190, height: 110, text: "Child", color: "violet" as const };
    const document = { ...createEmptyBoard(), elements: [root, child], connections: [{ id: "connection:root-child" as const, fromId: root.id, toId: child.id }] };
    const result = appendMindMapSibling(document, child.id, "element:sibling", "connection:root-sibling", "");

    expect(result?.node).toMatchObject({ id: "element:sibling", x: 330, y: 178, text: "" });
    expect(result?.document.connections).toContainEqual({ id: "connection:root-sibling", fromId: root.id, toId: "element:sibling" });
  });

  it("lays out a selected mind-map root with child nodes to its right", () => {
    const first = { id: "element:first" as const, kind: "note" as const, x: 0, y: 0, width: 190, height: 110, text: "First", color: "violet" as const };
    const second = { id: "element:second" as const, kind: "note" as const, x: 0, y: 0, width: 190, height: 110, text: "Second", color: "violet" as const };
    const document = { ...createEmptyBoard(), elements: [root, first, second], connections: [{ id: "connection:one" as const, fromId: root.id, toId: first.id }, { id: "connection:two" as const, fromId: root.id, toId: second.id }] };

    const laidOut = layoutMindMap(document, root.id);
    expect(laidOut.elements.find((element) => element.id === first.id)?.x).toBe(root.x + 300);
    expect(laidOut.elements.find((element) => element.id === second.id)?.x).toBe(root.x + 300);
    expect(laidOut.elements.find((element) => element.id === second.id)?.y).toBeGreaterThan(laidOut.elements.find((element) => element.id === first.id)?.y ?? 0);
  });
});
