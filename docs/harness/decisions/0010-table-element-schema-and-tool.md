# ADR 0010: Table element schema, minimalist UI, and interactive grid mutations

- Status: Accepted
- Date: 2026-09-08

## Decision

- Extend `BoardElement.kind` with `"table"`.
- Add optional domain fields `rows?: number`, `cols?: number`, and `tableData?: string[][]` to `BoardElement` for structured grid data representation.
- Add a new Table tool to `BoardTool` and `contentTools` in the board toolbar.
- Implement cell-specific inline editing (`editingCell: { id, row, col, value }`) positioned directly over individual target grid cells, avoiding full-table raw text overlays.
- Render tables with modern minimalist whiteboard aesthetics: crisp 1px borders, subtle header section background fill (`colors.stroke` opacity 0.12), high-contrast cell typography, and theme color palette integration.
- Expose row/column insertion and deletion methods (`addTableRow`, `deleteTableRow`, `addTableCol`, `deleteTableCol`) on `BoardEngine` supporting operations on any row or column position (including middle rows/cols) with full undo/redo.
- Provide interactive canvas controls and toolbar actions for quick row/column expansion, deletion, and color customization.

## Consequences

- Existing documents continue to function seamlessly as `rows`, `cols`, and `tableData` are optional fields.
- Board operations including duplicate, move, resize, selection color changes, and undo/redo automatically work with table elements through the board command layer.
