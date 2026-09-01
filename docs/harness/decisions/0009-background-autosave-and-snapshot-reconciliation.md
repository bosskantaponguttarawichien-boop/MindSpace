# ADR 0009: Background autosave and snapshot reconciliation

- Status: Accepted
- Date: 2026-09-02

## Context

Editing a board while a save was in flight lost work. `usePersistedBoards` debounced each change for 600 ms and then replaced the whole board list with every Firestore snapshot. A snapshot describes the state the last write left behind, and Firestore also emits one locally as soon as a write is queued, so the echo of a write routinely arrived after the user had already moved on. The stale document flowed into `BoardCanvas`, `KonvaBoard` saw a different `initialDocument`, and the canvas reset mid-gesture — dropping the edits made in between and clearing selection. Two further irritations came from the same path: the badge announced "Saving…" on every keystroke, and `orderBy("updatedAt", "desc")` reshuffled the sidebar on each write.

## Decision

- A save queue (`features/workspace/sync/board-save-queue.ts`) owns writes. It coalesces a burst of edits (600 ms idle, 2500 ms maximum hold so a long drag still reaches Firestore), never runs two writes for one board at once, keeps the newest document queued while a write is in flight, and retries a failed write every 4 s instead of dropping the edits. It publishes the set of board IDs that are still unsaved.
- Snapshots are reconciled, not applied (`features/workspace/sync/merge-remote-boards.ts`). A board with a pending write keeps its local document; every other board takes the remote one. Ordering follows the on-screen list, so a save no longer reshuffles the sidebar, and boards deleted locally stay hidden until the snapshot catches up.
- The hook holds the board list in a ref as well as state, so a snapshot merges against what is actually on screen and the editing callbacks stop being rebuilt on every change.
- Saving is silent by default: the badge switches to "Saving…" only when a write is still outstanding after 1200 ms, and reports "Saved" the moment the queue drains. Failures still surface as an error badge.
- Queued edits are flushed when the page is hidden, on `pagehide`, and when the hook tears down, rather than having their timers cleared.

## Rollback and compatibility

Nothing about the persisted schema, the Firestore query, or the security rules changes; the difference is entirely in when a client writes and which side wins a reconcile. Rolling back restores the previous overwrite behaviour and its data loss. A pending write that loses its client — a closed tab where the flush never reached the network — is still lost, which is the same guarantee as before.
