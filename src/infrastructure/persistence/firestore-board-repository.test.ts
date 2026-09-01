import { describe, expect, it } from "vitest";
import { parseBoardDocument } from "@/infrastructure/persistence/firestore-board-repository";

describe("parseBoardDocument", () => {
  it("accepts a serializable version 1 board document", () => {
    expect(parseBoardDocument({
      version: 1,
      id: "board:one",
      name: "One",
      elements: [{ id: "element:one", kind: "note", x: 1, y: 2, width: 3, height: 4, text: "Hello", color: "yellow" }],
      connections: [],
    })).toMatchObject({ id: "board:one", name: "One" });
  });

  it("rejects a malformed board payload from Firestore", () => {
    expect(parseBoardDocument({ version: 1, id: "board:one", name: "One", elements: [{ id: "element:one", kind: "bad" }], connections: [] })).toBeNull();
  });
});
