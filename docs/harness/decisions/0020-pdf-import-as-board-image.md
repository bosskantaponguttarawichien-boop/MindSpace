# 0020 — PDF import adds the first page as a board image

## Status

Accepted

## Context

Importing a PDF opened a full-screen local viewer (`LocalPdfViewer`) and left nothing on the board. The PDF was never saved, never synced, and could not be arranged, connected, or exported with the rest of the board, so an imported document was invisible to every board feature. Users expect an imported PDF to behave like an imported image: it becomes content on the canvas.

Phase 6 scope keeps new board element types, PDF text extraction/OCR, and multi-page PDF layouts out of scope, so the change must reuse what already exists.

## Decision

Import rasterizes page 1 of the chosen PDF in the browser and sends that bitmap through the existing image upload path, producing an ordinary `image` element on the board.

- No new element kind, no persisted schema change: the page is an image element with an `assetUrl`, so undo/redo, autosave, export, and the image cleanup path apply unchanged.
- Only the first page is imported. A one-off notice tells the user when the source had more pages; multi-page layout stays out of scope.
- PDF bytes are never uploaded or stored; only the rendered page image is. No text is extracted, so no document content reaches the AI or analytics boundary.
- `LocalPdfViewer` and its local-only preview strings are removed; nothing else used them.

## Dependency

`pdfjs-dist` is added. The platform offers no API to rasterize a PDF page: browsers render PDFs only in an opaque viewer (`<iframe>`/`<embed>`) whose pixels are unreadable from script, and Konva, Firebase, and Next.js provide nothing for it. `pdfjs-dist` is Mozilla's PDF renderer, is loaded lazily (`await import`) so it stays out of the main bundle, and runs with `isEvalSupported: false` and `disableAutoFetch: true` so untrusted file bytes cannot execute script or trigger network fetches.

The adapter lives in `src/infrastructure/files/pdf-page-image.ts`, matching the architecture's "Firebase Storage and PDF adapters" boundary. Domain and UI code do not import `pdfjs-dist`; the feature component calls the adapter and receives a `File` plus a stable failure reason it renders in the reader's language.

## Consequences

- An imported PDF page is a board image: movable, resizable, exportable, and deleted through the same lifecycle.
- A scanned or image-heavy PDF becomes a bitmap of its first page; its text is not searchable or selectable. Text extraction remains a later decision.
- Password-protected PDFs are rejected with a localized message rather than prompting for a password.
