# ADR 0016: Vertical text alignment for board elements

- Status: Accepted
- Date: 2026-09-14

## Context

Users requested the ability to align text vertically (top, middle, bottom) within shapes and text elements, in addition to horizontal alignment (left, center, right).

## Decision

- Add an optional `verticalAlign?: BoardVerticalAlignment` (`"top" | "middle" | "bottom"`) field to `BoardTextStyle`.
- The field is additive: missing `verticalAlign` defaults to `"top"`, ensuring backward compatibility with existing saved boards.
- Validate `verticalAlign` in `isBoardTextStyle` within `firestore-board-repository.ts`.
- In `board-toolbar.tsx`, enhance the alignment popover (`textAlignRow`) by adding Top (`AlignVerticalJustifyStart`), Middle (`AlignVerticalJustifyCenter`), and Bottom (`AlignVerticalJustifyEnd`) controls beside the horizontal alignment buttons, separated by a vertical divider.
- In `konva-board.tsx`, calculate total text height and position `startY` based on `verticalAlign` (`top`, `middle`, `bottom`) in `MarkdownText`.
- Selection state and `setSelectionTextStyle` account for `verticalAlign` when checking and applying text style changes.

## Consequences

Vertical text alignment is persisted across save, reload, undo/redo, and exports. Existing boards and elements without explicit vertical alignment remain unaffected and render with default top alignment.
