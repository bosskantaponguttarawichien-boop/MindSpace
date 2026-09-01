# ADR 0005: Private sync-link workspaces

- Status: Accepted
- Date: 2026-09-01

## Decision

- A user can copy a private workspace URL without creating an account.
- The URL contains a cryptographically random UUID. Boards in that workspace are stored at `workspaces/{workspaceId}/boards/{boardId}`.
- Creating the first link copies existing personal boards into the shared workspace; it does not delete the personal copy.
- Firestore snapshots provide realtime updates. Concurrent edits use last-write-wins in this personal-use phase.

## Security trade-off

The link is a bearer capability: anyone with it can read and edit every board in that workspace. It must be treated like a password. Account-based access will replace it when stronger cross-device security is needed.
