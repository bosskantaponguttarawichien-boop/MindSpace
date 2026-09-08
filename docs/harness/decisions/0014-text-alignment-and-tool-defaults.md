# ADR 0014: Persist text alignment and reuse creation defaults

- Status: Accepted
- Date: 2026-09-03

## Decision

Text elements may persist `textStyle.textAlign` as an additive value (`left`, `center`, or `right`). Missing alignment remains left-aligned for compatibility with existing boards.

The active creation defaults remain editor state. When Enter/Tab creates a related mind-map node, it reuses the source element's shape/text style and the current connector defaults, rather than silently creating a sticky note with a default connector.

## Consequences

Text alignment is preserved through save, reload, undo/redo, and exports. Tool defaults affect future elements without overwriting unrelated existing elements; selected elements are updated only by an explicit toolbar action.
