import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { memo } from "react";
import { Ellipse, Group, Line, Path, Rect, Text } from "react-konva";
import type { BoardElement, BoardElementId } from "@/domain/board/board-document";
import type { BoardTool } from "@/infrastructure/board-engine/board-engine";
import { isShapeKind } from "@/infrastructure/board-engine/board-elements";
import { BoardImage } from "@/infrastructure/board-engine/board-image";
import { BoardTable } from "@/infrastructure/board-engine/board-table";
import { MarkdownText } from "@/infrastructure/board-engine/markdown-text";
import { NOTE_GRADIENTS, type ElementColors } from "@/infrastructure/board-engine/board-theme";

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
      ) : element.kind === "ellipse" ? (
        <Ellipse
          x={element.width / 2}
          y={element.height / 2}
          radiusX={element.width / 2}
          radiusY={element.height / 2}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={2}
          perfectDrawEnabled={false}
        />
      ) : element.kind === "diamond" ? (
        <Line
          points={[element.width / 2, 0, element.width, element.height / 2, element.width / 2, element.height, 0, element.height / 2]}
          closed
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={2}
          perfectDrawEnabled={false}
        />
      ) : element.kind === "triangle" ? (
        <Line
          points={[element.width / 2, 0, element.width, element.height, 0, element.height]}
          closed
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={2}
          perfectDrawEnabled={false}
        />
      ) : element.kind === "note" ? (
        (() => {
          const gradient = NOTE_GRADIENTS[element.color ?? "yellow"];
          const fold = Math.min(24, Math.min(element.width, element.height) * 0.18);
          const tapeWidth = Math.min(84, Math.max(68, element.width * 0.4));
          const tapeHeight = 24;
          return (
            <Group>
              {/* Main square paper sheet with subtle gradient and ambient shadow */}
              <Line
                points={[
                  0,
                  0,
                  element.width,
                  0,
                  element.width,
                  element.height - fold,
                  element.width - fold,
                  element.height,
                  0,
                  element.height,
                ]}
                closed
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: element.width, y: element.height }}
                fillLinearGradientColorStops={[
                  0,
                  gradient.from,
                  1,
                  gradient.to,
                ]}
                shadowColor="#0f172a"
                shadowOpacity={isCoarsePointer ? 0 : 0.12}
                shadowBlur={isCoarsePointer ? 0 : 14}
                shadowOffsetY={6}
                shadowOffsetX={1}
                perfectDrawEnabled={false}
                shadowForStrokeEnabled={false}
              />
              {/* Under-crease shadow behind the folded corner */}
              <Line
                points={[
                  element.width - fold,
                  element.height,
                  element.width - fold - 2,
                  element.height - fold - 2,
                  element.width,
                  element.height - fold,
                ]}
                closed
                fill="rgba(15, 23, 42, 0.12)"
                perfectDrawEnabled={false}
              />
              {/* Folded corner flap with gentle 3D elevation shadow */}
              <Line
                points={[
                  element.width - fold,
                  element.height - fold,
                  element.width,
                  element.height - fold,
                  element.width - fold,
                  element.height,
                ]}
                closed
                fill={gradient.to}
                shadowColor="#0f172a"
                shadowOpacity={isCoarsePointer ? 0 : 0.18}
                shadowBlur={isCoarsePointer ? 0 : 4}
                shadowOffsetX={-2}
                shadowOffsetY={-2}
                perfectDrawEnabled={false}
                shadowForStrokeEnabled={false}
              />
              {/* Fold crease highlight */}
              <Line
                points={[
                  element.width - fold,
                  element.height,
                  element.width,
                  element.height - fold,
                ]}
                stroke="rgba(255, 255, 255, 0.55)"
                strokeWidth={0.8}
                perfectDrawEnabled={false}
              />
              {/* Clear tape (เทปใส) attached at the top center */}
              <Group
                x={element.width / 2}
                y={0}
                offsetX={tapeWidth / 2}
                offsetY={tapeHeight / 2}
                rotation={-1.5}
                listening={false}
              >
                {/* Tape soft shadow */}
                <Rect
                  width={tapeWidth}
                  height={tapeHeight}
                  cornerRadius={2}
                  fill="rgba(15, 23, 42, 0.08)"
                  shadowColor="#0f172a"
                  shadowOpacity={isCoarsePointer ? 0 : 0.18}
                  shadowBlur={isCoarsePointer ? 0 : 4}
                  shadowOffsetY={2}
                  perfectDrawEnabled={false}
                />
                {/* Clear translucent tape body */}
                <Rect
                  width={tapeWidth}
                  height={tapeHeight}
                  cornerRadius={2}
                  fill="rgba(255, 255, 255, 0.72)"
                  stroke="rgba(203, 213, 225, 0.6)"
                  strokeWidth={1}
                  perfectDrawEnabled={false}
                />
                {/* Tape glossy highlight sheen */}
                <Line
                  points={[6, 4, tapeWidth - 6, 4]}
                  stroke="rgba(255, 255, 255, 0.85)"
                  strokeWidth={1.5}
                  perfectDrawEnabled={false}
                />
              </Group>
            </Group>
          );
        })()
      ) : element.kind === "text" ? (
        <Rect width={element.width} height={element.height} fill="rgba(0, 0, 0, 0.001)" perfectDrawEnabled={false} />
      ) : (
        <Rect
          width={element.width}
          height={element.height}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={2.5}
          cornerRadius={18}
          shadowColor="#0f172a"
          shadowOpacity={isCoarsePointer ? 0 : 0.06}
          shadowBlur={isCoarsePointer ? 0 : 8}
          shadowOffsetY={3}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
        />
      )}
      {(element.kind === "note" || isShapeKind(element.kind)) && (element.title || isTitleEditing) ? (
        <Group onDblClick={() => onTitleDblClick(element)}>
          <Rect width={element.width} height={50} fill="transparent" perfectDrawEnabled={false} />
          {element.kind === "note" ? (
            <Path x={18} y={19} data="M6 11A5 5 0 1 1 11 6c0 2-1 3-2.5 4.5V13h-5v-2.5C2 9 1 8 1 6A5 5 0 0 1 6 1 M3.5 15h5 M4.5 17h3" stroke={colors.text} strokeWidth={1.4} listening={false} perfectDrawEnabled={false} />
          ) : (
            <Path x={18} y={18} scaleX={0.85} scaleY={0.85} data="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0 M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" stroke={colors.text} strokeWidth={1.5} lineCap="round" lineJoin="round" listening={false} perfectDrawEnabled={false} />
          )}
          <Text x={43} y={18} width={element.width - 61} text={isTitleEditing ? "" : element.title ?? ""} fill={colors.text} fontFamily="Geist, Noto Sans Thai, sans-serif" fontSize={17} fontStyle="bold" perfectDrawEnabled={false} />
          {element.text?.trim() ? (
            <Line points={[18, 51, element.width - 18, 51]} stroke={colors.stroke} opacity={0.27} strokeWidth={1} perfectDrawEnabled={false} />
          ) : null}
        </Group>
      ) : null}
      {element.kind === "image" || element.kind === "table" || isEditing ? null : <MarkdownText element={element} color={colors.text} />}
      {isLocked ? (
        <Group x={element.width - 18} y={-20} listening={false} opacity={0.85}>
          <Rect y={5} width={14} height={10} cornerRadius={2} fill="#475569" perfectDrawEnabled={false} />
          <Line points={[3.5, 5, 3.5, 2.5, 10.5, 2.5, 10.5, 5]} stroke="#475569" strokeWidth={1.8} lineCap="round" perfectDrawEnabled={false} />
        </Group>
      ) : null}
    </Group>
  );
});
