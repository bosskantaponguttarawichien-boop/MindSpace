# ADR 0015: Element grouping and joint selection movement

- Status: Accepted
- Date: 2026-09-13

## Context

Multi-selection (shift-click and marquee) lets a user select several elements, but dragging one selected element only moved that single element in `BoardDocument` state — other selected elements kept their position even though the selection box visually followed the drag. There was also no way to group elements so they keep moving together across separate selection actions.

## Decision

- Add an optional `groupId?: string` field to `BoardElement`. Elements sharing a `groupId` belong to one group; the field is additive and absent on existing boards.
- Add `groupSelection`/`ungroupSelection` to `BoardEngine`, implemented in `konva-board.tsx` following the existing `deleteSelection`/`duplicateSelection` pattern (read `selectionRef.current`, transform `documentRef.current`, `commit(...)`). Grouping requires at least two selected elements; ungrouping clears `groupId` from every element sharing a group with the current selection. The pure element-array transforms live in `src/domain/board/grouping.ts` for unit testing.
- Selecting any element that belongs to a group (click, marquee, shift-click, long-press) expands the selection to every element sharing that group, so a group always moves and is act­ed on as one unit.
- Fix multi-element drag: dragging any element that is part of a multi-element selection now moves every selected element by the same delta, previewed live via direct Konva node positioning and committed as a single history entry (one undo step for the whole selection/group).
- Expose group/ungroup through a keyboard shortcut (Ctrl/Cmd+G, Ctrl/Cmd+Shift+G) and through `WorkspaceTopbar` buttons alongside duplicate/delete.

## Consequences

`BoardElement.groupId` is a new optional persisted field; existing boards without it keep working unchanged (validated as an optional string in the Firestore repository). Multi-selection drag behavior changes for all users, not only grouped elements — this was the reported/expected behavior gap this task closes, and ADR 0011 already treats "movement" of a multi-selection as in-scope, unchanged product intent. No new dependency or external service is introduced.
