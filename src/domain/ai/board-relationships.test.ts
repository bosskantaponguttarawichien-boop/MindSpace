import { describe, expect, it } from "vitest";
import type { BoardElementId } from "@/domain/board/board-document";
import { deriveRelationships, NEARBY_GAP, type RelationshipElement, type RelationshipLink } from "@/domain/ai/board-relationships";

function id(name: string): BoardElementId {
  return `element:${name}`;
}

function element(name: string, patch: Partial<Omit<RelationshipElement, "id">> = {}): RelationshipElement {
  return { id: id(name), kind: "note", x: 0, y: 0, width: 100, height: 100, text: name, ...patch };
}

function outlineOf(elements: RelationshipElement[], links: RelationshipLink[] = []) {
  return deriveRelationships(elements, links).outline.map((node) => [node.label, node.depth, node.relation ?? "-"]);
}

describe("board-relationships frames", () => {
  it("nests an element that sits inside a shape under that shape", () => {
    const outline = outlineOf([
      element("Discovery", { kind: "rectangle", width: 600, height: 400 }),
      element("User interviews", { x: 40, y: 40 }),
      element("Elsewhere", { x: 2000, y: 2000 }),
    ]);

    expect(outline).toEqual([
      ["Discovery", 0, "-"],
      ["User interviews", 1, "inside"],
    ]);
  });

  it("keeps the innermost frame as the parent when frames are nested", () => {
    const relationships = deriveRelationships([
      element("Board", { kind: "rectangle", width: 900, height: 700 }),
      element("Section", { kind: "rectangle", x: 50, y: 50, width: 400, height: 300 }),
      element("Detail", { x: 80, y: 80 }),
    ], []);

    expect(relationships.containerByElementId.get(id("Detail"))).toBe(id("Section"));
    expect(relationships.outline.map((node) => [node.label, node.depth])).toEqual([
      ["Board", 0],
      ["Section", 1],
      ["Detail", 2],
    ]);
  });

  it("lets a connector win over the frame an element sits in", () => {
    const outline = outlineOf(
      [
        element("Frame", { kind: "rectangle", width: 600, height: 400 }),
        element("Owned by connector", { x: 40, y: 40 }),
        element("Real parent", { x: 1500 }),
      ],
      [{ fromId: id("Real parent"), toId: id("Owned by connector") }],
    );

    expect(outline).toEqual([
      ["Real parent", 0, "-"],
      ["Owned by connector", 1, "-"],
      ["Frame", 0, "-"],
    ]);
  });

  it("lets grouping win over the frame when the group is anchored in the connector tree", () => {
    const outline = outlineOf(
      [
        element("Plan", { kind: "rectangle", width: 900, height: 700 }),
        element("Marketing", { x: 40, y: 40, groupId: "group:mkt" }),
        element("Budget", { x: 40, y: 300, groupId: "group:mkt" }),
        element("Workstreams", { x: 2000 }),
      ],
      [{ fromId: id("Workstreams"), toId: id("Marketing") }],
    );

    expect(outline).toEqual([
      ["Workstreams", 0, "-"],
      ["Marketing", 1, "-"],
      ["Budget", 1, "same group"],
      ["Plan", 0, "-"],
    ]);
  });
});

describe("board-relationships proximity", () => {
  it("clusters elements that only relate by sitting close together", () => {
    const relationships = deriveRelationships([
      element("Idea A"),
      element("Idea B", { x: 100 + NEARBY_GAP - 1 }),
      element("Unrelated", { x: 3000 }),
    ], []);

    expect(relationships.clusters).toEqual([{ name: "P1", elementIds: [id("Idea A"), id("Idea B")] }]);
    expect(relationships.outline.map((node) => [node.label, node.depth, node.relation ?? "-"])).toEqual([
      ["Idea A", 0, "-"],
      ["Idea B", 0, "nearby"],
    ]);
  });

  it("does not cluster elements further apart than the gap", () => {
    const relationships = deriveRelationships([
      element("A"),
      element("B", { x: 100 + NEARBY_GAP + 1 }),
    ], []);

    expect(relationships.clusters).toEqual([]);
    expect(relationships.outline).toEqual([]);
  });

  it("leaves connected, grouped and framed elements out of proximity clusters", () => {
    const relationships = deriveRelationships(
      [
        element("Root"),
        element("Child", { x: 120 }),
        element("G-A", { y: 200, groupId: "group:x" }),
        element("G-B", { x: 120, y: 200, groupId: "group:x" }),
      ],
      [{ fromId: id("Root"), toId: id("Child") }],
    );

    expect(relationships.clusters).toEqual([]);
  });

  it("chains a run of nearby elements into one cluster", () => {
    const relationships = deriveRelationships([
      element("A"),
      element("B", { x: 140 }),
      element("C", { x: 280 }),
    ], []);

    expect(relationships.clusters).toEqual([{ name: "P1", elementIds: [id("A"), id("B"), id("C")] }]);
  });
});
