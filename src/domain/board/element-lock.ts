import type { BoardElement, BoardElementId } from "@/domain/board/board-document";

/**
 * A locked element stays exactly where it is: it cannot be dragged, resized, retyped, erased or
 * deleted. It can still be clicked, because clicking it is the only way to unlock it again.
 */
export function isElementLocked(element: Pick<BoardElement, "locked">): boolean {
  return element.locked === true;
}

/** Locks or unlocks the given elements. Returns the same array when nothing changes. */
export function setElementsLocked(
  elements: BoardElement[],
  ids: BoardElementId[],
  locked: boolean,
): BoardElement[] {
  const target = new Set(ids);
  if (target.size === 0) return elements;
  let changed = false;
  const next = elements.map((element) => {
    if (!target.has(element.id) || isElementLocked(element) === locked) return element;
    changed = true;
    if (locked) return { ...element, locked: true };
    // Unlocking drops the field so boards never persist a flag that means "not locked".
    const copy = { ...element };
    delete copy.locked;
    return copy;
  });
  return changed ? next : elements;
}

/** True when the selection is entirely locked, which is what turns the lock button into unlock. */
export function isSelectionLocked(elements: BoardElement[], ids: BoardElementId[]): boolean {
  const target = new Set(ids);
  if (target.size === 0) return false;
  const selected = elements.filter((element) => target.has(element.id));
  return selected.length > 0 && selected.every(isElementLocked);
}
