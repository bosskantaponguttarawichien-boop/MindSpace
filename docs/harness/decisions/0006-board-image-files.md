# ADR 0006: Board image storage and PDF export

- Status: Accepted
- Date: 2026-09-01

## Decision

- Phase 4 first increment accepts raster images up to 25 MB. Supported still images are resized to a 1,920px maximum side and encoded as WebP at 82% quality only when that reduces bytes; the stored object is capped at 10 MB. Animated GIFs remain original to preserve animation.
- Images are uploaded to Firebase Storage. Board documents store only HTTPS download URLs and image geometry.
- A personal board stores files under `users/{uid}/images`; a private-link workspace stores files under `workspaces/{workspaceId}/images`.
- The full current board bounds are fitted to one landscape page and exported through the browser print dialog, where the user saves it as PDF.
- Deleting an image starts a 30-second delayed Storage cleanup. Restoring the image with undo during that window cancels cleanup.
- A local PDF can be previewed in the browser, but it is never written to a board document or presented as persisted.

## Deferred

PDF storage, page extraction, export of the entire infinite board, and cleanup of deleted file objects need separate design work.
