# ADR 0011: Remove board alignment controls from Phase 4

- Status: Accepted
- Date: 2026-09-03

## Context

The Phase 4 toolbar exposed a six-way alignment menu for multi-selected elements. The product direction now favors direct placement and a less crowded mobile toolbar. The requested experience retains selecting several elements, including a desktop drag-selection marquee, but removes the alignment tool itself.

## Decision

- Remove the alignment menu from the toolbar and the corresponding board-engine capability.
- Keep multi-selection, movement, transformation, copy, duplicate, and delete unchanged.
- Replace Phase 4's alignment acceptance criterion with observable multi-selection through modifier-click and desktop marquee selection.

## Consequences

No board-document field or stored data changes. Existing boards require no migration. Alignment commands are not persisted, so removing the capability does not make existing board data unreadable.
