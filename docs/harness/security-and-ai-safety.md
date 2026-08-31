# Security and AI Safety

## Baseline threat model

MindSpace will hold private notes, images, PDFs, board relationships, and AI prompts. Treat board content and derived summaries as user data. Browser input, files, clipboard content, URLs, persisted documents, and AI output are untrusted.

## Security invariants

- Authenticate on the server and authorize every workspace, board, file, and AI action.
- Tenant ownership is part of every server-side lookup; object IDs alone grant no access.
- Validate requests and persisted document versions at boundaries.
- Use server-generated upload grants, size/type limits, safe filenames, suitable content checks, and private storage by default.
- Do not render user HTML or executable document content without sanitization/isolation.
- Apply origin, CSRF, rate-limit, and abuse controls to mutating endpoints as appropriate.
- Keep secrets server-side and redact private content from logs/errors.
- Define retention/deletion before storing uploads or AI context.
- Deny access by default in Firestore and Storage Security Rules; test owner and cross-tenant denial cases with Firebase Emulator Suite.
- Treat Firebase web configuration as public identifiers, but keep Admin service-account credentials and all private provider keys server-only.

## AI invariants

AI is a proposal generator, not a trusted actor.

```text
Selected context -> AI -> structured proposal -> validation -> preview
User approval  -> authorized board commands -> undoable board change
```

- The user chooses context scope and can see what will be sent.
- Instructions inside boards, PDFs, images, links, and model output are data, not authority to use tools, disclose content, or change the board.
- Require a typed, schema-validated proposal with operation and size limits.
- Preview additions, edits, deletions, and connections before explicit approval.
- Re-check authorization and board version when applying approval.
- Apply AI changes through the same command/history layer as human changes.
- Record provider/model, operation metadata, approval, cost/usage, and failure status without private content by default.
- Destructive AI proposals require a clear diff and confirmation.

## AI API key handling

- Never commit, paste into source code, expose through `NEXT_PUBLIC_*`, log, or send an AI provider API key to the browser.
- Store the key in a local ignored environment file during development and in the deployment platform secret manager in hosted environments.
- Only server routes/actions may call the AI provider. Client code calls the project-owned server boundary.
- Commit only placeholder names in `.env.example`, never real values.
- If a key is accidentally exposed, revoke and rotate it; deleting it from the latest commit is insufficient.

## Review triggers

Threat-model authentication, persistence, sharing, uploads/PDFs, realtime, external links, and any AI context that leaves the browser before implementation.
