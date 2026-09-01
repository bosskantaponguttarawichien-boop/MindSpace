# Product Scope

## Product outcome

MindSpace is an AI-powered personal knowledge workspace built around an infinite board. The full vision remains in `requirement.md`; delivery is phased to avoid coupling the board engine to persistence, files, realtime, and AI too early.

## Current phase: Phase 4 — Image files and PDF export

The goal is to add useful visual references to a board while keeping file bytes outside the board document.

### In scope

- Application shell matching the POC's information architecture: board list, board workspace, top bar, tool bar, and a non-functional AI-panel placeholder.
- Infinite canvas using a board-engine adapter, with pan and zoom.
- Create and edit text, sticky-note, and basic shape elements.
- Select, multi-select, move, resize, duplicate, copy/paste, and delete.
- Create/delete node-to-node connectors that follow moved nodes.
- Undo and redo for every board mutation in this phase.
- Keyboard access for primary actions and clear focus states.
- Accept PNG, JPEG, WEBP, or GIF images up to 25 MB; resize supported still images to a 1,920px maximum side and upload WebP only when it reduces bytes. Stored files remain capped at 10 MB.
- Add uploaded images to a board as movable, resizable, undoable elements.
- Persist image metadata and safe download URLs in the versioned board document.
- Export the full current board bounds through the browser print dialog as PDF.
- Remove an image object from Storage 30 seconds after it is deleted from a board; undo within that window cancels cleanup.
- Open a local PDF preview without claiming it was saved or synced.

### Explicitly out of scope

- PDF storage, page extraction, and text extraction.
- Multi-page PDF layouts for oversized boards.
- Accounts, granular permissions, link revocation, and collaboration beyond one trusted user.
- Live AI calls, AI context collection, and applying AI-generated operations.
- Sharing, permissions, billing, analytics, and production deployment.
- Building a custom canvas engine when the approved board engine supports the need.

Out-of-scope UI may appear as disabled or clearly labelled preview; it must not pretend that data was saved, synced, exported, or processed.

## Phase 4 acceptance criteria

1. A user can choose a supported image and see it on the board.
2. Image geometry is persisted and remains after reload.
3. Images are uploaded to Firebase Storage, not embedded in Firestore documents.
4. A user can open the browser print dialog to save the full current board as PDF.
5. Deleting an image removes its Storage object after a short undo window.
6. A user can open a local PDF preview and clearly sees that it is not yet persisted.
7. `lint`, `typecheck`, `test`, and `build` pass.

## Promotion gate to PDF ingestion

Before cross-device access, choose an account-linking experience, migrate anonymous data safely, add rules/emulator tests for migration, and define conflict behavior across devices.
