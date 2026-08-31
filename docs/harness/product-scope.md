# Product Scope

## Product outcome

MindSpace is an AI-powered personal knowledge workspace built around an infinite board. The full vision remains in `requirement.md`; delivery is phased to avoid coupling the board engine to persistence, files, realtime, and AI too early.

## Current phase: Phase 1 — Board Core

The goal is a reliable, local-only board interaction slice that proves the domain and editor architecture.

### In scope

- Application shell matching the POC's information architecture: board list, board workspace, top bar, tool bar, and a non-functional AI-panel placeholder.
- Infinite canvas using a board-engine adapter, with pan and zoom.
- Create and edit text, sticky-note, and basic shape elements.
- Select, multi-select, move, resize, duplicate, copy/paste, and delete.
- Create/delete node-to-node connectors that follow moved nodes.
- Undo and redo for every board mutation in this phase.
- Keyboard access for primary actions and clear focus states.
- Deterministic sample board data for development and tests.

### Delivery milestones

#### Milestone 1 — Foundation and visual shell

- Scaffold Next.js with pnpm, strict TypeScript, styling, test tools, and standard quality commands.
- Establish design tokens and reusable UI/layout components.
- Rebuild the POC shell responsively without fake Saved, Sync, Export, or AI behavior.
- Establish Thai and English message catalogs, locale detection/fallback, and an accessible language switcher.
- Add the board-engine adapter boundary and deterministic sample data contract.
- Keep the application compatible with Vercel deployment and verify a production build.

#### Milestone 2 — Canvas navigation and elements

- Integrate React Konva through the project-owned board-engine interface (Phase 1.1).
- Implement pan/zoom and text, sticky-note, and shape creation/editing.
- Add selection, move, resize, delete, duplicate, and copy/paste.

#### Milestone 3 — Connections and history

- Add node connectors and endpoint integrity.
- Make every supported mutation participate correctly in undo/redo.
- Add keyboard shortcuts and accessibility behavior.

#### Milestone 4 — Verification and stabilization

- Complete domain, component/integration, and critical end-to-end tests.
- Verify performance with representative sample-board size.
- Pass lint, typecheck, tests, build, accessibility review, and the Definition of Done.

### Explicitly out of scope

- Accounts, authentication, backend APIs, database, autosave, cross-device sync, realtime, and conflict resolution.
- Image/PDF upload or processing and PDF export.
- Live AI calls, AI context collection, and applying AI-generated operations.
- Sharing, permissions, billing, analytics, and production deployment.
- Building a custom canvas engine when the approved board engine supports the need.

Out-of-scope UI may appear as disabled or clearly labelled preview; it must not pretend that data was saved, synced, exported, or processed.

## Phase 1 acceptance criteria

1. A user can navigate a large board by pan and zoom without moving page chrome.
2. A user can create, edit, select, move, resize, duplicate, and delete each supported element type.
3. A user can connect two nodes and the connector follows both nodes.
4. Undo/redo restores every supported mutation, including connector changes.
5. Reloading intentionally resets to documented sample data in Phase 1; the UI does not claim persistence or sync.
6. Core board behaviors have automated tests and primary flows pass an end-to-end test.
7. `lint`, `typecheck`, `test`, and `build` pass once the application scaffold exists.

## Promotion gate to Phase 2

Before Firebase persistence begins, freeze and test a versioned board document contract, define Firestore collections/indexes and migration/version strategy, define Security Rules and server trust boundaries, configure Emulator tests, and document autosave conflict/error behavior. Promote the phase only through a decision record and a Harness update.
