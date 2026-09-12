import { describe, expect, it } from "vitest";
import type { BoardElement } from "@/domain/board/board-document";
import { boundsFromPoints, elementBounds, elementCenter, getConnectionEndpoints, getConnectionPathPoints, getGroupedElbowPaths, getShapeIntersection, isElementContainedByBounds } from "@/domain/board/geometry";

describe("geometry", () => {
  it("calculates element center correctly", () => {
    const element: BoardElement = {
      id: "element:1",
      kind: "rectangle",
      x: 100,
      y: 200,
      width: 200,
      height: 100,
      text: "",
    };
    expect(elementCenter(element)).toEqual({ x: 200, y: 250 });
  });

  it("finds rectangular selection bounds and only includes fully covered elements", () => {
    const selection = boundsFromPoints({ x: 40, y: 30 }, { x: 240, y: 180 });
    const contained: BoardElement = { id: "element:contained", kind: "note", x: 60, y: 50, width: 120, height: 100, text: "" };
    const intersecting: BoardElement = { id: "element:intersecting", kind: "note", x: 200, y: 50, width: 120, height: 100, text: "" };

    expect(selection).toEqual({ x: 40, y: 30, width: 200, height: 150 });
    expect(isElementContainedByBounds(contained, selection)).toBe(true);
    expect(isElementContainedByBounds(intersecting, selection)).toBe(false);
  });

  it("uses a drawing's stroke points instead of its placeholder geometry for selection", () => {
    const drawing: BoardElement = {
      id: "element:drawing",
      kind: "draw",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      text: "",
      points: [80, 60, 150, 120, 220, 90],
    };

    expect(elementBounds(drawing)).toEqual({ x: 80, y: 60, width: 140, height: 60 });
    expect(isElementContainedByBounds(drawing, { x: 70, y: 50, width: 160, height: 80 })).toBe(true);
  });

  it("calculates rectangle boundary intersection", () => {
    const rect: BoardElement = {
      id: "element:rect",
      kind: "rectangle",
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      text: "",
    };
    // Center is (150, 150), rx=50, ry=50
    // Target to the right (250, 150) -> should intersect right edge (200, 150)
    const right = getShapeIntersection(rect, { x: 250, y: 150 });
    expect(right.x).toBeCloseTo(200);
    expect(right.y).toBeCloseTo(150);

    // Target to the top (150, 0) -> should intersect top edge (150, 100)
    const top = getShapeIntersection(rect, { x: 150, y: 0 });
    expect(top.x).toBeCloseTo(150);
    expect(top.y).toBeCloseTo(100);
  });

  it("calculates ellipse boundary intersection", () => {
    const ellipse: BoardElement = {
      id: "element:ellipse",
      kind: "ellipse",
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      text: "",
    };
    // Center is (200, 150), rx=100, ry=50
    const right = getShapeIntersection(ellipse, { x: 400, y: 150 });
    expect(right.x).toBeCloseTo(300);
    expect(right.y).toBeCloseTo(150);

    const top = getShapeIntersection(ellipse, { x: 200, y: 0 });
    expect(top.x).toBeCloseTo(200);
    expect(top.y).toBeCloseTo(100);
  });

  it("calculates diamond boundary intersection", () => {
    const diamond: BoardElement = {
      id: "element:diamond",
      kind: "diamond",
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      text: "",
    };
    // Center is (150, 150), rx=50, ry=50
    // Top vertex is (150, 100)
    const top = getShapeIntersection(diamond, { x: 150, y: 0 });
    expect(top.x).toBeCloseTo(150);
    expect(top.y).toBeCloseTo(100);

    // Right vertex is (200, 150)
    const right = getShapeIntersection(diamond, { x: 300, y: 150 });
    expect(right.x).toBeCloseTo(200);
    expect(right.y).toBeCloseTo(150);
  });

  it("calculates triangle boundary intersection", () => {
    const triangle: BoardElement = {
      id: "element:triangle",
      kind: "triangle",
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      text: "",
    };
    // Center is (150, 150), top vertex is (150, 100)
    const top = getShapeIntersection(triangle, { x: 150, y: 0 });
    expect(top.x).toBeCloseTo(150);
    expect(top.y).toBeCloseTo(100);

    // Bottom edge at y=200
    const bottom = getShapeIntersection(triangle, { x: 150, y: 300 });
    expect(bottom.x).toBeCloseTo(150);
    expect(bottom.y).toBeCloseTo(200);
  });

  it("calculates padded connection endpoints with default gap offset", () => {
    const rectA: BoardElement = {
      id: "element:a",
      kind: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      text: "",
    };
    const rectB: BoardElement = {
      id: "element:b",
      kind: "rectangle",
      x: 200,
      y: 0,
      width: 100,
      height: 100,
      text: "",
    };

    const { start, end } = getConnectionEndpoints(rectA, rectB);
    // rectA center (50, 50), right edge is x=100. Padded start: 100 + 16 = 116
    expect(start.x).toBeCloseTo(116);
    expect(start.y).toBeCloseTo(50);
    // rectB center (250, 50), left edge is x=200. Padded end: 200 - 16 = 184
    expect(end.x).toBeCloseTo(184);
    expect(end.y).toBeCloseTo(50);
  });

  it("builds a straight two-point path by default", () => {
    expect(getConnectionPathPoints(undefined, { x: 0, y: 0 }, { x: 100, y: 50 })).toEqual([0, 0, 100, 50]);
    expect(getConnectionPathPoints("straight", { x: 0, y: 0 }, { x: 100, y: 50 })).toEqual([0, 0, 100, 50]);
  });

  it("bends an elbow path at the horizontal midpoint", () => {
    const points = getConnectionPathPoints("elbow", { x: 0, y: 0 }, { x: 100, y: 200 });
    expect(points).toEqual([0, 0, 50, 0, 50, 200, 100, 200]);
  });

  it("bows a curved path's midpoint away from the straight line, keeping its endpoints", () => {
    const points = getConnectionPathPoints("curved", { x: 0, y: 0 }, { x: 100, y: 0 });
    expect(points).toHaveLength(6);
    expect([points[0], points[1]]).toEqual([0, 0]);
    expect([points[4], points[5]]).toEqual([100, 0]);
    expect(points[2]).toBeCloseTo(50);
    expect(points[3]).not.toBe(0);
  });

  it("merges elbow siblings leaving a source's side edge into one trunk before splitting", () => {
    const from: BoardElement = { id: "element:from", kind: "rectangle", x: 0, y: 0, width: 100, height: 100, text: "" };
    const to1: BoardElement = { id: "element:to1", kind: "rectangle", x: 300, y: -60, width: 100, height: 100, text: "" };
    const to2: BoardElement = { id: "element:to2", kind: "rectangle", x: 300, y: 60, width: 100, height: 100, text: "" };
    const elements = new Map([from, to1, to2].map((element) => [element.id, element]));

    const paths = getGroupedElbowPaths(
      from.id,
      [{ id: "connection:c1", toId: to1.id }, { id: "connection:c2", toId: to2.id }],
      (id) => elements.get(id),
      0,
    );

    const c1 = paths.get("connection:c1");
    const c2 = paths.get("connection:c2");
    expect(c1?.start).toEqual({ x: 100, y: 50 });
    expect(c2?.start).toEqual(c1?.start);
    // Same trunk segment (start -> branch point) for both siblings; they only diverge after it.
    expect(c1?.points.slice(0, 4)).toEqual([100, 50, 200, 50]);
    expect(c2?.points.slice(0, 4)).toEqual(c1?.points.slice(0, 4));
    expect(c1?.points).toEqual([100, 50, 200, 50, 200, 0, 300, 0]);
    expect(c2?.points).toEqual([100, 50, 200, 50, 200, 100, 300, 100]);
  });

  it("merges elbow siblings leaving a source's top/bottom edge into a vertical trunk, like a tree diagram", () => {
    const from: BoardElement = { id: "element:from", kind: "rectangle", x: 0, y: 0, width: 200, height: 100, text: "" };
    const to1: BoardElement = { id: "element:to1", kind: "rectangle", x: -100, y: 250, width: 100, height: 100, text: "" };
    const to2: BoardElement = { id: "element:to2", kind: "rectangle", x: 200, y: 250, width: 100, height: 100, text: "" };
    const elements = new Map([from, to1, to2].map((element) => [element.id, element]));

    const paths = getGroupedElbowPaths(
      from.id,
      [{ id: "connection:c1", toId: to1.id }, { id: "connection:c2", toId: to2.id }],
      (id) => elements.get(id),
      0,
    );

    const c1 = paths.get("connection:c1");
    const c2 = paths.get("connection:c2");
    expect(c1?.start).toEqual({ x: 100, y: 100 });
    expect(c2?.start).toEqual(c1?.start);
    // Trunk drops straight down from the shared start to the branch row before splitting sideways.
    expect(c1?.points.slice(0, 4)).toEqual([100, 100, 100, 175]);
    expect(c2?.points.slice(0, 4)).toEqual(c1?.points.slice(0, 4));
    expect(c1?.points).toEqual([100, 100, 100, 175, -20, 175, -20, 250]);
    expect(c2?.points).toEqual([100, 100, 100, 175, 220, 175, 220, 250]);
  });
});
