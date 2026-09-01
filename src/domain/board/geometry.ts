import type { BoardElement } from "@/domain/board/board-document";

export type Point = { x: number; y: number };

export function elementCenter(element: BoardElement): Point {
  return { x: element.x + element.width / 2, y: element.y + element.height / 2 };
}

function lineSegmentIntersection(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point,
): Point | null {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  if (Math.abs(denom) < 1e-9) return null;

  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

  if (ua >= 0 && ub >= 0 && ub <= 1) {
    return {
      x: p1.x + ua * (p2.x - p1.x),
      y: p1.y + ua * (p2.y - p1.y),
    };
  }
  return null;
}

export function getShapeIntersection(element: BoardElement, targetPoint: Point): Point {
  const center = elementCenter(element);
  const dx = targetPoint.x - center.x;
  const dy = targetPoint.y - center.y;

  if (Math.hypot(dx, dy) < 1e-6) {
    return center;
  }

  const rx = Math.max(1, element.width / 2);
  const ry = Math.max(1, element.height / 2);

  if (element.kind === "ellipse") {
    const scale = 1 / Math.hypot(dx / rx, dy / ry);
    return {
      x: center.x + dx * scale,
      y: center.y + dy * scale,
    };
  }

  if (element.kind === "diamond") {
    const scale = 1 / (Math.abs(dx / rx) + Math.abs(dy / ry));
    return {
      x: center.x + dx * scale,
      y: center.y + dy * scale,
    };
  }

  if (element.kind === "triangle") {
    const v0: Point = { x: element.x + element.width / 2, y: element.y };
    const v1: Point = { x: element.x + element.width, y: element.y + element.height };
    const v2: Point = { x: element.x, y: element.y + element.height };

    const farPoint: Point = {
      x: center.x + dx * 10,
      y: center.y + dy * 10,
    };

    const edges: [Point, Point][] = [
      [v0, v1],
      [v1, v2],
      [v2, v0],
    ];

    for (const [start, end] of edges) {
      const hit = lineSegmentIntersection(center, farPoint, start, end);
      if (hit) return hit;
    }
  }

  // Default rectangular boundary for rectangle, note, text, image, draw, etc.
  const tx = dx !== 0 ? rx / Math.abs(dx) : Infinity;
  const ty = dy !== 0 ? ry / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty);

  return {
    x: center.x + dx * t,
    y: center.y + dy * t,
  };
}

export function getConnectionEndpoints(
  from: BoardElement,
  to: BoardElement,
  gap = 16,
): { start: Point; end: Point } {
  const startCenter = elementCenter(from);
  const endCenter = elementCenter(to);

  const rawStart = getShapeIntersection(from, endCenter);
  const rawEnd = getShapeIntersection(to, startCenter);

  const dx = rawEnd.x - rawStart.x;
  const dy = rawEnd.y - rawStart.y;
  const dist = Math.hypot(dx, dy);

  if (dist <= gap * 2 + 2) {
    return { start: rawStart, end: rawEnd };
  }

  const unitX = dx / dist;
  const unitY = dy / dist;

  return {
    start: {
      x: rawStart.x + unitX * gap,
      y: rawStart.y + unitY * gap,
    },
    end: {
      x: rawEnd.x - unitX * gap,
      y: rawEnd.y - unitY * gap,
    },
  };
}

