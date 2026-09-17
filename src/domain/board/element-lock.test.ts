import { describe, expect, it } from "vitest";
import type { BoardElement, BoardElementId } from "@/domain/board/board-document";
import { isElementLocked, isSelectionLocked, setElementsLocked } from "@/domain/board/element-lock";

function element(suffix: string, locked?: boolean): BoardElement {
  return { id: `element:${suffix}` as BoardElementId, kind: "note", x: 0, y: 0, width: 10, height: 10, text: suffix, ...(locked ? { locked } : {}) };
}

describe("element locking", () => {
  it("treats a board saved before locking existed as unlocked", () => {
    expect(isElementLocked(element("a"))).toBe(false);
  });

  it("locks only the given elements", () => {
    const elements = [element("a"), element("b")];

    const next = setElementsLocked(elements, [elements[0]!.id], true);

    expect(next[0]!.locked).toBe(true);
    expect(next[1]).toBe(elements[1]);
  });

  it("drops the flag on unlock instead of persisting a false", () => {
    const elements = [element("a", true)];

    const next = setElementsLocked(elements, [elements[0]!.id], false);

    expect("locked" in next[0]!).toBe(false);
  });

  it("returns the same list when nothing changes, so no history entry is written", () => {
    const elements = [element("a", true)];
    expect(setElementsLocked(elements, [elements[0]!.id], true)).toBe(elements);
    expect(setElementsLocked(elements, [], false)).toBe(elements);
  });

  it("reports a selection as locked only when every selected element is locked", () => {
    const locked = element("a", true);
    const unlocked = element("b");

    expect(isSelectionLocked([locked, unlocked], [locked.id])).toBe(true);
    expect(isSelectionLocked([locked, unlocked], [locked.id, unlocked.id])).toBe(false);
    expect(isSelectionLocked([locked, unlocked], [])).toBe(false);
  });
});
