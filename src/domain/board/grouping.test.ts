import { describe, expect, it } from "vitest";
import { expandSelectionWithGroups, getGroupMembers, groupElements, ungroupElements } from "@/domain/board/grouping";
import type { BoardElement } from "@/domain/board/board-document";

const elements: BoardElement[] = [
  { id: "element:a", kind: "rectangle", x: 10, y: 20, width: 100, height: 80, text: "A" },
  { id: "element:b", kind: "rectangle", x: 200, y: 20, width: 100, height: 80, text: "B" },
  { id: "element:c", kind: "rectangle", x: 400, y: 20, width: 100, height: 80, text: "C" },
];

describe("groupElements", () => {
  it("assigns a shared groupId to the selected elements", () => {
    const result = groupElements(elements, ["element:a", "element:b"], "group:1");
    expect(result.find((element) => element.id === "element:a")?.groupId).toBe("group:1");
    expect(result.find((element) => element.id === "element:b")?.groupId).toBe("group:1");
    expect(result.find((element) => element.id === "element:c")?.groupId).toBeUndefined();
  });

  it("does not group a single element", () => {
    const result = groupElements(elements, ["element:a"], "group:1");
    expect(result).toBe(elements);
  });

  it("does not mutate the source array", () => {
    groupElements(elements, ["element:a", "element:b"], "group:1");
    expect(elements.every((element) => element.groupId === undefined)).toBe(true);
  });
});

describe("ungroupElements", () => {
  const grouped = groupElements(elements, ["element:a", "element:b"], "group:1");

  it("clears groupId from every sibling when only one member is selected", () => {
    const result = ungroupElements(grouped, ["element:a"]);
    expect(result.find((element) => element.id === "element:a")?.groupId).toBeUndefined();
    expect(result.find((element) => element.id === "element:b")?.groupId).toBeUndefined();
  });

  it("is a no-op for elements without a group", () => {
    const result = ungroupElements(elements, ["element:c"]);
    expect(result).toBe(elements);
  });
});

describe("expandSelectionWithGroups", () => {
  const grouped = groupElements(elements, ["element:a", "element:b"], "group:1");

  it("expands a single grouped id to every sibling in the group", () => {
    const result = expandSelectionWithGroups(["element:a"], grouped);
    expect(new Set(result)).toEqual(new Set(["element:a", "element:b"]));
  });

  it("leaves an ungrouped selection unchanged", () => {
    const result = expandSelectionWithGroups(["element:c"], grouped);
    expect(result).toEqual(["element:c"]);
  });

  it("merges groups reached through an additive multi-selection", () => {
    const result = expandSelectionWithGroups(["element:a", "element:c"], grouped);
    expect(new Set(result)).toEqual(new Set(["element:a", "element:b", "element:c"]));
  });

  it("does not expand members of the currently focused group", () => {
    const result = expandSelectionWithGroups(["element:a"], grouped, "group:1");
    expect(result).toEqual(["element:a"]);
  });

  it("still expands members of other groups when another group is focused", () => {
    const multiGrouped = [
      ...grouped,
      { id: "element:d", kind: "rectangle", x: 500, y: 20, width: 100, height: 80, text: "D", groupId: "group:2" },
      { id: "element:e", kind: "rectangle", x: 600, y: 20, width: 100, height: 80, text: "E", groupId: "group:2" },
    ] as BoardElement[];
    // Group 1 is focused, so selecting element:a inside group:1 does not expand to element:b
    expect(expandSelectionWithGroups(["element:a"], multiGrouped, "group:1")).toEqual(["element:a"]);
    // But selecting element:d in group:2 expands to group:2 members
    expect(new Set(expandSelectionWithGroups(["element:d"], multiGrouped, "group:1"))).toEqual(new Set(["element:d", "element:e"]));
  });
});

describe("getGroupMembers", () => {
  const grouped = groupElements(elements, ["element:a", "element:b"], "group:1");

  it("returns all IDs matching the groupId", () => {
    expect(getGroupMembers(grouped, "group:1")).toEqual(["element:a", "element:b"]);
    expect(getGroupMembers(grouped, "group:unknown")).toEqual([]);
  });
});
