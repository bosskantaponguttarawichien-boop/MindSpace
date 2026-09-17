import { describe, expect, it } from "vitest";
import type { BoardDocument } from "@/domain/board/board-document";
import { applyProposalToDocument } from "@/domain/ai/apply-proposal";
import { validateProposal, type AiProposal } from "@/domain/ai/proposal-schema";

function baseDocument(): BoardDocument {
  return {
    version: 1,
    id: "board:test",
    name: "Test Board",
    elements: [
      { id: "element:1", kind: "note", x: 100, y: 100, width: 200, height: 120, text: "Root", color: "violet" },
      { id: "element:2", kind: "rectangle", x: 400, y: 100, width: 160, height: 80, text: "Child", color: "blue" },
    ],
    connections: [
      { id: "connection:1", fromId: "element:1", toId: "element:2" },
    ],
  };
}

let counter = 0;
function options(selectedIds: BoardDocument["elements"][number]["id"][] = []) {
  return {
    createElementId: () => `element:new-${++counter}` as const,
    createConnectionId: () => `connection:new-${++counter}` as const,
    createGroupId: () => `group:new-${++counter}`,
    selectedIds,
  };
}

function proposal(patch: Partial<AiProposal>): AiProposal {
  return { id: "proposal:test", title: "Test", explanation: "Test", ...patch };
}

describe("apply-proposal", () => {
  it("leaves a locked element untouched by an approved update or delete", () => {
    const document = baseDocument();
    document.elements[0]!.locked = true;

    const result = applyProposalToDocument(
      document,
      proposal({ updateElements: [{ id: "element:1", text: "Rewritten" }], deleteElementIds: ["element:1"] }),
      options(),
    );

    const kept = result?.document.elements.find((element) => element.id === "element:1");
    expect(kept?.text).toBe("Root");
    expect(result?.document.connections).toHaveLength(1);
  });

  it("returns null when a proposal carries no applicable operation", () => {
    expect(applyProposalToDocument(baseDocument(), proposal({}), options())).toBeNull();
  });

  it("creates a table element with a normalized grid and derived text", () => {
    const result = applyProposalToDocument(
      baseDocument(),
      proposal({ elements: [{ kind: "table", text: "", tableData: [["Task", "Owner"], ["Research"]] }] }),
      options(),
    );

    const table = result?.document.elements.at(-1);
    expect(table?.kind).toBe("table");
    expect(table?.rows).toBe(2);
    expect(table?.cols).toBe(2);
    expect(table?.tableData).toEqual([["Task", "Owner"], ["Research", ""]]);
    expect(table?.text).toBe("Task | Owner\nResearch | ");
  });

  it("honours proposed geometry and text style on new elements", () => {
    const result = applyProposalToDocument(
      baseDocument(),
      proposal({
        elements: [{ kind: "rectangle", text: "Placed", x: 900, y: 40, width: 300, height: 200, textStyle: { fontSize: 32, fontWeight: "bold", textAlign: "center" } }],
      }),
      options(),
    );

    const created = result?.document.elements.at(-1);
    expect(created).toMatchObject({ x: 900, y: 40, width: 300, height: 200 });
    expect(created?.textStyle).toEqual({ fontSize: 32, fontWeight: "bold", textAlign: "center" });
  });

  it("moves, resizes and restyles an existing element without touching the others", () => {
    const result = applyProposalToDocument(
      baseDocument(),
      proposal({ updateElements: [{ id: "element:2", x: 20, y: 30, width: 260, height: 140, textStyle: { textAlign: "right" } }] }),
      options(),
    );

    const updated = result?.document.elements.find((element) => element.id === "element:2");
    expect(updated).toMatchObject({ x: 20, y: 30, width: 260, height: 140 });
    expect(updated?.textStyle?.textAlign).toBe("right");
    expect(result?.document.elements.find((element) => element.id === "element:1")).toEqual(baseDocument().elements[0]);
  });

  it("converts a note into a table and back without leaving stale grid data", () => {
    const toTable = applyProposalToDocument(
      baseDocument(),
      proposal({ updateElements: [{ id: "element:1", kind: "table", tableData: [["A", "B"], ["1", "2"]] }] }),
      options(),
    );
    const table = toTable?.document.elements.find((element) => element.id === "element:1");
    expect(table?.kind).toBe("table");
    expect(table?.rows).toBe(2);
    expect(table?.tableData).toEqual([["A", "B"], ["1", "2"]]);

    const backToNote = applyProposalToDocument(
      toTable!.document,
      proposal({ updateElements: [{ id: "element:1", kind: "note" }] }),
      options(),
    );
    const note = backToNote?.document.elements.find((element) => element.id === "element:1");
    expect(note?.kind).toBe("note");
    expect(note?.rows).toBeUndefined();
    expect(note?.tableData).toBeUndefined();
  });

  it("deletes a single connector while keeping both elements", () => {
    const result = applyProposalToDocument(
      baseDocument(),
      proposal({ deleteConnectionIds: ["connection:1"] }),
      options(),
    );

    expect(result?.document.connections).toHaveLength(0);
    expect(result?.document.elements).toHaveLength(2);
  });

  it("groups and ungroups elements", () => {
    const grouped = applyProposalToDocument(
      baseDocument(),
      proposal({ groupElements: [{ elementIds: ["element:1", "element:2"] }] }),
      options(),
    );
    const groupIds = grouped?.document.elements.map((element) => element.groupId);
    expect(groupIds?.[0]).toBeDefined();
    expect(groupIds?.[0]).toBe(groupIds?.[1]);

    const ungrouped = applyProposalToDocument(
      grouped!.document,
      proposal({ ungroupElementIds: ["element:1"] }),
      options(),
    );
    expect(ungrouped?.document.elements.every((element) => element.groupId === undefined)).toBe(true);
  });

  it("connects two existing elements", () => {
    const document = baseDocument();
    document.connections = [];
    const result = applyProposalToDocument(
      document,
      proposal({ connections: [{ fromId: "element:1", toId: "element:2", pathStyle: "elbow", color: "red" }] }),
      options(),
    );

    expect(result?.document.connections).toHaveLength(1);
    expect(result?.document.connections[0]).toMatchObject({ fromId: "element:1", toId: "element:2", pathStyle: "elbow", color: "red" });
  });

  it("re-arranges the mind map with the requested layout direction", () => {
    const result = applyProposalToDocument(
      baseDocument(),
      proposal({ layout: { direction: "tree", rootId: "element:1" } }),
      options(),
    );

    const root = result?.document.elements.find((element) => element.id === "element:1");
    const child = result?.document.elements.find((element) => element.id === "element:2");
    expect(child!.y).toBeGreaterThan(root!.y);
  });

  it("applies a validated multi-operation proposal in one approval", () => {
    const validated = validateProposal({
      title: "Tidy board",
      explanation: "Add a branch, recolor, and drop a connector",
      elements: [{ kind: "note", text: "New branch", color: "emerald" }],
      connections: [{ fromId: "element:1", toIndex: 0 }],
      updateElements: [{ id: "element:2", color: "amber" }],
      deleteConnectionIds: ["connection:1"],
    });

    const result = applyProposalToDocument(baseDocument(), validated!, options());
    expect(result?.createdElementIds).toHaveLength(1);
    expect(result?.document.elements.find((element) => element.id === "element:2")?.color).toBe("amber");
    expect(result?.document.connections).toHaveLength(1);
    expect(result?.document.connections[0]?.fromId).toBe("element:1");
  });
});
