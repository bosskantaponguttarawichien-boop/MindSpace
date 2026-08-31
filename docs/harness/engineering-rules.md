# Engineering Rules

## TypeScript and APIs

- Enable strict TypeScript and keep public domain/application types explicit.
- Use `unknown` for untrusted input and validate before use.
- Prefer discriminated unions for element kinds and command/result states.
- Do not hide errors with non-null assertions, empty catches, or broad casts.
- Return structured errors at boundaries; user-visible failures must be actionable.

## React and Next.js

- Default to Server Components for route composition; use Client Components only at interaction boundaries such as the board editor.
- Keep feature state close to its owner; do not introduce global state for local UI.
- Components render and dispatch intent; domain decisions belong in commands/use cases.
- Avoid effects for derived state and avoid syncing duplicate state through effects.
- Controls use semantic elements, accessible names, visible focus, and keyboard behavior.

## Board behavior

- Every mutation must be representable as a command and covered by undo/redo.
- Group continuous gestures into one logical history entry.
- Deleting a node handles attached connectors deterministically.
- Copy/duplicate creates new stable IDs and remaps internal connector references.
- Geometry/serialization does not depend on rendered DOM measurements unless isolated behind an adapter.

## Styling and POC usage

- Convert POC colors and spacing into named design tokens; do not scatter literals.
- Preserve the POC information hierarchy, not its fixed canvas or absolute sample coordinates.
- Inline styles and inline event handlers are not production patterns.
- Disabled future features must be honest about their status.

## Localization

- Support `th` and `en`; use stable semantic message keys rather than source text as keys.
- User-facing strings, labels, validation messages, empty states, and accessibility text come from locale catalogs.
- English is the fallback when a translation key is missing; missing keys must be visible in development/tests.
- Persist an explicit user locale choice when persistence enters scope; before then, keep the choice locally.
- Layouts must tolerate longer translations without clipping primary actions.

## Dependencies

Before adding a package, document the capability, why the current platform is insufficient, maintenance/bundle/security/licensing impact, and the boundary that contains it. Use one library per concern unless a decision permits overlap.

## Data and repository hygiene

- Persist only versioned domain documents or normalized domain records.
- Schema changes require forward and rollback/repair thinking.
- Never rely on client authorization checks to protect server data.
- Logs exclude secrets, raw files, board content, and AI context by default.
- Keep changes focused; do not refactor unrelated code.
- Never commit `.env*` values, credentials, generated output, or user content.
- Update the Harness when a new invariant or recurring failure is discovered.
