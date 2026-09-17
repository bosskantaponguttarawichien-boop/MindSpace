# ADR 0018: Relationship context for AI (connectors and groups)

- Status: Accepted
- Date: 2026-09-17

## Context

The AI received board context as a flat element list plus a connection list. Summaries therefore read the board as unrelated nodes: a mind map lost which node sits under which branch, and elements the user had grouped were treated as loose, unrelated notes even though grouping is exactly how a user says "these belong to one topic without a connector between them".

## Decision

- Derive relationships in `src/domain/ai/board-context.ts` and send them as a single indented "Relationship outline": connectors give parent/child depth, and grouping keeps grouped elements on the same topic. A node placed by grouping rather than a connector is tagged `same group`.
- List groups explicitly (`G1`, `G2`, ... with member labels and IDs) and tag grouped elements in the element list. A group needs at least two members inside the current scope to be reported; the board's raw `groupId` stays out of the prompt as a bare identifier.
- A group whose members carry no connector is emitted as its own top-level cluster, so it is still one topic rather than a list of standalone elements. Only elements with neither a connector nor a group are reported as standalone.
- The walk emits every element at most once and tolerates cycles and parents outside the current scope, which are emitted at the top level.
- Instruct the model to read both relationship kinds, summarize per branch with each group folded into one bullet, and consider the whole group when a request targets one grouped element. Demo mode derives its structural summary from the same outline.

## Consequences

Summaries, explanations, and reviews follow the structure the user built, including boards that use grouping instead of connectors. Prompt size grows by one outline line per element plus one line per group, within the existing 50,000-character context bound. Proposals still name explicit element IDs and are previewed before approval: the group instruction changes what the model proposes, never what an approval silently applies. No persisted schema or dependency change.
