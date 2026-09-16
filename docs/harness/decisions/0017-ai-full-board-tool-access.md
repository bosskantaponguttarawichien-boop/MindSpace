# ADR 0017: AI proposal access to the full board tool set

- Status: Accepted
- Date: 2026-09-16

## Context

ADR 0012 introduced the AI proposal workflow with a narrow operation vocabulary: create note/text/shape elements, create connections, restyle connectors, change element color/text/kind, and delete elements. The board has since gained tables, text styling (font size, weight, horizontal and vertical alignment), element grouping, mind-map auto-layout, the full 19-color palette, and per-connector deletion. Asking the AI for any of those produced either no proposal or a silently dropped field, because `validateProposal` discarded unknown keys and unsupported values.

## Decision

- Extend `AiProposal` to cover every board tool that can be expressed as a validated, previewable operation: element geometry (`x`, `y`, `width`, `height`), `textStyle`, table elements and cell data, the complete `BOARD_COLORS` palette, `deleteConnectionIds`, `groupElements`, `ungroupElementIds`, and `layout` (mind-map arrangement).
- Freehand drawings and images stay human-only. They need raw pointer input or an uploaded asset, so the system prompt forbids proposing them and the validator rejects those kinds.
- Keep validation strict at the AI boundary: values are checked against the domain constants (`BOARD_COLORS`, `TEXT_FONT_SIZES`, connector enums), geometry is clamped to a bounded canvas range, table grids are capped and padded to a rectangular shape, and ID lists must carry their `element:`/`connection:` prefix. Operation counts stay bounded per proposal.
- Move proposal application out of `konva-board.tsx` into the pure `src/domain/ai/apply-proposal.ts`. The engine still owns ID generation, `commit(...)`, and selection, so AI changes remain a single undoable history entry applied through the same path as human edits.
- Every new operation renders in the AI panel proposal card before approval, so nothing is applied that the preview did not show.
- Send the attributes the AI now edits (size, text style, group, table shape, connector line/color) in the board context, so edits can target real state instead of guessing.

## Consequences

The AI can drive the board tools a user can drive, while the approval gate, bounded operation counts, and strict value validation from `security-and-ai-safety.md` are unchanged. `BoardDocument` and its persisted schema are untouched. Proposal application is now unit-testable without rendering Konva, and the prompt's allowed-value list is generated from the domain constants, so adding a color or font size no longer needs a prompt edit.
