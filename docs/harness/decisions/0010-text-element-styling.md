# ADR 0010: Persist text-element styling as an additive board-document field

- Status: Accepted
- Date: 2026-09-03

## Context

Phase 4 board text needs a visible Bold control and a font-size selector. The board document is persisted to Firestore and is the source for canvas rendering, undo/redo, PDF export, and later synchronization. Styling only in a textarea would disappear after an edit or reload.

## Decision

- Text formatting applies to an entire `text` board element. Inline rich-text spans are explicitly deferred.
- A `textStyle` object with an approved `fontSize` and `fontWeight` is an optional field on a text element. New text writes both values; missing values on existing version-1 documents render as 18px normal text.
- The document remains version 1 because the field is additive and optional. Firestore validation admits it only on text elements and rejects unapproved values.
- Formatting a selected text element uses the existing board-engine history path, so it is undoable and persists with the ordinary board save queue. Formatting selected before creation is an editor-only default for the next text element.

## Rollback and compatibility

Older documents require no migration. An older client ignores the optional field and still accepts the document because its parser does not reject unknown element fields; reverting this feature therefore preserves board data, although it renders text at its old default style.
