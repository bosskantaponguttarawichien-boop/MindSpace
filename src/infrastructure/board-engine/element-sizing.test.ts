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
  it("shrinks a shape to the measured text height while preserving its usable minimum", () => {
    expect(heightForEditedElement(rectangle, 58, 1)).toBe(72);
  });

  it("converts a screen measurement back to board coordinates", () => {
    expect(heightForEditedElement(rectangle, 216, 1.5)).toBe(144);
  });
});
