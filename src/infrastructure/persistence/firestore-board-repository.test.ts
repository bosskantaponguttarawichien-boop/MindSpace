import { describe, expect, it } from "vitest";
import { BOARD_COLORS } from "@/domain/board/board-document";
import { DEFAULT_TEXT_STYLES, textStyleForScope, textStyleScopeFor } from "@/domain/board/text-style-scope";
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

  it("accepts diagram shapes", () => {
    expect(parseBoardDocument({
      version: 1,
      id: "board:diagram",
      name: "Diagram",
      elements: [
        { id: "element:diamond", kind: "diamond", x: 1, y: 2, width: 120, height: 80, text: "Decision", color: "yellow" },
        { id: "element:triangle", kind: "triangle", x: 160, y: 2, width: 120, height: 80, text: "Step", color: "green" },
      ],
      connections: [],
    })).not.toBeNull();
  });

  it("accepts a valid persisted text style and rejects an invalid one", () => {
    const board = (textStyle: unknown, kind: "text" | "rectangle" | "note" = "text") => ({
      version: 1,
      id: "board:text-style",
      name: "Text style",
      elements: [{ id: "element:text", kind, x: 1, y: 2, width: 120, height: 48, text: "Heading", textStyle }],
      connections: [],
    });

    expect(parseBoardDocument(board({ fontSize: 32, fontWeight: "bold" }))).not.toBeNull();
    expect(parseBoardDocument(board({ fontSize: 18, fontWeight: "normal", textAlign: "right" }, "rectangle"))).not.toBeNull();
    expect(parseBoardDocument(board({ fontSize: 18, fontWeight: "normal", textAlign: "center", verticalAlign: "middle" }, "rectangle"))).not.toBeNull();
    expect(parseBoardDocument(board({ fontSize: 18, fontWeight: "normal", verticalAlign: "bottom" }, "rectangle"))).not.toBeNull();
    expect(parseBoardDocument(board({ fontSize: 24, fontWeight: "bold", textAlign: "center" }, "note"))).not.toBeNull();
    expect(parseBoardDocument(board({ fontSize: 19, fontWeight: "bold" }))).toBeNull();
    expect(parseBoardDocument(board({ fontSize: 32, fontWeight: "heavy" }))).toBeNull();
    expect(parseBoardDocument(board({ fontSize: 18, fontWeight: "normal", verticalAlign: "diagonal" }))).toBeNull();
  });

  it("accepts every board colour and rejects an unknown one", () => {
    const board = (color: string) => ({
      version: 1,
      id: "board:colors",
      name: "Colors",
      elements: [{ id: "element:one", kind: "note", x: 1, y: 2, width: 3, height: 4, text: "Hello", color }],
      connections: [],
    });
    for (const color of BOARD_COLORS) expect(parseBoardDocument(board(color))).not.toBeNull();
    expect(parseBoardDocument(board("chartreuse"))).toBeNull();
  });

  it("accepts an image element only with a HTTPS asset URL", () => {
    expect(parseBoardDocument({
      version: 1,
      id: "board:image",
      name: "Image",
      elements: [{ id: "element:image", kind: "image", x: 1, y: 2, width: 300, height: 200, text: "", assetUrl: "https://storage.example/image.png" }],
      connections: [],
    })).not.toBeNull();
    expect(parseBoardDocument({
      version: 1,
      id: "board:image",
      name: "Image",
      elements: [{ id: "element:image", kind: "image", x: 1, y: 2, width: 300, height: 200, text: "", assetUrl: "javascript:alert(1)" }],
      connections: [],
    })).toBeNull();
  });

  it("accepts table elements and rehydrates tableData when omitted", () => {
    const doc = parseBoardDocument({
      version: 1,
      id: "board:table",
      name: "Table",
      elements: [
        {
          id: "element:table",
          kind: "table",
          x: 10,
          y: 20,
          width: 300,
          height: 150,
          rows: 2,
          cols: 2,
          text: "ColA | ColB\nVal1 | Val2",
          color: "slate",
        },
      ],
      connections: [],
    });
    expect(doc).not.toBeNull();
    expect(doc?.elements[0]).toMatchObject({
      rows: 2,
      cols: 2,
      tableData: [
        ["ColA", "ColB"],
        ["Val1", "Val2"],
      ],
    });
  });

  it("keeps a board whose table carries the styles the table tool creates it with", () => {
    // A rejected element discards the entire board, so the editor would drop the board the user
    // is drawing on the moment a table came back from Firestore.
    const doc = parseBoardDocument({
      version: 1,
      id: "board:styled-table",
      name: "Styled table",
      elements: [
        {
          id: "element:table",
          kind: "table",
          x: 0,
          y: 0,
          width: 300,
          height: 150,
          rows: 1,
          cols: 2,
          text: "ColA | ColB",
          color: "slate",
          textStyle: textStyleForScope(DEFAULT_TEXT_STYLES, "table"),
        },
      ],
      connections: [],
    });
    expect(doc).not.toBeNull();
    expect(doc?.elements[0]?.textStyle).toMatchObject({ textAlign: "center", verticalAlign: "middle" });
  });

  it("every text-style scope maps onto a kind this parser accepts", () => {
    for (const kind of ["text", "note", "table", "rectangle", "ellipse", "diamond", "triangle"]) {
      const scope = textStyleScopeFor(kind);
      expect(scope).not.toBeNull();
      const doc = parseBoardDocument({
        version: 1,
        id: `board:${kind}`,
        name: kind,
        elements: [{ id: `element:${kind}`, kind, x: 0, y: 0, width: 100, height: 50, text: "Hi", textStyle: DEFAULT_TEXT_STYLES[scope!] }],
        connections: [],
      });
      expect(doc, `${kind} should survive a Firestore round trip`).not.toBeNull();
    }
  });
});
