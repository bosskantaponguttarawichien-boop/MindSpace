# Delivery Workflow

## 1. Understand

- Read `AGENTS.md`, the relevant requirement, current scope, and affected decisions.
- Inspect existing code and tests before proposing a new pattern.
- Turn the request into observable acceptance criteria.
- Identify domain, UI, infrastructure, security, and data boundaries affected.

## 2. Plan

- Choose the smallest vertical slice that satisfies the criteria.
- List affected modules and verification layers.
- Call out destructive migrations, new services, dependencies, or decisions.
- Do not implement out-of-phase capabilities as speculative infrastructure.

## 3. Implement

- Follow dependency direction and existing conventions.
- Add tests with behavior, not implementation details, as the subject.
- Keep changes reviewable and preserve unrelated user work.

## 4. Validate and fix

Run the repository standard checks when available:

```text
lint -> typecheck -> unit/integration tests -> end-to-end tests -> build
```

Run `node scripts/validate-harness.mjs` when Harness files change. A failed check returns to implementation; do not weaken a valid check merely to get green.

## 5. Review

Review acceptance criteria, phase scope, dependency boundaries, undo/data loss, loading/error/disabled states, accessibility, untrusted input, privacy, authorization, and regression coverage.

## 6. Handoff

Report the outcome, key files, commands actually run, results, and remaining risks or deliberate deferrals. Do not describe a mock as a working capability.

## Decision record triggers

Create an ADR for stack/provider strategy, stabilized domain-contract changes, reversed dependencies, new shared layers, or significant performance/security/quality trade-offs.
