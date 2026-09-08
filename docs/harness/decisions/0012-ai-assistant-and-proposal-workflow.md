# ADR 0012: AI Assistant and Structured Proposal Approval Workflow

- Status: Accepted
- Date: 2026-09-03

## Context

Phase 5 promotes the AI Assistant from a static placeholder to an interactive copilot. The product vision requires AI to answer questions about board content, summarize, expand, explain, check content, and generate mind-maps or new nodes. In accordance with `security-and-ai-safety.md`, AI is a proposal generator rather than an autonomous actor, and API keys must never be exposed to the client.

## Decision

- Create a server-side Next.js route `/api/ai/chat` that receives user prompts and selected board context, validates request bounds, and delegates to a project-owned `AiProvider` interface.
- Read `GEMINI_API_KEY` (or `OPENAI_API_KEY`) only in the server execution environment. If no key is configured, provide graceful status messaging with mock response capability so local verification remains unblocked.
- Extract board context in two explicit, user-controlled scopes: `"entire-board"` and `"selection"`.
- When the AI suggests changes to the board (e.g. creating notes, mind-map nodes, or connections), the response includes a strictly validated `AiProposal` payload.
- AI proposals are previewed in the AI panel with explicit user review:
  - **Approve**: Dispatches board engine mutations with newly generated stable IDs and registers a single undo/redo history entry.
  - **Reject**: Dismisses the proposal without mutating board state.
- The board document schema version remains unchanged; newly created elements and connections conform to existing `BoardDocument` models.

## Consequences

- Dependency direction is preserved: domain and UI components remain completely independent of external AI vendor SDKs.
- Safety and data loss prevention invariants are strictly satisfied through human-in-the-loop approval and command-level undoability.
