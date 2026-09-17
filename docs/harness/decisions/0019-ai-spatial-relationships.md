# ADR 0019: Spatial relationships in AI board context (frames and proximity)

- Status: Accepted
- Date: 2026-09-17

## Context

ADR 0018 gave the AI connector and group relationships. Boards also carry relationships that exist only in the layout: content dropped inside a big shape that acts as a frame or section, and elements parked next to each other as one topic without any connector or group. The AI saw those only as raw coordinates, so it read them as unrelated standalone elements.

## Decision

- Move relationship derivation into the pure `src/domain/ai/board-relationships.ts`, which returns groups, frame containment, proximity clusters, and one flattened outline. `board-context.ts` keeps element/connection summaries and prompt formatting.
- Frames: `rectangle`, `ellipse`, `diamond`, and `triangle` act as frames. An element whose box sits inside a strictly larger frame (4px slack) is nested under it and tagged `inside`; with nested frames the smallest containing frame wins. Notes, text, and tables are content, not frames.
- Proximity: elements with no connector, group, or frame relationship that sit within a 64px edge gap are chained into a cluster (`P1`, `P2`, ...) by union-find and reported as a hint, not a stated link. Clusters need at least two members.
- Precedence, most to least certain: connector, group, frame, proximity. A connector always states where a node belongs; a group already anchored in the connector tree carries its members, so a frame does not adopt them. A frame that holds content is itself reported even when something else claimed that content.
- The prompt states the precedence, says a frame's text is its section title, and forbids claiming a connector or group from proximity alone or restructuring the board because elements merely sit close together.

## Consequences

The AI reads boards built by layout alone, not only by connectors. Proximity is heuristic: the 64px gap and the frame kinds are tuned to the board's default element sizes, and a false cluster costs a hint in the prompt rather than a board change, since proposals still name explicit element IDs and are previewed before approval. Relationship derivation is unit-tested without rendering Konva. No persisted schema or dependency change.
