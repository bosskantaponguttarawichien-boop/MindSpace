# MindSpace
repository is space for me use to learn, brainstorm

## Engineering contract

Before development, read [AGENTS.md](AGENTS.md) and [the project Harness](docs/harness/README.md). The current authorized scope is Phase 1 — Board Core.

```bash
node scripts/validate-harness.mjs
```

## Phase 1 application

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. Phase 1 is intentionally local-only: Firebase persistence and live AI are represented as disabled future states.

Quality commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Copy `.env.example` to `.env.local` only when a phase needs those values. Phase 1.1 uses the MIT-licensed React Konva and Konva packages; it requires no canvas license key or production fee.
