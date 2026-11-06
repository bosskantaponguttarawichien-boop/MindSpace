import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { memo } from "react";
import { Group, Line, Rect, Text } from "react-konva";
import type { BoardElement, BoardElementId } from "@/domain/board/board-document";
import type { BoardTool } from "@/infrastructure/board-engine/board-engine";
import { isShapeKind } from "@/infrastructure/board-engine/board-elements";
import { BoardImage } from "@/infrastructure/board-engine/board-image";
import { BoardTable } from "@/infrastructure/board-engine/board-table";
import { MarkdownText } from "@/infrastructure/board-engine/markdown-text";
import { type ElementColors } from "@/infrastructure/board-engine/board-theme";

import { ElementSurface } from "./element-surface";

type BoardElementNodeProps = {
  element: BoardElement;
  colors: ElementColors;
  effectiveTool: BoardTool;
  isLocked: boolean;
  isCoarsePointer: boolean;
  isEditing: boolean;
  isTitleEditing: boolean;
  onSelect: (id: BoardElementId, event: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onStartLongPress: (id: BoardElementId, event: KonvaEventObject<TouchEvent>) => void;
  onClearLongPress: () => void;
  onStartMouseLongPress: (id: BoardElementId) => void;
  onDblClick: (element: BoardElement, event: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDblTap: (element: BoardElement, event: KonvaEventObject<TouchEvent>) => void;
  onDragStart: () => void;
  onDragMove: (element: BoardElement, event: KonvaEventObject<DragEvent>) => void;
  onDragEnd: (element: BoardElement, event: KonvaEventObject<DragEvent>) => void;
  onTransformStart: () => void;
  onTransformEnd: (element: BoardElement, event: KonvaEventObject<Event>) => void;
  onCellDblClick: (element: BoardElement, r: number, c: number, text: string) => void;
  onTitleDblClick: (element: BoardElement) => void;
  registerShape: (id: BoardElementId, node: Konva.Node | null) => void;
};

export const BoardElementNode = memo(function BoardElementNode({
  element,
  colors,
  effectiveTool,
  isLocked,
  isCoarsePointer,
  isEditing,
  isTitleEditing,
  onSelect,
  onStartLongPress,
  onClearLongPress,
  onStartMouseLongPress,
  onDblClick,
  onDblTap,
  onDragStart,
  onDragMove,
  onDragEnd,
  onTransformStart,
  onTransformEnd,
  onCellDblClick,
  onTitleDblClick,
  registerShape,
}: BoardElementNodeProps) {
  if (element.kind === "draw") {
    return (
      <Line
        name={element.id}
        ref={(node) => registerShape(element.id, node)}
        points={element.points ?? []}
        stroke={colors.stroke}
        strokeWidth={3}
        hitStrokeWidth={20}
        lineCap="round"
        lineJoin="round"
        tension={0.25}
        perfectDrawEnabled={false}
      />
    );
  }

  return (
    <Group
      name={element.id}
      ref={(node) => registerShape(element.id, node)}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      draggable={effectiveTool === "select" && !isLocked}
      onClick={(event) => onSelect(element.id, event)}
      onTap={(event) => onSelect(element.id, event)}
      onTouchStart={(event) => onStartLongPress(element.id, event)}
      onTouchMove={onClearLongPress}
      onTouchEnd={onClearLongPress}
      onMouseDown={() => onStartMouseLongPress(element.id)}
      onMouseMove={onClearLongPress}
      onMouseUp={onClearLongPress}
      onDblClick={(event) => onDblClick(element, event)}
      onDblTap={(event) => onDblTap(element, event)}
      onDragStart={onDragStart}
      onDragMove={(event) => onDragMove(element, event)}
      onDragEnd={(event) => onDragEnd(element, event)}
      onTransformStart={onTransformStart}
      onTransformEnd={(event) => onTransformEnd(element, event)}
    >
      {element.kind === "image" ? (
        <BoardImage element={element} />
      ) : element.kind === "table" ? (
        <BoardTable
          element={element}
          colors={colors}
          titleEditing={isTitleEditing}
          onTitleDblClick={() => onTitleDblClick(element)}
          onCellDblClick={(r, c, text) => onCellDblClick(element, r, c, text)}
        />
      ) : element.kind === "text" ? (
        <Rect width={element.width} height={element.height} fill="rgba(0, 0, 0, 0.001)" perfectDrawEnabled={false} />
      ) : (
        <ElementSurface element={element} colors={colors} reducedEffects={isCoarsePointer} />
      )}
      {(element.kind === "note" || isShapeKind(element.kind)) && (element.title || isTitleEditing) ? (
        <Group onDblClick={(event) => { event.cancelBubble = true; onTitleDblClick(element); }}
          onDblTap={(event) => { event.cancelBubble = true; onTitleDblClick(element); }}>
          <Rect width={element.width} height={50} fill="transparent" perfectDrawEnabled={false} />
          <Text x={18} y={18} width={element.width - 36} text={isTitleEditing ? "" : element.title ?? ""} fill={colors.text} fontFamily="Geist, Noto Sans Thai, sans-serif" fontSize={17} fontStyle="bold" perfectDrawEnabled={false} />
        </Group>
      ) : null}
      {element.kind === "image" || element.kind === "table" || (isEditing && !isTitleEditing) ? null : <MarkdownText element={element} color={colors.text} />}
      {isLocked ? (
        <Group x={element.width - 18} y={-20} listening={false} opacity={0.85}>
          <Rect y={5} width={14} height={10} cornerRadius={2} fill="#475569" perfectDrawEnabled={false} />
          <Line points={[3.5, 5, 3.5, 2.5, 10.5, 2.5, 10.5, 5]} stroke="#475569" strokeWidth={1.8} lineCap="round" perfectDrawEnabled={false} />
        </Group>
      ) : null}
    </Group>
  );
});
