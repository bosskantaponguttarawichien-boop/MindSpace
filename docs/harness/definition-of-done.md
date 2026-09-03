# Definition of Done

A change is done only when every applicable item is true.

## Product and scope

- [ ] Acceptance criteria are observable and satisfied.
- [ ] The change is inside the current phase or the phase was explicitly promoted.
- [ ] POC-only/future behavior is not presented as functional.
- [ ] Loading, empty, error, disabled, and recovery states are considered.

## Architecture and experience

- [ ] Dependency direction and module ownership are preserved.
- [ ] Board mutations use the command/history path and are undoable where applicable.
- [ ] Untrusted input is validated and errors are explicit.
- [ ] Dependencies and architecture decisions are justified/recorded.
- [ ] No secrets, generated artifacts, debug code, or private user data are included.
- [ ] Primary interaction is keyboard accessible with visible focus and accessible names.
- [ ] Destructive and AI-originated changes have suitable preview/confirmation.
- [ ] Account linking, authorization, sharing/revocation, history restoration, and AI use have an explicit audit and recovery path appropriate to Phase 6.
- [ ] Telemetry and operational logs are minimized and proven not to contain board content, prompts, file bytes, or secrets.

## Verification

- [ ] Tests cover behavior and regressions at the appropriate layer.
- [ ] `lint` passes.
- [ ] `typecheck` passes.
- [ ] `test` passes.
- [ ] `build` passes.
- [ ] Relevant end-to-end flow passes when available.
- [ ] Firebase Emulator Rules tests prove allowed and denied access, including revoked and cross-workspace cases.
- [ ] Backup restore and incident/release procedures have been rehearsed or explicitly recorded as unavailable for a non-production environment.
- [ ] Harness validation passes when contract files changed.
- [ ] Final diff is reviewed for scope, data loss, privacy, security, and accessibility.

Until the scaffold supplies a command, mark the check unavailable and state why; never call it passed.

## Handoff

- [ ] Outcome and user impact are summarized.
- [ ] Commands actually run and their results are reported.
- [ ] Risks, migrations, and deliberate deferrals are explicit.
