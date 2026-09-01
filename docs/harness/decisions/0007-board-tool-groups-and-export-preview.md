# ADR 0007: Eraser tool, extended color set, and previewed PDF export

- Status: Accepted
- Date: 2026-09-01

## Context

Phase 4.3 fixes defects the user hit on real boards: PDF export never reached a print dialog, the colour tray was clipped by the toolbar, the tool row had no readable grouping, and there was no way to remove one element without selecting it first. All of it has to work with touch input.

## Decision

- `printBoard` is replaced by `renderExport()`, which returns the fitted landscape page as a PNG data URL plus its pixel size. The board engine renders; the feature layer decides what to do with the result.
- Export shows that render in a confirmation dialog first. Confirming prints through a hidden same-origin iframe rather than `window.open`, because `window.open(..., "noopener")` returns `null` in Chrome, so the previous implementation always fell into its pop-up warning and never printed. The browser print dialog stays the PDF writer, as decided in ADR 0006.
- `BoardElement.color` grows from five to ten values: `red`, `orange`, `pink`, `teal`, and `indigo` join the existing set. This widens the persisted enum, so `parseBoardDocument` accepts the new values before any client can write them.
- A new `eraser` tool removes the element or connector under the pointer. A press-and-drag erases everything it crosses and commits one history entry, matching how freehand drawing already groups a gesture.
- Toolbar controls are declared as ordered groups (pointer, text, shapes, lines, files, structure) rendered with a separator between groups, and the row wraps instead of scrolling horizontally so every tool stays reachable on a phone.

## Rollback and compatibility

A client older than this change rejects a document that uses one of the five new colours (`parseBoardDocument` returns `null`) and drops that board from its list until it reloads. Nothing is written to Firestore in that state, so a reload of the stale client restores it. Rolling back the enum requires rewriting affected elements to a colour in the original five.
