# Product Scope

## Product outcome

MindSpace is an AI-powered personal knowledge workspace built around an infinite board. The full vision remains in `requirement.md`; delivery is phased to avoid coupling the board engine to persistence, files, realtime, and AI too early.

## Current phase: Phase 6 — Production hardening

The goal is to make the existing personal knowledge workspace safe, recoverable, observable, and ready for a controlled production launch. Phase 6 hardens the product; it does not weaken the board command, privacy, or human-approved AI guarantees established in earlier phases.

### In scope

- Preserve all verified Phase 1–5 behavior: boards, file references, autosave, and AI proposals remain functional and no AI proposal may mutate a board without approval.
- Replace anonymous-only ownership and bearer sync links with account-based identity, safe anonymous-data linking/migration, and server-authorized workspace membership. The initial sign-in providers and recovery experience require an ADR before implementation.
- Role-based workspace access with owner, editor, and viewer capabilities; invite, remove, and revoke sharing access. Firestore and Storage rules must deny unauthenticated and cross-workspace access by default.
- Versioned board history snapshots, owner-controlled backups, and restore with a preview/confirmation step. Restoring a snapshot is a board mutation recorded in undo/redo where the active editor can support it.
- Offline-first edit recovery that exposes pending state, reconnects safely, and gives the user an actionable conflict/recovery path rather than silently dropping changes.
- Production error boundaries, privacy-preserving structured monitoring, and operational alerts. Logs must not contain board content, file bytes, prompts, provider keys, or raw provider responses.
- Authenticated and authorized AI boundary with request bounds, rate limiting, auditable metadata, usage/cost tracking, and clear limit/error recovery states. Private AI context is never recorded in analytics logs.
- Production deployment readiness: validated environment configuration, least-privilege service credentials, Security Rules Emulator coverage, CI gates, and documented backup/incident/release procedures.

### Explicitly out of scope

- New board-element types, PDF OCR/extraction, or multi-page PDF layouts.
- Presence indicators, cursors, comments, conflict-free realtime collaboration, and other synchronous collaboration semantics.
- Autonomous AI actions, model training on user content, or storing raw board/AI content in monitoring or analytics.
- Paid billing/subscriptions, enterprise SSO/SCIM, organization administration, and arbitrary public sharing links.
- A provider-specific identity experience before its UX, account-recovery, and anonymous-migration decision is recorded.

Out-of-scope UI may appear as disabled or clearly labelled preview; it must not pretend that data was saved, synced, exported, or processed.

## Phase 6 acceptance criteria

1. A documented account-linking and recovery decision exists before a sign-in provider is shipped; linking preserves a user's eligible anonymous boards or clearly reports a recoverable migration failure.
2. An authenticated user can create a workspace, invite an editor or viewer, and revoke a member. Server routes/actions, Firestore Rules, and Storage Rules enforce the same capability and deny cross-workspace access.
3. A board owner can inspect history, create or use a backup, preview a prior revision, and explicitly restore it without silent data loss.
4. A user can edit while temporarily offline, sees pending/recovery status, and receives an actionable conflict path after reconnection.
5. Expected application failures render localized recovery UI; production telemetry records a minimal structured event without board content, prompt content, file bytes, credentials, or raw provider output.
6. AI requests require a verified actor and authorized board/workspace context, have bounded input and rate-limit handling, and record only provider/model, usage/cost, operation type, approval, and failure metadata.
7. Deployment configuration fails safely when required secrets or production controls are missing. Secret values never reach client bundles, committed files, or logs.
8. Firebase Emulator tests prove allowed owner/editor/viewer behavior and denied anonymous, revoked, and cross-workspace access; tests also cover history restore, offline recovery, and AI-limit behavior.
9. `lint`, `typecheck`, `test`, relevant end-to-end tests, and `build` pass; release/rollback, backup restore, and incident response are documented.

## Release gate

Before declaring a production launch, close every Phase 6 acceptance criterion, run the same checks in CI, perform a controlled restore rehearsal, and approve the documented identity/migration, retention/deletion, and incident-response procedures.
