import { describe, expect, it } from "vitest";
import type { BoardElement } from "@/domain/board/board-document";
import { heightForEditedElement } from "./element-sizing";

const rectangle: BoardElement = {
  id: "element:shape",
  kind: "rectangle",
  x: 0,
  y: 0,
  width: 220,
  height: 180,
  text: "Old content",
  color: "violet",
};

describe("heightForEditedElement", () => {
  it.each(["note", "rectangle", "ellipse", "diamond", "triangle"] as const)("keeps %s dimensions when content changes at any zoom", (kind) => {
    for (const scale of [0.25, 0.9, 1, 2.5]) {
      expect(heightForEditedElement({ ...rectangle, kind }, 58, scale)).toBe(180);
      expect(heightForEditedElement({ ...rectangle, kind }, 600, scale)).toBe(180);
    }
  });

  it("converts a screen measurement back to board coordinates", () => {
    expect(heightForEditedElement({ ...rectangle, kind: "text" }, 216, 1.5)).toBe(144);
  });
});
