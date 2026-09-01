# ADR 0008: Toolbar tool groups with option cards

- Status: Accepted
- Date: 2026-09-01

## Context

ADR 0007 arranged the toolbar as ordered groups that wrap onto a second row. On a phone the row still wrapped, and the four shape tools plus three connector dropdowns took eleven of the twenty controls. Connector styling was only reachable through three separate dropdown menus, and only after a connector was already selected, so a line could not be drawn with the wanted head or dash in the first place.

## Decision

- Three groups collapse into one trigger button each: shapes (rectangle, ellipse, diamond, triangle), connector, and ink (draw, eraser). The trigger shows the icon of the group's last-used tool and carries a caret, `aria-haspopup`, and `aria-expanded`.
- Clicking a trigger selects that group's last-used tool and opens its card in the same click; clicking it again closes the card and leaves the tool selected. At most one card is open, tracked by a single `openCard` state that also owns the existing colour tray. Escape closes it.
- Cards render below the toolbar, reusing the colour tray's own surface from ADR 0007 so nothing is clipped by the toolbar and touch targets stay at 36 px.
- Colour lives inside each card: the shape card sets element colour, the connector card sets line colour. The central palette button stays for whatever is already selected.
- Connector options are applied twice — `updateSelectedConnection` for a selected line, and `setConnectionDefaults` for lines created afterwards, by the connector tool and by `addChildNode`. Defaults are engine state only; they are not persisted and reset with the page.
- The connector dropdown menus are replaced by option rows in the card. Their message keys are unchanged, so both locales keep their existing strings.

## Rollback and compatibility

Nothing about the document schema changes: defaults are written into new `BoardConnection` records using fields that ADR 0004 already persists, so an older client reads these boards unchanged. Reverting this ADR restores the flat tool row without touching stored data. Stroke width and a highlighter were considered for the ink card and deliberately left out, because they would widen `BoardElement` and repeat the compatibility cost of ADR 0007.

## Colour selection follow-up

Two defects surfaced while using the cards, both fixed here.

- Every Firestore snapshot echo re-entered `KonvaBoard` as a new `initialDocument`. The guard compared documents with `JSON.stringify`, which is key-order sensitive, so the round-tripped document never matched the local one, the board was replaced, and the selection was cleared. A colour could therefore be applied once, and the next pick did nothing until the element was selected again. The guard now uses `sameBoardDocument`, which compares content with sorted keys and treats an undefined field as absent, and a genuine remote change keeps whatever part of the selection still exists instead of clearing it.
- A picked colour now becomes the colour of elements created afterwards. `setSelectionColor` records it as the element default, alongside the connector defaults above; both live in engine refs and reset with the page. A selected connector still takes the colour on its own, without touching the element default.
- Colour cards stay open after a pick, since picking colours in a row is the common case; the toolbar button or Escape closes them.
