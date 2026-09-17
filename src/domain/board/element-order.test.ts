import { describe, expect, it } from "vitest";
import type { BoardElement, BoardElementId } from "@/domain/board/board-document";
import { reorderElements } from "@/domain/board/element-order";

function element(suffix: string): BoardElement {
  return { id: `element:${suffix}` as BoardElementId, kind: "note", x: 0, y: 0, width: 10, height: 10, text: suffix };
}

const a = element("a");
const b = element("b");
const c = element("c");
const order = (elements: BoardElement[]) => elements.map((item) => item.text).join("");

describe("reorderElements", () => {
  it("paints a selection on top of everything else", () => {
    expect(order(reorderElements([a, b, c], [a.id], "front"))).toBe("bca");
  });

  it("paints a selection behind everything else", () => {
    expect(order(reorderElements([a, b, c], [c.id], "back"))).toBe("cab");
  });

  it("moves a selection one step at a time in both directions", () => {
    expect(order(reorderElements([a, b, c], [a.id], "forward"))).toBe("bac");
    expect(order(reorderElements([a, b, c], [c.id], "backward"))).toBe("acb");
  });

  it("keeps a multiple selection together instead of shuffling it internally", () => {
    expect(order(reorderElements([a, b, c], [a.id, b.id], "forward"))).toBe("cab");
    expect(order(reorderElements([a, b, c], [b.id, c.id], "backward"))).toBe("bca");
  });

  it("keeps the relative order of the elements it moves to an edge", () => {
    expect(order(reorderElements([a, b, c], [a.id, c.id], "front"))).toBe("bac");
    expect(order(reorderElements([a, b, c], [a.id, c.id], "back"))).toBe("acb");
  });

  it("returns the same list when nothing can move, so no history entry is written", () => {
    const elements = [a, b, c];
    expect(reorderElements(elements, [c.id], "front")).toBe(elements);
    expect(reorderElements(elements, [a.id], "backward")).toBe(elements);
    expect(reorderElements(elements, [], "front")).toBe(elements);
    expect(reorderElements(elements, ["element:missing" as BoardElementId], "front")).toBe(elements);
  });
});
