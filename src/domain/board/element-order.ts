import type { BoardElement, BoardElementId } from "@/domain/board/board-document";

/**
 * Elements are painted in list order, so the last element in the list is the one on top.
 * Layering therefore only ever reorders the list; no element is otherwise changed, and a
 * placement that cannot move anything returns the original list so callers can skip the commit.
 */
export const LAYER_PLACEMENTS = ["front", "forward", "backward", "back"] as const;

export type LayerPlacement = (typeof LAYER_PLACEMENTS)[number];

export function reorderElements(
  elements: BoardElement[],
  ids: BoardElementId[],
  placement: LayerPlacement,
): BoardElement[] {
  const selected = new Set(ids);
  if (selected.size === 0) return elements;
  if (!elements.some((element) => selected.has(element.id))) return elements;

  const next = placement === "front" || placement === "back"
    ? moveToEdge(elements, selected, placement)
    : moveOneStep(elements, selected, placement);
  return sameOrder(elements, next) ? elements : next;
}

/** Front and back keep the moved elements in their own relative order. */
function moveToEdge(elements: BoardElement[], selected: Set<BoardElementId>, placement: "front" | "back") {
  const moving = elements.filter((element) => selected.has(element.id));
  const rest = elements.filter((element) => !selected.has(element.id));
  return placement === "front" ? [...rest, ...moving] : [...moving, ...rest];
}

/**
 * One step hops over the nearest neighbour that is not itself selected, so a block of selected
 * elements travels together instead of shuffling within itself.
 */
function moveOneStep(elements: BoardElement[], selected: Set<BoardElementId>, placement: "forward" | "backward") {
  const next = [...elements];
  if (placement === "forward") {
    for (let index = next.length - 2; index >= 0; index -= 1) {
      const element = next[index]!;
      const ahead = next[index + 1]!;
      if (!selected.has(element.id) || selected.has(ahead.id)) continue;
      next[index] = ahead;
      next[index + 1] = element;
    }
    return next;
  }
  for (let index = 1; index < next.length; index += 1) {
    const element = next[index]!;
    const behind = next[index - 1]!;
    if (!selected.has(element.id) || selected.has(behind.id)) continue;
    next[index] = behind;
    next[index - 1] = element;
  }
  return next;
}

function sameOrder(left: BoardElement[], right: BoardElement[]) {
  return left.length === right.length && left.every((element, index) => element === right[index]);
}
