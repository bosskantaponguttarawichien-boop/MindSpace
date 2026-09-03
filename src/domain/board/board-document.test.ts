import { describe, expect, it } from "vitest";
import { DEFAULT_TEXT_STYLE, sameBoardDocument, textStyleFor, type BoardDocument } from "@/domain/board/board-document";

function board(overrides: Partial<BoardDocument> = {}): BoardDocument {
  return {
    version: 1,
    id: "board:1",
    name: "Board",
    elements: [{ id: "element:1", kind: "note", x: 0, y: 0, width: 10, height: 10, text: "Hi", color: "violet" }],
    connections: [{ id: "connection:1", fromId: "element:1", toId: "element:2" }],
    ...overrides,
  };
}

describe("sameBoardDocument", () => {
  it("uses the historical text defaults when a style is not persisted", () => {
    expect(textStyleFor({})).toEqual(DEFAULT_TEXT_STYLE);
    expect(textStyleFor({ textStyle: { fontSize: 32, fontWeight: "bold" } })).toEqual({ fontSize: 32, fontWeight: "bold", textAlign: "left" });
  });

  it("ignores key order, so a Firestore echo does not read as a new document", () => {
    const local = board();
    const echoed = JSON.parse(JSON.stringify({
      connections: local.connections.map((connection) => ({ toId: connection.toId, id: connection.id, fromId: connection.fromId })),
      elements: local.elements.map((element) => ({ color: element.color, text: element.text, height: element.height, width: element.width, y: element.y, x: element.x, kind: element.kind, id: element.id })),
      name: local.name,
      id: local.id,
      version: local.version,
    })) as BoardDocument;

    expect(sameBoardDocument(local, echoed)).toBe(true);
  });

  it("treats an undefined field and a missing field as the same", () => {
    const withUndefined = board({ elements: [{ id: "element:1", kind: "note", x: 0, y: 0, width: 10, height: 10, text: "Hi", color: "violet", assetUrl: undefined }] });

    expect(sameBoardDocument(withUndefined, board())).toBe(true);
  });

  it("still reports a real change", () => {
    const recoloured = board({ elements: [{ id: "element:1", kind: "note", x: 0, y: 0, width: 10, height: 10, text: "Hi", color: "red" }] });

    expect(sameBoardDocument(board(), recoloured)).toBe(false);
  });

  it("recognizes a persisted text-style change", () => {
    const styled = board({ elements: [{ id: "element:1", kind: "text", x: 0, y: 0, width: 10, height: 10, text: "Hi", textStyle: { fontSize: 24, fontWeight: "bold" } }] });

    expect(sameBoardDocument(board(), styled)).toBe(false);
  });
});
