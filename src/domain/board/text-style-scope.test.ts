import { describe, expect, it } from "vitest";
import { DEFAULT_TEXT_STYLES, TEXT_STYLE_SCOPES, textStyleForScope, textStyleScopeFor } from "@/domain/board/text-style-scope";

describe("text style scopes", () => {
  it("maps every shape kind onto the single shape scope", () => {
    for (const kind of ["rectangle", "ellipse", "diamond", "triangle", "shape"]) {
      expect(textStyleScopeFor(kind)).toBe("shape");
    }
  });

  it("keeps text, note and table in scopes of their own", () => {
    expect(textStyleScopeFor("text")).toBe("text");
    expect(textStyleScopeFor("note")).toBe("note");
    expect(textStyleScopeFor("table")).toBe("table");
  });

  it("has no scope for objects that carry no editable text style", () => {
    expect(textStyleScopeFor("draw")).toBeNull();
    expect(textStyleScopeFor("image")).toBeNull();
    expect(textStyleScopeFor("connector")).toBeNull();
    expect(textStyleScopeFor(null)).toBeNull();
    expect(textStyleScopeFor(undefined)).toBeNull();
  });

  it("gives each scope its own defaults so one object type never inherits another's", () => {
    expect(new Set(TEXT_STYLE_SCOPES).size).toBe(TEXT_STYLE_SCOPES.length);
    expect(DEFAULT_TEXT_STYLES.text.fontSize).toBe(18);
    expect(DEFAULT_TEXT_STYLES.note.fontSize).toBe(16);
    expect(DEFAULT_TEXT_STYLES.table.fontSize).toBe(14);
    expect(DEFAULT_TEXT_STYLES.shape.textAlign).toBe("center");
    expect(DEFAULT_TEXT_STYLES.text.textAlign).toBe("left");
  });

  it("resolves a style per object kind and falls back to the text scope", () => {
    const styles = { ...DEFAULT_TEXT_STYLES, shape: { ...DEFAULT_TEXT_STYLES.shape, fontWeight: "bold" as const } };

    expect(textStyleForScope(styles, "diamond").fontWeight).toBe("bold");
    expect(textStyleForScope(styles, "note").fontWeight).toBe("normal");
    expect(textStyleForScope(styles, "draw")).toEqual(styles.text);
  });
});
