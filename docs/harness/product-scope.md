# Product Scope

## Product outcome

MindSpace is an AI-powered personal knowledge workspace built around an infinite board. The full vision remains in `requirement.md`; delivery is phased to avoid coupling the board engine to persistence, files, realtime, and AI too early.

## Current phase: Phase 3 — Private sync links

The goal is to let a single user open the same private workspace on multiple devices without a login screen.

### In scope

- Application shell matching the POC's information architecture: board list, board workspace, top bar, tool bar, and a non-functional AI-panel placeholder.
- Infinite canvas using a board-engine adapter, with pan and zoom.
- Create and edit text, sticky-note, and basic shape elements.
- Select, multi-select, move, resize, duplicate, copy/paste, and delete.
- Create/delete node-to-node connectors that follow moved nodes.
- Undo and redo for every board mutation in this phase.
- Keyboard access for primary actions and clear focus states.
- Generate and copy a private workspace sync link.
- Copy existing personal boards into the linked workspace without deleting the original copy.
- Load, save, and receive realtime Firestore updates for boards opened through that link.
- Clearly communicate that the link grants edit access to its holder.

### Explicitly out of scope

- Accounts, granular permissions, link revocation, and collaboration beyond one trusted user.
- Image/PDF upload or processing and PDF export.
- Live AI calls, AI context collection, and applying AI-generated operations.
- Sharing, permissions, billing, analytics, and production deployment.
- Building a custom canvas engine when the approved board engine supports the need.

Out-of-scope UI may appear as disabled or clearly labelled preview; it must not pretend that data was saved, synced, exported, or processed.

## Phase 3 acceptance criteria

1. A user can copy one private sync link without creating an account.
2. Opening that link on another device loads the same boards.
3. A board change becomes visible on the other open device through Firestore snapshots.
4. A private link is presented as edit-capable and must be treated like a password.
5. `lint`, `typecheck`, `test`, and `build` pass.

## Promotion gate to account-backed sharing

Before cross-device access, choose an account-linking experience, migrate anonymous data safely, add rules/emulator tests for migration, and define conflict behavior across devices.
