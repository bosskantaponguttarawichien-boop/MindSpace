import { describe, expect, it } from "vitest";
import type { BoardElement } from "@/domain/board/board-document";
import { elementCenter, getConnectionEndpoints, getShapeIntersection } from "@/domain/board/geometry";

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
});

