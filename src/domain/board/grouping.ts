import type { BoardElement, BoardElementId } from "@/domain/board/board-document";

/** Assigns a shared groupId to the given elements. No-op below two elements. */
export function groupElements(elements: BoardElement[], ids: BoardElementId[], groupId: string): BoardElement[] {
  if (ids.length < 2) return elements;
  const idSet = new Set(ids);
  return elements.map((element) => (idSet.has(element.id) ? { ...element, groupId } : element));
}

/** Clears groupId from every element sharing a group with the given ids. No-op if none are grouped. */
export function ungroupElements(elements: BoardElement[], ids: BoardElementId[]): BoardElement[] {
  const idSet = new Set(ids);
  const groupIds = new Set(
    elements.filter((element) => idSet.has(element.id) && element.groupId).map((element) => element.groupId as string),
  );
  if (groupIds.size === 0) return elements;
  return elements.map((element) => {
    if (!element.groupId || !groupIds.has(element.groupId)) return element;
    const copy = { ...element };
    delete copy.groupId;
    return copy;
  });
}

/** Expands a selection so selecting one grouped element selects every sibling sharing its group(s). */
export function expandSelectionWithGroups(ids: BoardElementId[], elements: BoardElement[]): BoardElementId[] {
  const idSet = new Set(ids);
  const groupIds = new Set(
    elements.filter((element) => idSet.has(element.id) && element.groupId).map((element) => element.groupId as string),
  );
  if (groupIds.size === 0) return ids;
  const expanded = new Set(ids);
  for (const element of elements) {
    if (element.groupId && groupIds.has(element.groupId)) expanded.add(element.id);
  }
  return [...expanded];
}
