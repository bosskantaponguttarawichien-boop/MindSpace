# ADR 0022: Optional note and table titles, visual connector default

- Status: Accepted
- Date: 2026-09-26

## Decision

- Add optional `title` to board elements. It is rendered and edited independently of `text` only for notes and tables. Existing boards without a title retain their previous layout. An empty title is removed on save.
- A selected note or table exposes a title action in its existing toolbar. Title changes go through the board document commit so they participate in undo/redo, autosave, and exports. Shape text remains the shape's sole label.
- New connectors default to a curved violet plain line with small outlined circular endpoints. The existing path, arrow, line-style and color controls remain available. Existing connectors retain their persisted styles and historical fallbacks.
- Show small outline icons inside the optional title areas of notes and tables. The title areas are absent when the title is absent.

## Consequences

- Persisted element `title` is an additive optional field; no migration of older documents is needed.
- Table grid rows use the remaining height when a title is present. A blank title takes no space.
