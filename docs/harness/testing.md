# Testing Strategy

Tests prove user-visible behavior and domain invariants at the cheapest reliable layer.

## Unit

Use for command application/inversion, history grouping, copy ID remapping, connector integrity/cleanup, serialization/version handling, and later AI proposal validation.

## Component and integration

Use for toolbar intent dispatch, selection/shortcuts, editor-adapter synchronization, status states, accessible names, and focus behavior.

## End-to-end

Keep a small set of critical Phase 1 flows:

1. Open sample board, pan/zoom, create and edit an element.
2. Connect two elements, move one, and verify the connection follows.
3. Create/move/delete, then undo and redo the sequence.
4. Use the primary flow by keyboard.

Phase 6 adds these production-critical flows:

1. Link eligible anonymous data to an account and retain access after a new authenticated session.
2. Invite an editor and viewer; prove that a viewer cannot mutate, a revoked user loses access, and another workspace is denied.
3. Create a board revision, preview it, restore it only after confirmation, and verify recovery/undo behavior.
4. Edit offline, reconnect, and exercise the visible recovery/conflict path.
5. Make an AI request as an authorized user, then verify an over-limit request gets a recoverable response without recording private context.

## Rules

- Test public behavior, not private functions or incidental markup.
- A bug fix includes a regression test when practical.
- Mock only owned boundaries; do not mock the subject under test.
- Use deterministic clocks, IDs, sample data, and network responses.
- Tests do not call real auth, storage, database, or AI services by default.
- Run Firebase Emulator Security Rules tests for every permission, revocation, and cross-workspace behavior. Emulator fixtures use synthetic identities and board content only.
- Monitoring tests assert structured metadata and explicitly assert the absence of board text, prompts, file bytes, credentials, and raw provider responses.
- Flaky tests are defects; fix or quarantine with an owner and follow-up.

## Standard gate

Once scaffolded, package scripts expose at least `lint`, `typecheck`, `test`, and `build`. Add an end-to-end command with the first browser flow. CI runs the same commands as local development and includes Firebase Emulator Rules tests before release.
