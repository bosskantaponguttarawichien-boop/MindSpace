# ADR 0013: Email/password account linking for the first Phase 6 auth slice

- Status: Accepted
- Date: 2026-09-03

## Context

Phase 6 replaces anonymous-only ownership with an account-based identity without losing a user's existing personal boards. Firebase Authentication is already the approved identity adapter; its anonymous-account linking retains the Firebase UID, which is also the owner key for current Firestore and Storage records.

## Decision

- Enable Firebase Email/Password as the first interactive sign-in method. No new identity provider or dependency is introduced.
- A guest who creates an account calls Firebase `linkWithCredential`; the UID remains unchanged, so eligible `users/{uid}` boards and images remain owned by the account.
- Signing in to an existing account does not merge the active guest workspace. The UI presents a clear confirmation before the identity switch.
- Password-reset email uses Firebase's provider flow. Credentials never enter Firestore, the board document, app logs, or server routes.
- Firebase calls remain behind `src/infrastructure/auth/`; UI components receive account data and callbacks through the workspace feature hook.

## Consequences

This slice restores login and preserves the current personal-board owner model. It does not yet implement workspace roles, authenticated server sessions, invitation/revocation, or server authorization of AI calls; those remain subsequent Phase 6 vertical slices. Firebase Email/Password must be enabled in the project's Firebase console before the UI is usable in a configured environment.
