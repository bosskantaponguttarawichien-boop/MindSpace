# ADR 0004: User-scoped Firestore board persistence

- Status: Accepted
- Date: 2026-09-01

## Decision

- Firebase Anonymous Authentication creates a private browser identity without a login screen.
- Boards are stored at `users/{uid}/boards/{boardId}`. Each record contains `name`, a versioned `document`, `schemaVersion`, and `updatedAt`.
- The client validates Firestore data before passing it to the board editor.
- Edits remain local first and are persisted after a 600 ms debounce. A failed save is shown as a recoverable error in the UI.
- Firestore snapshots are the source for initial loading and other tabs using the same anonymous identity. Conflicts use last-write-wins for this personal, single-user phase.
- Firestore Security Rules restrict every board to its authenticated owner; the matching rules live in `firestore.rules`.

## Consequences

Anonymous identity does not sync boards to a different browser/device. Account linking is required before cross-device access can be offered safely.
