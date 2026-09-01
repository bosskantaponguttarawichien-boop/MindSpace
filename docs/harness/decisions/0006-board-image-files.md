# ADR 0006: Board image storage and PDF export

- Status: Accepted
- Date: 2026-09-01

## Decision

- Phase 4 first increment supports image files only, capped at 10 MB.
- Images are uploaded to Firebase Storage. Board documents store only HTTPS download URLs and image geometry.
- A personal board stores files under `users/{uid}/images`; a private-link workspace stores files under `workspaces/{workspaceId}/images`.
- The current visible board can be exported through the browser print dialog, where the user saves it as PDF.

## Deferred

PDF upload, page extraction/viewer, export of the entire infinite board, and cleanup of deleted file objects need separate design work.
