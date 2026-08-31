# ADR 0001: Initial architecture

- Status: Accepted
- Date: 2026-08-31

## Context

MindSpace combines a high-interaction infinite canvas with later persistence, realtime, files, and AI. The repository currently contains requirements and a static POC. Coupling early to editor/provider data would make undo/redo, sync, migrations, and AI board actions risky.

## Decision

- Begin with a Next.js App Router modular monolith in strict TypeScript.
- Use pnpm as the package manager and Vercel as the initial deployment platform.
- Use Tailwind CSS and shadcn/ui for application UI.
- Use tldraw behind a project-owned board-engine adapter rather than building a canvas engine.
- Own a versioned, framework-neutral board document and command contract.
- Keep persistence, auth, files, realtime, and AI behind ports; introduce adapters only in the phase that needs them.
- Use Firebase for the planned persistence platform as refined by ADR 0002.
- Keep AI provider-neutral and require preview plus user approval for mutations.
- Support Thai and English from the initial scaffold with a user-facing language switcher; English is the fallback locale.

Package versions and deployment provider are deferred to scaffold/deployment decisions so current supported releases can be selected then.

## Consequences

The command/domain seam supports testing, undo/redo, and future sync. It adds some up-front code but prevents editor-library and provider SDK types from becoming the product model.
