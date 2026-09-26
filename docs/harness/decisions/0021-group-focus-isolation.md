# ADR 0021: Group focus drill-down isolation and joint selection movement

- Status: Accepted
- Date: 2026-09-26

## Context

In ADR 0015, grouping was introduced so that selecting any element within a group selects the whole group. However, users could not select, move, or transform an individual element inside a group without ungrouping the whole group first. Furthermore, joint dragging for multi-selection needed direct synchronization across all selected sibling nodes during drag interactions.

## Decision

- Support group focus isolation mode (drill-down):
  - Single-click on a grouped element continues to select the entire group.
  - Double-clicking (or double-tapping) a grouped element enters focus mode for that group (`focusedGroupId`), selecting only that specific element.
  - While focused within a group, clicking other elements in the same group selects those elements individually without expanding to the entire group.
  - A visual dashed bounding box with a "Group" badge outlines the focused group.
  - Clicking on the canvas background (empty space), clicking an element outside the focused group, or pressing `Escape` unfocuses and exits focus mode.
  - Double-clicking an already-focused element opens text or cell editing as usual.
- Support joint drag movement for multi-element selections:
  - When dragging any element in a multi-element selection (such as a whole group selected from root), all selected elements move by the same delta in real-time, updating arrow connectors and transformer bounds live, and committing as a single historical undo entry.
  - When in group focus mode, dragging a single element moves only that element.
- Domain helpers:
  - Update `expandSelectionWithGroups(ids, elements, focusedGroupId?)` in `src/domain/board/grouping.ts` to skip expansion for members of the currently focused group.
  - Add `elementsBoundingBox(elements)` in `src/domain/board/geometry.ts` to compute combined bounding boxes for group indicators.

## Consequences

- No changes to persisted document schema or database layer.
- Group interaction follows standard canvas conventions (such as Figma and Miro), making grouped elements editable in place without destructive ungrouping.
- No new external dependencies.
