# Architecture

## Approved shape

Start as a modular monolith using Next.js App Router and strict TypeScript, managed with pnpm and deployed to Vercel. Use tldraw behind a local adapter for the board engine. Use Firebase through project-owned adapters for persisted data and files when Phase 2 begins. External capabilities remain behind application interfaces so UI and board-domain behavior do not depend on vendor SDKs.

```text
UI / routes
    |
    v
Application use cases + board commands
    |
    v
Domain model and ports
    |
    v
Adapters: tldraw | persistence | files | AI | auth
```

Dependencies point downward. Domain code does not import React, Next.js, tldraw, database clients, auth SDKs, storage SDKs, or AI SDKs.

## Target module boundaries

```text
src/
  app/                 routing, layouts, server entry points
  features/
    board/             board UI and application use cases
    workspace/         workspace/board navigation
    ai/                later: AI proposal and approval UI
  components/
    ui/                reusable design-system primitives
    layout/            reusable application-shell components
  domain/
    board/             framework-neutral document and command contracts
  infrastructure/
    board-engine/      tldraw adapter
    firebase/          later: Firestore, Auth, and Storage adapters
    persistence/       repository interfaces and Firebase implementations
    auth/              later: Firebase Authentication adapter
    files/             later: Firebase Storage and PDF adapters
    ai/                later: provider-neutral AI adapter
  shared/              small reusable UI and utilities; no feature dumping ground
```

The exact scaffold may adapt to framework conventions, but dependency direction and ownership must remain intact.

## Reusable component architecture

Build reusable components at three levels:

1. **UI primitives** — generic `Button`, `IconButton`, `Panel`, `Tooltip`, `Menu`, and form controls. They know nothing about boards.
2. **Layout components** — `AppShell`, `Sidebar`, `Topbar`, `Toolbar`, and `RightPanel`. They own layout slots, not product behavior.
3. **Feature components** — `BoardToolbar`, `BoardStatus`, `BoardList`, and later `AiPanel`. They compose primitives and dispatch feature intent.

Split a component when it has an independent responsibility, is reused, needs isolated testing, or significantly improves readability. Do not create one-line wrapper components or a universal component with many unrelated boolean props merely to claim reuse. Prefer composition, variants, and explicit props.

Feature-specific components stay with their feature until genuine cross-feature reuse exists. Shared folders are not dumping grounds.

## Firebase boundary

- Use Cloud Firestore for workspace, board metadata, and versioned board documents.
- Use Firebase Storage for image/PDF objects; Firestore stores references and safe metadata, not file bytes.
- Firebase Authentication is the planned identity provider for the persistence phase.
- Browser code uses only the minimum Firebase client SDK required for user-scoped operations.
- Privileged work uses server-side Firebase Admin SDK and verified identity; Admin credentials never reach the browser.
- Firestore documents are mapped to/from the domain contract in adapters. Domain/UI code does not import Firebase SDKs.
- Use Firebase Emulator Suite for automated integration tests and local development involving Firebase.
- Firestore realtime listeners do not by themselves define collaborative editing or conflict semantics; that requires a later realtime decision.

## Board document contract

The product owns a versioned, serializable board document independent of the editor library. At minimum it has a document version, stable element IDs, element kinds, geometry, content/style payloads, and connections referencing element IDs. Runtime-only editor state is not persisted.

All mutations use explicit commands such as `createElement`, `updateElement`, `moveElements`, `connectElements`, and `deleteSelection`. Commands are the seam for undo/redo now and persistence, realtime, audit, and AI proposals later.

## State ownership

- Ephemeral viewport, selection, hover, and tool state belongs to editor/UI.
- Board document state belongs to the board domain/application layer.
- Server state will be accessed through persistence ports backed by Firebase adapters in Phase 2.
- Do not create two writable sources of truth for the same board data.

## External boundaries

- Convert domain shapes and tldraw shapes only in the board-engine adapter.
- Validate data when it enters from URLs, APIs, storage, files, clipboard, or AI.
- AI providers return proposals expressed as validated board commands; they do not receive direct mutation access.
- File bytes and extracted content never live in the board document; it stores references plus safe metadata.

## Initial quality attributes

- Interaction correctness and data safety outrank animation polish.
- Board interactions should remain responsive with representative Phase 1 data.
- Desktop is primary; smaller screens fail gracefully rather than expose inaccessible controls.
- Primary controls meet WCAG 2.2 AA expectations for names, focus, contrast, and keyboard access.
- User-facing UI supports Thai and English from the first scaffold, with an accessible language switcher and English as the fallback locale.
- User-facing strings do not live directly in feature components; they use the project localization layer.
