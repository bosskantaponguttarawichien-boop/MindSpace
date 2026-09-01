# Product Scope

## Product outcome

MindSpace is an AI-powered personal knowledge workspace built around an infinite board. The full vision remains in `requirement.md`; delivery is phased to avoid coupling the board engine to persistence, files, realtime, and AI too early.

## Current phase: Phase 2 — Personal board persistence

The goal is to persist a private user's versioned board documents without adding a visible login flow, files, collaboration, or AI execution.

### In scope

- Application shell matching the POC's information architecture: board list, board workspace, top bar, tool bar, and a non-functional AI-panel placeholder.
- Infinite canvas using a board-engine adapter, with pan and zoom.
- Create and edit text, sticky-note, and basic shape elements.
- Select, multi-select, move, resize, duplicate, copy/paste, and delete.
- Create/delete node-to-node connectors that follow moved nodes.
- Undo and redo for every board mutation in this phase.
- Keyboard access for primary actions and clear focus states.
- Firebase Anonymous Authentication with no login UI.
- Firestore board list/load/create and debounced auto-save with clear connecting, saving, saved, and error states.
- Firestore Security Rules that isolate documents by authenticated Firebase UID.
- Validating persisted board documents before the editor uses them.

### Explicitly out of scope

- Account linking, cross-device sync, collaboration, and conflict resolution beyond last-write-wins within one anonymous browser identity.
- Image/PDF upload or processing and PDF export.
- Live AI calls, AI context collection, and applying AI-generated operations.
- Sharing, permissions, billing, analytics, and production deployment.
- Building a custom canvas engine when the approved board engine supports the need.

Out-of-scope UI may appear as disabled or clearly labelled preview; it must not pretend that data was saved, synced, exported, or processed.

## Phase 2 acceptance criteria

1. The app silently obtains an anonymous Firebase identity and does not show a login UI.
2. A new browser profile receives one empty board, and it can create more boards.
3. Board edits save after a short debounce and survive a page reload in the same browser profile.
4. The UI reports connecting, saving, saved, and save-error states honestly.
5. Firestore records are validated before entering the board editor and Security Rules isolate records by Firebase UID.
6. `lint`, `typecheck`, `test`, and `build` pass.

## Promotion gate to account-backed sync

Before cross-device access, choose an account-linking experience, migrate anonymous data safely, add rules/emulator tests for migration, and define conflict behavior across devices.
