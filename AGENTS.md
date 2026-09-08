# MindSpace Engineering Contract

This file is the entry point for every human or AI contributor. Read it before planning or changing code.

## Source of truth

Read these files in order:

1. `requirement.md` — product vision and full product requirements.
2. `docs/harness/product-scope.md` — the currently authorized delivery phase.
3. `docs/harness/architecture.md` — system boundaries and dependency direction.
4. `docs/harness/engineering-rules.md` — implementation rules.
5. `docs/harness/testing.md` and `docs/harness/definition-of-done.md` — proof required before completion.
6. `docs/harness/security-and-ai-safety.md` for auth, uploads, data, or AI work.

`poc.html` is a visual and interaction reference only. Do not copy its static DOM, inline styles, inline handlers, hard-coded coordinates, or mock behavior into production code.

If documents conflict, the narrower current-phase rule wins. Product intent in `requirement.md` must not be silently changed; record a decision or ask for a product decision.

## Current delivery boundary

The current phase is **Phase 6 — Production hardening**. Build only the production-hardening slice defined in `docs/harness/product-scope.md`. Do not add new board content features, autonomous AI, synchronous collaboration, or public sharing unless a task explicitly promotes them.

## Mandatory workflow

For every task:

1. Restate the acceptance criteria and identify affected boundaries.
2. Inspect existing patterns before adding a new pattern or dependency.
3. Make the smallest coherent change; do not bundle unrelated refactors.
4. Add or update tests at the behavior boundary.
5. Run the checks defined by the repository scripts.
6. Review the diff for scope, accessibility, security, and accidental data loss.
7. Report what changed, what was verified, and any remaining risk.

Never claim a check passed unless it was run. If a check cannot run, state why.

## Non-negotiable rules

- Use strict TypeScript. Avoid `any`; narrow `unknown` at boundaries.
- Keep UI, board-domain commands, persistence, and external services separated.
- UI components do not call databases, storage, auth providers, or AI providers.
- All board mutations go through commands so undo/redo and future sync remain possible.
- Stable IDs are generated once; array indexes and display names are not identities.
- Persist/version domain data, not framework-specific editor objects without an adapter.
- AI may propose board operations but must never mutate a board without preview and explicit user approval.
- Validate untrusted input at every server, file, import, and AI boundary.
- Do not add a dependency without documenting why the platform or current stack is insufficient.
- Do not edit generated files or commit secrets, credentials, local environment files, build output, or user data.

## Architecture change rule

Create or update a decision record under `docs/harness/decisions/` before changing the approved stack or dependency direction, bypassing the board command layer, changing the persisted schema, adding an external service, or weakening a safety/quality rule.

Run `node scripts/validate-harness.mjs` after editing the Harness.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
