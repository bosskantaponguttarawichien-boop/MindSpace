import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { memo } from "react";
import { Arrow, Ellipse, Group, Line } from "react-konva";
import type { BoardConnection, BoardElement } from "@/domain/board/board-document";
import { getConnectionEndpoints, getConnectionPathPoints } from "@/domain/board/geometry";
import { COLORS } from "@/infrastructure/board-engine/board-theme";

type BoardConnectionNodeProps = {
  connection: BoardConnection;
  from: BoardElement;
  to: BoardElement;
  groupedPath?: { points: number[] };
  isSelected: boolean;
  onSelect: (id: string, event: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  registerArrow: (id: string, node: Konva.Arrow | null) => void;
  registerAnchor: (key: string, node: Konva.Ellipse | null) => void;
};

export const BoardConnectionNode = memo(function BoardConnectionNode({
  connection,
  from,
  to,
  groupedPath,
  isSelected,
  onSelect,
  registerArrow,
  registerAnchor,
}: BoardConnectionNodeProps) {
  const { start, end } = getConnectionEndpoints(from, to, connection.pathStyle === "curved" ? 0 : 16);
  const colorKey = connection.color;
  const strokeColor = isSelected ? "#7c3aed" : colorKey ? COLORS[colorKey].stroke : "#64748b";
  const style = connection.style ?? "end";
  const lineStyle = connection.lineStyle ?? "solid";
  const headType = connection.headType ?? "arrow";
  const pointerAtBeginning = style === "both" || style === "start";
  const pointerAtEnding = style === "both" || style === "end";
  const dash = lineStyle === "dashed" ? [10, 6] : lineStyle === "dotted" ? [3, 5] : [];
  let pointerLength = 10;
  let pointerWidth = 10;
  if (headType === "arrow") {
    pointerLength = 10;
    pointerWidth = 12;
  } else if (headType === "triangle") {
    pointerLength = 14;
    pointerWidth = 10;
  }
  const pathStyle = connection.pathStyle ?? "straight";
  const points = groupedPath ? groupedPath.points : getConnectionPathPoints(pathStyle, start, end);
  const isCustomMarker = headType === "circle" || headType === "diamond";
  const endAngleDeg = (Math.atan2(points[points.length - 1]! - points[points.length - 3]!, points[points.length - 2]! - points[points.length - 4]!) * 180) / Math.PI;
  const startAngleDeg = (Math.atan2(points[1]! - points[3]!, points[0]! - points[2]!) * 180) / Math.PI;
  const select = (event: KonvaEventObject<MouseEvent | TouchEvent>) => onSelect(connection.id, event);

  return (
    <Group>
      <Arrow
        name={connection.id}
        hitStrokeWidth={18}
        ref={(node) => registerArrow(connection.id, node)}
        points={points}
        tension={pathStyle === "curved" ? 0.5 : 0}
        stroke={strokeColor}
        fill={strokeColor}
        strokeWidth={isSelected ? 4 : 2}
        dash={dash}
        pointerAtBeginning={isCustomMarker ? false : pointerAtBeginning}
        pointerAtEnding={isCustomMarker ? false : pointerAtEnding}
        pointerLength={pointerLength}
        pointerWidth={pointerWidth}
        perfectDrawEnabled={false}
        onClick={select}
        onTap={select}
      />
      {headType === "circle" && pointerAtEnding ? <Ellipse x={end.x} y={end.y} radiusX={6.5} radiusY={6.5} fill={strokeColor} stroke="#ffffff" strokeWidth={2} perfectDrawEnabled={false} shadowForStrokeEnabled={false} onClick={select} onTap={select} /> : null}
      {headType === "circle" && pointerAtBeginning ? <Ellipse x={start.x} y={start.y} radiusX={6.5} radiusY={6.5} fill={strokeColor} stroke="#ffffff" strokeWidth={2} perfectDrawEnabled={false} shadowForStrokeEnabled={false} onClick={select} onTap={select} /> : null}
      {headType === "diamond" && pointerAtEnding ? <Line points={[-6, 0, 0, -5, 6, 0, 0, 5]} closed x={end.x} y={end.y} rotation={endAngleDeg} fill={strokeColor} stroke={strokeColor} perfectDrawEnabled={false} onClick={select} onTap={select} /> : null}
      {headType === "diamond" && pointerAtBeginning ? <Line points={[-6, 0, 0, -5, 6, 0, 0, 5]} closed x={start.x} y={start.y} rotation={startAngleDeg + 180} fill={strokeColor} stroke={strokeColor} perfectDrawEnabled={false} onClick={select} onTap={select} /> : null}
      {pathStyle === "curved" && style === "none" ? [start, end].map((point, index) => <Ellipse key={`anchor-${index}`} ref={(node) => registerAnchor(`${connection.id}:${index}`, node)} x={point.x} y={point.y} radiusX={4.5} radiusY={4.5} fill="#ffffff" stroke={strokeColor} strokeWidth={1.7} listening={false} perfectDrawEnabled={false} />) : null}
    </Group>
  );
});
