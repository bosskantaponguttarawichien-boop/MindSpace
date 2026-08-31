# ADR 0003: React Konva board engine

- Status: Accepted
- Date: 2026-09-01

## Context

The Phase 1 prototype used tldraw to validate the board experience quickly. Production use requires a tldraw license and makes the editor behavior dependent on its SDK. MindSpace needs ownership of its board interactions and a predictable MIT-licensed foundation.

## Decision

- Phase 1.1 removes tldraw completely.
- Use the MIT-licensed `konva` and `react-konva` packages for rendering and pointer interaction.
- Keep `BoardDocument` as the writable product model; never persist Konva nodes or runtime state.
- Expose commands to surrounding UI through the project-owned `BoardEngine` interface.
- Implement selection, transforms, pan, zoom, drawing, connections, duplication, deletion, and history inside the board-engine implementation.

## Consequences

MindSpace has no canvas SDK license key or production fee. The project owns more interaction code and must test editor behavior directly, but Firebase and future AI commands remain independent of the rendering library.
