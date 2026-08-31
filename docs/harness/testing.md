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

Later phases add save/reload, multi-device sync, files, and AI preview/approve only when those features enter scope.

## Rules

- Test public behavior, not private functions or incidental markup.
- A bug fix includes a regression test when practical.
- Mock only owned boundaries; do not mock the subject under test.
- Use deterministic clocks, IDs, sample data, and network responses.
- Tests do not call real auth, storage, database, or AI services by default.
- Flaky tests are defects; fix or quarantine with an owner and follow-up.

## Standard gate

Once scaffolded, package scripts expose at least `lint`, `typecheck`, `test`, and `build`. Add an end-to-end command with the first browser flow. CI runs the same commands as local development.
